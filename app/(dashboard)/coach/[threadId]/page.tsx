import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { CoachShell } from "../coach-shell";
import { ThreadChat } from "@/components/coaching/thread-chat";
import type {
  SubscriptionTier,
  CoachingThreadWithDeal,
  CoachingMessage,
  Deal,
} from "@/types/database";
import { ACTIVE_STAGES } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { title: "StrategyGPT | RevSignal" };
  }

  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("title")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    title: thread ? `${thread.title} | StrategyGPT | RevSignal` : "StrategyGPT | RevSignal",
  };
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const tier: SubscriptionTier = subscription?.tier ?? "power";
  if (!PLANS[tier].limits.aiBriefings) {
    redirect("/coach");
  }

  // Parallel fetch: current thread, all threads (for sidebar), active deals, messages
  const [threadResult, threadsResult, dealsResult, messagesResult] =
    await Promise.all([
      supabase
        .from("coaching_threads")
        .select(`
          *,
          deals:deal_id (deal_id, company, stage),
          ma_entities:ma_entity_id (entity_id, company, entity_type, stage),
          projects:project_id (project_id, name, status, category),
          contacts:contact_id (contact_id, name, company, role)
        `)
        .eq("thread_id", threadId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("coaching_threads")
        .select(`
          *,
          deals:deal_id (deal_id, company, stage),
          ma_entities:ma_entity_id (entity_id, company, entity_type, stage),
          projects:project_id (project_id, name, status, category),
          contacts:contact_id (contact_id, name, company, role)
        `)
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false }),
      supabase
        .from("deals")
        .select("deal_id, company, stage")
        .eq("user_id", user.id)
        .in("stage", ACTIVE_STAGES)
        .order("last_activity_date", { ascending: false }),
      supabase
        .from("coaching_conversations")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(50),
    ]);

  if (!threadResult.data) {
    notFound();
  }

  const currentThread = threadResult.data as CoachingThreadWithDeal;
  const threads = (threadsResult.data ?? []) as CoachingThreadWithDeal[];
  const activeDeals =
    (dealsResult.data as Pick<Deal, "deal_id" | "company" | "stage">[]) || [];
  const messages = (messagesResult.data as CoachingMessage[]) || [];

  // Enrich threads with follow-up counts and task counts
  const threadIds = threads.map((t) => t.thread_id);
  if (threadIds.length > 0) {
    const [{ data: followUps }, { data: taskRows }] = await Promise.all([
      supabase
        .from("thread_follow_ups")
        .select("thread_id, due_date")
        .eq("user_id", user.id)
        .eq("status", "open")
        .in("thread_id", threadIds),
      // Count open tasks per thread by joining through source_message_id
      supabase
        .from("user_tasks")
        .select("source_message_id, coaching_conversations!inner(thread_id)")
        .eq("user_id", user.id)
        .eq("status", "open")
        .not("source_message_id", "is", null),
    ]);

    if (followUps) {
      const today = new Date().toISOString().split("T")[0];
      const counts: Record<string, { count: number; has_overdue: boolean }> =
        {};
      for (const fu of followUps) {
        if (!counts[fu.thread_id]) {
          counts[fu.thread_id] = { count: 0, has_overdue: false };
        }
        counts[fu.thread_id].count++;
        if (fu.due_date && fu.due_date < today) {
          counts[fu.thread_id].has_overdue = true;
        }
      }
      for (const t of threads) {
        t.open_follow_up_count = counts[t.thread_id]?.count ?? 0;
        t.has_overdue = counts[t.thread_id]?.has_overdue ?? false;
      }
    }

    if (taskRows) {
      const taskCounts: Record<string, number> = {};
      for (const row of taskRows as unknown as { coaching_conversations: { thread_id: string } }[]) {
        const conv = row.coaching_conversations;
        const tid = Array.isArray(conv) ? conv[0]?.thread_id : conv?.thread_id;
        if (tid && threadIds.includes(tid)) {
          taskCounts[tid] = (taskCounts[tid] ?? 0) + 1;
        }
      }
      for (const t of threads) {
        t.open_task_count = taskCounts[t.thread_id] ?? 0;
      }
    }
  }

  // Get deal company name for the header
  const dealCompany =
    currentThread.deals &&
    typeof currentThread.deals === "object" &&
    "company" in currentThread.deals
      ? (currentThread.deals as { company: string }).company
      : null;

  return (
    <CoachShell threads={threads} activeDeals={activeDeals}>
      <ThreadChat
        thread={currentThread}
        initialMessages={messages}
        dealCompany={dealCompany}
        activeDeals={activeDeals}
      />
    </CoachShell>
  );
}
