import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processUnsummarizedConversations,
  refreshStaleDealBriefs,
} from "@/lib/rag/summarizer";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/cron/deal-brief-refresh
 *
 * Cron job: refreshes deal briefs for all active deals with new activity.
 * Scheduled daily at 11:00 PM.
 *
 * Steps:
 *  1. Process any unsummarized conversations (prerequisite for brief generation)
 *  2. Refresh deal briefs for deals where last_activity_date > brief.last_updated
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all users who have active deals (any tier — briefs are generated data, not AI-gated)
  const { data: userRows, error: userError } = await supabase
    .from("deals")
    .select("user_id")
    .in("stage", [
      "lead",
      "qualified",
      "discovery",
      "poc_trial",
      "proposal",
      "negotiation",
    ]);

  if (userError) {
    console.error("[cron/deal-brief-refresh] Failed to fetch users:", userError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Deduplicate user IDs
  const userIds = [...new Set((userRows ?? []).map((r) => r.user_id))];

  if (userIds.length === 0) {
    return NextResponse.json({ message: "No active deals found", processed: 0 });
  }

  const allResults: {
    userId: string;
    summarized: { processed: number; failed: number };
    briefs: { refreshed: string[]; skipped: string[]; failed: string[] };
  }[] = [];

  for (const userId of userIds) {
    try {
      // Step 1: Summarize any unsummarized conversations
      const summarized = await processUnsummarizedConversations(supabase, userId, {
        limit: 50,
      });

      // Step 2: Refresh stale deal briefs
      const briefs = await refreshStaleDealBriefs(supabase, userId);

      allResults.push({ userId, summarized, briefs });
    } catch (error) {
      console.error(
        `[cron/deal-brief-refresh] Failed for user ${userId}:`,
        error instanceof Error ? error.message : error
      );
      allResults.push({
        userId,
        summarized: { processed: 0, failed: 0 },
        briefs: { refreshed: [], skipped: [], failed: [error instanceof Error ? error.message : "unknown"] },
      });
    }
  }

  const totalRefreshed = allResults.reduce(
    (sum, r) => sum + r.briefs.refreshed.length,
    0
  );
  const totalSummarized = allResults.reduce(
    (sum, r) => sum + r.summarized.processed,
    0
  );

  return NextResponse.json({
    message: `Processed ${userIds.length} users: ${totalSummarized} conversations summarized, ${totalRefreshed} deal briefs refreshed`,
    processed: userIds.length,
    totalSummarized,
    totalRefreshed,
    details: allResults,
  });
}
