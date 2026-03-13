import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMeetingPrep } from "@/lib/agents/strategist";
import { z } from "zod/v4";

const uuidSchema = z.string().uuid();

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * POST /api/meetings/[meetingId]/prep
 * Generate an AI prep brief for an upcoming meeting
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { meetingId } = await context.params;

  if (!uuidSchema.safeParse(meetingId).success) {
    return NextResponse.json({ error: "Invalid meeting ID" }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the meeting
  const { data: meeting, error: fetchError } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("note_id", meetingId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Extract attendee names from the attendees jsonb array
  const attendeeNames: string[] = Array.isArray(meeting.attendees)
    ? meeting.attendees.map(
        (a: { name?: string }) => a.name ?? "Unknown"
      )
    : [];

  // Build agenda string from agenda items
  const agendaText: string | undefined = Array.isArray(meeting.agenda)
    ? meeting.agenda
        .map((item: { text?: string }) => item.text ?? "")
        .filter(Boolean)
        .join("\n- ")
    : undefined;

  // Generate the prep brief via The Strategist
  const result = await generateMeetingPrep(supabase, user.id, {
    title: meeting.title,
    attendeeNames,
    agenda: agendaText ? `- ${agendaText}` : undefined,
    dealId: meeting.deal_id ?? undefined,
  });

  // Save the prep brief to the meeting record
  const { error: updateError } = await supabase
    .from("meeting_notes")
    .update({
      prep_brief: result.prep,
      updated_at: new Date().toISOString(),
    })
    .eq("note_id", meetingId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[api/meetings/prep] Failed to save prep brief:", updateError.message);
    // Still return the prep text even if save failed
  }

  return NextResponse.json({
    prep_brief: result.prep,
    generated_at: result.generatedAt,
    sources_cited: result.sourcesCited,
    tokens_used: result.tokensUsed,
  });
}
