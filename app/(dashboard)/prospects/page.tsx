import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { ProspectsView } from "@/components/prospects/prospects-view";
import type { Prospect, SubscriptionTier } from "@/types/database";

export default async function ProspectsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [prospectsResult, subscriptionResult] = await Promise.all([
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
  ]);

  const prospects = (prospectsResult.data as Prospect[]) ?? [];
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? "free";
  const hasResearchAccess = PLANS[userTier].limits.prospectSearches > 0;

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
    />
  );
}
