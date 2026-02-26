import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const bulkUpdateSchema = z.object({
  item_ids: z.array(z.string().min(1)),
  status: z
    .enum(["pending", "completed", "overdue", "cancelled"] as const)
    .optional(),
  escalation_level: z.enum(["green", "yellow", "red"] as const).optional(),
});

/**
 * GET /api/action-items
 * List action items with optional filters: status, escalation_level, deal_id
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
  const escalation = searchParams.get("escalation_level");
  const dealId = searchParams.get("deal_id");
  const owner = searchParams.get("owner");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("action_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    const statuses = status.split(",");
    query = query.in("status", statuses);
  }

  if (escalation) {
    const levels = escalation.split(",");
    query = query.in("escalation_level", levels);
  }

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  if (owner) {
    query = query.eq("owner", owner);
  }

  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) {
      query = query.limit(n);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/action-items] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch action items" }, { status: 500 });
  }

  return NextResponse.json({ action_items: data });
}

/**
 * PATCH /api/action-items
 * Bulk update action items (status and/or escalation_level)
 */
export async function PATCH(request: NextRequest) {
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

  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { item_ids, ...updates } = parsed.data;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No update fields provided" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: now,
  };

  // Set completed_at when marking as completed
  if (updates.status === "completed") {
    updateData.completed_at = now;
  } else if (updates.status === "pending") {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from("action_items")
    .update(updateData)
    .in("item_id", item_ids)
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.error("[api/action-items] PATCH failed:", error.message);
    return NextResponse.json({ error: "Failed to update action items" }, { status: 500 });
  }

  return NextResponse.json({
    updated: data?.length ?? 0,
    action_items: data,
  });
}
