import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestTeamsChats } from "@/lib/pipeline/teams-ingest";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/ingest/teams-chats
 *
 * Ingest recent Teams chat messages. Called by cron every 15 min.
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all users with active Microsoft Graph connections
  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("user_id")
    .eq("provider", "microsoft");

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ message: "No Microsoft connections", processed: 0 });
  }

  const results: { userId: string; status: string; result?: unknown }[] = [];

  for (const token of tokens) {
    try {
      // Calculate "since" — 20 min ago to overlap with cron interval
      const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();

      const result = await ingestTeamsChats(supabase, token.user_id, {
        since,
        summarize: false, // Summarization runs separately via cron
      });

      results.push({ userId: token.user_id, status: "success", result });
    } catch (error) {
      console.error(
        `[ingest/teams-chats] Failed for user ${token.user_id}:`,
        error instanceof Error ? error.message : error
      );
      results.push({ userId: token.user_id, status: "failed" });
    }
  }

  return NextResponse.json({
    message: `Processed ${results.length} users`,
    results,
  });
}
