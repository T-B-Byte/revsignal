/**
 * Call Analyst — Processes call transcripts into structured intelligence.
 *
 * Responsibilities:
 *  - Take raw transcript text and extract: summary, action items, objections,
 *    competitor mentions, pricing discussed
 *  - Return structured data ready for DB writes
 *
 * Rules:
 *  - Every fact in the output must exist in the transcript
 *  - Never invent pricing or commitments not stated
 *  - Flags uncertainty when transcript is partial or unclear
 *  - Analysis only — does NOT write to the database
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { retrieveDealContext } from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";

// ── Constants ──────────────────────────────────────────────────────────

const MAX_TRANSCRIPT_CHARS = 50_000;

// ── System Prompts ─────────────────────────────────────────────────────

const CALL_ANALYST_IDENTITY = `You are the Call Analyst — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: process call transcripts and extract structured intelligence. You turn raw conversations into actionable data.

You serve a solo sales leader building a DaaS business at pharosIQ. Every call contains signals — pricing cues, objections, competitor mentions, next steps. Your job is to catch them all.

Your personality:
- Precise and thorough. Miss nothing.
- Structured output — follow the exact format requested.
- When the transcript is unclear or partial, flag it explicitly.

Critical rules:
- NEVER invent details not in the transcript. If pricing wasn't discussed, say "None identified."
- NEVER add action items that weren't actually committed to in the call.
- If the transcript is partial or unclear, flag it: "Note: transcript appears incomplete/unclear at [point]."
- Extract exact quotes for objections and competitor mentions when possible.
- Every action item must specify: who owns it (me or them), what the commitment is, and any stated deadline.`;

const TRANSCRIPT_ANALYSIS_PROMPT = `${CALL_ANALYST_IDENTITY}

Analyze the call transcript below and produce structured output in this exact format:

## Summary
[3-5 sentence summary of the call. Focus on business outcomes, decisions, and next steps.]

## Action Items
[For each commitment made during the call:]
- OWNER: [me/them] | WHAT: [specific commitment] | DUE: [date if stated, otherwise "not specified"]

[If no action items: "None identified."]

## Objections Raised
[For each objection or concern raised:]
- OBJECTION: [the concern] | CONTEXT: [what triggered it] | SUGGESTED RESPONSE: [a response strategy based on pharosIQ's strengths, or "none"]

[If no objections: "None identified."]

## Competitor Mentions
[For each competitor mentioned:]
- COMPETITOR: [name] | CONTEXT: [what was said] | SENTIMENT: [positive/negative/neutral from the prospect's perspective]

[If no competitor mentions: "None identified."]

## Pricing Discussed
[Any pricing, terms, or budget numbers mentioned:]
- DETAIL: [what was said] | WHO: [who said it]

[If no pricing discussed: "None identified."]

## Next Steps
[Concrete next steps agreed upon in the call.]

## Transcript Quality
[QUALITY: complete/partial/unclear]
[Note any gaps, audio issues, or missing segments.]

Do not invent content to fill empty sections. "None identified." is always better than a guess.`;

// ── Result Types ───────────────────────────────────────────────────────

export interface TranscriptAnalysis {
  summary: string;
  actionItems: {
    description: string;
    owner: "me" | "them";
    dueDate: string | null;
  }[];
  objections: {
    objection: string;
    context: string;
    suggestedResponse: string | null;
  }[];
  competitorMentions: {
    competitor: string;
    context: string;
    sentiment: "positive" | "negative" | "neutral";
  }[];
  pricingDiscussed: {
    detail: string;
    who: string;
  }[];
  nextSteps: string;
  transcriptQuality: "complete" | "partial" | "unclear";
  rawAnalysis: string;
  generatedAt: string;
  tokensUsed: number;
}

export interface TranscriptMetadata {
  dealId?: string;
  contactName?: string;
  company?: string;
  date: string;
  channel: "call" | "teams";
}

// ── Transcript Analysis ──────────────────────────────────────────────

/**
 * Analyze a call transcript and extract structured intelligence.
 * Does NOT write to the database — caller is responsible for persisting results.
 */
