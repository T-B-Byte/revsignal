import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateBoardReport } from "@/lib/agents/strategist";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";

/**
 * POST /api/cron/board-report
 *
 * Cron job: auto-generates and archives weekly board reports for Power-tier users.
 * Scheduled every Monday at 7:30 AM.
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
    console.error("[cron/board-report] Failed to fetch subscriptions:", subError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const powerUsers = (subscriptions ?? []).filter(
    (s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings
  );

  if (powerUsers.length === 0) {
    return NextResponse.json({ message: "No eligible users", processed: 0 });
  }

  const results: { userId: string; status: string; weekNumber?: number }[] = [];

  for (const sub of powerUsers) {
    try {
      const report = await generateBoardReport(supabase, sub.user_id);

      // Archive the report (upsert: one per user per week)
      const { error: archiveError } = await supabase
        .from("board_report_archives")
        .upsert(
          {
            user_id: sub.user_id,
            week_number: report.weekNumber,
            title: "DaaS Revenue Initiative",
            subtitle: `Week ${report.weekNumber} Update`,
            sections: report.sections,
            tokens_used: report.tokensUsed,
            generated_at: report.generatedAt,
          },
          { onConflict: "user_id,week_number" }
        );

      if (archiveError) {
        console.error(
          `[cron/board-report] Archive failed for user ${sub.user_id}:`,
          archiveError.message
        );
        results.push({ userId: sub.user_id, status: "generated_not_archived", weekNumber: report.weekNumber });
      } else {
        results.push({ userId: sub.user_id, status: "success", weekNumber: report.weekNumber });
      }
    } catch (error) {
      console.error(
        `[cron/board-report] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      results.push({ userId: sub.user_id, status: "failed" });
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "failed").length;

  return NextResponse.json({
    message: `Board reports: ${succeeded} succeeded, ${failed} failed`,
    processed: results.length,
    results,
  });
}
