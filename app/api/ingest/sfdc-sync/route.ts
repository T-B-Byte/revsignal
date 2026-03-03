import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFullSync } from "@/lib/pipeline/sfdc-sync";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/ingest/sfdc-sync
 *
 * Bi-directional Salesforce sync. Called by cron hourly.
 * Pulls SFDC changes first, then pushes local updates.
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("user_id")
    .eq("provider", "salesforce");

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ message: "No Salesforce connections", processed: 0 });
  }

  const results: { userId: string; status: string; result?: unknown }[] = [];

  for (const token of tokens) {
    try {
      // Sync changes from last 2 hours (overlap with hourly cron)
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      const result = await runFullSync(supabase, token.user_id, { since });

      results.push({ userId: token.user_id, status: "success", result });
    } catch (error) {
      console.error(
        `[ingest/sfdc-sync] Failed for user ${token.user_id}:`,
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
