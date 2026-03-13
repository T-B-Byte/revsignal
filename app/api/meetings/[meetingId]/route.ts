import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const uuidSchema = z.string().uuid();

const updateMeetingBodySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  meeting_date: z.iso.datetime({ offset: true }).optional(),
  meeting_type: z
    .enum([
      "one_on_one",
      "team",
      "strategy",
      "cross_functional",
      "board",
      "standup",
      "other",
    ] as const)
    .optional(),
  attendees: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        role: z.string().max(200).optional(),
      })
    )
    .max(50)
    .optional(),
  contact_ids: z.array(z.uuid()).max(50).optional(),
  deal_id: z.uuid().nullable().optional(),
  agenda: z
    .array(
      z.object({
        text: z.string().min(1).max(1000),
        covered: z.boolean(),
      })
    )
    .max(50)
    .optional(),
  location: z.string().max(500).nullable().optional(),
  status: z.enum(["upcoming", "completed", "cancelled"] as const).optional(),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  prep_brief: z.string().max(50000).nullable().optional(),
  ai_summary: z.string().max(50000).nullable().optional(),
  action_items: z.array(z.record(z.string(), z.unknown())).max(100).optional(),
});

interface RouteContext {
  params: Promise<{ meetingId: string }>;
}

/**
 * GET /api/meetings/[meetingId]
 * Fetch a single meeting by note_id
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

  const { data: meeting, error } = await supabase
    .from("meeting_notes")
    .select("*")
    .eq("note_id", meetingId)
    .eq("user_id", user.id)
    .single();

  if (error || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ meeting });
}

/**
 * PATCH /api/meetings/[meetingId]
 * Update a meeting
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateMeetingBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("meeting_notes")
    .update(updateData)
    .eq("note_id", meetingId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/meetings] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update meeting" },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  return NextResponse.json({ meeting: data });
}

/**
 * DELETE /api/meetings/[meetingId]
 * Delete a meeting
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

  const { error } = await supabase
    .from("meeting_notes")
    .delete()
    .eq("note_id", meetingId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/meetings] DELETE failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete meeting" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
