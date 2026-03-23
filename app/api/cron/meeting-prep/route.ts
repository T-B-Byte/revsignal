import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMeetingPrep } from "@/lib/agents/strategist";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier, MeetingAttendee } from "@/types/database";

const MAX_PREPS_PER_USER = 5;

/**
 * POST /api/cron/meeting-prep
 *
 * Cron job: auto-generates prep briefs for upcoming meetings (next 24 hours)
 * that don't have one yet. Runs daily at 6:00 AM (before 7:00 AM briefing).
 *
 * Only runs for Power-tier users (meeting prep requires Claude API calls).
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find all users with active subscriptions that include AI briefings
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, tier")
    .eq("status", "active");

  if (subError) {
    console.error("[cron/meeting-prep] Failed to fetch subscriptions:", subError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const eligibleUsers = (subscriptions ?? []).filter(
    (s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings
  );

  if (eligibleUsers.length === 0) {
    return NextResponse.json({ message: "No eligible users", prepped: 0 });
  }

  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const results: { userId: string; meetingsPrepped: number; errors: string[] }[] = [];

  for (const sub of eligibleUsers) {
    const entry = { userId: sub.user_id, meetingsPrepped: 0, errors: [] as string[] };

    try {
      // Find upcoming meetings in the next 24 hours without a prep brief
      const { data: meetings, error: meetError } = await supabase
        .from("meeting_notes")
        .select("note_id, title, attendees, agenda, deal_id")
        .eq("user_id", sub.user_id)
        .eq("status", "upcoming")
        .is("prep_brief", null)
        .gte("meeting_date", now.toISOString())
        .lte("meeting_date", twentyFourHoursFromNow)
        .order("meeting_date", { ascending: true })
        .limit(MAX_PREPS_PER_USER);

      if (meetError) {
        entry.errors.push(`Query failed: ${meetError.message}`);
        results.push(entry);
        continue;
      }

      if (!meetings || meetings.length === 0) {
        results.push(entry);
        continue;
      }

      for (const meeting of meetings) {
        try {
          const attendees = (meeting.attendees as MeetingAttendee[]) ?? [];
          const attendeeNames = attendees.map((a) => a.name);
          const agenda = (meeting.agenda as { text: string }[]) ?? [];
          const agendaText = agenda.length > 0
            ? agenda.map((a) => a.text).join("; ")
            : undefined;

          // Generate prep via the Strategist (full RAG retrieval + Claude)
          const prepResult = await generateMeetingPrep(supabase, sub.user_id, {
            title: meeting.title,
            attendeeNames,
            agenda: agendaText,
            dealId: meeting.deal_id ?? undefined,
          });

          // Write the generated prep brief back to the meeting record
          await supabase
            .from("meeting_notes")
            .update({
              prep_brief: prepResult.prep,
              updated_at: new Date().toISOString(),
            })
            .eq("note_id", meeting.note_id);

          entry.meetingsPrepped++;
        } catch (error) {
          entry.errors.push(
            `Meeting ${meeting.note_id}: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }
    } catch (error) {
      entry.errors.push(
        `User loop: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    results.push(entry);
  }

  const totalPrepped = results.reduce((sum, r) => sum + r.meetingsPrepped, 0);

  return NextResponse.json({
    message: `Auto-prepped ${totalPrepped} meetings for ${results.length} users`,
    results,
  });
}
