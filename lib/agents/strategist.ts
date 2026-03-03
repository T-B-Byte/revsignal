/**
 * The Strategist — RevSignal's Master Agent.
 *
 * Not a passive tool. An always-on strategist that proactively drives revenue.
 *
 * Responsibilities:
 *  - Daily morning briefings (top 3 priorities, prospect suggestions, pipeline health)
 *  - Deal strategy for every active opportunity
 *  - Pattern recognition across all ingested data
 *  - Revenue forecasting and pacing alerts
 *  - GTM Playbook coaching (flags neglected items, weaves reminders into briefings)
 *
 * Rules:
 *  - Every call uses RAG retrieval first — never generates from context window alone
 *  - Outputs cite sources (conversation_id, date, channel)
 *  - Never invents data — if no source, says "I don't have a record of that"
 *  - Each deal has its own context silo
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import {
  retrieveBriefingContext,
  retrieveDealContext,
  type BriefingContext,
  type DealContext,
} from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import {
  REVENUE_TARGET,
  type Deal,
  type PlaybookItem,
} from "@/types/database";

// ── System Prompts ─────────────────────────────────────────────────────

const STRATEGIST_IDENTITY = `You are The Strategist — the AI brain of RevSignal, a personal DaaS sales command center.

You serve a solo sales leader building a B2B data licensing business from scratch at pharosIQ. The goal: $1M first-year revenue from data-as-a-service (DaaS) partnerships.

Revenue math:
- Target: $1,000,000 in year-one DaaS revenue
- Model: ~10 customers at ~$100K ACV average
- Product: pharosIQ's proprietary first-party intent data (270M+ contacts, 650+ intent categories)
- Delivery: API, flat file, cloud delivery, platform integration, or embedded/OEM

Your personality:
- Direct and confident. No hedging, no filler.
- You speak like a smart peer — not a subordinate, not a consultant.
- When something is at risk, say so plainly. Don't soften bad news.
- When you don't have data, say "I don't have a record of that." Never guess.
- Cite your sources: reference conversation dates, channels, and contacts when stating facts.

Critical rules:
- NEVER invent pricing, dates, commitments, metrics, or contact details.
- NEVER confuse contacts or details between deals. Each deal is its own silo.
- ALWAYS cite the source when stating a fact (e.g., "Per the Feb 12 Teams call with Sarah...").
- If working from incomplete data, flag it: "Based on partial data..."
- If data conflicts exist, flag them for the user to resolve.`;

const MORNING_BRIEFING_PROMPT = `${STRATEGIST_IDENTITY}

Generate a morning briefing. Structure it exactly like this:

## Top 3 Priorities Today
[The 3 most important things to do today, based on pipeline state, overdue items, and deal momentum. Be specific — "Follow up with Sarah at Demandbase on the pricing proposal from Feb 10" not "Check on deals."]

## Pipeline Health
[Quick snapshot: X active deals, $Y weighted pipeline, $Z closed. Pacing to target. Flag any deals that have gone dark (no activity in 7+ days).]

## Overdue & Upcoming
[Action items that are overdue or due this week. Escalation levels. Who owes what.]

## Deal Momentum
[For each active deal with recent activity: 1-2 sentence status. For stale deals: flag them.]

## Playbook Check
[Any neglected GTM playbook items (30+ days untouched). Quick nudge — not a lecture.]

## Prospect Suggestions
[If pipeline needs filling, suggest 1-2 prospect categories or actions. Skip if pipeline is healthy.]

Keep the whole briefing concise — this is a morning scan, not a novel. Use bullet points. Be direct.`;

const DEAL_STRATEGY_PROMPT = `${STRATEGIST_IDENTITY}

Provide deal-specific strategy advice. Based on the deal context provided, cover:

1. **Current Assessment** — Where does this deal stand? What's the momentum?
2. **Risks** — What could derail this? Missing contacts, stale conversations, competitor threat?
3. **Next Best Action** — The single most important thing to do next, with specifics.
4. **Talking Points** — 2-3 key points for the next conversation.

Be specific to THIS deal. Reference actual conversations, dates, and contacts from the data.
If data is thin, say so and suggest what information to gather.`;

// ── Morning Briefing ───────────────────────────────────────────────────

export interface BriefingResult {
  briefing: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Generate a morning briefing using full pipeline context.
 * This is The Strategist's primary daily output.
 */
