/**
 * Competitive Watcher — Monitors competitors and generates battle cards.
 *
 * Responsibilities:
 *  - Process new competitive intelligence and generate strategic implications
 *  - Generate comprehensive battle cards from accumulated intel
 *
 * Rules:
 *  - All analysis grounded in stored competitive_intel records
 *  - Never fabricates competitor pricing, features, or strategies
 *  - Distinguishes fact (from data) vs. inference (analyst assessment)
 *  - Sources and dates all data points
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { retrieveCompetitorIntel } from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import type { CompetitiveIntel } from "@/types/database";
import { TINA_VOICE_RULES } from "./voice";

// ── System Prompts ─────────────────────────────────────────────────────

const COMPETITIVE_WATCHER_IDENTITY = `You are the Competitive Watcher — a sub-agent of RevSignal, a personal DaaS sales command center.

Your job: track competitors in the B2B intent data space and provide actionable competitive intelligence. You help the user understand competitive positioning and win against alternatives.

Key competitive landscape:
- pharosIQ sells first-party, contact-level, permission-based intent data
- Main differentiators: first-party (not co-op), contact-level (not account-level), 360M+ contacts, 650+ intent categories
- Competitors include: Bombora (co-op model), TechTarget, ZoomInfo, Lusha, Clearbit, 6sense, G2, and others

Your personality:
- Analytical. Every competitive insight should answer "so what?" for the sales process.
- Balanced — don't trash competitors. Identify genuine strengths AND weaknesses.
- Action-oriented — every analysis ends with "how to use this."

Critical rules:
- NEVER invent competitor pricing, revenue, or customer data not in the intel records.
- Clearly label sources and dates for all data points.
- Distinguish between CONFIRMED facts and INFERRED assessments.
- When data is stale (30+ days), flag it as potentially outdated.

${TINA_VOICE_RULES}

Note: Voice rules apply especially to Talking Points and Win Themes — Tina uses these verbatim in sales conversations.`;

const COMPETITIVE_UPDATE_PROMPT = `${COMPETITIVE_WATCHER_IDENTITY}

A new piece of competitive intelligence has been captured. Analyze it in context of what we already know about this competitor.

Produce:

## What's New
[Summarize the new intel in one paragraph]

## Strategic Implications
[How does this affect our competitive positioning? Does it create an opportunity or a threat?]

## Sales Impact
[How should this change how we sell against this competitor? Any deals at risk?]

## Talking Points
[2-3 ready-to-use talking points for sales conversations where this competitor comes up]

Be specific. Generic "stay competitive" advice is useless.`;

const BATTLE_CARD_PROMPT = `${COMPETITIVE_WATCHER_IDENTITY}

Generate a comprehensive battle card for the competitor below. Base it ONLY on the intel records provided — never invent data.

Structure:

## Overview
[What they do, their positioning, target market, size/funding if known. Sourced from intel records.]

## Pricing & Packaging
[Their known pricing model, tiers, and how it compares to pharosIQ. If no pricing intel exists, say so. Never guess.]

## Their Strengths
[What they genuinely do well. Be honest — knowing their strengths helps us compete.]

## Their Weaknesses
[Where they fall short. Ground every point in data.]

## Our Differentiators
[Why pharosIQ data wins against this competitor. Focus on: first-party (not co-op), contact-level (not account-level), permission-based, 360M+ contacts, 650+ intent categories.]

## Landmines to Set
[3-5 questions to ask the prospect early in the process that expose this competitor's weaknesses. Frame as discovery questions, not attacks. e.g., "Have you validated whether their intent signals resolve to actual contacts, or just account-level flags?"]

## Common Objections & Responses
[When a prospect brings up this competitor, what do they say and how to respond? Format as "They say: X" / "You say: Y" pairs.]

## Talk Track
[2-3 sentence positioning statement for when this competitor comes up in conversation. This is the quick, confident framing, not the detailed rebuttal.]

## Win Themes
[The 2-3 key messages that consistently win against this competitor]

## Win/Loss Patterns
[When do we tend to win against this competitor (deal size, use case, buyer persona)? When do we tend to lose? When should we not compete? If no win/loss data exists, say "No win/loss data captured yet" and suggest what to track.]

## Proof Points
[Customers who switched from this competitor, relevant case studies, quotes, or metrics. If none exist, say "No proof points captured yet" and suggest what would be most valuable to collect.]

## Data Freshness
[List the dates of the intel records used. Flag anything older than 30 days as "may be outdated."]

Cite sources and dates for every factual claim. Mark inferences as "Assessment:".`;

// ── Result Types ───────────────────────────────────────────────────────

export interface CompetitiveAnalysisResult {
  competitor: string;
  analysis: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

export interface BattleCardResult {
  competitor: string;
  battleCard: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

// ── Competitor Update Analysis ───────────────────────────────────────

/**
 * Process a new piece of competitive intelligence and generate strategic analysis.
 * Writes the data point to competitive_intel table, then analyzes in context.
 */
