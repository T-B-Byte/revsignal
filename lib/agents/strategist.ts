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
  retrieveStrategicContext,
  retrieveStakeholderContext,
  retrieveMeetingPrepContext,
  type BriefingContext,
  type DealContext,
  type StrategicContextResult,
  type StakeholderContextResult,
  type MeetingPrepContextResult,
} from "@/lib/rag/retriever";
import { logAgentCall, timed } from "./log";
import {
  REVENUE_TARGET,
  type Deal,
  type PlaybookItem,
  type NoteCategory,
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
  const {
    pipeline,
    dealBriefs,
    competitiveIntel,
    neglectedPlaybookItems,
    recentMeetingNotes,
  } = ctx;

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

  // Recent internal meetings
  if (recentMeetingNotes.length > 0) {
    const meetingLines = recentMeetingNotes.map((m) => {
      const attendeeStr = m.attendees
        .map((a) => (a.role ? `${a.name} (${a.role})` : a.name))
        .join(", ");
      const summary = m.ai_summary || "(no summary)";
      return `- [${m.meeting_date}] ${m.title} — with ${attendeeStr}\n  ${summary}`;
    });
    sections.push(
      `RECENT INTERNAL MEETINGS:\n${meetingLines.join("\n\n")}`
    );
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

  // Active nudges (coaching prompts)
  if (ctx.activeNudges && ctx.activeNudges.length > 0) {
    const nudgeLines = ctx.activeNudges.map(
      (n) => `- [${n.priority.toUpperCase()}] ${n.title}: ${n.message}`
    );
    sections.push(`PENDING COACHING NUDGES:\n${nudgeLines.join("\n")}`);
  }

  // Recent strategic notes
  if (ctx.recentStrategicNotes && ctx.recentStrategicNotes.length > 0) {
    const noteLines = ctx.recentStrategicNotes.map(
      (n) =>
        `- [${n.category}] ${n.title}: ${n.content.length > 200 ? n.content.slice(0, 200) + "..." : n.content}`
    );
    sections.push(`RECENT STRATEGIC INSIGHTS:\n${noteLines.join("\n")}`);
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

// ── Coaching Mode ─────────────────────────────────────────────────────

const COACHING_PROMPT = `${STRATEGIST_IDENTITY}

You are now in coaching mode. You are Tina's strategic advisor for her role as SVP, Data Products & Partnerships at pharosIQ.

In this mode, you help with:
- Meeting preparation (who to meet, what to ask, what to watch for)
- Internal stakeholder navigation (relationship dynamics, political sensitivities)
- Role strategy (how to position yourself, what to prioritize)
- Communication coaching (email drafts, how to frame requests, tone checks)
- Tradeshow and event preparation
- Day-to-day decision support

HOW TO TALK TO TINA:

You are a sharp strategic advisor, not an assistant. Talk to Tina like a smart peer who has full context on her situation and isn't afraid to have an opinion.

Core principles:
- Be direct. State your point, then support it. No preambles.
- Have a point of view. Don't list options without a recommendation. If one approach is better, say so and say why.
- Be concise. If three sentences get the job done, don't write six. Tina scans fast.
- Push back when something is weak. If she suggests an approach that won't work, say so directly and redirect.
- Never hedge with filler ("I think maybe...", "You might want to consider...", "It could potentially..."). State it with confidence or flag the uncertainty explicitly ("I don't have data on this, but my read is...").
- Proactively flag what she's not seeing. If she's focused on one meeting but there's a bigger issue, raise it.
- Connect the dots across conversations. Reference what she learned in previous meetings and show how it applies now.
- When she asks "is this too [meek/aggressive/whatever]", give her a straight answer and a better alternative.
- End with the next move. Every response should make it clear what she should do next.
- Keep it warm but never sycophantic. No "Great question!" or "That's a really smart approach!" Just answer the question.

CRITICAL FORMAT RULES:
- NEVER use em-dashes (the long dash). Use commas, periods, colons, semicolons, or parentheses instead.
- NEVER fabricate stakeholder context, meeting details, or institutional knowledge. If you don't have a record, say "I don't have context on that yet."
- NEVER be passive or deferential. Tina hired a strategist, not a yes-machine.
- Reference specific stakeholder context when relevant.
- When preparing for meetings, suggest specific questions tailored to the person and what's already known.
- When debriefing, help extract the key insights and suggest what to do with them.`;

export interface CoachingResult {
  response: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Generate a coaching response in freeform advisory mode.
 * The Strategist as a strategic advisor for internal navigation, meeting prep, role strategy, etc.
 */
export async function generateCoachingResponse(
  supabase: SupabaseClient,
  userId: string,
  userMessage: string,
  options?: { dealId?: string; stakeholderName?: string }
): Promise<CoachingResult> {
  // Step 1: RAG retrieval
  const [strategicCtx, durationRetrieve] = await timed(() =>
    retrieveStrategicContext(supabase, userId, {
      stakeholderName: options?.stakeholderName,
      dealId: options?.dealId,
    })
  );

  // Optionally retrieve deeper context
  let dealContext: DealContext | null = null;
  let stakeholderCtx: StakeholderContextResult | null = null;

  if (options?.dealId) {
    dealContext = await retrieveDealContext(supabase, userId, options.dealId);
  }
  if (options?.stakeholderName) {
    stakeholderCtx = await retrieveStakeholderContext(
      supabase,
      userId,
      options.stakeholderName
    );
  }

  // Step 2: Build context doc
  const contextDoc = buildCoachingContextDoc(
    strategicCtx,
    dealContext,
    stakeholderCtx
  );

  // Step 3: Build messages array with conversation history for multi-turn
  // Anthropic API requires: starts with "user", strict alternation user/assistant.
  // Apply a character budget to prevent context window overflow.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  const MAX_HISTORY_CHARS = 8000;
  let charBudget = MAX_HISTORY_CHARS;

  // Skip leading assistant messages (must start with "user")
  const history = strategicCtx.recentCoachingHistory;
  let startIdx = 0;
  while (startIdx < history.length && history[startIdx].role !== "user") {
    startIdx++;
  }

  // Add history with alternation enforcement and character budget
  let lastRole: string | null = null;
  for (let i = startIdx; i < history.length; i++) {
    const msg = history[i];
    const role = msg.role === "user" ? "user" : "assistant";
    // Skip consecutive same-role messages (keep only the last one)
    if (role === lastRole) {
      messages.pop();
    }
    const content =
      msg.content.length > 2000
        ? msg.content.slice(0, 2000) + " [...]"
        : msg.content;
    if (charBudget - content.length < 0) break;
    charBudget -= content.length;
    messages.push({ role, content });
    lastRole = role;
  }
  // If history ends with a user message, remove it (we'll add the current one)
  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    messages.pop();
  }

  // Add the current user message with context
  messages.push({
    role: "user",
    content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\nCONTEXT:\n${contextDoc}\n\nUSER MESSAGE:\n${userMessage}`,
  });

  // Step 4: Generate response
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: COACHING_PROMPT,
      messages,
    })
  );

  const responseText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "I wasn't able to generate a response. Try rephrasing your question.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  // Step 5: Save both messages to coaching_conversations
  const sourcesCited = collectCoachingSources(strategicCtx, stakeholderCtx);
  const now = new Date().toISOString();
  const { error: insertError } = await supabase
    .from("coaching_conversations")
    .insert([
      {
        user_id: userId,
        role: "user",
        content: userMessage,
        created_at: now,
      },
      {
        user_id: userId,
        role: "assistant",
        content: responseText,
        context_used: {
          stakeholdersProvided: strategicCtx.stakeholders.length,
          notesProvided: strategicCtx.strategicNotes.length,
          dealId: options?.dealId ?? null,
          stakeholderName: options?.stakeholderName ?? null,
        },
        sources_cited: sourcesCited,
        tokens_used: tokensUsed,
        created_at: new Date(Date.now() + 1).toISOString(), // +1ms to preserve ordering
      },
    ]);

  if (insertError) {
    console.error(
      "[strategist] Failed to save coaching messages:",
      insertError.message
    );
  }

  // Step 6: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "coaching-chat",
    inputContext: {
      stakeholdersProvided: strategicCtx.stakeholders.length,
      notesProvided: strategicCtx.strategicNotes.length,
      historyMessages: strategicCtx.recentCoachingHistory.length,
      dealId: options?.dealId ?? null,
      stakeholderName: options?.stakeholderName ?? null,
      retrieveDurationMs: durationRetrieve,
    },
    output: responseText.slice(0, 500),
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    response: responseText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Meeting Prep Mode ─────────────────────────────────────────────────

const MEETING_PREP_PROMPT = `${STRATEGIST_IDENTITY}

Generate a meeting prep brief. Structure it as:

## Meeting Overview
What this meeting is about and what you want to accomplish. Be specific to the context provided.

## Attendee Profiles
For each attendee: their role, communication style, what motivates them, sensitivities to avoid, relationship status. Only include what you know from the data. If you lack context on someone, say so.

## Talking Points
3-5 specific talking points based on context. Reference recent conversations, deals, or strategic notes.

## Watch For
Potential landmines, sensitivities, or dynamics between attendees. Political considerations.

## Desired Outcomes
What success looks like for this meeting. Specific commitments or decisions to aim for.

CRITICAL FORMAT RULES:
- NEVER use em-dashes (the long dash). Use commas, periods, colons, semicolons, or parentheses instead.
- NEVER invent facts about people or deals. If you lack context on someone, say "I don't have context on [name] yet."
- Be specific and actionable.`;

export interface MeetingPrepResult {
  prep: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Generate a meeting prep brief for upcoming meetings.
 */
export async function generateMeetingPrep(
  supabase: SupabaseClient,
  userId: string,
  params: {
    title: string;
    attendeeNames: string[];
    agenda?: string;
    dealId?: string;
  }
): Promise<MeetingPrepResult> {
  // Step 1: RAG retrieval
  const [prepCtx, durationRetrieve] = await timed(() =>
    retrieveMeetingPrepContext(
      supabase,
      userId,
      params.attendeeNames,
      params.dealId
    )
  );

  // Step 2: Build context doc
  const contextDoc = buildMeetingPrepContextDoc(prepCtx, params);

  // Step 3: Generate prep
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: MEETING_PREP_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const prepText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "Failed to generate meeting prep.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  const sourcesCited = prepCtx.stakeholderContexts.flatMap((sc) =>
    sc.relatedConversations.map((c) => c.conversation_id)
  );

  // Step 4: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "meeting-prep",
    inputContext: {
      title: params.title,
      attendees: params.attendeeNames,
      dealId: params.dealId ?? null,
      stakeholdersFound: prepCtx.stakeholderContexts.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: prepText.slice(0, 500),
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    prep: prepText,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Meeting Debrief Mode ──────────────────────────────────────────────

const MEETING_DEBRIEF_PROMPT = `${STRATEGIST_IDENTITY}

Process a meeting debrief. You will receive the meeting details and the user's debrief notes.

Your task:
1. Summarize the key takeaways
2. Extract institutional knowledge that should be saved (stakeholder insights, political dynamics, decision rationale)
3. Identify follow-up actions
4. Flag anything that contradicts existing records

Output ONLY valid JSON in this format:
{
  "debrief_summary": "2-3 paragraph summary of key takeaways",
  "extracted_notes": [
    {
      "category": "<one of: institutional_context, stakeholder_insight, decision_log, political_dynamic, meeting_debrief, strategic_observation, competitive_insight, relationship_note>",
      "title": "Short descriptive title",
      "content": "The insight or knowledge to preserve"
    }
  ],
  "follow_up_actions": [
    {
      "description": "What needs to happen",
      "owner": "me or them",
      "due_suggestion": "suggested date or timeframe"
    }
  ],
  "stakeholder_updates": [
    {
      "name": "Person name",
      "updates": "What to update on their profile (e.g., relationship changed, new sensitivity learned)"
    }
  ],
  "conflicts_detected": ["any contradictions with existing data, or empty array if none"]
}

CRITICAL FORMAT RULES:
- NEVER use em-dashes in any text field. Use commas, periods, colons, semicolons, or parentheses instead.
- Only output valid JSON. No markdown, no commentary outside the JSON.
- NEVER fabricate information not present in the debrief notes or existing context.`;

export interface DebriefResult {
  debrief: string;
  extractedNotes: {
    category: NoteCategory;
    title: string;
    content: string;
  }[];
  followUpActions: {
    description: string;
    owner: string;
    due_suggestion: string;
  }[];
  stakeholderUpdates: {
    name: string;
    updates: string;
  }[];
  conflictsDetected: string[];
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
}

/**
 * Process a meeting debrief: extract strategic notes, action items, and stakeholder updates.
 */
export async function processMeetingDebrief(
  supabase: SupabaseClient,
  userId: string,
  params: {
    meetingNoteId: string;
    debriefNotes: string;
  }
): Promise<DebriefResult> {
  // Step 1: Fetch the meeting note
  const { data: meetingNote, error: meetingError } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("note_id", params.meetingNoteId)
    .eq("user_id", userId)
    .single();

  if (meetingError || !meetingNote) {
    throw new Error("Meeting note not found");
  }

  // Step 2: Retrieve stakeholder context for each attendee
  const attendees: { name: string }[] = Array.isArray(meetingNote.attendees)
    ? (meetingNote.attendees as { name: string }[])
    : [];
  const attendeeNames = attendees.map((a) => a.name);
  if (attendeeNames.length === 0) {
    console.warn(
      "[strategist] Meeting debrief has no attendees:",
      params.meetingNoteId
    );
  }

  const [prepCtx, durationRetrieve] = await timed(() =>
    retrieveMeetingPrepContext(supabase, userId, attendeeNames)
  );

  // Step 3: Build context doc
  const contextDoc = buildMeetingDebriefContextDoc(
    meetingNote,
    prepCtx,
    params.debriefNotes
  );

  // Step 4: Generate debrief
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: MEETING_DEBRIEF_PROMPT,
      messages: [
        {
          role: "user",
          content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
        },
      ],
    })
  );

  const responseText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "{}";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  // Step 5: Parse JSON response
  const VALID_NOTE_CATEGORIES = new Set([
    "institutional_context", "stakeholder_insight", "decision_log",
    "political_dynamic", "meeting_debrief", "strategic_observation",
    "competitive_insight", "relationship_note",
  ]);

  let debriefSummary: string | null = null;
  let extractedNotes: DebriefResult["extractedNotes"] = [];
  let followUpActions: DebriefResult["followUpActions"] = [];
  let stakeholderUpdates: DebriefResult["stakeholderUpdates"] = [];
  let conflictsDetected: string[] = [];

  try {
    const parsed = JSON.parse(responseText);
    debriefSummary =
      typeof parsed.debrief_summary === "string"
        ? parsed.debrief_summary
        : null;

    // Validate each extracted note has required fields and valid category
    extractedNotes = Array.isArray(parsed.extracted_notes)
      ? parsed.extracted_notes.filter(
          (n: unknown): n is DebriefResult["extractedNotes"][number] =>
            typeof n === "object" &&
            n !== null &&
            typeof (n as Record<string, unknown>).category === "string" &&
            VALID_NOTE_CATEGORIES.has(
              (n as Record<string, unknown>).category as string
            ) &&
            typeof (n as Record<string, unknown>).title === "string" &&
            typeof (n as Record<string, unknown>).content === "string"
        )
      : [];

    // Validate follow-up actions have required fields
    followUpActions = Array.isArray(parsed.follow_up_actions)
      ? parsed.follow_up_actions.filter(
          (a: unknown): a is DebriefResult["followUpActions"][number] =>
            typeof a === "string" ||
            (typeof a === "object" &&
              a !== null &&
              typeof (a as Record<string, unknown>).description === "string")
        )
      : [];

    stakeholderUpdates = Array.isArray(parsed.stakeholder_updates)
      ? parsed.stakeholder_updates.filter(
          (s: unknown): s is string => typeof s === "string"
        )
      : [];

    conflictsDetected = Array.isArray(parsed.conflicts_detected)
      ? parsed.conflicts_detected.filter(
          (c: unknown): c is string => typeof c === "string"
        )
      : [];
  } catch {
    console.error(
      "[strategist] Failed to parse debrief JSON response:",
      responseText.slice(0, 200)
    );
  }

  // Step 6: Save validated extracted notes to strategic_notes table
  if (extractedNotes.length > 0) {
    const noteRecords = extractedNotes.map((note) => ({
      user_id: userId,
      category: note.category,
      title: note.title,
      content: note.content,
      source: `Meeting debrief: ${meetingNote.title} (${meetingNote.meeting_date})`,
      tags: ["debrief", "auto-extracted"],
    }));

    const { error: insertError } = await supabase
      .from("strategic_notes")
      .insert(noteRecords);

    if (insertError) {
      console.error(
        "[strategist] Failed to save extracted notes:",
        insertError.message
      );
    }
  }

  // Step 7: Update meeting note's ai_summary only if debrief was generated
  if (debriefSummary) {
    await supabase
      .from("meeting_notes")
      .update({ ai_summary: debriefSummary })
      .eq("note_id", params.meetingNoteId)
      .eq("user_id", userId);
  }

  const sourcesCited = prepCtx.stakeholderContexts.flatMap((sc) =>
    sc.relatedConversations.map((c) => c.conversation_id)
  );

  // Step 8: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "meeting-debrief",
    inputContext: {
      meetingNoteId: params.meetingNoteId,
      meetingTitle: meetingNote.title,
      attendees: attendeeNames,
      extractedNotesCount: extractedNotes.length,
      followUpActionsCount: followUpActions.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: (debriefSummary ?? "").slice(0, 500),
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    debrief: debriefSummary ?? "Failed to process debrief.",
    extractedNotes,
    followUpActions,
    stakeholderUpdates,
    conflictsDetected,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
  };
}

// ── Coaching Context Doc Builders ─────────────────────────────────────

function buildCoachingContextDoc(
  ctx: StrategicContextResult,
  dealCtx: DealContext | null,
  stakeholderCtx: StakeholderContextResult | null
): string {
  const sections: string[] = [];

  // Stakeholder profiles
  if (ctx.stakeholders.length > 0) {
    const stakeholderLines = ctx.stakeholders.map((s) => {
      const parts = [
        `${s.name} (${s.role || "role unknown"}, ${s.organization})`,
        `Relationship: ${s.relationship}`,
        s.communication_style
          ? `Communication: ${s.communication_style}`
          : null,
        s.motivations ? `Motivations: ${s.motivations}` : null,
        s.sensitivities ? `Sensitivities: ${s.sensitivities}` : null,
        s.influence_level
          ? `Influence: ${s.influence_level}/5`
          : null,
        s.last_interaction_date
          ? `Last interaction: ${s.last_interaction_date}`
          : null,
      ];
      return parts.filter(Boolean).join("\n  ");
    });
    sections.push(
      `STAKEHOLDER PROFILES:\n${stakeholderLines.join("\n\n")}`
    );
  }

  // Deep stakeholder context (if a specific person was mentioned)
  if (stakeholderCtx) {
    const s = stakeholderCtx.stakeholder;
    const deepParts: string[] = [
      `\nDEEP CONTEXT ON ${s.name.toUpperCase()}:`,
    ];
    if (stakeholderCtx.relatedNotes.length > 0) {
      const noteLines = stakeholderCtx.relatedNotes.map(
        (n) => `- [${n.category}] ${n.title}: ${n.content.length > 300 ? n.content.slice(0, 300) + "..." : n.content}`
      );
      deepParts.push(`Related notes:\n${noteLines.join("\n")}`);
    }
    if (stakeholderCtx.relatedMeetings.length > 0) {
      const meetingLines = stakeholderCtx.relatedMeetings.map(
        (m) =>
          `- [${m.meeting_date}] ${m.title}: ${m.ai_summary || "(no summary)"}`
      );
      deepParts.push(`Meetings involving ${s.name}:\n${meetingLines.join("\n")}`);
    }
    if (stakeholderCtx.relatedConversations.length > 0) {
      const convoLines = stakeholderCtx.relatedConversations.map(
        (c) =>
          `- [${c.date}] ${c.channel.toUpperCase()}: ${c.ai_summary || "(no summary)"}`
      );
      deepParts.push(`Conversations:\n${convoLines.join("\n")}`);
    }
    sections.push(deepParts.join("\n"));
  }

  // Strategic notes
  if (ctx.strategicNotes.length > 0) {
    const noteLines = ctx.strategicNotes.map(
      (n) =>
        `- [${n.category}] ${n.title} (${n.created_at.split("T")[0]}): ${n.content.length > 200 ? n.content.slice(0, 200) + "..." : n.content}`
    );
    sections.push(`STRATEGIC NOTES:\n${noteLines.join("\n")}`);
  }

  // Active nudges
  if (ctx.activeNudges.length > 0) {
    const nudgeLines = ctx.activeNudges.map(
      (n) => `- [${n.priority.toUpperCase()}] ${n.title}: ${n.message}`
    );
    sections.push(`ACTIVE NUDGES:\n${nudgeLines.join("\n")}`);
  }

  // Deal context (if provided)
  if (dealCtx) {
    sections.push(buildDealContextDoc(dealCtx));
  }

  return sections.join("\n\n");
}

function buildMeetingPrepContextDoc(
  ctx: MeetingPrepContextResult,
  params: { title: string; attendeeNames: string[]; agenda?: string }
): string {
  const sections: string[] = [];

  sections.push(
    `MEETING: ${params.title}\nATTENDEES: ${params.attendeeNames.join(", ")}${params.agenda ? `\nAGENDA: ${params.agenda}` : ""}`
  );

  // Stakeholder profiles for each attendee
  for (const sc of ctx.stakeholderContexts) {
    const s = sc.stakeholder;
    const parts = [
      `--- ${s.name} (${s.role || "role unknown"}, ${s.organization}) ---`,
      `Relationship: ${s.relationship}`,
      s.communication_style
        ? `Communication style: ${s.communication_style}`
        : null,
      s.motivations ? `Motivations: ${s.motivations}` : null,
      s.sensitivities ? `Sensitivities: ${s.sensitivities}` : null,
      s.notes ? `Notes: ${s.notes}` : null,
    ];

    if (sc.relatedMeetings.length > 0) {
      const meetingLines = sc.relatedMeetings
        .slice(0, 5)
        .map(
          (m) =>
            `  - [${m.meeting_date}] ${m.title}: ${m.ai_summary || "(no summary)"}`
        );
      parts.push(`Previous meetings:\n${meetingLines.join("\n")}`);
    }

    if (sc.relatedNotes.length > 0) {
      const noteLines = sc.relatedNotes
        .slice(0, 5)
        .map(
          (n) => `  - [${n.category}] ${n.title}: ${n.content.length > 200 ? n.content.slice(0, 200) + "..." : n.content}`
        );
      parts.push(`Related insights:\n${noteLines.join("\n")}`);
    }

    sections.push(parts.filter(Boolean).join("\n"));
  }

  // Flag attendees without stakeholder records
  const knownNames = new Set(
    ctx.stakeholderContexts.map((sc) =>
      sc.stakeholder.name.toLowerCase()
    )
  );
  const unknownAttendees = params.attendeeNames.filter(
    (name) => !knownNames.has(name.toLowerCase())
  );
  if (unknownAttendees.length > 0) {
    sections.push(
      `ATTENDEES WITHOUT PROFILES: ${unknownAttendees.join(", ")} (no stakeholder context available)`
    );
  }

  // Deal context
  if (ctx.dealContext) {
    sections.push(buildDealContextDoc(ctx.dealContext));
  }

  // Relevant nudges
  if (ctx.relevantNudges.length > 0) {
    const nudgeLines = ctx.relevantNudges.map(
      (n) => `- [${n.priority.toUpperCase()}] ${n.title}: ${n.message}`
    );
    sections.push(`RELEVANT NUDGES:\n${nudgeLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

function buildMeetingDebriefContextDoc(
  meetingNote: Record<string, unknown>,
  prepCtx: MeetingPrepContextResult,
  debriefNotes: string
): string {
  const sections: string[] = [];

  const attendees: { name: string; role?: string }[] = Array.isArray(
    meetingNote.attendees
  )
    ? (meetingNote.attendees as { name: string; role?: string }[])
    : [];
  const attendeeStr = attendees
    .map((a) => (a.role ? `${a.name} (${a.role})` : a.name))
    .join(", ");

  sections.push(
    `MEETING: ${meetingNote.title}\nDATE: ${meetingNote.meeting_date}\nTYPE: ${meetingNote.meeting_type}\nATTENDEES: ${attendeeStr || "none listed"}`
  );

  // Original meeting content (truncate to prevent context window overflow)
  if (meetingNote.content) {
    const content = meetingNote.content as string;
    const truncated =
      content.length > 3000
        ? content.slice(0, 3000) + "\n[... truncated ...]"
        : content;
    sections.push(`ORIGINAL MEETING NOTES:\n${truncated}`);
  }

  // Stakeholder context for each attendee
  for (const sc of prepCtx.stakeholderContexts) {
    const s = sc.stakeholder;
    const parts = [
      `--- Existing context on ${s.name} ---`,
      `Role: ${s.role || "unknown"}, Relationship: ${s.relationship}`,
      s.notes ? `Notes: ${s.notes}` : null,
    ];
    sections.push(parts.filter(Boolean).join("\n"));
  }

  // User's debrief input
  sections.push(`DEBRIEF NOTES (from user):\n${debriefNotes}`);

  return sections.join("\n\n");
}

function collectCoachingSources(
  ctx: StrategicContextResult,
  stakeholderCtx: StakeholderContextResult | null
): string[] {
  const sources = new Set<string>();
  for (const note of ctx.strategicNotes) {
    sources.add(note.note_id);
  }
  if (stakeholderCtx) {
    for (const c of stakeholderCtx.relatedConversations) {
      sources.add(c.conversation_id);
    }
    for (const m of stakeholderCtx.relatedMeetings) {
      sources.add(m.note_id);
    }
  }
  return Array.from(sources);
}
