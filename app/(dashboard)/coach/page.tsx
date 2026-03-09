import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { CoachShell } from "./coach-shell";
import type { SubscriptionTier, CoachingThreadWithDeal, Deal } from "@/types/database";
import { ACTIVE_STAGES } from "@/types/database";

export const metadata = {
  title: "Coach | RevSignal",
  description: "Strategic coaching from The Strategist.",
};

export default async function CoachPage() {
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
  const hasAiAccess = PLANS[tier].limits.aiBriefings;

  if (!hasAiAccess) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-surface-tertiary p-6 text-center">
          <p className="text-sm text-text-muted">
            Coaching is available on the Power plan.
          </p>
          <a
            href="/settings"
            className="mt-2 inline-block text-sm font-medium text-accent-primary hover:underline"
          >
            Upgrade your plan
          </a>
        </div>
      </div>
    );
  }

  // Parallel fetch: threads + active deals
  const [threadsResult, dealsResult] = await Promise.all([
    supabase
      .from("coaching_threads")
      .select(`
        *,
        deals:deal_id (deal_id, company, stage)
      `)
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false }),
    supabase
      .from("deals")
      .select("deal_id, company, stage")
      .eq("user_id", user.id)
      .in("stage", ACTIVE_STAGES)
      .order("last_activity_date", { ascending: false }),
  ]);

  // Fetch follow-up counts
  const threads = (threadsResult.data ?? []) as CoachingThreadWithDeal[];
  const threadIds = threads.map((t) => t.thread_id);

  if (threadIds.length > 0) {
    const { data: followUps } = await supabase
      .from("thread_follow_ups")
      .select("thread_id, due_date")
      .eq("user_id", user.id)
      .eq("status", "open")
      .in("thread_id", threadIds);

    if (followUps) {
      const today = new Date().toISOString().split("T")[0];
      const counts: Record<string, { count: number; has_overdue: boolean }> = {};
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
  }

  const activeDeals = (dealsResult.data as Pick<Deal, "deal_id" | "company" | "stage">[]) || [];

  return (
    <CoachShell threads={threads} activeDeals={activeDeals}>
      {/* Default empty state when no thread is selected */}
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-text-primary">
            The Strategist
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Select a thread or start a new one.
          </p>
          <p className="mt-3 text-xs text-text-muted">
            Each thread remembers your conversation history, tracks follow-ups,
            and gives you coaching tailored to the context.
          </p>
        </div>
      </div>
    </CoachShell>
  );
}
