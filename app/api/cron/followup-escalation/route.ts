import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanForOverdueItems } from "@/lib/agents/follow-up-enforcer";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";

/**
 * POST /api/cron/followup-escalation
 *
 * Cron job: scans all Power-tier users' action items for overdue items
 * and escalates them (green → yellow → red).
 * Scheduled daily at 9:00 AM.
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
      "[cron/followup-escalation] Failed to fetch subscriptions:",
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
  let totalEscalated = 0;

  for (const sub of powerUsers) {
    try {
      const result = await scanForOverdueItems(supabase, sub.user_id);
      succeeded++;
      totalEscalated += result.escalated.length;
    } catch (error) {
      console.error(
        `[cron/followup-escalation] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      failed++;
    }
  }

  return NextResponse.json({
    message: `Escalation scan: ${succeeded} users processed, ${failed} failed, ${totalEscalated} items escalated`,
    processed: succeeded + failed,
    totalEscalated,
  });
}
