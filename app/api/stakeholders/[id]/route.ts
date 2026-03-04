import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

type RouteContext = { params: Promise<{ id: string }> };

const updateStakeholderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).nullable().optional(),
  organization: z.string().max(200).optional(),
  is_internal: z.boolean().optional(),
  relationship: z
    .enum([
      "sponsor",
      "champion",
      "supporter",
      "neutral",
      "blocker",
      "unknown",
    ] as const)
    .optional(),
  communication_style: z.string().max(2000).nullable().optional(),
  sensitivities: z.string().max(2000).nullable().optional(),
  motivations: z.string().max(2000).nullable().optional(),
  influence_level: z.number().int().min(1).max(5).nullable().optional(),
  related_contact_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  last_interaction_date: z.string().nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/stakeholders/:id
 * Get a stakeholder with related strategic notes.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stakeholderResult, notesResult] = await Promise.all([
    supabase
      .from("stakeholders")
      .select("*")
      .eq("stakeholder_id", id)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("strategic_notes")
      .select("*")
      .eq("related_stakeholder_id", id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (stakeholderResult.error) {
    return NextResponse.json(
      { error: "Stakeholder not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    stakeholder: stakeholderResult.data,
    related_notes: notesResult.data ?? [],
  });
}

/**
 * PATCH /api/stakeholders/:id
 * Update a stakeholder.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
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

  const parsed = updateStakeholderSchema.safeParse(body);
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

  const { data, error } = await supabase
    .from("stakeholders")
    .update(parsed.data)
    .eq("stakeholder_id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A stakeholder with this name and organization already exists." },
        { status: 409 }
      );
    }
    console.error("[api/stakeholders/:id] PATCH failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update stakeholder" },
      { status: 500 }
    );
  }

  return NextResponse.json({ stakeholder: data });
}

/**
 * DELETE /api/stakeholders/:id
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("stakeholders")
    .delete()
    .eq("stakeholder_id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/stakeholders/:id] DELETE failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete stakeholder" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true });
}
