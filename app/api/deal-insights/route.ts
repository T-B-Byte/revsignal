import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const patchSchema = z.object({
  insight_id: z.string().uuid(),
  is_active: z.boolean().optional(),
  superseded_by: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/deal-insights?deal_id=...&insight_type=...&is_active=...
 * List insights, optionally filtered. Includes thread title via join.
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
  const dealId = searchParams.get("deal_id");
  const insightType = searchParams.get("insight_type");
  const isActive = searchParams.get("is_active");

  let query = supabase
    .from("deal_insights")
    .select("*, coaching_threads(thread_id, title)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }
  if (insightType) {
    query = query.eq("insight_type", insightType);
  }
  if (isActive !== null && isActive !== undefined) {
    query = query.eq("is_active", isActive === "true");
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error("[api/deal-insights] GET error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Flatten thread title for easier consumption
  const insights = (data ?? []).map((row) => {
    const thread = row.coaching_threads as { thread_id: string; title: string } | null;
    return {
      ...row,
      coaching_threads: undefined,
      thread_title: thread?.title ?? null,
    };
  });

  return NextResponse.json({ insights });
}

/**
 * PATCH /api/deal-insights
 * Update an insight (toggle is_active, set superseded_by).
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { insight_id, is_active, superseded_by } = parsed.data;

  const updates: Record<string, unknown> = {};
  if (is_active !== undefined) updates.is_active = is_active;
  if (superseded_by !== undefined) updates.superseded_by = superseded_by;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("deal_insights")
    .update(updates)
    .eq("insight_id", insight_id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/deal-insights] PATCH error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ insight: data });
}
