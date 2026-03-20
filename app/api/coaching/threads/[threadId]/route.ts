import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const participantSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  contact_id: z.string().uuid().optional(),
});

const updateThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contact_name: z.string().min(1).max(200).nullable().optional(),
  contact_role: z.string().max(200).nullable().optional(),
  company: z.string().min(1).max(200).nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  prospect_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  ma_entity_id: z.string().uuid().nullable().optional(),
  is_archived: z.boolean().optional(),
  participants: z.array(participantSchema).max(20).optional(),
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

  // Verify ownership for any linked entities
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

  if (parsed.data.prospect_id) {
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id")
      .eq("id", parsed.data.prospect_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }
  }

  if (parsed.data.project_id) {
    const { data: project } = await supabase
      .from("projects")
      .select("project_id")
      .eq("project_id", parsed.data.project_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  if (parsed.data.ma_entity_id) {
    const { data: entity } = await supabase
      .from("ma_entities")
      .select("entity_id")
      .eq("entity_id", parsed.data.ma_entity_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!entity) {
      return NextResponse.json({ error: "M&A entity not found" }, { status: 404 });
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
