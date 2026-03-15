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
  SFDC_STAGE_MAP,
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

## Today's Meetings
[List any meetings happening today or this week. For each: who's in the room, what the topic is, and a quick prep note (what to bring up, what to watch for). If no upcoming meetings, skip this section.]

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

  // Upcoming meetings (next 7 days)
  if (ctx.upcomingMeetingNotes && ctx.upcomingMeetingNotes.length > 0) {
    const upcomingLines = ctx.upcomingMeetingNotes.map((m) => {
      const attendeeStr = m.attendees
        .map((a) => (a.role ? `${a.name} (${a.role})` : a.name))
        .join(", ");
      const dealTag = m.deal_id ? " [DEAL-LINKED]" : "";
      return `- [${m.meeting_date}] ${m.title} — with ${attendeeStr}${dealTag}`;
    });
    sections.push(
      `UPCOMING MEETINGS (next 7 days):\n${upcomingLines.join("\n")}`
    );
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

  // User's personal tasks (manually created action items)
  if (ctx.userTasks && ctx.userTasks.length > 0) {
    const taskLines = ctx.userTasks.map((t) => {
      const due = t.due_date ? ` (due: ${t.due_date})` : "";
      return `- ${t.description}${due}`;
    });
    sections.push(`MY TASKS (user-created action items):\n${taskLines.join("\n")}`);
  }

  // Thread alerts (stale deal threads + overdue follow-ups from coaching threads)
  if (ctx.threadAlerts && ctx.threadAlerts.length > 0) {
    const alertLines = ctx.threadAlerts.map((a) => {
      const parts: string[] = [];
      if (a.days_stale >= 7) {
        parts.push(`STALE (${a.days_stale} days)`);
      }
      if (a.overdue_follow_ups.length > 0) {
        const fuDescs = a.overdue_follow_ups
          .map((fu) => `"${fu.description}"${fu.due_date ? ` (was due ${fu.due_date})` : ""}`)
          .join("; ");
        parts.push(`OVERDUE: ${fuDescs}`);
      }
      const dealTag = a.deal_company ? ` [${a.deal_company}]` : "";
      return `- ${a.title}${dealTag}: ${parts.join(", ")}`;
    });
    sections.push(
      `COACHING THREAD ALERTS (need attention):\n${alertLines.join("\n")}`
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
  "conflicts_detected": ["any contradictions with existing data, or empty array if none"],
  "crm_coaching": {
    "stage_recommendation": "If a deal is linked: what SFDC stage this deal should be in now (use exact Salesforce stage names: Prospecting, Qualification, Needs Analysis, Value Proposition, Proposal/Price Quote, Negotiation/Review, Closed Won, Closed Lost). If no stage change needed, say 'No change'. If no deal linked, null.",
    "sfdc_actions": ["List of specific actions to take in Salesforce: log a call activity, update close date, add a note, update contacts, etc."],
    "win_probability_assessment": "Based on the meeting: is the current win probability still accurate? Suggest adjustment if needed with reasoning. Be direct. Do not sandbag (understate a strong deal) or over-forecast (overstate a weak one).",
    "forecast_guidance": "Brief forecasting advice: should this deal be in commit, best case, or pipeline? Why?"
  }
}

CRITICAL FORMAT RULES:
- NEVER use em-dashes in any text field. Use commas, periods, colons, semicolons, or parentheses instead.
- Only output valid JSON. No markdown, no commentary outside the JSON.
- NEVER fabricate information not present in the debrief notes or existing context.
- For crm_coaching: only include if the meeting is linked to a deal. Set to null if no deal context is provided.
- Use exact Salesforce stage names from the SFDC_STAGE_MAP when recommending stage changes.`;

export interface CrmCoaching {
  stageRecommendation: string | null;
  sfdcActions: string[];
  winProbabilityAssessment: string | null;
  forecastGuidance: string | null;
}

export interface DebriefResult {
  debrief: string;
  extractedNotes: {
    category: NoteCategory;
    title: string;
    content: string;
    note_id?: string;
    pinned?: boolean;
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
  crmCoaching: CrmCoaching | null;
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

  const dealId = (meetingNote.deal_id as string) || null;

  const [prepCtx, durationRetrieve] = await timed(() =>
    retrieveMeetingPrepContext(supabase, userId, attendeeNames, dealId ?? undefined)
  );

  // Fetch deal context for CRM coaching if meeting is linked to a deal
  let dealContext: DealContext | null = null;
  if (dealId) {
    dealContext = await retrieveDealContext(supabase, userId, dealId);
  }

  // Step 3: Build context doc
  const contextDoc = buildMeetingDebriefContextDoc(
    meetingNote,
    prepCtx,
    params.debriefNotes,
    dealContext
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
  let crmCoaching: CrmCoaching | null = null;

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

    // Parse CRM coaching if present
    if (parsed.crm_coaching && typeof parsed.crm_coaching === "object") {
      const cc = parsed.crm_coaching as Record<string, unknown>;
      crmCoaching = {
        stageRecommendation:
          typeof cc.stage_recommendation === "string"
            ? cc.stage_recommendation
            : null,
        sfdcActions: Array.isArray(cc.sfdc_actions)
          ? cc.sfdc_actions.filter(
              (a: unknown): a is string => typeof a === "string"
            )
          : [],
        winProbabilityAssessment:
          typeof cc.win_probability_assessment === "string"
            ? cc.win_probability_assessment
            : null,
        forecastGuidance:
          typeof cc.forecast_guidance === "string"
            ? cc.forecast_guidance
            : null,
      };
    }
  } catch {
    console.error(
      "[strategist] Failed to parse debrief JSON response:",
      responseText.slice(0, 200)
    );
  }

  // Step 6: Save validated extracted notes to strategic_notes table
  if (extractedNotes.length > 0) {
    // Auto-pin categories that are permanently relevant
    const AUTO_PIN_CATEGORIES = new Set([
      "institutional_context",
      "political_dynamic",
      "relationship_note",
    ]);

    const noteRecords = extractedNotes.map((note) => ({
      user_id: userId,
      category: note.category,
      title: note.title,
      content: note.content,
      source: `Meeting debrief: ${meetingNote.title} (${meetingNote.meeting_date})`,
      tags: AUTO_PIN_CATEGORIES.has(note.category)
        ? ["debrief", "auto-extracted", "foundational"]
        : ["debrief", "auto-extracted"],
    }));

    const { data: insertedNotes, error: insertError } = await supabase
      .from("strategic_notes")
      .insert(noteRecords)
      .select("note_id, title, category, tags");

    if (insertError) {
      console.error(
        "[strategist] Failed to save extracted notes:",
        insertError.message
      );
    } else if (insertedNotes) {
      // Attach note_ids back to extractedNotes for the UI
      for (let i = 0; i < extractedNotes.length && i < insertedNotes.length; i++) {
        extractedNotes[i].note_id = insertedNotes[i].note_id;
        extractedNotes[i].pinned = (insertedNotes[i].tags ?? []).includes("foundational");
      }
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
    crmCoaching,
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
  debriefNotes: string,
  dealContext: DealContext | null
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
    `MEETING: ${meetingNote.title}\nDATE: ${meetingNote.meeting_date}\nATTENDEES: ${attendeeStr || "none listed"}`
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

  // Deal context for CRM coaching
  if (dealContext) {
    const { deal } = dealContext;
    const sfdcStage = SFDC_STAGE_MAP[deal.stage] ?? deal.stage;
    const dealLines = [
      `LINKED DEAL: ${deal.company}`,
      `Current stage: ${deal.stage} (SFDC: ${sfdcStage})`,
      `ACV: ${deal.acv ? "$" + deal.acv.toLocaleString() : "Not set"}`,
      `Win probability: ${deal.win_probability}%`,
      deal.close_date ? `Expected close: ${deal.close_date}` : null,
      deal.notes ? `Deal notes: ${deal.notes}` : null,
      `Last activity: ${deal.last_activity_date}`,
      `SFDC Opportunity ID: ${deal.sfdc_opportunity_id || "not linked"}`,
    ];
    sections.push(dealLines.filter(Boolean).join("\n"));

    // Include deal brief if available
    if (dealContext.brief) {
      sections.push(`DEAL BRIEF:\n${dealContext.brief.brief_text}`);
    }

    // SFDC stage mapping reference
    sections.push(
      `SFDC STAGE MAP (for coaching recommendations):\n` +
      Object.entries(SFDC_STAGE_MAP).map(([k, v]) => `- ${k} → ${v}`).join("\n")
    );
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

// ── Threaded Coaching ─────────────────────────────────────────────────

const THREAD_COACHING_PROMPT = `${STRATEGIST_IDENTITY}

You are in a persistent coaching thread. This thread has its own memory and context. You may be coaching on a specific deal or on general strategy.

THREAD BEHAVIOR:
- You have the thread's history (either via a thread brief summarizing older messages, plus the recent messages verbatim).
- When a deal is linked, you also have the full deal context: conversations, meeting notes, contacts, action items, and the deal brief.
- Build on prior thread context. Reference what was discussed before. Connect the dots.
- Track commitments. When Tina says she'll do something or sets a follow-up date, note it.
- When you identify a follow-up action, include it in a FOLLOW_UPS section at the end of your response (see format below).
- On each response, end with the next move. What should Tina do next?

FOLLOW-UP EXTRACTION:
When you identify specific follow-up actions from the conversation, append them at the very end of your response in this exact format:

<!-- FOLLOW_UPS
[{"description": "Follow up with Sarah on pricing proposal", "due_date": "2026-03-15"}]
-->

Rules for follow-ups:
- Only include genuinely actionable items, not vague suggestions.
- due_date is optional (null if no date specified or implied). Use ISO date format (YYYY-MM-DD).
- The FOLLOW_UPS block is hidden from the user display but parsed by the system.
- If no follow-ups to extract, omit the block entirely.

MEETING DETECTION:
When Tina pastes an email, chat, or notes that mention a meeting being scheduled, proposed, or confirmed — or when context clearly implies an upcoming meeting with specific people — append a MEETING_DETECTED block at the very end (after FOLLOW_UPS if both exist):

<!-- MEETING_DETECTED
{"title": "SFDC Architecture Review with RevOps", "attendees": [{"name": "Tim Steward", "role": "Director, FP&A and Revenue Operations"}, {"name": "Jereme Buuck", "role": "Revenue Operations & Commissions Analyst"}], "suggested_agenda": ["Account/Contact structure for DaaS deals", "Opportunity types and stage steps"]}
-->

Rules for meeting detection:
- Only trigger when there is clear evidence a meeting IS being set up or will happen. Do not trigger for casual mentions of "we should meet sometime."
- Extract attendee names and roles from the context.
- suggested_agenda is optional — include if the source material mentions specific topics.
- The MEETING_DETECTED block is hidden from display but parsed by the system to prompt the user to create the meeting.
- If no meeting is detected, omit the block entirely.

PROJECT DETECTION:
When Tina mentions working on a project, initiative, or workstream with specific people, append a PROJECT_DETECTED block. This powers her Network mindmap that shows who she's collaborating with on what.

<!-- PROJECT_DETECTED
[{"name": "SAP", "members": [{"name": "Marty Fettig", "role": "EVP"}]}, {"name": "Leadpredict", "members": [{"name": "Ben Luck", "role": "Chief Data Scientist"}, {"name": "Romano Ditoro", "role": "CIO"}]}]
-->

Rules for project detection:
- Detect when Tina mentions working on a named initiative, project, partnership, or workstream with specific people.
- Include the project name and the people involved (with roles if known).
- Trigger on statements like "I'm working with Marty on SAP", "Ben and I are building Leadpredict", "the Leadscale project with Marty", etc.
- Also trigger when Tina pastes intel about a project and mentions collaborators.
- Do NOT trigger for general mentions of a company without a clear project/initiative context.
- Do NOT trigger for deal pipeline activity (that's tracked separately in Deals).
- Multiple projects can be detected in one message.
- The PROJECT_DETECTED block is hidden from display but parsed by the system to auto-create/update projects in the Network mindmap.
- If no projects are detected, omit the block entirely.

${coachingToneRules()}`;

const THREAD_CATCHUP_PROMPT = `${STRATEGIST_IDENTITY}

Generate a brief "here's where we left off" summary for a coaching thread the user is returning to.

Cover these in 3-5 concise bullet points:
1. Where the conversation left off (last topic discussed, decisions made)
2. Open follow-ups with their status (overdue items flagged clearly)
3. Any changes to the linked deal since the last thread activity (new conversations, stage changes, new contacts)
4. Your recommendation for what to focus on next

Keep it tight. This is a quick orientation, not a full briefing.

${coachingToneRules()}`;

const THREAD_BRIEF_PROMPT = `${STRATEGIST_IDENTITY}

Summarize an entire coaching thread history into a structured brief. This brief will replace the full message history in future requests to prevent context window overflow.

The brief MUST capture:
1. **Key facts and decisions** (pricing discussed, commitments made, strategies agreed upon)
2. **Open items** (follow-ups pending, unanswered questions, things waiting on someone)
3. **Context references** (which deals, contacts, conversations, and meetings were discussed, with dates)
4. **Relationship dynamics** (any stakeholder insights surfaced in the thread)

Keep it under 1500 words. Be factual, not narrative. Use bullet points.
Do NOT include pleasantries or meta-commentary about the thread itself. Just the substance.

${coachingToneRules()}`;

function coachingToneRules(): string {
  return `CRITICAL FORMAT RULES:
- NEVER use em-dashes (the long dash). Use commas, periods, colons, semicolons, or parentheses instead.
- NEVER fabricate information. If you don't have a record, say so.
- NEVER be passive or deferential.
- Reference specific dates, contacts, and sources when stating facts.`;
}

/** Threshold: regenerate thread brief after this many messages */
const THREAD_BRIEF_THRESHOLD = 20;

export interface MeetingDetectedData {
  title: string;
  attendees: { name: string; role?: string }[];
  suggested_agenda?: string[];
}

export interface ThreadResponseResult {
  response: string;
  generatedAt: string;
  sourcesCited: string[];
  tokensUsed: number;
  followUpsExtracted: { description: string; due_date: string | null }[];
  meetingDetected: MeetingDetectedData | null;
  projectsDetected: ProjectDetectedData[];
}

/**
 * Generate a coaching response within a persistent thread.
 * Uses thread brief + recent messages + RAG deal context.
 */
export async function generateThreadResponse(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  userMessage: string,
  options?: {
    dealId?: string;
    maEntityId?: string;
    threadBrief?: string;
    messageCount?: number;
  }
): Promise<ThreadResponseResult> {
  // Step 1: RAG retrieval (strategic context + optional deal context)
  const [strategicCtx, durationRetrieve] = await timed(() =>
    retrieveStrategicContext(supabase, userId, {
      dealId: options?.dealId,
    })
  );

  let dealContext: DealContext | null = null;
  if (options?.dealId) {
    dealContext = await retrieveDealContext(supabase, userId, options.dealId);
  }

  // M&A entity context: fetch entity details, contacts, notes, and documents
  let maEntityContext: string | null = null;
  if (options?.maEntityId) {
    const [entityRes, contactsRes, notesRes, docsRes] = await Promise.all([
      supabase
        .from("ma_entities")
        .select("*")
        .eq("entity_id", options.maEntityId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ma_contacts")
        .select("name, title, role_in_process, email")
        .eq("entity_id", options.maEntityId)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("ma_notes")
        .select("note_type, content, created_at")
        .eq("entity_id", options.maEntityId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("ma_documents")
        .select("filename, mime_type, analysis_status, created_at")
        .eq("entity_id", options.maEntityId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (!entityRes.data) {
      console.warn(`[strategist] MA entity ${options.maEntityId} not found for user ${userId}`);
    }
    if (entityRes.data) {
      const e = entityRes.data;
      const sections: string[] = [
        `M&A ENTITY: ${e.company}`,
        `Type: ${e.entity_type === "acquirer" ? "Potential Acquirer" : "Acquisition Target"}`,
        `Stage: ${e.stage}`,
      ];
      if (e.strategic_rationale) sections.push(`Strategic Rationale: ${e.strategic_rationale}`);
      if (e.website) sections.push(`Website: ${e.website}`);
      if (e.notes) sections.push(`Notes: ${e.notes}`);
      if (e.source) sections.push(`Source: ${e.source}`);

      if (contactsRes.data && contactsRes.data.length > 0) {
        const contactLines = contactsRes.data.map(
          (c) => `- ${c.name}${c.title ? ` (${c.title})` : ""}${c.role_in_process ? ` — ${c.role_in_process}` : ""}`
        );
        sections.push(`Key Contacts:\n${contactLines.join("\n")}`);
      }

      if (notesRes.data && notesRes.data.length > 0) {
        const noteLines = notesRes.data.slice(0, 10).map(
          (n) => `[${n.created_at.split("T")[0]}] (${n.note_type}) ${n.content.length > 300 ? n.content.slice(0, 300) + " [...]" : n.content}`
        );
        sections.push(`Recent Notes:\n${noteLines.join("\n")}`);
      }

      if (docsRes.data && docsRes.data.length > 0) {
        const docLines = docsRes.data.map(
          (d) => `- ${d.filename} (${d.analysis_status})`
        );
        sections.push(`Documents:\n${docLines.join("\n")}`);
      }

      maEntityContext = sections.join("\n");
    }
  }

  // Step 2: Fetch thread follow-ups (open items)
  const { data: openFollowUps } = await supabase
    .from("thread_follow_ups")
    .select("description, due_date, status")
    .eq("thread_id", threadId)
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false });

  // Step 3: Build context document
  const contextSections: string[] = [];

  // Thread brief (progressive summary of older messages)
  if (options?.threadBrief) {
    contextSections.push(`THREAD HISTORY BRIEF:\n${options.threadBrief}`);
  }

  // Open follow-ups for this thread
  if (openFollowUps && openFollowUps.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const fuLines = openFollowUps.map((fu) => {
      const overdue = fu.due_date && fu.due_date < today ? " [OVERDUE]" : "";
      const dueStr = fu.due_date ? ` (due: ${fu.due_date})` : "";
      return `- ${fu.description}${dueStr}${overdue}`;
    });
    contextSections.push(`OPEN FOLLOW-UPS:\n${fuLines.join("\n")}`);
  }

  // M&A entity context
  if (maEntityContext) {
    contextSections.push(maEntityContext);
  }

  // Strategic context (stakeholders, notes, nudges)
  const coachingCtx = buildCoachingContextDoc(strategicCtx, dealContext, null);
  if (coachingCtx) {
    contextSections.push(coachingCtx);
  }

  const contextDoc = contextSections.join("\n\n");

  // Step 4: Build messages array with thread history
  // Load recent messages — fetch more than we need so we can prioritize intel
  const { data: recentMessages } = await supabase
    .from("coaching_conversations")
    .select("role, content, created_at, interaction_type")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(30);

  const messages: { role: "user" | "assistant"; content: string }[] = [];

  // Also build a separate intel digest for non-coaching notes that fall outside
  // the recent message window, so the Strategist always has full awareness
  const intelDigestLines: string[] = [];

  if (recentMessages && recentMessages.length > 0) {
    // Separate intel notes from coaching messages
    const intelTypes = new Set(["email", "conversation", "call_transcript", "web_meeting", "in_person_meeting"]);
    const allChronological = [...recentMessages].reverse();

    // Pick the last 10 messages for the conversation window, but ensure
    // recent intel notes aren't displaced by coaching back-and-forth.
    // Strategy: include all intel notes from the last 30, plus enough
    // coaching messages to fill the remaining slots (up to 10 total).
    const intelMsgs = allChronological.filter(
      (m) => m.role === "user" && intelTypes.has(m.interaction_type ?? "coaching")
    );
    const coachingMsgs = allChronological.filter(
      (m) => !intelTypes.has(m.interaction_type ?? "coaching")
    );

    // Take the most recent 5 intel notes + most recent 10 coaching messages,
    // then merge by date and take the final 10
    const selectedIntel = intelMsgs.slice(-5);
    const selectedCoaching = coachingMsgs.slice(-10);
    const merged = [...selectedIntel, ...selectedCoaching]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(-10);

    // Any intel notes NOT in the merged set get summarized in the intel digest
    const mergedIds = new Set(merged.map((m) => m.created_at));
    for (const note of intelMsgs) {
      if (!mergedIds.has(note.created_at)) {
        const typeLabel = (note.interaction_type ?? "note").replace(/_/g, " ");
        const date = note.created_at.split("T")[0];
        const preview = note.content.length > 300
          ? note.content.slice(0, 300) + " [...]"
          : note.content;
        intelDigestLines.push(`[${date}] (${typeLabel}) ${preview}`);
      }
    }

    let lastRole: string | null = null;
    let charBudget = 12000;

    for (const msg of merged) {
      const role = msg.role === "user" ? "user" as const : "assistant" as const;
      if (role === lastRole) {
        messages.pop();
      }
      // Strip follow-up extraction blocks from assistant messages (they're system-internal)
      let content = msg.content;
      content = content.replace(/<!-- FOLLOW_UPS\n[\s\S]*?(?:-->|$)/g, "").trim();

      // Label intel notes so the Strategist knows the source type
      const iType = msg.interaction_type ?? "coaching";
      if (role === "user" && intelTypes.has(iType)) {
        const typeLabel = iType.replace(/_/g, " ").toUpperCase();
        content = `[PASTED ${typeLabel}]\n${content}`;
      }

      if (content.length > 2000) {
        content = content.slice(0, 2000) + " [...]";
      }
      if (charBudget - content.length < 0) break;
      charBudget -= content.length;
      messages.push({ role, content });
      lastRole = role;
    }

    // Ensure we don't end with a user message (we'll add the current one)
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages.pop();
    }
  }

  // Inject intel digest into context if there are older notes outside the window
  if (intelDigestLines.length > 0) {
    contextSections.push(
      `OLDER INTEL NOTES (not in recent messages):\n${intelDigestLines.join("\n")}`
    );
  }

  // Add the current user message with context
  messages.push({
    role: "user",
    content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\nCONTEXT:\n${contextDoc}\n\nUSER MESSAGE:\n${userMessage}`,
  });

  // Step 5: Generate response
  const anthropic = getAnthropic();

  const [response, durationGenerate] = await timed(() =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: THREAD_COACHING_PROMPT,
      messages,
    })
  );

  const fullResponseText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : "I wasn't able to generate a response. Try rephrasing your question.";

  const tokensUsed =
    (response.usage?.input_tokens ?? 0) +
    (response.usage?.output_tokens ?? 0);

  // Step 6: Extract follow-ups, meeting detection, and project detection from response, then strip from user-facing text
  const followUpsExtracted = extractFollowUps(fullResponseText);
  const meetingDetected = extractMeetingDetected(fullResponseText);
  const projectsDetected = extractProjectDetected(fullResponseText);
  const cleanResponse = fullResponseText
    .replace(/<!-- FOLLOW_UPS\n[\s\S]*?(?:-->|$)/g, "")
    .replace(/<!-- MEETING_DETECTED\n[\s\S]*?(?:-->|$)/g, "")
    .replace(/<!-- PROJECT_DETECTED\n[\s\S]*?(?:-->|$)/g, "")
    .trim();

  // Step 7: Save messages to coaching_conversations (with thread_id)
  // Save the clean response (no follow-up markup) so historical context is clean
  const sourcesCited = collectCoachingSources(strategicCtx, null);
  const now = new Date().toISOString();

  await supabase.from("coaching_conversations").insert([
    {
      user_id: userId,
      thread_id: threadId,
      role: "user",
      content: userMessage,
      created_at: now,
    },
    {
      user_id: userId,
      thread_id: threadId,
      role: "assistant",
      content: cleanResponse,
      context_used: {
        dealId: options?.dealId ?? null,
        threadBrief: !!options?.threadBrief,
        followUpsExtracted: followUpsExtracted.length,
      },
      sources_cited: sourcesCited,
      tokens_used: tokensUsed,
      created_at: new Date(Date.now() + 1).toISOString(),
    },
  ]);

  // Step 8: Save extracted follow-ups
  if (followUpsExtracted.length > 0) {
    await supabase.from("thread_follow_ups").insert(
      followUpsExtracted.map((fu) => ({
        thread_id: threadId,
        user_id: userId,
        description: fu.description,
        due_date: fu.due_date,
      }))
    );
  }

  // Step 8b: Auto-create/update projects from detected project mentions
  if (projectsDetected.length > 0) {
    upsertDetectedProjects(supabase, userId, projectsDetected).catch((err) =>
      console.error("[strategist] Project upsert failed:", err)
    );
  }

  // Step 9: Check if thread brief needs regeneration
  const currentMessageCount = (options?.messageCount ?? 0) + 2; // +2 for user + assistant
  if (
    currentMessageCount >= THREAD_BRIEF_THRESHOLD &&
    currentMessageCount % THREAD_BRIEF_THRESHOLD < 2
  ) {
    // Fire and forget (don't block the response)
    generateThreadBrief(supabase, userId, threadId).catch((err) =>
      console.error("[strategist] Thread brief generation failed:", err)
    );
  }

  // Step 10: Log
  await logAgentCall({
    supabase,
    userId,
    agentName: "strategist",
    action: "thread-coaching",
    inputContext: {
      threadId,
      dealId: options?.dealId ?? null,
      hasThreadBrief: !!options?.threadBrief,
      messageCount: currentMessageCount,
      followUpsExtracted: followUpsExtracted.length,
      projectsDetected: projectsDetected.length,
      retrieveDurationMs: durationRetrieve,
    },
    output: fullResponseText.slice(0, 500),
    sourcesCited,
    tokensUsed,
    durationMs: durationRetrieve + durationGenerate,
  });

  return {
    response: cleanResponse,
    generatedAt: new Date().toISOString(),
    sourcesCited,
    tokensUsed,
    followUpsExtracted,
    meetingDetected,
    projectsDetected,
  };
}

