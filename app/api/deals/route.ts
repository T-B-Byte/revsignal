import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createDealBodySchema = z.object({
  company: z.string().min(1),
  acv: z.number().nonnegative().optional(),
  stage: z
    .enum([
      "lead",
      "qualified",
      "discovery",
      "poc_trial",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ] as const)
    .optional(),
  deployment_method: z
    .enum([
      "api",
      "flat_file",
      "cloud_delivery",
      "platform_integration",
      "embedded_oem",
    ] as const)
    .optional(),
  product_tier: z.enum(["signals", "intelligence", "embedded"] as const).optional(),
  win_probability: z.number().min(0).max(100).optional(),
  close_date: z.string().optional(),
  notes: z.string().optional(),
  contacts: z
    .array(
      z.object({
        contact_id: z.string(),
        name: z.string(),
        role: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * GET /api/deals
 * List deals with optional filters: stage, icp_category
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
  const stage = searchParams.get("stage");
  const limit = searchParams.get("limit");

  let query = supabase
    .from("deals")
    .select("*")
    .eq("user_id", user.id)
    .order("last_activity_date", { ascending: false });

  if (stage) {
    const stages = stage.split(",");
    query = query.in("stage", stages);
  }

  if (limit) {
    const n = Number(limit);
    if (Number.isFinite(n) && n > 0 && n <= 200) {
      query = query.limit(n);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/deals] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch deals" }, { status: 500 });
  }

  return NextResponse.json({ deals: data });
}

/**
 * POST /api/deals
 * Create a new deal
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

  const parsed = createDealBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("deals")
    .insert({
      user_id: user.id,
      company: parsed.data.company,
      acv: parsed.data.acv ?? null,
      stage: parsed.data.stage ?? "lead",
      deployment_method: parsed.data.deployment_method ?? null,
      product_tier: parsed.data.product_tier ?? null,
      win_probability: parsed.data.win_probability ?? 10,
      close_date: parsed.data.close_date ?? null,
      notes: parsed.data.notes ?? null,
      contacts: parsed.data.contacts ?? [],
      created_date: now,
      last_activity_date: now,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/deals] POST failed:", error.message);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }

  return NextResponse.json({ deal: data }, { status: 201 });
}
