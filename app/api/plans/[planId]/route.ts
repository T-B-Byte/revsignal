import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const updatePlanSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  start_date: z.string().date().optional(),
  is_archived: z.boolean().optional(),
  thread_id: z.string().uuid().nullable().optional(),
});

type RouteContext = { params: Promise<{ planId: string }> };

/**
 * GET /api/plans/[planId]
 * Fetch a plan with all its milestones.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title),
      plan_milestones (
        *,
        coaching_threads:thread_id (thread_id, title)
      )
    `)
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[api/plans] GET detail error:", error.message);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

/**
 * PATCH /api/plans/[planId]
 * Update plan metadata.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId } = await context.params;

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

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/plans] PATCH error:", error.message);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json(plan);
}

/**
 * DELETE /api/plans/[planId]
 * Delete a plan and all its milestones (cascading).
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("plan_id", planId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/plans] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
