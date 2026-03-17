import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createPlanSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  start_date: z.string().date(),
  thread_id: z.string().uuid().optional(),
});

/**
 * GET /api/plans
 * List user's 90-day plans with milestone counts per phase.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: plans, error } = await supabase
    .from("plans")
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title),
      plan_milestones (milestone_id, phase, is_completed)
    `)
    .eq("user_id", user.id)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/plans] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }

  // Compute summary stats per plan
  const enriched = (plans || []).map((plan) => {
    const milestones = (plan.plan_milestones as { milestone_id: string; phase: string; is_completed: boolean }[]) || [];
    const phases = ["day_30", "day_60", "day_90"] as const;
    const phaseSummary = Object.fromEntries(
      phases.map((p) => {
        const items = milestones.filter((m) => m.phase === p);
        return [p, { total: items.length, completed: items.filter((m) => m.is_completed).length }];
      })
    );
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.is_completed).length;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plan_milestones: _, ...rest } = plan;
    return {
      ...rest,
      phase_summary: phaseSummary,
      total_milestones: totalMilestones,
      completed_milestones: completedMilestones,
    };
  });

  return NextResponse.json(enriched);
}

/**
 * POST /api/plans
 * Create a new 90-day plan.
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

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify thread ownership if provided
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

  const { data: plan, error } = await supabase
    .from("plans")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      start_date: parsed.data.start_date,
      thread_id: parsed.data.thread_id ?? null,
    })
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title)
    `)
    .single();

  if (error) {
    console.error("[api/plans] POST error:", error.message);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }

  return NextResponse.json(plan, { status: 201 });
}