/**
 * Generate a "here's where we left off" catchup for thread re-entry.
 */
export async function generateThreadCatchup(
  supabase: SupabaseClient,
  userId: string,
  threadId: string,
  options: {
    dealId?: string;
    threadBrief?: string;
    lastMessageAt: string;
    threadTitle: string;
  }
): Promise<string> {
  // Fetch recent messages (last 6)
  const { data: recentMessages } = await supabase
    .from("coaching_conversations")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(6);

  // Fetch open follow-ups
  const { data: openFollowUps } = await supabase
    .from("thread_follow_ups")
    .select("description, due_date")
    .eq("thread_id", threadId)
    .eq("status", "open");

  // Build context
  const sections: string[] = [];
  sections.push(`THREAD: "${options.threadTitle}"`);
  sections.push(`LAST ACTIVITY: ${options.lastMessageAt}`);

  if (options.threadBrief) {
    sections.push(`THREAD BRIEF:\n${options.threadBrief}`);
  }

  if (recentMessages && recentMessages.length > 0) {
    const chronological = [...recentMessages].reverse();
    const msgLines = chronological.map((m) => {
      const role = m.role === "user" ? "TINA" : "STRATEGIST";
      const content = m.content.replace(/<!-- FOLLOW_UPS\n[\s\S]*?-->/g, "").trim();
      const truncated = content.length > 500 ? content.slice(0, 500) + "..." : content;
      return `[${role}] ${truncated}`;
    });
    sections.push(`RECENT MESSAGES:\n${msgLines.join("\n\n")}`);
  }

  if (openFollowUps && openFollowUps.length > 0) {
    const today = new Date().toISOString().split("T")[0];
    const fuLines = openFollowUps.map((fu) => {
      const overdue = fu.due_date && fu.due_date < today ? " [OVERDUE]" : "";
      return `- ${fu.description}${fu.due_date ? ` (due: ${fu.due_date})` : ""}${overdue}`;
    });
    sections.push(`OPEN FOLLOW-UPS:\n${fuLines.join("\n")}`);
  }

  // If deal-linked, get deal changes since last thread activity
  if (options.dealId) {
    const dealContext = await retrieveDealContext(supabase, userId, options.dealId);
    if (dealContext) {
      // Get conversations since last thread activity
      const newConversations = dealContext.conversations.filter(
        (c) => c.date > options.lastMessageAt
      );
      if (newConversations.length > 0) {
        const convoLines = newConversations.map(
          (c) => `- [${c.date}] ${c.channel.toUpperCase()}: ${c.ai_summary || "(no summary)"}`
        );
        sections.push(`NEW DEAL ACTIVITY SINCE LAST THREAD:\n${convoLines.join("\n")}`);
      }

      sections.push(
        `DEAL STATUS: ${dealContext.deal.company} at ${dealContext.deal.stage}, ACV: ${dealContext.deal.acv ? "$" + dealContext.deal.acv.toLocaleString() : "not set"}`
      );
    }
  }

  const contextDoc = sections.join("\n\n");

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: THREAD_CATCHUP_PROMPT,
    messages: [
      {
        role: "user",
        content: `Today is ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.\n\n${contextDoc}`,
      },
    ],
  });

  return response.content.length > 0 && response.content[0].type === "text"
    ? response.content[0].text
    : "Welcome back. Let me know what you'd like to work on.";
}