export async function analyzeCompetitorUpdate(
  supabase: SupabaseClient,
  userId: string,
  competitor: string,
  dataPoint: string,
  source: string
): Promise<CompetitiveAnalysisResult | null> {
  // Step 1: Write the new data point to competitive_intel
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("competitive_intel")
    .insert({
      user_id: userId,
      competitor,
      category: "general",
      data_point: dataPoint,
      source,
      captured_date: now,
    });

  if (insertError) {
    console.error(
      "[agents/competitive-watcher] Failed to insert intel:",
      insertError.message
    );
  }

  // Step 2: RAG retrieval — get all existing intel for this competitor
  const [existingIntel, durationRetrieve] = await timed(() =>
    retrieveCompetitorIntel(supabase, userId, competitor)
  );

  // Step 3: Build context and generate analysis
  const contextDoc = buildUpdateContextDoc(
    competitor,
    dataPoint,
    source,
    existingIntel
  );

  const anthropic = getAnthropic();

  let analysisText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: COMPETITIVE_UPDATE_PROMPT,
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
        : "Failed to generate competitive analysis.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[competitive-watcher] Claude API error during competitor update:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "competitive-watcher",
      action: "competitor-update",
      inputContext: { competitor, source },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  const sourcesCited = existingIntel.map((i) => i.id);

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "competitive-watcher",
    action: "competitor-update",
    inputContext: {
      competitor,
      dataPoint: dataPoint.substring(0, 200),
      source,
      existingIntelCount: existingIntel.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: analysisText,
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    competitor,
    analysis: analysisText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Battle Card Generation ───────────────────────────────────────────

/**
 * Generate a comprehensive battle card from all stored intel for a competitor.
 */
export async function generateBattleCard(
  supabase: SupabaseClient,
  userId: string,
  competitor: string
): Promise<BattleCardResult | null> {
  // Step 1: RAG retrieval
  const [existingIntel, durationRetrieve] = await timed(() =>
    retrieveCompetitorIntel(supabase, userId, competitor)
  );

  if (existingIntel.length === 0) return null;

  // Step 2: Build context and generate battle card
  const contextDoc = buildBattleCardContextDoc(competitor, existingIntel);

  const anthropic = getAnthropic();

  let battleCardText: string;
  let tokensUsed: number;
  let durationGenerate = 0;

  try {
    const [response, dur] = await timed(() =>
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 3000,
        system: BATTLE_CARD_PROMPT,
        messages: [
          {
            role: "user",
            content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
          },
        ],
      })
    );
    durationGenerate = dur;

    battleCardText =
      response.content.length > 0 && response.content[0].type === "text"
        ? response.content[0].text
        : "Failed to generate battle card.";

    tokensUsed =
      (response.usage?.input_tokens ?? 0) +
      (response.usage?.output_tokens ?? 0);
  } catch (error) {
    console.error(
      "[competitive-watcher] Claude API error during battle card generation:",
      error instanceof Error ? error.message : error
    );
    await logAgentCall({
      supabase,
      userId,
      agentName: "competitive-watcher",
      action: "battle-card",
      inputContext: { competitor, intelRecords: existingIntel.length },
      output: `Claude API error: ${error instanceof Error ? error.message : "Unknown"}`,
      sourcesCited: [],
    });
    return null;
  }

  const sourcesCited = existingIntel.map((i) => i.id);

  // Step 3: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "competitive-watcher",
    action: "battle-card",
    inputContext: {
      competitor,
      intelRecords: existingIntel.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: battleCardText,
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    competitor,
    battleCard: battleCardText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildUpdateContextDoc(
  competitor: string,
  newDataPoint: string,
  source: string,
  existingIntel: CompetitiveIntel[]
): string {
  const sections: string[] = [];

  sections.push(
    `COMPETITOR: ${competitor}\n\n` +
      `NEW INTEL:\n"${newDataPoint}"\nSource: ${source}\nCaptured: ${new Date().toISOString()}`
  );

  if (existingIntel.length > 0) {
    const intelLines = existingIntel
      .slice(0, 20)
      .map(
        (i) =>
          `- [${i.captured_date}] ${i.category}: ${i.data_point}${i.source ? ` (source: ${i.source})` : ""}`
      );
    sections.push(
      `EXISTING INTEL (${existingIntel.length} records):\n${intelLines.join("\n")}`
    );
  } else {
    sections.push(
      "EXISTING INTEL: This is the first intel record for this competitor."
    );
  }

  return sections.join("\n\n");
}

function buildBattleCardContextDoc(
  competitor: string,
  intel: CompetitiveIntel[]
): string {
  const sections: string[] = [];

  sections.push(`COMPETITOR: ${competitor}`);

  // Group intel by category
  const byCategory = new Map<string, CompetitiveIntel[]>();
  for (const item of intel) {
    const cat = item.category || "general";
    const existing = byCategory.get(cat) || [];
    existing.push(item);
    byCategory.set(cat, existing);
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  for (const [category, items] of byCategory) {
    const lines = items.map((i) => {
      const staleFlag =
        i.captured_date < thirtyDaysAgo ? " [POTENTIALLY OUTDATED]" : "";
      return `- [${i.captured_date}] ${i.data_point}${i.source ? ` (source: ${i.source})` : ""}${staleFlag}`;
    });
    sections.push(
      `INTEL — ${category.toUpperCase()} (${items.length} records):\n${lines.join("\n")}`
    );
  }

  return sections.join("\n\n");
}
