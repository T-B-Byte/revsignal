/**
 * Follow-Up Enforcer — Monitors all conversations for commitments.
 *
 * Responsibilities:
 *  - Scan for overdue action items and escalate (green → yellow → red)
 *  - Draft follow-up messages for specific overdue items
 *  - Track who owes what and flag dropped balls
 *
 * Rules:
 *  - Escalation: 1-3 days overdue → yellow, 3+ days → red
 *  - Every call uses RAG retrieval first
 *  - Outputs cite source conversation_id and date
 *  - Never invents commitments not in the data
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  retrieveOverdueActionItems,
  retrieveDealContext,
  type OverdueActionItemWithContext,
} from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import type { EscalationLevel } from "@/types/database";
import { TINA_VOICE_RULES } from "./voice";

// ── Constants ──────────────────────────────────────────────────────────

const LEVEL_ORDER: Record<EscalationLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

// ── System Prompts ─────────────────────────────────────────────────────

const FOLLOW_UP_ENFORCER_IDENTITY = `You are the Follow-Up Enforcer — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: make sure nothing falls through the cracks. You monitor all commitments, deadlines, and follow-ups. When something is overdue, you flag it and help draft the follow-up.

You serve a solo sales leader building a DaaS business at pharosIQ. Every missed follow-up is a missed deal.

Your personality:
- Urgent but not panicky. Overdue items need action, not drama.
- Precise — cite the specific commitment, who made it, when, and what channel.
- Helpful — when flagging an overdue item, suggest the next action.

Critical rules:
- NEVER invent commitments. Only flag action items that exist in the data.
- ALWAYS cite the source: conversation date, channel, and contact.
- If an item has no due_date, don't mark it overdue — flag it as undated.
- Each deal is its own context silo.`;

const ESCALATION_SCAN_PROMPT = `${FOLLOW_UP_ENFORCER_IDENTITY}

You've just scanned all overdue action items. Produce a concise escalation report.

For each overdue item, include:
- What the commitment was
- Who owns it (me or them)
- Which deal/company it belongs to
- How many days overdue
- Escalation level (YELLOW = 1-2 days overdue, RED = 3+ days)
- Suggested next action

Structure:
## Escalation Summary
[One-line overview: X items escalated, Y now RED, Z now YELLOW]

## RED Items (3+ days overdue)
[List each RED item with details]

## YELLOW Items (1-3 days overdue)
[List each YELLOW item with details]

## Suggested Actions
[Top 2-3 most urgent things to do right now]

Keep it tight. This is an action list, not a report.`;

const FOLLOW_UP_DRAFT_PROMPT = `${FOLLOW_UP_ENFORCER_IDENTITY}

Draft a follow-up message for the overdue action item described below.

${TINA_VOICE_RULES}

Additional rules for follow-up drafts:
- Reference the specific commitment or context that creates the follow-up need.
- Keep it short — 3-8 sentences max.
- Include a clear ask or next step.
- Never apologize for following up.
- Short paragraphs. 2-3 sentences max.

Output format:
SUBJECT: [subject line if email, or "N/A" if Teams message]

DRAFT:
[the message text]`;

// ── Result Types ───────────────────────────────────────────────────────

export interface EscalationResult {
  escalated: {
    itemId: string;
    description: string;
    from: EscalationLevel;
    to: EscalationLevel;
  }[];
  summary: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

export interface FollowUpDraftResult {
  subject: string | null;
  draft: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

// ── Escalation Scan ──────────────────────────────────────────────────

/**
 * Scan for overdue action items and escalate their levels.
 * Updates the database and generates a human-readable summary.
 */
