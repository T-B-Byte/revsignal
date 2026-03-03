import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestTeamsCallTranscripts } from "@/lib/pipeline/teams-ingest";
import { processTranscriptBatch } from "@/lib/pipeline/transcript-processor";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/cron/ingest-transcripts
 *
 * Cron job: Daily call transcript processing at 6:00 AM.
 * Pulls Teams call transcripts, then processes all unprocessed
 * transcripts through the Call Analyst pipeline.
 * Calls pipeline functions directly (no HTTP proxy).
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("user_id")
    .eq("provider", "microsoft");

  if (!tokens || tokens.length === 0) {
    return NextResponse.json({ message: "No Microsoft connections", processed: 0 });
  }

  const results: { userId: string; status: string; ingested?: unknown; processed?: unknown }[] = [];

  for (const token of tokens) {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Step 1: Ingest Teams call transcripts
      const ingestResult = await ingestTeamsCallTranscripts(supabase, token.user_id, {
        since,
        summarize: false,
      });

      // Step 2: Process unprocessed transcripts through Call Analyst
      const { data: unprocessed } = await supabase
        .from("ingested_messages")
        .select("external_id, raw_content")
        .eq("user_id", token.user_id)
        .in("source", ["teams-call", "plaud"])
        .eq("processed", false)
        .not("raw_content", "is", null)
        .limit(20);

      let processResult = { processed: 0, failed: 0 };
      if (unprocessed && unprocessed.length > 0) {
        const transcriptInputs = unprocessed.map((msg) => ({
          text: msg.raw_content!,
          source: "teams" as const,
          externalId: msg.external_id ?? undefined,
          date: new Date().toISOString(),
          channel: "call" as const,
        }));

        processResult = await processTranscriptBatch(
          supabase,
          token.user_id,
          transcriptInputs
        );
      }

      results.push({
        userId: token.user_id,
        status: "success",
        ingested: ingestResult,
        processed: processResult,
      });
    } catch (error) {
      console.error(
        `[cron/ingest-transcripts] Failed for user ${token.user_id}:`,
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
