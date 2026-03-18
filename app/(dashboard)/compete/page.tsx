import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { CompeteView } from "@/components/compete/compete-view";
import type { CompetitiveIntel, CompetitorComparison, SubscriptionTier } from "@/types/database";

export default async function CompetePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [intelResult, subscriptionResult, comparisonsResult] = await Promise.all([
    supabase
      .from("competitive_intel")
      .select("*")
      .eq("user_id", user.id)
      .order("competitor")
      .order("category"),
    supabase
      .from("subscriptions")
      .select("tier")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("competitor_comparisons")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  const intel = (intelResult.data as CompetitiveIntel[]) ?? [];
  const comparisons = (comparisonsResult.data as CompetitorComparison[]) ?? [];
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? 'power';
  const hasAiAccess = PLANS[userTier].limits.aiBriefings;

  // Group by competitor
  const grouped = intel.reduce(
    (acc, item) => {
      if (!acc[item.competitor]) acc[item.competitor] = [];
      acc[item.competitor].push(item);
      return acc;
    },
    {} as Record<string, CompetitiveIntel[]>
  );

  const competitors = Object.entries(grouped);
  const competitorNames = Object.keys(grouped);

  return (
    <CompeteView
      competitors={competitors}
      competitorNames={competitorNames}
      comparisons={comparisons}
      hasAiAccess={hasAiAccess}
    />
  );
}