export async function scanForOverdueItems(
  supabase: SupabaseClient,
  userId: string
): Promise<EscalationResult> {
  // Step 1: RAG retrieval
  let durationRetrieve: number;
  const [overdueItems, retrieveDur] = await timed(() =>
    retrieveOverdueActionItems(supabase, userId)
  );
  durationRetrieve = retrieveDur;

  if (overdueItems.length === 0) {
    const emptyResult: EscalationResult = {
      escalated: [],
      summary: "No overdue action items found.",
      generatedAt: new Date().toISOString(),
      sourcesCited: [],
      tokensUsed: 0,
    };

    await logAgentCall({
      supabase,
      userId,
      agentName: "follow-up-enforcer",
      action: "escalation-scan",
      inputContext: { overdueCount: 0 },
      output: emptyResult.summary,
      sourcesCited: [],
      durationMs: durationRetrieve,
    });

    return emptyResult;
  }

  // Step 2: Compute new escalation levels and update DB
  // Only escalate UP (green→yellow→red), never downgrade
  const escalated: EscalationResult["escalated"] = [];
  const now = new Date().toISOString();

  const updatePromises: PromiseLike<void>[] = [];

  for (const oi of overdueItems) {
    const newLevel: EscalationLevel =
      oi.daysPastDue >= 3 ? "red" : "yellow";
    const currentLevel = oi.item.escalation_level;

    // Only escalate up, never downgrade
    if (LEVEL_ORDER[newLevel] > LEVEL_ORDER[currentLevel]) {
      const itemId = oi.item.item_id;
      updatePromises.push(
        supabase
          .from("action_items")
          .update({
            escalation_level: newLevel,
            status: "overdue" as const,
            updated_at: now,
          })
          .eq("item_id", itemId)
          .eq("user_id", userId)
          .then(({ error }) => {
            if (error) {
              console.error(
                `[follow-up-enforcer] Failed to escalate ${itemId}:`,
                error.message
              );
            } else {
              escalated.push({
                itemId,
                description: oi.item.description,
                from: currentLevel,
                to: newLevel,
              });
            }
          })
      );
    } else if (oi.item.status !== "overdue") {
      // Mark as overdue even if escalation level didn't change
      updatePromises.push(
        supabase
          .from("action_items")
          .update({
            status: "overdue" as const,
            updated_at: now,
          })
          .eq("item_id", oi.item.item_id)
          .eq("user_id", userId)
          .then(({ error }) => {
            if (error) {
              console.error(
                `[follow-up-enforcer] Failed to mark overdue ${oi.item.item_id}:`,
                error.message
              );
            }
          })
      );
    }
  }

  await Promise.all(updatePromises);

  // Step 3: Build context doc and generate summary
  const contextDoc = buildEscalationContextDoc(overdueItems);
  const anthropic = getAnthropic();

  let summaryText: string;
  let tokensUsed: number;

  try {
    const [response, durationGenerate] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: ESCALATION_SCAN_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );

    summaryText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate escalation summary.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);

    durationRetrieve += durationGenerate;
  } catch (error) {
    console.error(
      "[follow-up-enforcer] Claude API error during escalation scan:",
      error instanceof Error ? error.message : error
    );
    summaryText = `Escalation scan completed: ${escalated.length} items escalated, but summary generation failed.`;
    tokensUsed = 0;
  }

  const sourcesCited = overdueItems
    .filter((oi) => oi.item.source_conversation_id)
    .map((oi) => oi.item.source_conversation_id!);

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "follow-up-enforcer",
    action: "escalation-scan",
    inputContext: {
      overdueCount: overdueItems.length,
      escalatedCount: escalated.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: summaryText,
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve,
  });

  return {
    escalated,
    summary: summaryText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Follow-Up Draft ──────────────────────────────────────────────────

/**
 * Generate a follow-up draft for a specific overdue action item.
 * Uses deal context and conversation history for personalization.
 */
export async function generateFollowUpDraft(
  supabase: SupabaseClient,
  userId: string,
  actionItemId: string
): Promise<FollowUpDraftResult | null> {
  // Step 1: Fetch the action item
  const { data: itemData, error: itemError } = await supabase
    .from("action_items")
    .select("*")
    .eq("item_id", actionItemId)
    .eq("user_id", userId)
    .single();

  if (itemError || !itemData) return null;

  // Step 2: RAG retrieval — get deal context if linked
  let dealContextDoc = "";
  const sourcesCited: string[] = [];

  if (itemData.deal_id) {
    const [dealContext] = await timed(() =>
      retrieveDealContext(supabase, userId, itemData.deal_id!)
    );

    if (dealContext) {
      dealContextDoc = buildDealContextForFollowUp(dealContext);
      sourcesCited.push(
        ...dealContext.conversations.map((c) => c.conversation_id)
      );
    }
  }

  if (itemData.source_conversation_id) {
    sourcesCited.push(itemData.source_conversation_id);
  }

  // Step 3: Build context and generate draft
  const itemDoc = buildActionItemDoc(itemData);
  const anthropic = getAnthropic();

  let responseText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        system: FOLLOW_UP_DRAFT_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${itemDoc}${dealContextDoc ? `\n\n${dealContextDoc}` : ""}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    responseText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[follow-up-enforcer] Claude API error during draft generation:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "follow-up-enforcer",
      action: "follow-up-draft",
      inputContext: { actionItemId, dealId: itemData.deal_id },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  // Parse subject and draft from response
  const { subject, draft } = parseFollowUpResponse(responseText);

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "follow-up-enforcer",
    action: "follow-up-draft",
    inputContext: {
      actionItemId,
      dealId: itemData.deal_id,
      owner: itemData.owner,
    },
    output: responseText,
    sourcesCited: [...new Set(sourcesCited)],
    tokensUsed,
    durationMs: durationGenerate,
  });

  return {
    subject,
    draft,
    generatedAt: new Date().toISOString(),
    sourcesCited: [...new Set(sourcesCited)],
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildEscalationContextDoc(
  items: OverdueActionItemWithContext[]
): string {
  const lines = items.map((oi) => {
    const level = oi.daysPastDue > 3 ? "RED" : "YELLOW";
    return [
      `- [${level}] "${oi.item.description}"`,
      `  Owner: ${oi.item.owner} | Days overdue: ${oi.daysPastDue}`,
      `  Due date: ${oi.item.due_date}`,
      oi.dealCompany ? `  Deal: ${oi.dealCompany}` : null,
      oi.contactName ? `  Contact: ${oi.contactName}` : null,
      oi.item.source_conversation_id
        ? `  Source: conversation ${oi.item.source_conversation_id}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  return `OVERDUE ACTION ITEMS (${items.length} total):\n\n${lines.join("\n\n")}`;
}

function buildActionItemDoc(
  item: Record<string, unknown>
): string {
  return [
    "ACTION ITEM:",
    `Description: ${item.description}`,
    `Owner: ${item.owner}`,
    `Due date: ${item.due_date || "not set"}`,
    `Status: ${item.status}`,
    `Escalation: ${item.escalation_level}`,
    item.source_conversation_id
      ? `Source conversation: ${item.source_conversation_id}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDealContextForFollowUp(
  ctx: { deal: { company: string; stage: string }; contacts: { name: string; role: string | null; email: string | null }[]; conversations: { date: string; channel: string; ai_summary: string | null; contact_name?: string }[]; brief: { brief_text: string } | null }
): string {
  const sections: string[] = [];

  sections.push(`DEAL CONTEXT:\nCompany: ${ctx.deal.company}\nStage: ${ctx.deal.stage}`);

  if (ctx.contacts.length > 0) {
    const contactLines = ctx.contacts.map((c) => {
      const parts = [c.name, c.role ? `(${c.role})` : null, c.email ? `<${c.email}>` : null];
      return `- ${parts.filter(Boolean).join(" ")}`;
    });
    sections.push(`CONTACTS:\n${contactLines.join("\n")}`);
  }

  if (ctx.brief) {
    sections.push(`DEAL BRIEF:\n${ctx.brief.brief_text}`);
  }

  // Only include last 5 conversations for follow-up context
  const recentConvos = ctx.conversations.slice(0, 5);
  if (recentConvos.length > 0) {
    const convoLines = recentConvos.map((c) => {
      const header = `[${c.date}] ${c.channel.toUpperCase()}${c.contact_name ? ` with ${c.contact_name}` : ""}`;
      return `${header}\n${c.ai_summary || "(no summary)"}`;
    });
    sections.push(`RECENT CONVERSATIONS:\n${convoLines.join("\n\n")}`);
  }

  return sections.join("\n\n");
}

function parseFollowUpResponse(text: string): {
  subject: string | null;
  draft: string;
} {
  const subjectMatch = text.match(/SUBJECT:\s*(.+?)(?:\n|$)/);
  const draftMatch = text.match(/DRAFT:\s*\n?([\s\S]+)/);

  const rawSubject = subjectMatch?.[1]?.trim() ?? null;
  const subject =
    rawSubject && rawSubject.toLowerCase() !== "n/a" ? rawSubject : null;

  const draft = draftMatch?.[1]?.trim() ?? text.trim();

  return { subject, draft };
}
