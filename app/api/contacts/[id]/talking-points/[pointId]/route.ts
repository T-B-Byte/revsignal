import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updateTalkingPointSchema = z.object({
  content: z.string().min(1).max(500).optional(),
  priority: z.number().int().min(0).max(999).optional(),
  is_completed: z.boolean().optional(),
  thread_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string; pointId: string }> };

/**
 * PATCH /api/contacts/[id]/talking-points/[pointId]
 * Update a talking point (content, priority, completion status).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { id: contactId, pointId } = await context.params;

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

  const parsed = updateTalkingPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // If thread_id is being set, verify it belongs to this user
  if (parsed.data.thread_id) {
    const { data: thread } = await supabase
      .from("coaching_threads")
      .select("thread_id")
      .eq("thread_id", parsed.data.thread_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
  }

  // Build update payload
  const updates: Record<string, unknown> = { ...parsed.data };

  // Set completed_at when marking complete/incomplete
  if (parsed.data.is_completed === true) {
    updates.completed_at = new Date().toISOString();
  } else if (parsed.data.is_completed === false) {
    updates.completed_at = null;
  }

  const { data: point, error } = await supabase
    .from("talking_points")
    .update(updates)
    .eq("id", pointId)
    .eq("contact_id", contactId)
    .eq("user_id", user.id)
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .single();

  if (error) {
    console.error("[api/contacts/talking-points] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update talking point" }, { status: 500 });
  }

  if (!point) {
    return NextResponse.json({ error: "Talking point not found" }, { status: 404 });
  }

  return NextResponse.json(point);
}

/**
 * DELETE /api/contacts/[id]/talking-points/[pointId]
 * Delete a talking point.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { id: contactId, pointId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("talking_points")
    .delete()
    .eq("id", pointId)
    .eq("contact_id", contactId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/contacts/talking-points] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete talking point" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
