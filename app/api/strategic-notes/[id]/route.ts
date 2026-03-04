import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

type RouteContext = { params: Promise<{ id: string }> };

const updateNoteSchema = z.object({
  category: z
    .enum([
      "institutional_context",
      "stakeholder_insight",
      "decision_log",
      "political_dynamic",
      "meeting_debrief",
      "strategic_observation",
      "competitive_insight",
      "relationship_note",
    ] as const)
    .optional(),
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(10000).optional(),
  related_stakeholder_id: z.string().uuid().nullable().optional(),
  related_deal_id: z.string().uuid().nullable().optional(),
  source: z.string().max(500).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/strategic-notes/:id
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("strategic_notes")
    .select("*")
    .eq("note_id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  return NextResponse.json({ note: data });
}

/**
 * PATCH /api/strategic-notes/:id
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const parsed = updateNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: "No update fields provided" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("strategic_notes")
    .update(parsed.data)
    .eq("note_id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/strategic-notes/:id] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ note: data });
}

/**
 * DELETE /api/strategic-notes/:id
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("strategic_notes")
    .delete()
    .eq("note_id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/strategic-notes/:id] DELETE failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
