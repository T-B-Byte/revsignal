/**
 * RAG Retriever — Context retrieval before every agent call.
 *
 * Every agent MUST call a retrieval function here before prompting Claude.
 * Raw text is never sent to the model — we send ai_summary (conversations),
 * brief_text (deal briefs), and structured data (action items, contacts, etc.).
 *
 * Scoping rules:
 *  - All queries scoped by user_id
 *  - Deal-specific queries additionally scoped by deal_id (context silo)
 *  - Never cross-contaminate deal contexts
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { businessDaysBetween } from "@/lib/business-days";
import type {
  Deal,
  Contact,
  Conversation,
  ActionItem,
  DealBrief,
  PlaybookItem,
  CompetitiveIntel,
  Prospect,
  DealStage,
  MeetingAttendee,
  Stakeholder,
  StrategicNote,
  CoachingMessage,
  Nudge,
  NoteCategory,
} from "@/types/database";

// ── Types ──────────────────────────────────────────────────────────────

/** Context for a single deal — everything an agent needs to reason about it. */
export interface DealContext {
  deal: Deal;
  contacts: Contact[];
  /** Recent conversations with ai_summary (NOT raw_text). Ordered newest-first. */
  conversations: ConversationSummary[];
  actionItems: ActionItem[];
  brief: DealBrief | null;
}

/** Conversation with raw_text stripped — agents only see summaries. */
export interface ConversationSummary {
  conversation_id: string;
  contact_id: string | null;
  deal_id: string | null;
  date: string;
  channel: string;
  subject: string | null;
  ai_summary: string | null;
  action_items: { description: string; owner: string; due_date?: string }[];
  follow_up_date: string | null;
  /** Resolved contact name for citation purposes. */
  contact_name?: string;
}

/** Full pipeline context for daily briefings and weekly digests. */
export interface PipelineContext {
  activeDeals: Deal[];
  closedWonDeals: Deal[];
  closedLostDeals: Deal[];
  totalClosedRevenue: number;
  overdueItems: ActionItem[];
  upcomingItems: ActionItem[];
  recentConversations: ConversationSummary[];
  playbook: PlaybookItem[];
  staleDeals: Deal[];
}

/** Summary of a meeting note for agent consumption (no raw content beyond truncation). */
export interface MeetingNoteSummary {
  note_id: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees: MeetingAttendee[];
  ai_summary: string | null;
  action_items: { description: string; owner: string; due_date?: string }[];
  tags: string[];
  deal_id: string | null;
}

/** Context specifically for The Strategist's morning briefing. */
export interface UserTask {
  task_id: string;
  description: string;
  due_date: string | null;
  status: string;
  created_at: string;
}

export interface ThreadAlertSummary {
  thread_id: string;
  title: string;
  deal_company: string | null;
  days_stale: number;
  overdue_follow_ups: { description: string; due_date: string | null }[];
  open_follow_up_count: number;
}

export interface BriefingContext {
  pipeline: PipelineContext;
  dealBriefs: { deal: Deal; brief: DealBrief }[];
  competitiveIntel: CompetitiveIntel[];
  neglectedPlaybookItems: PlaybookItem[];
  recentMeetingNotes: MeetingNoteSummary[];
  upcomingMeetingNotes: MeetingNoteSummary[];
  activeNudges?: Nudge[];
  recentStrategicNotes?: StrategicNote[];
  userTasks?: UserTask[];
  threadAlerts?: ThreadAlertSummary[];
}

/** Strategic context for The Strategist's coaching mode. */
export interface StrategicContextResult {
  strategicNotes: StrategicNote[];
  stakeholders: Stakeholder[];
  activeNudges: Nudge[];
  recentCoachingHistory: CoachingMessage[];
}

/** Deep context on a specific stakeholder. */
export interface StakeholderContextResult {
  stakeholder: Stakeholder;
  relatedNotes: StrategicNote[];
  relatedMeetings: MeetingNoteSummary[];
  relatedConversations: ConversationSummary[];
}

