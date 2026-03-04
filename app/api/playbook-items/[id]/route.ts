import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateSchema = z.object({
  status: z
    .enum([
      "not_started",
      "in_progress",
      "completed",
      "blocked",
      "deprecated",
    ] as const)
    .optional(),
  notes: z.string().max(5000).optional(),
});

/**
 * PATCH /api/playbook-items/[id]
 * Update a playbook item's status or notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
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

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    ...parsed.data,
    last_touched: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("playbook_items")
    .update(updateData)
    .eq("item_id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    // PGRST116 = .single() found no rows — item doesn't exist or belongs to another user
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Playbook item not found" },
        { status: 404 }
      );
    }
    console.error("[api/playbook-items] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update playbook item" },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: data });
}