export async function generateMorningBriefing(
  supabase: SupabaseClient,
  userId: string
): Promise<BriefingResult> {
  // Step 1: RAG retrieval — get everything we need
  const [context, durationRetrieve] = await timed(() =>
    retrieveBriefingContext(supabase, userId)
  );

  // Step 2: Build the context document for Claude
  const contextDoc = buildBriefingContextDoc(context);

  // Step 3: Generate briefing
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: MORNING_BRIEFING_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const briefingText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "Failed to generate briefing.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  // Collect source citations (conversation IDs referenced in context)
  const sourcesCited = collectSourcesCited(context);

  // Step 4: Log the agent call
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "morning-briefing",
    inputContext: {
      activeDeals: context.pipeline.activeDeals.length,
      overdueItems: context.pipeline.overdueItems.length,
      conversationsProvided: context.pipeline.recentConversations.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: briefingText,
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    briefing: briefingText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Deal Strategy ──────────────────────────────────────────────────────

export interface DealStrategyResult {
  strategy: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Generate strategy advice for a specific deal.
 */
export async function generateDealStrategy(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<DealStrategyResult | null> {
  // Step 1: RAG retrieval — deal context silo
  const [context, durationRetrieve] = await timed(() =>
    retrieveDealContext(supabase, userId, dealId)
  );

  if (!context) return null;

  // Step 2: Build context document
  const contextDoc = buildDealContextDoc(context);

  // Step 3: Generate strategy
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: DEAL_STRATEGY_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const strategyText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "Failed to generate deal strategy.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  const sourcesCited = context.conversations.map(
    (c) => c.conversation_id
  );

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "deal-strategy",
    inputContext: {
      dealId,
      company: context.deal.company,
      stage: context.deal.stage,
      conversationsProvided: context.conversations.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: strategyText,
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    strategy: strategyText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Context Document Builders ──────────────────────────────────────────

function buildBriefingContextDoc(ctx: BriefingContext): string {
  const { pipeline, dealBriefs, competitiveIntel, neglectedPlaybookItems } =
    ctx;

  const sections: string[] = [];

  // Revenue pacing
  const pacing = pipeline.totalClosedRevenue / REVENUE_TARGET;
  sections.push(
    `REVENUE STATUS:\n` +
      `Closed revenue: $${pipeline.totalClosedRevenue.toLocaleString()} of $${REVENUE_TARGET.toLocaleString()} target (${Math.round(pacing * 100)}%)\n` +
      `Active deals: ${pipeline.activeDeals.length}\n` +
      `Weighted pipeline: $${calculateWeightedPipeline(pipeline.activeDeals).toLocaleString()}`
  );

  // Active deals summary
  if (pipeline.activeDeals.length > 0) {
    const dealLines = pipeline.activeDeals.map((d) => {
      const daysSinceActivity = daysBetween(
        d.last_activity_date,
        new Date().toISOString()
      );
      const staleFlag = daysSinceActivity >= 7 ? " ⚠️ STALE" : "";
      return `- ${d.company} | ${d.stage} | ACV: ${d.acv ? "$" + d.acv.toLocaleString() : "TBD"} | Last activity: ${daysSinceActivity}d ago${staleFlag}`;
    });
    sections.push(`ACTIVE DEALS:\n${dealLines.join("\n")}`);
  }

  // Deal briefs (the rich context)
  if (dealBriefs.length > 0) {
    const briefLines = dealBriefs.map(
      (db) =>
        `--- ${db.deal.company} (${db.deal.stage}) ---\n${db.brief.brief_text}`
    );
    sections.push(`DEAL BRIEFS:\n${briefLines.join("\n\n")}`);
  }

  // Stale deals
  if (pipeline.staleDeals.length > 0) {
    const staleLines = pipeline.staleDeals.map(
      (d) =>
        `- ${d.company} (${d.stage}) — last activity: ${d.last_activity_date}`
    );
    sections.push(`STALE DEALS (7+ days no activity):\n${staleLines.join("\n")}`);
  }

  // Overdue action items
  if (pipeline.overdueItems.length > 0) {
    const overdueLines = pipeline.overdueItems.map(
      (a) =>
        `- [${a.escalation_level.toUpperCase()}] ${a.description} (due: ${a.due_date}, owner: ${a.owner})`
    );
    sections.push(`OVERDUE ACTION ITEMS:\n${overdueLines.join("\n")}`);
  }

  // Upcoming action items
  if (pipeline.upcomingItems.length > 0) {
    const upcomingLines = pipeline.upcomingItems.map(
      (a) => `- ${a.description} (due: ${a.due_date}, owner: ${a.owner})`
    );
    sections.push(`UPCOMING THIS WEEK:\n${upcomingLines.join("\n")}`);
  }

  // Recent conversations
  if (pipeline.recentConversations.length > 0) {
    const convoLines = pipeline.recentConversations.map((c) => {
      const parts = [
        `[${c.date}] ${c.channel.toUpperCase()}`,
        c.subject ? `"${c.subject}"` : null,
        c.ai_summary ? `— ${c.ai_summary}` : null,
      ];
      return `- ${parts.filter(Boolean).join(" ")}`;
    });
    sections.push(`RECENT ACTIVITY:\n${convoLines.join("\n")}`);
  }

  // Closed deals (for pattern context)
  if (pipeline.closedWonDeals.length > 0) {
    sections.push(
      `CLOSED WON: ${pipeline.closedWonDeals.map((d) => `${d.company} ($${(d.acv || 0).toLocaleString()})`).join(", ")}`
    );
  }

  if (pipeline.closedLostDeals.length > 0) {
    sections.push(
      `RECENTLY LOST: ${pipeline.closedLostDeals.map((d) => `${d.company}${d.lost_reason ? ` — ${d.lost_reason}` : ""}`).join(", ")}`
    );
  }

  // Competitive intel
  if (competitiveIntel.length > 0) {
    const intelLines = competitiveIntel
      .slice(0, 10)
      .map(
        (ci) =>
          `- [${ci.captured_date}] ${ci.competitor}: ${ci.data_point}`
      );
    sections.push(`RECENT COMPETITIVE INTEL:\n${intelLines.join("\n")}`);
  }

  // Neglected playbook items
  if (neglectedPlaybookItems.length > 0) {
    const playbookLines = neglectedPlaybookItems.map(
      (p) =>
        `- [${p.workstream}] ${p.description} (status: ${p.status}, last touched: ${p.last_touched || "never"})`
    );
    sections.push(
      `NEGLECTED PLAYBOOK ITEMS (30+ days):\n${playbookLines.join("\n")}`
    );
  }

  // Playbook progress summary
  const playbookStats = computePlaybookStats(pipeline.playbook);
  if (playbookStats.total > 0) {
    sections.push(
      `PLAYBOOK PROGRESS: ${playbookStats.completed}/${playbookStats.total} items completed (${Math.round((playbookStats.completed / playbookStats.total) * 100)}%)`
    );
  }

  return sections.join("\n\n");
}

function buildDealContextDoc(ctx: DealContext): string {
  const { deal, contacts, conversations, actionItems, brief } = ctx;

  const sections: string[] = [];

  // Deal header
  const dealHeader = [
    `Company: ${deal.company}`,
    `Stage: ${deal.stage}`,
    `ACV: ${deal.acv ? "$" + deal.acv.toLocaleString() : "Not set"}`,
    deal.product_tier ? `Product tier: ${deal.product_tier}` : null,
    deal.deployment_method
      ? `Deployment: ${deal.deployment_method}`
      : null,
    deal.win_probability
      ? `Win probability: ${deal.win_probability}%`
      : null,
    deal.close_date ? `Expected close: ${deal.close_date}` : null,
    deal.notes ? `Notes: ${deal.notes}` : null,
    `Created: ${deal.created_date}`,
    `Last activity: ${deal.last_activity_date}`,
  ]
    .filter(Boolean)
    .join("\n");
  sections.push(`DEAL:\n${dealHeader}`);

  // Contacts
  if (contacts.length > 0) {
    const contactLines = contacts.map((c) => {
      const parts = [
        c.name,
        c.role ? `(${c.role})` : null,
        c.email ? `<${c.email}>` : null,
      ];
      return `- ${parts.filter(Boolean).join(" ")}`;
    });
    sections.push(`CONTACTS:\n${contactLines.join("\n")}`);
  }

  // Existing deal brief
  if (brief) {
    sections.push(
      `CURRENT DEAL BRIEF (updated ${brief.last_updated}):\n${brief.brief_text}`
    );
  }

  // Conversation history (summaries only)
  if (conversations.length > 0) {
    const convoLines = conversations.map((c) => {
      const header = `[${c.date}] ${c.channel.toUpperCase()}${c.contact_name ? ` with ${c.contact_name}` : ""}${c.subject ? ` — "${c.subject}"` : ""}`;
      const summary = c.ai_summary || "(no summary)";
      return `${header}\n${summary}`;
    });
    sections.push(
      `CONVERSATION HISTORY (${conversations.length} conversations, newest first):\n${convoLines.join("\n\n")}`
    );
  } else {
    sections.push("CONVERSATION HISTORY: No conversations logged yet.");
  }

  // Action items
  const pendingActions = actionItems.filter(
    (a) => a.status === "pending" || a.status === "overdue"
  );
  if (pendingActions.length > 0) {
    const actionLines = pendingActions.map(
      (a) =>
        `- [${a.escalation_level.toUpperCase()}] ${a.description} (owner: ${a.owner}, due: ${a.due_date || "no date"}, status: ${a.status})`
    );
    sections.push(`OPEN ACTION ITEMS:\n${actionLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

// ── Helpers ────────────────────────────────────────────────────────────

function calculateWeightedPipeline(deals: Deal[]): number {
  return deals.reduce(
    (sum, d) => sum + (d.acv || 0) * ((d.win_probability ?? 0) / 100),
    0
  );
}

function daysBetween(dateStr: string, nowStr: string): number {
  const d1 = new Date(dateStr).getTime();
  const d2 = new Date(nowStr).getTime();
  return Math.floor((d2 - d1) / 86400000);
}

function computePlaybookStats(items: PlaybookItem[]) {
  const total = items.filter((p) => p.status !== "deprecated").length;
  const completed = items.filter((p) => p.status === "completed").length;
  return { total, completed };
}

function collectSourcesCited(ctx: BriefingContext): string[] {
  const sources = new Set<string>();
  for (const c of ctx.pipeline.recentConversations) {
    sources.add(c.conversation_id);
  }
  for (const db of ctx.dealBriefs) {
    for (const id of db.brief.source_conversations ?? []) {
      sources.add(id);
    }
  }
  return Array.from(sources);
}

// ── Weekly Memo ──────────────────────────────────────────────────────

const WEEKLY_MEMO_PROMPT = `${STRATEGIST_IDENTITY}

Generate a Friday strategy memo — the weekly review. Structure it like this:

## Week in Review
[What happened this week: deals that advanced, conversations that moved things forward, new prospects discovered. Be specific.]

## Pipeline Movement
[Which deals changed stage? Any closed? Any lost? What's the net pipeline change?]

## Wins & Lessons
[What worked well. What didn't. Patterns you're seeing across deals.]

## Next Week Priorities
[Top 3-5 priorities for next week, ranked by revenue impact.]

## Strategic Observations
[Anything interesting you're seeing across the whole pipeline: pricing patterns, objection themes, competitor sightings, ICP patterns. Only if you have data to back it up.]

## Revenue Pacing
[How are we tracking to the $1M target? At current velocity, will we hit it? What needs to change?]

This is a strategic document, not a briefing. Go deeper. But stay factual — cite sources for every claim.`;

export interface WeeklyMemoResult {
  memo: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Generate a weekly strategy memo (Friday afternoon).
 * Uses the full pipeline context with extra depth.
 */
export async function generateWeeklyMemo(
  supabase: SupabaseClient,
  userId: string
): Promise<WeeklyMemoResult> {
  // Step 1: RAG retrieval
  const [ctx, durationRetrieve] = await timed(() =>
    retrieveBriefingContext(supabase, userId)
  );

  const contextDoc = buildBriefingContextDoc(ctx);

  // Step 2: Generate memo
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      system: WEEKLY_MEMO_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const memoText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "Failed to generate weekly memo.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  const sourcesCited = collectSourcesCited(ctx);

  // Step 3: Store as weekly digest
  const weekStart = getWeekStart();
  await supabase.from("weekly_digests").upsert(
    {
      user_id: userId,
      week_start: weekStart,
      digest_text: memoText,
      deals_advanced: ctx.pipeline.activeDeals
        .filter((d) => daysBetween(d.last_activity_date, new Date().toISOString()) <= 7)
        .map((d) => d.deal_id),
      deals_stalled: ctx.pipeline.staleDeals.map((d) => d.deal_id),
      revenue_closed: ctx.pipeline.totalClosedRevenue,
    },
    { onConflict: "user_id,week_start" }
  );

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "weekly-memo",
    inputContext: {
      activeDeals: ctx.pipeline.activeDeals.length,
      closedWon: ctx.pipeline.closedWonDeals.length,
      closedLost: ctx.pipeline.closedLostDeals.length,
      overdueItems: ctx.pipeline.overdueItems.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: memoText.slice(0, 500),
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    memo: memoText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── CEO Weekly Update ────────────────────────────────────────────────

const CEO_WEEKLY_PROMPT = `${STRATEGIST_IDENTITY}

Generate a CEO-facing weekly DaaS revenue update. This goes to the pharosIQ CEO.

CRITICAL RULES FOR THIS EMAIL:
- NO specific company names. Say "a major martech platform" or "an enterprise data buyer" — never name the company.
- NO pricing details or quote amounts.
- NO win probabilities or internal deal strategy.
- NO competitive intel.
- NO problems without solutions. If something is stuck, don't mention it.
- NO defensive framing. No "just" or "only" or apologetic language.

Frame everything as ADDITIVE to pharosIQ. DaaS revenue diversifies the revenue mix and lifts the whole company.

Output format (JSON):
{
  "highlights": ["2-4 short bullet points about this week's progress — deals advancing, new conversations, pipeline growth. Keep each under 15 words."],
  "nextWeek": "1-2 sentences about what's ahead. Meetings booked, proposals going out, new verticals opening up."
}

Only output valid JSON. No markdown, no commentary.`;

export interface CeoWeeklyData {
  closedRevenue: number;
  revenueTarget: number;
  pipelineAcv: number;
  dealsAdvanced: number;
  activeDeals: number;
  meetingsThisWeek: number;
  highlights: string[];
  nextWeek: string;
  generatedAt: string;
  tokensUsed: number;
}

/**
 * Generate the CEO weekly update data.
 * The Strategist produces CEO-safe highlights (no company names, no sensitive details).
 * Combine with buildCeoWeeklyEmail() for the final HTML.
 */
export async function generateCeoWeekly(
  supabase: SupabaseClient,
  userId: string
): Promise<CeoWeeklyData> {
  // Step 1: RAG retrieval
  const [ctx, durationRetrieve] = await timed(() =>
    retrieveBriefingContext(supabase, userId)
  );

  const contextDoc = buildBriefingContextDoc(ctx);

  // Calculate metrics
  const pipelineAcv = ctx.pipeline.activeDeals.reduce(
    (sum, d) => sum + (d.acv || 0),
    0
  );

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  // Deals that advanced this week (had activity in last 7 days)
  const dealsAdvanced = ctx.pipeline.activeDeals.filter(
    (d) => d.last_activity_date >= weekAgo
  ).length;

  // Meetings this week (conversations in last 7 days)
  const meetingsThisWeek = ctx.pipeline.recentConversations.filter(
    (c) => c.date >= weekAgo && (c.channel === "call" || c.channel === "in_person")
  ).length;

  // Step 2: Generate CEO-safe highlights
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: CEO_WEEKLY_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  // Parse JSON response
  let highlights: string[] = ["Pipeline building on schedule"];
  let nextWeek = "Continuing outreach and advancing active conversations.";

  const responseText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "";

  try {
    const parsed = JSON.parse(responseText);
    if (Array.isArray(parsed.highlights) && parsed.highlights.length > 0) {
      highlights = parsed.highlights;
    }
    if (typeof parsed.nextWeek === "string" && parsed.nextWeek) {
      nextWeek = parsed.nextWeek;
    }
  } catch {
    // If JSON parsing fails, use the raw text as a single highlight
    if (responseText.length > 10) {
      highlights = [responseText.slice(0, 200)];
    }
  }

  // Step 3: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "ceo-weekly",
    inputContext: {
      activeDeals: ctx.pipeline.activeDeals.length,
      closedRevenue: ctx.pipeline.totalClosedRevenue,
      pipelineAcv,
      retrieveDurationMs: durationRetrieve,
    },
    output: `Highlights: ${highlights.join("; ")}`,
    sourcesCited: [],
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    closedRevenue: ctx.pipeline.totalClosedRevenue,
    revenueTarget: REVENUE_TARGET,
    pipelineAcv,
    dealsAdvanced,
    activeDeals: ctx.pipeline.activeDeals.length,
    meetingsThisWeek,
    highlights,
    nextWeek,
    generatedAt: new Date().toISOString(),
    tokensUsed,
  };
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}
