import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ingestOutlookEmails,
  ingestCalendarEvents,
  syncCalendarToMeetingNotes,
} from "@/lib/pipeline/outlook-ingest";
import { verifyCronSecret } from "@/lib/cron-auth";

/**
 * POST /api/cron/ingest-outlook
 *
 * Cron job: Ingests Outlook emails and syncs calendar events every 15 min.
 * Calendar events are synced into meeting_notes for prep and briefings.
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

  const results: { userId: string; status: string; email?: unknown; calendar?: unknown }[] = [];

  for (const token of tokens) {
    const entry: { userId: string; status: string; email?: unknown; calendar?: unknown } = {
      userId: token.user_id,
      status: "success",
    };

    // Email ingestion
    try {
      const since = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      entry.email = await ingestOutlookEmails(supabase, token.user_id, {
        since,
        summarize: false,
      });
    } catch (error) {
      console.error(
        `[cron/ingest-outlook] Email ingestion failed for user ${token.user_id}:`,
        error instanceof Error ? error.message : error
      );
      entry.status = "partial";
    }

    // Calendar sync: ingest raw events + sync to meeting_notes
    try {
      await ingestCalendarEvents(supabase, token.user_id);
      entry.calendar = await syncCalendarToMeetingNotes(supabase, token.user_id);
    } catch (error) {
      console.error(
        `[cron/ingest-outlook] Calendar sync failed for user ${token.user_id}:`,
        error instanceof Error ? error.message : error
      );
      if (entry.status === "partial") entry.status = "failed";
      else entry.status = "partial";
    }

    results.push(entry);
  }

  return NextResponse.json({
    message: `Processed ${results.length} users`,
    results,
  });
}
