import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  phase: z.enum(["day_30", "day_60", "day_90"]).optional(),
  sort_order: z.number().int().min(0).max(999).optional(),
  is_completed: z.boolean().optional(),
  thread_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ planId: string; milestoneId: string }> };

/**
 * PATCH /api/plans/[planId]/milestones/[milestoneId]
 * Update a milestone (title, completion, phase, etc).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId, milestoneId } = await context.params;

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

  const parsed = updateMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.is_completed === true) {
    updates.completed_at = new Date().toISOString();
  } else if (parsed.data.is_completed === false) {
    updates.completed_at = null;
  }

  const { data: milestone, error } = await supabase
    .from("plan_milestones")
    .update(updates)
    .eq("milestone_id", milestoneId)
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .single();

  if (error) {
    console.error("[api/plans/milestones] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }

  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  return NextResponse.json(milestone);
}

/**
 * DELETE /api/plans/[planId]/milestones/[milestoneId]
 * Delete a milestone.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId, milestoneId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("plan_milestones")
    .delete()
    .eq("milestone_id", milestoneId)
    .eq("plan_id", planId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/plans/milestones] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete milestone" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
