import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMorningBriefing } from "@/lib/agents/strategist";
import { processUnsummarizedConversations } from "@/lib/rag/summarizer";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";

/**
 * POST /api/cron/morning-briefing
 *
 * Cron job: generates morning briefings for all Power-tier users.
 * Scheduled daily at 7:00 AM.
 *
 * Auth: CRON_SECRET bearer token (set via Vercel Cron or external scheduler).
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
    console.error("[cron/morning-briefing] Failed to fetch subscriptions:", subError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const powerUsers = (subscriptions ?? []).filter(
    (s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings
  );

  if (powerUsers.length === 0) {
    return NextResponse.json({ message: "No eligible users", processed: 0 });
  }

  const results: { userId: string; status: string }[] = [];

  for (const sub of powerUsers) {
    try {
      // First: summarize any unsummarized conversations
      await processUnsummarizedConversations(supabase, sub.user_id, { limit: 20 });

      // Then: generate briefing
      await generateMorningBriefing(supabase, sub.user_id);

      results.push({ userId: sub.user_id, status: "success" });
    } catch (error) {
      console.error(
        `[cron/morning-briefing] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      results.push({ userId: sub.user_id, status: "failed" });
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    message: `Briefings generated: ${succeeded} succeeded, ${failed} failed`,
    processed: results.length,
    results,
  });
}
