import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createMilestoneSchema = z.object({
  phase: z.enum(["day_30", "day_60", "day_90"]),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  sort_order: z.number().int().min(0).max(999).default(0),
  thread_id: z.string().uuid().optional(),
});

type RouteContext = { params: Promise<{ planId: string }> };

/**
 * POST /api/plans/[planId]/milestones
 * Add a milestone to a plan.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { planId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify plan ownership
  const { data: plan } = await supabase
    .from("plans")
    .select("plan_id")
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createMilestoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data: milestone, error } = await supabase
    .from("plan_milestones")
    .insert({
      plan_id: planId,
      user_id: user.id,
      phase: parsed.data.phase,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sort_order,
      thread_id: parsed.data.thread_id ?? null,
    })
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .single();

  if (error) {
    console.error("[api/plans/milestones] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create milestone" }, { status: 500 });
  }

  return NextResponse.json(milestone, { status: 201 });
}
