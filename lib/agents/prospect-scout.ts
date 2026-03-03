/**
 * Prospect Scout — Research and discovery agent.
 *
 * Responsibilities:
 *  - Research specific companies (generate research notes, suggest contacts)
 *  - Suggest new prospect targets based on pipeline gaps and ICP analysis
 *
 * Rules:
 *  - Every call uses RAG retrieval first
 *  - Never invents company details, contacts, or financials
 *  - Clearly labels what is known vs. what is inferred/suggested
 *  - Sources all factual claims
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  retrieveProspects,
  retrievePipelineContext,
} from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import type { Deal, Prospect } from "@/types/database";

// ── System Prompts ─────────────────────────────────────────────────────

const PROSPECT_SCOUT_IDENTITY = `You are the Prospect Scout — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: find and research companies that could buy pharosIQ's first-party intent data as a DaaS offering. You help fill the pipeline with qualified prospects.

Key context:
- Product: pharosIQ's proprietary first-party intent data (270M+ contacts, 650+ intent categories)
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM
- Target ACV: ~$100K average, range $50K-$500K depending on integration depth
- ICP categories: ABM Platforms, Sales Intelligence, Marketing Automation, Data Enrichment, CRM Platforms, CDPs, RevOps Platforms, Ad Tech / DSPs, Market Research / Analytics

Your personality:
- Analytical and thorough, but concise.
- When researching a company, focus on WHY they would buy intent data, not generic company descriptions.
- Identify the business case: what product gap does our data fill? Who is the buyer?

Critical rules:
- NEVER invent company financials, employee counts, or specific contact details.
- If you don't have information, say "Research needed" — don't guess.
- Clearly distinguish between facts from the database and your analytical inferences.
- Always suggest a specific next action.`;

const PROSPECT_RESEARCH_PROMPT = `${PROSPECT_SCOUT_IDENTITY}

Research the target company described below. Based on the data available, produce:

## Company Assessment
[Why would this company buy pharosIQ's intent data? What product or service gap does it fill?]

## ICP Fit
[Which ICP category fits best and why. Rate fit as Strong / Moderate / Weak.]

## Suggested Contacts
[Roles to target at this company. For each: title/role, why they'd care, and how to approach them.]

## Estimated ACV Range
[Based on likely integration depth and company size. Give a range. If not enough data, say "Insufficient data for estimate."]

## Next Action
[The single most important thing to do to advance this prospect.]

Be specific. Generic "they could use data" analysis is useless. Why THIS company, why NOW.`;

const PROSPECT_SUGGESTION_PROMPT = `${PROSPECT_SCOUT_IDENTITY}

Analyze the current pipeline and suggest where to focus prospecting efforts.

For each suggestion, provide:
- ICP category to focus on
- Why this category is a gap (based on pipeline data)
- Types of companies to target
- Estimated ACV range for this category
- Specific characteristics to look for

Also note:
- Which pipeline segments are healthy (don't need more prospects)
- Overall pipeline health assessment
- Revenue pacing context

Structure:
## Pipeline Gap Analysis
[Overview of which ICP categories are covered vs. missing]

## Prospecting Priorities
[Ranked list of 2-4 ICP categories or company types to focus on]

## Pipeline Health Note
[One paragraph on overall pipeline state and prospecting urgency]`;

// ── Result Types ───────────────────────────────────────────────────────

export interface ProspectResearchResult {
  company: string;
  researchNotes: string;
  icpCategory: string | null;
  nextAction: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

export interface ProspectSuggestionResult {
  suggestions: string;
  pipelineGaps: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

// ── Prospect Research ────────────────────────────────────────────────

/**
 * Research a specific company as a potential prospect.
 * Checks for duplicates, generates research notes, upserts to prospects table.
 */