/**
 * Regenerate the thread brief (progressive summarization).
 * Called when message_count crosses THREAD_BRIEF_THRESHOLD.
 */
export async function generateThreadBrief(
  supabase: SupabaseClient,
  userId: string,
  threadId: string
): Promise<void> {
  // Fetch all messages in the thread (with interaction_type for labeling)
  const { data: allMessages } = await supabase
    .from("coaching_conversations")
    .select("role, content, created_at, interaction_type")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (!allMessages || allMessages.length < THREAD_BRIEF_THRESHOLD) return;

  // Build the full thread text with interaction type labels
  // Intel notes (emails, transcripts, etc.) are labeled differently from coaching
  const INTEL_LABELS: Record<string, string> = {
    email: "EMAIL",
    conversation: "CONVERSATION",
    call_transcript: "CALL TRANSCRIPT",
    web_meeting: "WEB MEETING",
    in_person_meeting: "IN-PERSON MEETING",
  };

  const threadText = allMessages
    .map((m) => {
      const iType = m.interaction_type ?? "coaching";
      const intelLabel = INTEL_LABELS[iType];
      // Label intel notes by type so the summarizer can distinguish sources
      const role = m.role === "assistant"
        ? "STRATEGIST"
        : intelLabel
          ? `TINA (pasted ${intelLabel})`
          : "TINA";
      let content = m.content.replace(/<!-- FOLLOW_UPS\n[\s\S]*?-->/g, "").trim();
      if (content.length > 1000) {
        content = content.slice(0, 1000) + " [...]";
      }
      return `[${m.created_at.split("T")[0]}] ${role}: ${content}`;
    })
    .join("\n\n");

  // Cap total input to prevent context window issues
  const cappedText =
    threadText.length > 30000
      ? threadText.slice(0, 30000) + "\n\n[... earlier messages truncated ...]"
      : threadText;

  const anthropic = getAnthropic();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: THREAD_BRIEF_PROMPT,
    messages: [
      {
        role: "user",
        content: `Summarize this coaching thread into a structured brief:\n\n${cappedText}`,
      },
    ],
  });

  const briefText =
    response.content.length > 0 && response.content[0].type === "text"
      ? response.content[0].text
      : null;

  if (briefText) {
    await supabase
      .from("coaching_threads")
      .update({
        thread_brief: briefText,
        brief_updated_at: new Date().toISOString(),
      })
      .eq("thread_id", threadId)
      .eq("user_id", userId);
  }
}