/** Context for meeting preparation. */
export interface MeetingPrepContextResult {
  stakeholderContexts: StakeholderContextResult[];
  dealContext: DealContext | null;
  relevantNudges: Nudge[];
  recentStrategicNotes: StrategicNote[];
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Truncate text at the last sentence boundary within maxLen, appending "[...]" if cut. */
function truncateAtSentence(text: string | null | undefined, maxLen: number): string | null {
  if (!text) return null;
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf(".\n"),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (lastSentenceEnd > maxLen * 0.3) {
    return truncated.slice(0, lastSentenceEnd + 1) + " [...]";
  }
  return truncated + " [...]";
}

// ── Active stages constant (avoids circular import) ────────────────────

const ACTIVE_DEAL_STAGES: DealStage[] = [
  "lead",
  "qualified",
  "discovery",
  "poc_trial",
  "proposal",
  "negotiation",
];

// ── Deal Context Retrieval ─────────────────────────────────────────────

/**
 * Retrieve full context for a single deal.
 * This is the primary retrieval for deal-specific agent calls.
 */
export async function retrieveDealContext(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  options: { conversationLimit?: number } = {}
): Promise<DealContext | null> {
  const conversationLimit = options.conversationLimit ?? 20;

  // Parallel fetch — same pattern as deal detail page
  const [dealResult, convoResult, actionResult, briefResult] =
    await Promise.all([
      supabase
        .from("deals")
        .select("*")
        .eq("deal_id", dealId)
        .eq("user_id", userId)
        .single(),
      supabase
        .from("conversations")
        .select(
          "conversation_id, contact_id, deal_id, date, channel, subject, ai_summary, action_items, follow_up_date"
        )
        .eq("deal_id", dealId)
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .limit(conversationLimit),
      supabase
        .from("action_items")
        .select("*")
        .eq("deal_id", dealId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("deal_briefs")
        .select("*")
        .eq("deal_id", dealId)
        .eq("user_id", userId)
        .order("last_updated", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (dealResult.error || !dealResult.data) return null;

  const deal = dealResult.data as Deal;

  // Resolve contacts from deal.contacts[] refs
  const contactIds = (deal.contacts || []).map((c) => c.contact_id);
  let contacts: Contact[] = [];
  if (contactIds.length > 0) {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .in("contact_id", contactIds);
    contacts = (data as Contact[]) || [];
  }

  // Build contact name map for citation
  const contactMap = new Map(contacts.map((c) => [c.contact_id, c.name]));

  const conversations: ConversationSummary[] = (
    (convoResult.data as Conversation[]) || []
  ).map((c) => ({
    conversation_id: c.conversation_id,
    contact_id: c.contact_id,
    deal_id: c.deal_id,
    date: c.date,
    channel: c.channel,
    subject: c.subject,
    ai_summary: c.ai_summary,
    action_items: c.action_items || [],
    follow_up_date: c.follow_up_date,
    contact_name: c.contact_id
      ? contactMap.get(c.contact_id) ?? undefined
      : undefined,
  }));

  return {
    deal,
    contacts,
    conversations,
    actionItems: (actionResult.data as ActionItem[]) || [],
    brief: (briefResult.data as DealBrief) || null,
  };
}

// ── Pipeline Context Retrieval ─────────────────────────────────────────

/**
 * Retrieve full pipeline context for briefings and strategy.
 * Used by The Strategist for morning briefings and weekly memos.
 */
export async function retrievePipelineContext(
  supabase: SupabaseClient,
  userId: string,
  options: { conversationLimit?: number; staleDays?: number } = {}
): Promise<PipelineContext> {
  const conversationLimit = options.conversationLimit ?? 15;
  const staleDays = options.staleDays ?? 7;

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);
  const staleDateStr = staleDate.toISOString();

  const now = new Date().toISOString();

  const [
    activeResult,
    closedWonResult,
    closedLostResult,
    overdueResult,
    upcomingResult,
    convoResult,
    playbookResult,
  ] = await Promise.all([
    // Active deals
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .in("stage", ACTIVE_DEAL_STAGES)
      .order("last_activity_date", { ascending: false }),
    // Closed won
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .eq("stage", "closed_won")
      .order("closed_date", { ascending: false }),
    // Closed lost (last 30 days only — for pattern recognition)
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .eq("stage", "closed_lost")
      .gte(
        "closed_date",
        new Date(Date.now() - 30 * 86400000).toISOString()
      )
      .order("closed_date", { ascending: false }),
    // Overdue action items
    supabase
      .from("action_items")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["pending", "overdue"])
      .lt("due_date", now)
      .order("due_date", { ascending: true }),
    // Upcoming action items (next 7 days)
    supabase
      .from("action_items")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("due_date", now)
      .lte(
        "due_date",
        new Date(Date.now() + 7 * 86400000).toISOString()
      )
      .order("due_date", { ascending: true }),
    // Recent conversations (across all deals)
    supabase
      .from("conversations")
      .select(
        "conversation_id, contact_id, deal_id, date, channel, subject, ai_summary, action_items, follow_up_date"
      )
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(conversationLimit),
    // Playbook items
    supabase
      .from("playbook_items")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  const activeDeals = (activeResult.data as Deal[]) || [];
  const closedWonDeals = (closedWonResult.data as Deal[]) || [];

  // Identify stale deals — active but no activity in staleDays
  const staleDeals = activeDeals.filter(
    (d) => d.last_activity_date < staleDateStr
  );

  // Sum closed revenue
  const totalClosedRevenue = closedWonDeals.reduce(
    (sum, d) => sum + (d.acv || 0),
    0
  );

  return {
    activeDeals,
    closedWonDeals,
    closedLostDeals: (closedLostResult.data as Deal[]) || [],
    totalClosedRevenue,
    overdueItems: (overdueResult.data as ActionItem[]) || [],
    upcomingItems: (upcomingResult.data as ActionItem[]) || [],
    recentConversations: (
      (convoResult.data as Conversation[]) || []
    ).map((c) => ({
      conversation_id: c.conversation_id,
      contact_id: c.contact_id,
      deal_id: c.deal_id,
      date: c.date,
      channel: c.channel,
      subject: c.subject,
      ai_summary: c.ai_summary,
      action_items: c.action_items || [],
      follow_up_date: c.follow_up_date,
    })),
    playbook: (playbookResult.data as PlaybookItem[]) || [],
    staleDeals,
  };
}

// ── Briefing Context Retrieval ─────────────────────────────────────────

/**
 * Retrieve everything The Strategist needs for a morning briefing.
 * Combines pipeline context with deal briefs and competitive intel.
 */
export async function retrieveBriefingContext(
  supabase: SupabaseClient,
  userId: string
): Promise<BriefingContext> {
  // Get pipeline context first
  const pipeline = await retrievePipelineContext(supabase, userId);

  // Parallel: deal briefs for active deals + competitive intel + neglected playbook
  const activeDealIds = pipeline.activeDeals.map((d) => d.deal_id);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  const todayStr = new Date().toISOString().slice(0, 10);
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const [briefsResult, competitiveResult, meetingNotesResult, upcomingMeetingsResult, nudgesResult, strategicNotesResult, userTasksResult] = await Promise.all([
    activeDealIds.length > 0
      ? supabase
          .from("deal_briefs")
          .select("*")
          .eq("user_id", userId)
          .in("deal_id", activeDealIds)
          .order("last_updated", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("competitive_intel")
      .select("*")
      .eq("user_id", userId)
      .gte("captured_date", thirtyDaysAgo)
      .order("captured_date", { ascending: false })
      .limit(20),
    // Recent past meetings + pinned meetings (always included)
    supabase
      .from("meeting_notes")
      .select("note_id, title, meeting_date, meeting_type, attendees, ai_summary, content, action_items, tags, deal_id")
      .eq("user_id", userId)
      .lt("meeting_date", todayStr)
      .or(`meeting_date.gte.${thirtyDaysAgo},tags.cs.{foundational}`)
      .order("meeting_date", { ascending: false })
      .limit(20),
    // Upcoming meetings (today + next 7 days)
    supabase
      .from("meeting_notes")
      .select("note_id, title, meeting_date, meeting_type, attendees, ai_summary, content, action_items, tags, deal_id")
      .eq("user_id", userId)
      .gte("meeting_date", todayStr)
      .lte("meeting_date", sevenDaysFromNow)
      .order("meeting_date", { ascending: true })
      .limit(10),
    supabase
      .from("nudges")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    // Recent notes (last 7 days) + foundational notes (always included)
    supabase
      .from("strategic_notes")
      .select("*")
      .eq("user_id", userId)
      .or(`created_at.gte.${sevenDaysAgo},tags.cs.{foundational}`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("user_tasks")
      .select("task_id, description, due_date, status, created_at")
      .eq("user_id", userId)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(20),
  ]);

  // Match briefs to deals (one brief per deal, most recent)
  const briefsByDeal = new Map<string, DealBrief>();
  for (const brief of (briefsResult.data as DealBrief[]) || []) {
    if (!briefsByDeal.has(brief.deal_id)) {
      briefsByDeal.set(brief.deal_id, brief);
    }
  }

  const dealBriefs = pipeline.activeDeals
    .filter((d) => briefsByDeal.has(d.deal_id))
    .map((d) => ({ deal: d, brief: briefsByDeal.get(d.deal_id)! }));

  // Neglected playbook items — not touched in 30+ days and not completed
  const neglectedPlaybookItems = pipeline.playbook.filter(
    (p) =>
      p.status !== "completed" &&
      p.status !== "deprecated" &&
      (!p.last_touched || p.last_touched < thirtyDaysAgo)
  );

  // Helper to map raw meeting note rows to summaries
  function mapMeetingNotes(rows: Record<string, unknown>[]): MeetingNoteSummary[] {
    return rows.map((n) => ({
      note_id: n.note_id as string,
      title: n.title as string,
      meeting_date: n.meeting_date as string,
      meeting_type: n.meeting_type as string,
      attendees: (n.attendees as MeetingAttendee[]) || [],
      ai_summary:
        (n.ai_summary as string) ||
        truncateAtSentence(n.content as string, 500) ||
        null,
      action_items:
        (n.action_items as {
          description: string;
          owner: string;
          due_date?: string;
        }[]) || [],
      tags: (n.tags as string[]) || [],
      deal_id: (n.deal_id as string) || null,
    }));
  }

  // Map recent (past) meeting notes
  let recentMeetingNotes: MeetingNoteSummary[] = [];
  if (meetingNotesResult.error) {
    console.error("[rag/retriever] Error fetching meeting notes for briefing:", meetingNotesResult.error.message);
  } else {
    recentMeetingNotes = mapMeetingNotes((meetingNotesResult.data as Record<string, unknown>[]) || []);
  }

  // Map upcoming meeting notes
  let upcomingMeetingNotes: MeetingNoteSummary[] = [];
  if (upcomingMeetingsResult.error) {
    console.error("[rag/retriever] Error fetching upcoming meetings for briefing:", upcomingMeetingsResult.error.message);
  } else {
    upcomingMeetingNotes = mapMeetingNotes((upcomingMeetingsResult.data as Record<string, unknown>[]) || []);
  }

  // Thread alerts: stale deal threads + overdue follow-ups
  let threadAlerts: ThreadAlertSummary[] = [];
  try {
    const sevenDaysAgoDate = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: staleThreads } = await supabase
      .from("coaching_threads")
      .select(`
        thread_id, title, deal_id, last_message_at,
        deals:deal_id (company)
      `)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .lt("last_message_at", sevenDaysAgoDate)
      .not("deal_id", "is", null)
      .order("last_message_at", { ascending: true })
      .limit(10);

    const { data: overdueFollowUps } = await supabase
      .from("thread_follow_ups")
      .select("thread_id, description, due_date")
      .eq("user_id", userId)
      .eq("status", "open")
      .not("due_date", "is", null)
      .lt("due_date", todayStr);

    // Build a map of overdue follow-ups by thread
    const overdueByThread = new Map<string, { description: string; due_date: string | null }[]>();
    for (const fu of overdueFollowUps || []) {
      if (!overdueByThread.has(fu.thread_id)) {
        overdueByThread.set(fu.thread_id, []);
      }
      overdueByThread.get(fu.thread_id)!.push({
        description: fu.description,
        due_date: fu.due_date,
      });
    }

    // Get all open follow-up counts for threads with overdue items
    const threadsWithOverdue = Array.from(overdueByThread.keys());
    let openCountByThread = new Map<string, number>();
    if (threadsWithOverdue.length > 0) {
      const { data: openFollowUps } = await supabase
        .from("thread_follow_ups")
        .select("thread_id")
        .eq("user_id", userId)
        .eq("status", "open")
        .in("thread_id", threadsWithOverdue);

      for (const fu of openFollowUps || []) {
        openCountByThread.set(fu.thread_id, (openCountByThread.get(fu.thread_id) || 0) + 1);
      }
    }

    // Merge stale threads and threads with overdue follow-ups
    const alertThreadIds = new Set<string>();
    const alerts: ThreadAlertSummary[] = [];

    for (const t of staleThreads || []) {
      alertThreadIds.add(t.thread_id);
      const dealArr = t.deals as unknown as { company: string }[] | null;
      const dealData = dealArr?.[0] ?? null;
      const daysSince = Math.floor(
        (Date.now() - new Date(t.last_message_at).getTime()) / 86400000
      );
      alerts.push({
        thread_id: t.thread_id,
        title: t.title,
        deal_company: dealData?.company ?? null,
        days_stale: daysSince,
        overdue_follow_ups: overdueByThread.get(t.thread_id) || [],
        open_follow_up_count: openCountByThread.get(t.thread_id) || 0,
      });
    }

    // Add threads with overdue follow-ups that aren't already in the stale list
    for (const [threadId, overdueFUs] of overdueByThread.entries()) {
      if (alertThreadIds.has(threadId)) continue;
      // Fetch thread title
      const { data: threadData } = await supabase
        .from("coaching_threads")
        .select("title, deal_id, deals:deal_id (company)")
        .eq("thread_id", threadId)
        .eq("user_id", userId)
        .maybeSingle();

      if (threadData) {
        const dealArr = threadData.deals as unknown as { company: string }[] | null;
        const dealData = dealArr?.[0] ?? null;
        alerts.push({
          thread_id: threadId,
          title: threadData.title,
          deal_company: dealData?.company ?? null,
          days_stale: 0,
          overdue_follow_ups: overdueFUs,
          open_follow_up_count: openCountByThread.get(threadId) || overdueFUs.length,
        });
      }
    }

    threadAlerts = alerts;
  } catch (err) {
    console.error("[rag/retriever] Error fetching thread alerts:", err);
  }

  return {
    pipeline,
    dealBriefs,
    competitiveIntel: (competitiveResult.data as CompetitiveIntel[]) || [],
    neglectedPlaybookItems,
    recentMeetingNotes,
    upcomingMeetingNotes,
    activeNudges: (nudgesResult.data as Nudge[]) || [],
    recentStrategicNotes: (strategicNotesResult.data as StrategicNote[]) || [],
    userTasks: (userTasksResult.data as UserTask[]) || [],
    threadAlerts,
  };
}

// ── Conversation Retrieval (for summarization) ─────────────────────────

/**
 * Retrieve conversations that need AI summarization.
 * Used by the summarizer to process un-summarized conversations.
 */
export async function retrieveUnsummarizedConversations(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number } = {}
): Promise<Conversation[]> {
  const limit = options.limit ?? 50;

  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", userId)
    .is("ai_summary", null)
    .not("raw_text", "is", null)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[rag/retriever] Error fetching unsummarized conversations:", error.message);
    return [];
  }

  return (data as Conversation[]) || [];
}

/**
 * Retrieve all conversations for a deal, with raw_text included.
 * Used ONLY by the summarizer for deal brief generation — never for agent prompts.
 */
export async function retrieveDealConversationsForBrief(
  supabase: SupabaseClient,
  userId: string,
  dealId: string
): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("deal_id", dealId)
    .eq("user_id", userId)
    .not("ai_summary", "is", null)
    .order("date", { ascending: true });

  if (error) {
    console.error("[rag/retriever] Error fetching deal conversations for brief:", error.message);
    return [];
  }

  return (data as Conversation[]) || [];
}

// ── Overdue Action Items Retrieval ────────────────────────────────────

/** Overdue action item with resolved deal/contact context and days past due. */
export interface OverdueActionItemWithContext {
  item: ActionItem;
  dealCompany: string | null;
  contactName: string | null;
  daysPastDue: number;
}

/**
 * Retrieve all overdue action items with deal/contact context for escalation.
 * Used by the Follow-Up Enforcer.
 */
export async function retrieveOverdueActionItems(
  supabase: SupabaseClient,
  userId: string
): Promise<OverdueActionItemWithContext[]> {
  const now = new Date();
  const nowStr = now.toISOString();

  const { data, error } = await supabase
    .from("action_items")
    .select("*")
    .eq("user_id", userId)
    .in("status", ["pending", "overdue"])
    .not("due_date", "is", null)
    .lt("due_date", nowStr)
    .order("due_date", { ascending: true })
    .limit(200);

  if (error) {
    console.error(
      "[rag/retriever] Error fetching overdue action items:",
      error.message
    );
    return [];
  }

  const items = (data as ActionItem[]) || [];
  if (items.length === 0) return [];

  // Resolve deal companies and contact names in parallel
  const dealIds = [
    ...new Set(items.filter((i) => i.deal_id).map((i) => i.deal_id!)),
  ];
  const contactIds = [
    ...new Set(items.filter((i) => i.contact_id).map((i) => i.contact_id!)),
  ];

  const [dealsResult, contactsResult] = await Promise.all([
    dealIds.length > 0
      ? supabase
          .from("deals")
          .select("deal_id, company")
          .eq("user_id", userId)
          .in("deal_id", dealIds)
      : Promise.resolve({ data: [], error: null }),
    contactIds.length > 0
      ? supabase
          .from("contacts")
          .select("contact_id, name")
          .eq("user_id", userId)
          .in("contact_id", contactIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const dealMap = new Map(
    ((dealsResult.data as { deal_id: string; company: string }[]) || []).map(
      (d) => [d.deal_id, d.company]
    )
  );
  const contactMap = new Map(
    (
      (contactsResult.data as { contact_id: string; name: string }[]) || []
    ).map((c) => [c.contact_id, c.name])
  );

  return items.map((item) => {
    const dueDate = new Date(item.due_date!);
    const daysPastDue = businessDaysBetween(dueDate, now);

    return {
      item,
      dealCompany: item.deal_id ? dealMap.get(item.deal_id) ?? null : null,
      contactName: item.contact_id
        ? contactMap.get(item.contact_id) ?? null
        : null,
      daysPastDue,
    };
  });
}

// ── Competitive Intel Retrieval ──────────────────────────────────────

/**
 * Retrieve all competitive intel for a specific competitor.
 * Used by the Competitive Watcher for battle card generation.
 */
export async function retrieveCompetitorIntel(
  supabase: SupabaseClient,
  userId: string,
  competitor: string
): Promise<CompetitiveIntel[]> {
  const { data, error } = await supabase
    .from("competitive_intel")
    .select("*")
    .eq("user_id", userId)
    .ilike("competitor", escapeIlike(competitor))
    .order("captured_date", { ascending: false })
    .limit(50);

  if (error) {
    console.error(
      "[rag/retriever] Error fetching competitor intel:",
      error.message
    );
    return [];
  }

  return (data as CompetitiveIntel[]) || [];
}

// ── Prospect Retrieval ─────────────────────────────────────────────────

/**
 * Retrieve prospects for The Strategist's suggestions.
 */
export async function retrieveProspects(
  supabase: SupabaseClient,
  userId: string,
  options: { limit?: number; icpCategory?: string } = {}
): Promise<Prospect[]> {
  const limit = options.limit ?? 10;

  let query = supabase
    .from("prospects")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.icpCategory) {
    query = query.eq("icp_category", options.icpCategory);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[rag/retriever] Error fetching prospects:", error.message);
    return [];
  }

  return (data as Prospect[]) || [];
}

// ── Meeting Notes Retrieval ──────────────────────────────────────────

/**
 * Retrieve recent meeting notes for The Strategist's general context.
 * Returns ai_summary when available, falls back to truncated content.
 */
export async function retrieveMeetingContext(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit?: number;
    attendeeName?: string;
    dealId?: string;
  } = {}
): Promise<MeetingNoteSummary[]> {
  const limit = options.limit ?? 15;

  let query = supabase
    .from("meeting_notes")
    .select(
      "note_id, title, meeting_date, meeting_type, attendees, ai_summary, content, action_items, tags, deal_id"
    )
    .eq("user_id", userId)
    .order("meeting_date", { ascending: false })
    .limit(limit);

  if (options.dealId) {
    query = query.eq("deal_id", options.dealId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "[rag/retriever] Error fetching meeting notes:",
      error.message
    );
    return [];
  }

  let notes = (data as Record<string, unknown>[]) ?? [];

  // Filter by attendee name client-side (JSONB containment is possible but simpler here)
  if (options.attendeeName) {
    const name = options.attendeeName.toLowerCase();
    notes = notes.filter((n) => {
      const attendees = Array.isArray(n.attendees)
        ? (n.attendees as MeetingAttendee[])
        : [];
      return attendees.some((a) => a.name.toLowerCase().includes(name));
    });
  }

  return notes.map((n) => ({
    note_id: n.note_id as string,
    title: n.title as string,
    meeting_date: n.meeting_date as string,
    meeting_type: n.meeting_type as string,
    attendees: (n.attendees as MeetingAttendee[]) || [],
    ai_summary:
      (n.ai_summary as string) ||
      truncateAtSentence(n.content as string, 500) ||
      null,
    action_items:
      (n.action_items as {
        description: string;
        owner: string;
        due_date?: string;
      }[]) || [],
    tags: (n.tags as string[]) || [],
    deal_id: (n.deal_id as string) || null,
  }));
}

// ── Strategic Context Retrieval ─────────────────────────────────────

/**
 * Retrieve strategic context for The Strategist's coaching mode.
 * This is the coaching equivalent of retrieveBriefingContext().
 */
export async function retrieveStrategicContext(
  supabase: SupabaseClient,
  userId: string,
  options: {
    category?: NoteCategory;
    stakeholderName?: string;
    dealId?: string;
    limit?: number;
  } = {}
): Promise<StrategicContextResult> {
  const noteLimit = options.limit ?? 20;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Build strategic notes query: recent (30 days) + foundational (always)
  let notesQuery = supabase
    .from("strategic_notes")
    .select("*")
    .eq("user_id", userId)
    .or(`created_at.gte.${thirtyDaysAgo},tags.cs.{foundational}`)
    .order("created_at", { ascending: false })
    .limit(noteLimit);

  if (options.category) {
    notesQuery = notesQuery.eq("category", options.category);
  }
  if (options.dealId) {
    notesQuery = notesQuery.eq("related_deal_id", options.dealId);
  }

  const [notesResult, stakeholdersResult, nudgesResult, coachingResult] =
    await Promise.all([
      notesQuery,
      supabase
        .from("stakeholders")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true }),
      supabase
        .from("nudges")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("coaching_conversations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  let strategicNotes = (notesResult.data as StrategicNote[]) || [];

  // If stakeholderName is specified, filter notes by matching stakeholder
  if (options.stakeholderName) {
    const stakeholders = (stakeholdersResult.data as Stakeholder[]) || [];
    const matchName = options.stakeholderName.toLowerCase();
    // Prefer exact match, then startsWith, then includes
    const matchedStakeholder =
      stakeholders.find(
        (s) => s.name.toLowerCase() === matchName
      ) ??
      stakeholders.find((s) =>
        s.name.toLowerCase().startsWith(matchName)
      ) ??
      stakeholders.find((s) =>
        s.name.toLowerCase().includes(matchName)
      );
    if (matchedStakeholder) {
      // Also fetch notes linked to this stakeholder (may overlap, dedup)
      const { data: linkedNotes } = await supabase
        .from("strategic_notes")
        .select("*")
        .eq("user_id", userId)
        .eq("related_stakeholder_id", matchedStakeholder.stakeholder_id)
        .order("created_at", { ascending: false })
        .limit(noteLimit);
      if (linkedNotes) {
        const existingIds = new Set(strategicNotes.map((n) => n.note_id));
        for (const note of linkedNotes as StrategicNote[]) {
          if (!existingIds.has(note.note_id)) {
            strategicNotes.push(note);
          }
        }
      }
    }
  }

  return {
    strategicNotes,
    stakeholders: (stakeholdersResult.data as Stakeholder[]) || [],
    activeNudges: (nudgesResult.data as Nudge[]) || [],
    recentCoachingHistory: (
      (coachingResult.data as CoachingMessage[]) || []
    ).reverse(),
  };
}

/**
 * Retrieve deep context on a specific stakeholder.
 * Gathers the stakeholder record, related notes, meetings, and conversations.
 */
/** Escape ILIKE special characters to prevent wildcard injection. */
function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, "\\$&");
}

export async function retrieveStakeholderContext(
  supabase: SupabaseClient,
  userId: string,
  stakeholderName: string
): Promise<StakeholderContextResult | null> {
  // Try exact match first, then fall back to partial match
  let { data: stakeholderData } = await supabase
    .from("stakeholders")
    .select("*")
    .eq("user_id", userId)
    .ilike("name", escapeIlike(stakeholderName))
    .maybeSingle();

  if (!stakeholderData) {
    ({ data: stakeholderData } = await supabase
      .from("stakeholders")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", `%${escapeIlike(stakeholderName)}%`)
      .order("name", { ascending: true })
      .limit(1)
      .maybeSingle());
  }

  if (!stakeholderData) return null;
  const stakeholder = stakeholderData as Stakeholder;

  // Parallel fetch: related notes, meetings where this person attended, conversations via linked contact
  const [notesResult, meetingNotes, conversationsResult] = await Promise.all([
    supabase
      .from("strategic_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("related_stakeholder_id", stakeholder.stakeholder_id)
      .order("created_at", { ascending: false })
      .limit(20),
    retrieveMeetingContext(supabase, userId, {
      attendeeName: stakeholder.name,
      limit: 10,
    }),
    stakeholder.related_contact_id
      ? supabase
          .from("conversations")
          .select(
            "conversation_id, contact_id, deal_id, date, channel, subject, ai_summary, action_items, follow_up_date"
          )
          .eq("user_id", userId)
          .eq("contact_id", stakeholder.related_contact_id)
          .order("date", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const relatedConversations: ConversationSummary[] = (
    (conversationsResult.data as Conversation[]) || []
  ).map((c) => ({
    conversation_id: c.conversation_id,
    contact_id: c.contact_id,
    deal_id: c.deal_id,
    date: c.date,
    channel: c.channel,
    subject: c.subject,
    ai_summary: c.ai_summary,
    action_items: c.action_items || [],
    follow_up_date: c.follow_up_date,
  }));

  return {
    stakeholder,
    relatedNotes: (notesResult.data as StrategicNote[]) || [],
    relatedMeetings: meetingNotes,
    relatedConversations,
  };
}

/**
 * Retrieve everything needed to prepare for a meeting.
 * Fetches stakeholder context for each attendee, plus deal context and relevant nudges.
 */
export async function retrieveMeetingPrepContext(
  supabase: SupabaseClient,
  userId: string,
  attendeeNames: string[],
  dealId?: string
): Promise<MeetingPrepContextResult> {
  // Cap attendee lookups to prevent unbounded parallel queries
  const MAX_ATTENDEE_LOOKUPS = 10;
  const namesToLookup = attendeeNames.slice(0, MAX_ATTENDEE_LOOKUPS);
  const stakeholderContextPromises = namesToLookup.map((name) =>
    retrieveStakeholderContext(supabase, userId, name)
  );

  // Use allSettled for stakeholder lookups so one failure doesn't crash everything
  const [stakeholderSettled, dealContext, nudgesResult, notesResult] =
    await Promise.all([
      Promise.allSettled(stakeholderContextPromises),
      dealId
        ? retrieveDealContext(supabase, userId, dealId)
        : Promise.resolve(null),
      supabase
        .from("nudges")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("priority", { ascending: false })
        .limit(5),
      supabase
        .from("strategic_notes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  // Filter out nulls and failures
  const stakeholderContexts = stakeholderSettled
    .filter(
      (r): r is PromiseFulfilledResult<StakeholderContextResult | null> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter((ctx): ctx is StakeholderContextResult => ctx !== null);

  return {
    stakeholderContexts,
    dealContext,
    relevantNudges: (nudgesResult.data as Nudge[]) || [],
    recentStrategicNotes: (notesResult.data as StrategicNote[]) || [],
  };
}

// ── Meeting Notes Search ───────────────────────────────────────────

/**
 * Full-text search across meeting notes using PostgreSQL tsvector.
 */
export async function searchMeetingNotes(
  supabase: SupabaseClient,
  userId: string,
  searchQuery: string,
  options: { limit?: number } = {}
): Promise<MeetingNoteSummary[]> {
  const limit = options.limit ?? 20;

  // Convert to tsquery-compatible format (strip special chars to prevent syntax errors)
  const tsquery = searchQuery
    .trim()
    .replace(/[!|&():*<>\\'"]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" & ");

  if (!tsquery) return [];

  const { data, error } = await supabase
    .from("meeting_notes")
    .select(
      "note_id, title, meeting_date, meeting_type, attendees, ai_summary, content, action_items, tags, deal_id"
    )
    .eq("user_id", userId)
    .textSearch("search_vector", tsquery)
    .order("meeting_date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      "[rag/retriever] Meeting notes search error:",
      error.message
    );
    return [];
  }

  return ((data as Record<string, unknown>[]) ?? []).map((n) => ({
    note_id: n.note_id as string,
    title: n.title as string,
    meeting_date: n.meeting_date as string,
    meeting_type: n.meeting_type as string,
    attendees: (n.attendees as MeetingAttendee[]) || [],
    ai_summary:
      (n.ai_summary as string) ||
      truncateAtSentence(n.content as string, 500) ||
      null,
    action_items:
      (n.action_items as {
        description: string;
        owner: string;
        due_date?: string;
      }[]) || [],
    tags: (n.tags as string[]) || [],
    deal_id: (n.deal_id as string) || null,
  }));
}

// ── Tradeshow Context Retrieval ──────────────────────────────────────

/** Context for tradeshow sponsor analysis. */
export interface TradeshowContextResult {
  activeDeals: Deal[];
  prospects: Prospect[];
  competitiveIntel: CompetitiveIntel[];
}

/**
 * Retrieve context needed for tradeshow sponsor analysis.
 * Fetches active deals, prospects, and competitive intel
 * so the agent can flag overlaps and known competitors.
 */
export async function retrieveTradeshowContext(
  supabase: SupabaseClient,
  userId: string
): Promise<TradeshowContextResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [dealsResult, prospectsResult, intelResult] = await Promise.all([
    supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .in("stage", ["lead", "qualified", "discovery", "poc_trial", "proposal", "negotiation"])
      .order("last_activity_date", { ascending: false }),
    supabase
      .from("prospects")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("competitive_intel")
      .select("*")
      .eq("user_id", userId)
      .gte("captured_date", thirtyDaysAgo)
      .order("captured_date", { ascending: false })
      .limit(50),
  ]);

  if (dealsResult.error) {
    console.error("[rag/retriever] Error fetching deals for tradeshow context:", dealsResult.error.message);
  }
  if (prospectsResult.error) {
    console.error("[rag/retriever] Error fetching prospects for tradeshow context:", prospectsResult.error.message);
  }
  if (intelResult.error) {
    console.error("[rag/retriever] Error fetching competitive intel for tradeshow context:", intelResult.error.message);
  }

  return {
    activeDeals: (dealsResult.data as Deal[]) || [],
    prospects: (prospectsResult.data as Prospect[]) || [],
    competitiveIntel: (intelResult.data as CompetitiveIntel[]) || [],
  };
}