export async function runProspectResearch(
  supabase: SupabaseClient,
  userId: string,
  company: string,
  icpCategory?: string
): Promise<ProspectResearchResult | null> {
  // Step 1: RAG retrieval — check for existing data (parallel)
  const [[existingProspects, durationRetrieve1], [pipelineContext, durationRetrieve2]] =
    await Promise.all([
      timed(() => retrieveProspects(supabase, userId, { limit: 50 })),
      timed(() => retrievePipelineContext(supabase, userId)),
    ]);

  // Check if company already exists as a deal
  const existingDeal = pipelineContext.activeDeals.find(
    (d) => d.company.toLowerCase() === company.toLowerCase()
  );

  // Check if company already exists as a prospect
  const existingProspect = existingProspects.find(
    (p) => p.company.toLowerCase() === company.toLowerCase()
  );

  // Step 2: Build context document
  const contextDoc = buildResearchContextDoc(
    company,
    icpCategory ?? null,
    existingDeal ?? null,
    existingProspect ?? null,
    pipelineContext.activeDeals
  );

  // Step 3: Generate research
  const anthropic = getAnthropic();

  let researchText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: PROSPECT_RESEARCH_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    researchText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate research.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[prospect-scout] Claude API error during prospect research:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "prospect-scout",
      action: "prospect-research",
      inputContext: { company, icpCategory: icpCategory ?? null },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  // Step 4: Upsert to prospects table
  const now = new Date().toISOString();

  if (existingProspect) {
    await supabase
      .from("prospects")
      .update({
        research_notes: researchText,
        icp_category: icpCategory ?? existingProspect.icp_category,
        last_researched_date: now,
        updated_at: now,
      })
      .eq("id", existingProspect.id)
      .eq("user_id", userId);
  } else {
    await supabase.from("prospects").insert({
      user_id: userId,
      company,
      icp_category: icpCategory ?? null,
      research_notes: researchText,
      last_researched_date: now,
      source: "prospect-scout",
      contacts: [],
    });
  }

  const totalRetrieveDuration = durationRetrieve1 + durationRetrieve2;

  // Step 5: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "prospect-scout",
    action: "prospect-research",
    inputContext: {
      company,
      icpCategory: icpCategory ?? null,
      existingDeal: existingDeal?.company ?? null,
      existingProspect: existingProspect?.company ?? null,
      retrieveDurationMs: totalRetrieveDuration,
    },
    output: researchText,
    sourcesCited: [],
    tokensUsed,
    durationMs: totalRetrieveDuration + durationGenerate,
  });

  // Extract next action from response (last section)
  const nextActionMatch = researchText.match(
    /## Next Action\s*\n([\s\S]*?)(?:\n##|$)/
  );
  const nextAction = nextActionMatch?.[1]?.trim() ?? "Review research and decide on outreach strategy.";

  return {
    company,
    researchNotes: researchText,
    icpCategory: icpCategory ?? null,
    nextAction,
    generatedAt: new Date().toISOString(),
    sourcesCited: [],
    tokensUsed,
  };
}

// ── Prospect Suggestions ─────────────────────────────────────────────

/**
 * Analyze pipeline gaps and suggest where to focus prospecting.
 */