/**
 * Parse follow-up actions from the Strategist's response.
 * Looks for the hidden <!-- FOLLOW_UPS ... --> block.
 */
function extractFollowUps(
  responseText: string
): { description: string; due_date: string | null }[] {
  const match = responseText.match(
    /<!-- FOLLOW_UPS\n([\s\S]*?)(?:-->|$)/
  );
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "description" in item &&
          typeof (item as Record<string, unknown>).description === "string"
      )
      .map((item: { description: string; due_date?: string | null }) => ({
        description: item.description,
        due_date: item.due_date ?? null,
      }));
  } catch {
    console.error("[strategist] Failed to parse FOLLOW_UPS block");
    return [];
  }
}

/**
 * Parse meeting detection from the Strategist's response.
 * Looks for the hidden <!-- MEETING_DETECTED ... --> block.
 */
function extractMeetingDetected(
  responseText: string
): MeetingDetectedData | null {
  const match = responseText.match(
    /<!-- MEETING_DETECTED\n([\s\S]*?)(?:-->|$)/
  );
  if (!match) return null;

  try {
    const parsed = JSON.parse(match[1].trim());
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.attendees)
    ) {
      return null;
    }
    return {
      title: parsed.title,
      attendees: parsed.attendees.filter(
        (a: unknown) =>
          typeof a === "object" &&
          a !== null &&
          "name" in a &&
          typeof (a as Record<string, unknown>).name === "string"
      ),
      suggested_agenda: Array.isArray(parsed.suggested_agenda) ? parsed.suggested_agenda : undefined,
    };
  } catch {
    console.error("[strategist] Failed to parse MEETING_DETECTED block");
    return null;
  }
}