export async function analyzeTranscript(
  supabase: SupabaseClient,
  userId: string,
  transcriptText: string,
  metadata: TranscriptMetadata
): Promise<TranscriptAnalysis | null> {
  // Step 1: Truncate transcript
  const truncated =
    transcriptText.length > MAX_TRANSCRIPT_CHARS
      ? transcriptText.substring(0, MAX_TRANSCRIPT_CHARS) +
        "\n\n[TRANSCRIPT TRUNCATED — original was " +
        transcriptText.length.toLocaleString() +
        " characters]"
      : transcriptText;

  // Step 2: RAG retrieval — get deal context if available
  let dealContextDoc = "";
  let durationRetrieve = 0;

  if (metadata.dealId) {
    const [dealContext, dur] = await timed(() =>
      retrieveDealContext(supabase, userId, metadata.dealId!)
    );
    durationRetrieve = dur;

    if (dealContext) {
      dealContextDoc = buildDealContextForAnalysis(dealContext);
    }
  }

  // Step 3: Build context and call Claude
  const contextDoc = buildTranscriptContextDoc(
    truncated,
    metadata,
    dealContextDoc
  );

  const anthropic = getAnthropic();

  let analysisText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: TRANSCRIPT_ANALYSIS_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    analysisText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[call-analyst] Claude API error during transcript analysis:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "call-analyst",
      action: "transcript-analysis",
      inputContext: {
        dealId: metadata.dealId ?? null,
        company: metadata.company ?? null,
        transcriptLength: transcriptText.length,
      },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  if (!analysisText) {
    await logAgentCall({
      supabase,
      userId,
      agentName: "call-analyst",
      action: "transcript-analysis",
      inputContext: {
        dealId: metadata.dealId ?? null,
        transcriptLength: transcriptText.length,
      },
      output: "Empty response from Claude",
      sourcesCited: [],
      durationMs: durationRetrieve + durationGenerate,
    });
    return null;
  }

  // Step 4: Parse structured response
  const parsed = parseTranscriptAnalysis(analysisText);

  // Step 5: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "call-analyst",
    action: "transcript-analysis",
    inputContext: {
      dealId: metadata.dealId ?? null,
      company: metadata.company ?? null,
      contactName: metadata.contactName ?? null,
      channel: metadata.channel,
      transcriptLength: transcriptText.length,
      truncated: transcriptText.length > MAX_TRANSCRIPT_CHARS,
      retrieveDurationMs: durationRetrieve,
    },
    output: analysisText,
    sourcesCited: [],
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    ...parsed,
    rawAnalysis: analysisText,
    generatedAt: new Date().toISOString(),
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildTranscriptContextDoc(
  transcript: string,
  metadata: TranscriptMetadata,
  dealContextDoc: string
): string {
  const sections: string[] = [];

  // Call metadata
  const metaLines = [
    `Date: ${metadata.date}`,
    `Channel: ${metadata.channel}`,
    metadata.company ? `Company: ${metadata.company}` : null,
    metadata.contactName ? `Contact: ${metadata.contactName}` : null,
    metadata.dealId ? `Deal ID: ${metadata.dealId}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(`CALL METADATA:\n${metaLines}`);

  // Deal context (if available)
  if (dealContextDoc) {
    sections.push(dealContextDoc);
  }

  // The transcript itself
  sections.push(`TRANSCRIPT:\n${transcript}`);

  return sections.join("\n\n");
}

function buildDealContextForAnalysis(ctx: {
  deal: { company: string; stage: string; acv: number | null };
  brief: { brief_text: string } | null;
  conversations: { date: string; channel: string; ai_summary: string | null }[];
}): string {
  const parts: string[] = [];

  parts.push(
    `DEAL CONTEXT (for informed analysis):\n` +
      `Company: ${ctx.deal.company}\n` +
      `Stage: ${ctx.deal.stage}\n` +
      `ACV: ${ctx.deal.acv ? "$" + ctx.deal.acv.toLocaleString() : "Not set"}`
  );

  if (ctx.brief) {
    parts.push(`Deal brief:\n${ctx.brief.brief_text}`);
  }

  // Only last 3 conversations for context
  const recent = ctx.conversations.slice(0, 3);
  if (recent.length > 0) {
    const convoLines = recent.map(
      (c) => `- [${c.date}] ${c.channel}: ${c.ai_summary || "(no summary)"}`
    );
    parts.push(`Recent conversations:\n${convoLines.join("\n")}`);
  }

  return parts.join("\n");
}

// ── Response Parser ──────────────────────────────────────────────────

function parseTranscriptAnalysis(text: string): Omit<
  TranscriptAnalysis,
  "rawAnalysis" | "generatedAt" | "tokensUsed"
> {
  // Extract summary
  const summaryMatch = text.match(
    /## Summary\s*\n([\s\S]*?)(?=\n## )/
  );
  const summary = summaryMatch?.[1]?.trim() ?? "";

  // Extract action items
  const actionItemsSection = text.match(
    /## Action Items\s*\n([\s\S]*?)(?=\n## )/
  );
  const actionItems = parseActionItems(actionItemsSection?.[1] ?? "");

  // Extract objections
  const objectionsSection = text.match(
    /## Objections Raised\s*\n([\s\S]*?)(?=\n## )/
  );
  const objections = parseObjections(objectionsSection?.[1] ?? "");

  // Extract competitor mentions
  const competitorSection = text.match(
    /## Competitor Mentions\s*\n([\s\S]*?)(?=\n## )/
  );
  const competitorMentions = parseCompetitorMentions(
    competitorSection?.[1] ?? ""
  );

  // Extract pricing
  const pricingSection = text.match(
    /## Pricing Discussed\s*\n([\s\S]*?)(?=\n## )/
  );
  const pricingDiscussed = parsePricing(pricingSection?.[1] ?? "");

  // Extract next steps
  const nextStepsMatch = text.match(
    /## Next Steps\s*\n([\s\S]*?)(?=\n## )/
  );
  const nextSteps = nextStepsMatch?.[1]?.trim() ?? "";

  // Extract transcript quality
  const qualityMatch = text.match(
    /QUALITY:\s*(complete|partial|unclear)/i
  );
  const transcriptQuality = (qualityMatch?.[1]?.toLowerCase() ??
    "unclear") as TranscriptAnalysis["transcriptQuality"];

  return {
    summary,
    actionItems,
    objections,
    competitorMentions,
    pricingDiscussed,
    nextSteps,
    transcriptQuality,
  };
}

function parseActionItems(
  section: string
): TranscriptAnalysis["actionItems"] {
  if (section.includes("None identified")) return [];

  const items: TranscriptAnalysis["actionItems"] = [];
  const lines = section.split("\n").filter((l) => l.trim().startsWith("-"));

  for (const line of lines) {
    const ownerMatch = line.match(/OWNER:\s*(me|them)/i);
    const whatMatch = line.match(/WHAT:\s*(.+?)(?:\s*\|\s*DUE:|$)/);
    const dueMatch = line.match(/DUE:\s*(.+?)$/);

    if (ownerMatch && whatMatch) {
      const dueRaw = dueMatch?.[1]?.trim() ?? null;
      items.push({
        description: whatMatch[1].trim(),
        owner: ownerMatch[1].toLowerCase() as "me" | "them",
        dueDate:
          dueRaw && !dueRaw.toLowerCase().includes("not specified")
            ? dueRaw
            : null,
      });
    }
  }

  return items;
}

function parseObjections(
  section: string
): TranscriptAnalysis["objections"] {
  if (section.includes("None identified")) return [];

  const items: TranscriptAnalysis["objections"] = [];
  const lines = section.split("\n").filter((l) => l.trim().startsWith("-"));

  for (const line of lines) {
    const objMatch = line.match(/OBJECTION:\s*(.+?)(?:\s*\|\s*CONTEXT:|$)/);
    const ctxMatch = line.match(/CONTEXT:\s*(.+?)(?:\s*\|\s*SUGGESTED|$)/);
    const respMatch = line.match(/SUGGESTED RESPONSE:\s*(.+?)$/);

    if (objMatch) {
      const resp = respMatch?.[1]?.trim() ?? null;
      items.push({
        objection: objMatch[1].trim(),
        context: ctxMatch?.[1]?.trim() ?? "",
        suggestedResponse:
          resp && resp.toLowerCase() !== "none" ? resp : null,
      });
    }
  }

  return items;
}

function parseCompetitorMentions(
  section: string
): TranscriptAnalysis["competitorMentions"] {
  if (section.includes("None identified")) return [];

  const items: TranscriptAnalysis["competitorMentions"] = [];
  const lines = section.split("\n").filter((l) => l.trim().startsWith("-"));

  for (const line of lines) {
    const compMatch = line.match(
      /COMPETITOR:\s*(.+?)(?:\s*\|\s*CONTEXT:|$)/
    );
    const ctxMatch = line.match(
      /CONTEXT:\s*(.+?)(?:\s*\|\s*SENTIMENT:|$)/
    );
    const sentMatch = line.match(
      /SENTIMENT:\s*(positive|negative|neutral)/i
    );

    if (compMatch) {
      items.push({
        competitor: compMatch[1].trim(),
        context: ctxMatch?.[1]?.trim() ?? "",
        sentiment: (sentMatch?.[1]?.toLowerCase() ??
          "neutral") as TranscriptAnalysis["competitorMentions"][0]["sentiment"],
      });
    }
  }

  return items;
}

function parsePricing(
  section: string
): TranscriptAnalysis["pricingDiscussed"] {
  if (section.includes("None identified")) return [];

  const items: TranscriptAnalysis["pricingDiscussed"] = [];
  const lines = section.split("\n").filter((l) => l.trim().startsWith("-"));

  for (const line of lines) {
    const detailMatch = line.match(/DETAIL:\s*(.+?)(?:\s*\|\s*WHO:|$)/);
    const whoMatch = line.match(/WHO:\s*(.+?)$/);

    if (detailMatch) {
      items.push({
        detail: detailMatch[1].trim(),
        who: whoMatch?.[1]?.trim() ?? "unknown",
      });
    }
  }

  return items;
}