export async function suggestProspects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProspectSuggestionResult> {
  // Step 1: RAG retrieval (parallel)
  const [[pipelineContext, durationRetrieve1], [existingProspects, durationRetrieve2]] =
    await Promise.all([
      timed(() => retrievePipelineContext(supabase, userId)),
      timed(() => retrieveProspects(supabase, userId, { limit: 50 })),
    ]);

  // Step 2: Build context
  const contextDoc = buildSuggestionContextDoc(
    pipelineContext.activeDeals,
    pipelineContext.closedWonDeals,
    pipelineContext.closedLostDeals,
    pipelineContext.totalClosedRevenue,
    existingProspects
  );

  // Step 3: Generate suggestions
  const anthropic = getAnthropic();

  let suggestionsText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: PROSPECT_SUGGESTION_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    suggestionsText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate suggestions.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[prospect-scout] Claude API error during prospect suggestions:",
      error instanceof Error ? error.message : error
    );
    suggestionsText = "Suggestion generation failed due to an API error.";
    tokensUsed = 0;
  }

  const totalRetrieveDuration = durationRetrieve1 + durationRetrieve2;

  // Extract pipeline gaps section
  const gapsMatch = suggestionsText.match(
    /## Pipeline Gap Analysis\s*\n([\s\S]*?)(?:\n##|$)/
  );
  const pipelineGaps = gapsMatch?.[1]?.trim() ?? "";

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "prospect-scout",
    action: "prospect-suggestions",
    inputContext: {
      activeDeals: pipelineContext.activeDeals.length,
      existingProspects: existingProspects.length,
      closedRevenue: pipelineContext.totalClosedRevenue,
      retrieveDurationMs: totalRetrieveDuration,
    },
    output: suggestionsText,
    sourcesCited: [],
    tokensUsed,
    durationMs: totalRetrieveDuration + durationGenerate,
  });

  return {
    suggestions: suggestionsText,
    pipelineGaps,
    generatedAt: new Date().toISOString(),
    sourcesCited: [],
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildResearchContextDoc(
  company: string,
  icpCategory: string | null,
  existingDeal: Deal | null,
  existingProspect: Prospect | null,
  activeDeals: Deal[]
): string {
  const sections: string[] = [];

  sections.push(`TARGET COMPANY: ${company}`);

  if (icpCategory) {
    sections.push(`SUGGESTED ICP CATEGORY: ${icpCategory}`);
  }

  if (existingDeal) {
    sections.push(
      `NOTE: This company already has an active deal (stage: ${existingDeal.stage}, ACV: ${existingDeal.acv ? "$" + existingDeal.acv.toLocaleString() : "TBD"}). Research should complement the existing deal context.`
    );
  }

  if (existingProspect) {
    sections.push(
      `EXISTING PROSPECT DATA:\n` +
        `ICP Category: ${existingProspect.icp_category || "unset"}\n` +
        `Estimated ACV: ${existingProspect.estimated_acv ? "$" + existingProspect.estimated_acv.toLocaleString() : "not estimated"}\n` +
        `Last researched: ${existingProspect.last_researched_date || "never"}\n` +
        (existingProspect.research_notes
          ? `Previous research:\n${existingProspect.research_notes}`
          : "")
    );
  }

  // Pipeline context for comparison
  if (activeDeals.length > 0) {
    const dealSummary = activeDeals.map(
      (d) => `- ${d.company} (${d.stage}, ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"})`
    );
    sections.push(`CURRENT PIPELINE (${activeDeals.length} active deals):\n${dealSummary.join("\n")}`);
  }

  return sections.join("\n\n");
}

function buildSuggestionContextDoc(
  activeDeals: Deal[],
  closedWonDeals: Deal[],
  closedLostDeals: Deal[],
  totalClosedRevenue: number,
  existingProspects: Prospect[]
): string {
  const sections: string[] = [];

  // Revenue pacing
  const REVENUE_TARGET = 1_000_000;
  const pacing = totalClosedRevenue / REVENUE_TARGET;
  sections.push(
    `REVENUE STATUS:\n` +
      `Closed: $${totalClosedRevenue.toLocaleString()} of $${REVENUE_TARGET.toLocaleString()} (${Math.round(pacing * 100)}%)\n` +
      `Active deals: ${activeDeals.length}`
  );

  // Active deals by ICP category (if tagged on contacts)
  if (activeDeals.length > 0) {
    const dealLines = activeDeals.map(
      (d) =>
        `- ${d.company} | ${d.stage} | ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"}`
    );
    sections.push(`ACTIVE DEALS:\n${dealLines.join("\n")}`);
  } else {
    sections.push("ACTIVE DEALS: None — pipeline needs filling.");
  }

  // Closed won (what worked)
  if (closedWonDeals.length > 0) {
    const wonLines = closedWonDeals.map(
      (d) => `- ${d.company} ($${(d.acv || 0).toLocaleString()})`
    );
    sections.push(`CLOSED WON (what worked):\n${wonLines.join("\n")}`);
  }

  // Closed lost (what didn't)
  if (closedLostDeals.length > 0) {
    const lostLines = closedLostDeals.map(
      (d) =>
        `- ${d.company}${d.lost_reason ? ` — ${d.lost_reason}` : ""}`
    );
    sections.push(`RECENTLY LOST (avoid similar profiles):\n${lostLines.join("\n")}`);
  }

  // Existing prospects
  if (existingProspects.length > 0) {
    const prospectLines = existingProspects.map(
      (p) =>
        `- ${p.company} (${p.icp_category || "uncategorized"})${p.last_researched_date ? ` — researched ${p.last_researched_date}` : ""}`
    );
    sections.push(
      `EXISTING PROSPECTS (${existingProspects.length}):\n${prospectLines.join("\n")}`
    );
  }

  return sections.join("\n\n");
}