// ── Project Detection ──────────────────────────────────────────────────

export interface ProjectDetectedData {
  name: string;
  members: { name: string; role?: string }[];
}

/**
 * Parse project detection from the Strategist's response.
 * Looks for the hidden <!-- PROJECT_DETECTED ... --> block.
 */
export function extractProjectDetected(
  responseText: string
): ProjectDetectedData[] {
  const match = responseText.match(
    /<!-- PROJECT_DETECTED\n([\s\S]*?)(?:-->|$)/
  );
  if (!match) return [];

  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "name" in item &&
          typeof (item as Record<string, unknown>).name === "string" &&
          "members" in item &&
          Array.isArray((item as Record<string, unknown>).members)
      )
      .map((item: { name: string; members: { name: string; role?: string }[] }) => ({
        name: item.name,
        members: item.members.filter(
          (m: unknown) =>
            typeof m === "object" &&
            m !== null &&
            "name" in m &&
            typeof (m as Record<string, unknown>).name === "string"
        ),
      }));
  } catch {
    console.error("[strategist] Failed to parse PROJECT_DETECTED block");
    return [];
  }
}

/**
 * Auto-create or update projects from detected project data.
 * - If a project with the same name exists, adds any new members.
 * - If no match, creates a new project with the detected members.
 */
