import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createMeetingBodySchema = z.object({
  title: z.string().min(1).max(500),
  meeting_date: z.iso.datetime({ offset: true, message: "meeting_date must be a valid ISO 8601 datetime" }),
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
  deal_id: z.uuid().optional(),
  agenda: z
    .array(
      z.object({
        text: z.string().min(1).max(1000),
        covered: z.boolean(),
      })
    )
    .max(50)
    .optional(),
  location: z.string().max(500).optional(),
  status: z.enum(["upcoming", "completed", "cancelled"] as const).optional(),
  content: z.string().max(50000).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/meetings
 * List meetings for user, ordered by meeting_date.
 * Optional filter: ?status=upcoming
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");

  // Validate status if provided
  const validStatuses = ["upcoming", "completed", "cancelled"] as const;
  if (status && !validStatuses.includes(status as (typeof validStatuses)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  let query = supabase
    .from("meeting_notes")
    .select("*")
    .eq("user_id", user.id)
    .order("meeting_date", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/meetings] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }

  return NextResponse.json({ meetings: data });
}

/**
 * POST /api/meetings
 * Create a new meeting
 */
export async function POST(request: NextRequest) {
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

  const parsed = createMeetingBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("meeting_notes")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      meeting_date: parsed.data.meeting_date,
      meeting_type: parsed.data.meeting_type ?? "other",
      attendees: parsed.data.attendees ?? [],
      contact_ids: parsed.data.contact_ids ?? [],
      deal_id: parsed.data.deal_id ?? null,
      agenda: parsed.data.agenda ?? [],
      location: parsed.data.location ?? null,
      status: parsed.data.status ?? "upcoming",
      content: parsed.data.content ?? "",
      tags: parsed.data.tags ?? [],
    })
    .select()
    .single();

  if (error) {
    console.error("[api/meetings] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create meeting" },
      { status: 500 }
    );
  }

  return NextResponse.json({ meeting: data }, { status: 201 });
}
