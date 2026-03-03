import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFullSync } from "@/lib/pipeline/sfdc-sync";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/cron/sfdc-sync
 *
 * Cron job: Hourly Salesforce bi-directional sync.
 * Calls the pipeline function directly (no HTTP proxy).
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
      const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const result = await runFullSync(supabase, token.user_id, { since });
      results.push({ userId: token.user_id, status: "success", result });
    } catch (error) {
      console.error(
        `[cron/sfdc-sync] Failed for user ${token.user_id}:`,
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