export async function upsertDetectedProjects(
  supabase: SupabaseClient,
  userId: string,
  detected: ProjectDetectedData[]
): Promise<void> {
  if (detected.length === 0) return;

  // Fetch existing projects for this user
  const { data: existing } = await supabase
    .from("projects")
    .select("project_id, name, project_members(member_id, name)")
    .eq("user_id", userId);

  const existingMap = new Map(
    (existing ?? []).map((p: { project_id: string; name: string; project_members: { member_id: string; name: string }[] }) => [
      p.name.toLowerCase().trim(),
      p,
    ])
  );

  const colors = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6b7280"];

  for (const project of detected) {
    const key = project.name.toLowerCase().trim();
    const match = existingMap.get(key);

    if (match) {
      // Project exists — add any new members
      const existingNames = new Set(
        match.project_members.map((m: { name: string }) => m.name.toLowerCase().trim())
      );
      const newMembers = project.members.filter(
        (m) => !existingNames.has(m.name.toLowerCase().trim())
      );

      if (newMembers.length > 0) {
        await supabase.from("project_members").insert(
          newMembers.map((m) => ({
            project_id: match.project_id,
            user_id: userId,
            name: m.name,
            role: m.role ?? null,
          }))
        );
      }
    } else {
      // New project — create it
      const colorIndex = (existing?.length ?? 0 + Array.from(existingMap.keys()).indexOf(key)) % colors.length;

      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          user_id: userId,
          name: project.name,
          color: colors[colorIndex],
        })
        .select("project_id")
        .single();

      if (newProject && project.members.length > 0) {
        await supabase.from("project_members").insert(
          project.members.map((m) => ({
            project_id: newProject.project_id,
            user_id: userId,
            name: m.name,
            role: m.role ?? null,
          }))
        );
      }

      // Track for dedup within same batch
      if (newProject) {
        existingMap.set(key, {
          project_id: newProject.project_id,
          name: project.name,
          project_members: project.members.map((m) => ({ member_id: "", name: m.name })),
        });
      }
    }
  }
}
