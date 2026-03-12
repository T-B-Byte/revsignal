import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contact_name: z.string().min(1).max(200).nullable().optional(),
  contact_role: z.string().max(200).nullable().optional(),
  company: z.string().min(1).max(200).nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  is_archived: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * PATCH /api/coaching/threads/[threadId]
 * Update thread title, deal association, or archive status.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

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

  const parsed = updateThreadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // If linking to a new deal, verify ownership
  if (parsed.data.deal_id) {
    const { data: deal } = await supabase
      .from("deals")
      .select("deal_id")
      .eq("deal_id", parsed.data.deal_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }
  }

  const { data: thread, error } = await supabase
    .from("coaching_threads")
    .update(parsed.data)
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/coaching/threads] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  return NextResponse.json(thread);
}

/**
 * DELETE /api/coaching/threads/[threadId]
 * Delete a thread and all its messages/follow-ups (cascading).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("coaching_threads")
    .delete()
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/coaching/threads] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
