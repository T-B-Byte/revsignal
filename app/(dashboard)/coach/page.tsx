import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { CoachingChat } from "@/components/coaching/coaching-chat";
import type { SubscriptionTier, CoachingMessage, Deal, Stakeholder } from "@/types/database";
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

  // Parallel fetch: subscription, recent coaching history, active deals, stakeholders
  const [subscriptionResult, historyResult, dealsResult, stakeholdersResult] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("tier, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("coaching_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("deals")
        .select("deal_id, company, stage")
        .eq("user_id", user.id)
        .in("stage", ACTIVE_STAGES)
        .order("last_activity_date", { ascending: false }),
      supabase
        .from("stakeholders")
        .select("stakeholder_id, name, role, organization")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
    ]);

  const tier: SubscriptionTier = subscriptionResult.data?.tier ?? "free";
  const hasAiAccess = PLANS[tier].limits.aiBriefings;

  // Reverse history so oldest first (display order)
  const coachingHistory = (
    (historyResult.data as CoachingMessage[]) || []
  ).reverse();

  const activeDeals = (dealsResult.data as Pick<Deal, "deal_id" | "company" | "stage">[]) || [];
  const stakeholders = (stakeholdersResult.data as Pick<Stakeholder, "stakeholder_id" | "name" | "role" | "organization">[]) || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">The Strategist</h1>
        <p className="text-sm text-text-secondary">
          Your strategic advisor for deals, stakeholders, meeting prep, and role
          strategy.
        </p>
      </div>

      <CoachingChat
        hasAiAccess={hasAiAccess}
        initialHistory={coachingHistory}
        activeDeals={activeDeals}
        stakeholders={stakeholders}
      />
    </div>
  );
}
