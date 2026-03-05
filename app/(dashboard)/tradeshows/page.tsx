import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLANS } from "@/lib/stripe/config";
import { TradeshowsView } from "@/components/tradeshows/tradeshows-view";
import type { Tradeshow, TradeshowTarget, SubscriptionTier } from "@/types/database";

export default async function TradeshowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [tradeshowsResult, targetsResult, subscriptionResult] =
    await Promise.all([
      supabase
        .from("tradeshows")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("tradeshow_targets")
        .select("target_id, tradeshow_id, priority")
        .eq("user_id", user.id),
      supabase
        .from("subscriptions")
        .select("tier")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  const tradeshows = (tradeshowsResult.data as Tradeshow[]) ?? [];
  const targets = (targetsResult.data as Pick<TradeshowTarget, "target_id" | "tradeshow_id" | "priority">[]) ?? [];
  const userTier: SubscriptionTier = subscriptionResult.data?.tier ?? "power";
  const hasAccess = PLANS[userTier].limits.aiBriefings;

  // Group targets by tradeshow for card stats
  const targetsByTradeshow: Record<string, TradeshowTarget[]> = {};
  for (const target of targets) {
    if (!targetsByTradeshow[target.tradeshow_id]) {
      targetsByTradeshow[target.tradeshow_id] = [];
    }
    targetsByTradeshow[target.tradeshow_id].push(target as TradeshowTarget);
  }

  return (
    <TradeshowsView
      tradeshows={tradeshows}
      targetsByTradeshow={targetsByTradeshow}
      hasAccess={hasAccess}
    />
  );
}
