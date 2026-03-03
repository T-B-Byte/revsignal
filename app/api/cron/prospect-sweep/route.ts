import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestProspects } from "@/lib/agents/prospect-scout";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";

/**
 * POST /api/cron/prospect-sweep
 *
 * Cron job: runs prospect suggestion analysis for all Power-tier users.
 * Identifies pipeline gaps and suggests ICP categories to focus on.
 * Scheduled Monday at 8:00 AM.
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find all users with active Power subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, tier")
    .eq("status", "active");

  if (subError) {
    console.error(
      "[cron/prospect-sweep] Failed to fetch subscriptions:",
      subError.message
    );
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const powerUsers = (subscriptions ?? []).filter(
    (s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings
  );

  if (powerUsers.length === 0) {
    return NextResponse.json({ message: "No eligible users", processed: 0 });
  }

  let succeeded = 0;
  let failed = 0;

  for (const sub of powerUsers) {
    try {
      await suggestProspects(supabase, sub.user_id);
      succeeded++;
    } catch (error) {
      console.error(
        `[cron/prospect-sweep] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      failed++;
    }
  }

  return NextResponse.json({
    message: `Prospect sweep: ${succeeded} users processed, ${failed} failed`,
    processed: succeeded + failed,
  });
}
