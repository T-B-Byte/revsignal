import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { ProspectsView } from "@/components/prospects/prospects-view";
import type { Prospect, CoachingThread, CoachingMessage, Deal, SubscriptionTier } from "@/types/database";

export default async function ProspectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [prospectsResult, subscriptionResult, threadsResult, dealsResult] = await Promise.all([
    supabase
      .from("prospects")
      .select("*")
      .eq("user_id", user.id)
      .order("last_researched_date", { ascending: false, nullsFirst: false }),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    // Fetch coaching threads linked to prospects
    supabase
      .from("coaching_threads")
      .select("*")
      .eq("user_id", user.id)
      .not("prospect_id", "is", null),
    // Fetch active deals for Strategist context
    supabase
      .from("deals")
      .select("deal_id, company, stage")
      .eq("user_id", user.id)
      .not("stage", "in", "(closed_won,closed_lost)"),
  ]);

  const prospects = (prospectsResult.data as Prospect[]) ?? [];
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? 'power';
  const hasResearchAccess = PLANS[userTier].limits.prospectSearches > 0;
  const prospectThreads = (threadsResult.data as CoachingThread[]) ?? [];
  const activeDeals = (dealsResult.data as Pick<Deal, "deal_id" | "company" | "stage">[]) ?? [];

  // Build a map of prospect_id → thread for quick lookup
  const threadsByProspect: Record<string, CoachingThread> = {};
  for (const thread of prospectThreads) {
    if (thread.prospect_id) {
      threadsByProspect[thread.prospect_id] = thread;
    }
  }

  // Fetch messages for prospect threads (cap at 500 total to bound page load)
  const threadIds = prospectThreads.map((t) => t.thread_id);
  let messagesByThread: Record<string, CoachingMessage[]> = {};

  if (threadIds.length > 0) {
    const { data: messages } = await supabase
      .from("coaching_conversations")
      .select("*")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: true })
      .limit(500);

    if (messages) {
      for (const msg of messages as CoachingMessage[]) {
        if (msg.thread_id) {
          if (!messagesByThread[msg.thread_id]) {
            messagesByThread[msg.thread_id] = [];
          }
          messagesByThread[msg.thread_id].push(msg);
        }
      }
    }
  }

  // Extract unique ICP categories for filtering
  const icpCategories = Array.from(
    new Set(
      prospects
        .map((p) => p.icp_category)
        .filter((c): c is string => c !== null)
    )
  ).sort();

  return (
    <ProspectsView
      prospects={prospects}
      icpCategories={icpCategories}
      hasResearchAccess={hasResearchAccess}
      threadsByProspect={threadsByProspect}
      messagesByThread={messagesByThread}
      activeDeals={activeDeals}
    />
  );
}
