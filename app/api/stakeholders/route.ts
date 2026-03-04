import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createStakeholderSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.string().max(200).optional(),
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
  communication_style: z.string().max(2000).optional(),
  sensitivities: z.string().max(2000).optional(),
  motivations: z.string().max(2000).optional(),
  influence_level: z.number().int().min(1).max(5).optional(),
  related_contact_id: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  last_interaction_date: z.string().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * GET /api/stakeholders
 * List stakeholders with optional filters.
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
  const organization = searchParams.get("organization");
  const relationship = searchParams.get("relationship");
  const isInternal = searchParams.get("is_internal");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("stakeholders")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (organization) {
    query = query.eq("organization", organization);
  }

  if (relationship) {
    query = query.eq("relationship", relationship);
  }

  if (isInternal !== null) {
    query = query.eq("is_internal", isInternal === "true");
  }

  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) {
      query = query.limit(n);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/stakeholders] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch stakeholders" },
      { status: 500 }
    );
  }

  return NextResponse.json({ stakeholders: data });
}

/**
 * POST /api/stakeholders
 * Create a new stakeholder.
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

  const parsed = createStakeholderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("stakeholders")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A stakeholder with this name and organization already exists." },
        { status: 409 }
      );
    }
    console.error("[api/stakeholders] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create stakeholder" },
      { status: 500 }
    );
  }

  return NextResponse.json({ stakeholder: data }, { status: 201 });
}
