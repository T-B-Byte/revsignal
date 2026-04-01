import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createRecommendationSchema = z.object({
  product_id: z.string().regex(UUID_REGEX, "Invalid product_id format"),
  fit_strength: z.enum(["strong", "moderate", "exploratory"] as const),
  custom_angle: z.string().max(2000).optional().nullable(),
  suggested_tier: z.string().max(100).optional().nullable(),
  suggested_use_cases: z
    .array(z.object({ title: z.string(), description: z.string() }))
    .max(20)
    .optional(),
  include_in_deal_room: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
  custom_features: z.record(z.string(), z.unknown()).optional().nullable(),
  custom_pricing: z.record(z.string(), z.unknown()).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

type RouteParams = { params: Promise<{ companyId: string }> };

/**
 * GET /api/gtm/companies/[companyId]/recommendations
 * List all product recommendations for a company, with joined product data.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { companyId } = await params;

  if (!UUID_REGEX.test(companyId)) {
    return NextResponse.json(
      { error: "Invalid company ID format" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user owns this company profile
  const { data: company, error: companyError } = await supabase
    .from("gtm_company_profiles")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("gtm_product_recommendations")
    .select(
      "*, gtm_products(product_id, name, slug, category, tagline, demo_type)"
    )
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (error) {
    console.error(
      "[api/gtm/companies/[companyId]/recommendations] GET failed:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }

  return NextResponse.json({ recommendations: data });
}

/**
 * POST /api/gtm/companies/[companyId]/recommendations
 * Create a new product recommendation for a company.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { companyId } = await params;

  if (!UUID_REGEX.test(companyId)) {
    return NextResponse.json(
      { error: "Invalid company ID format" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user owns this company profile
  const { data: company, error: companyError } = await supabase
    .from("gtm_company_profiles")
    .select("company_id")
    .eq("company_id", companyId)
    .eq("user_id", user.id)
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: "Company not found" },
      { status: 404 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createRecommendationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("gtm_product_recommendations")
    .insert({
      user_id: user.id,
      company_id: companyId,
      product_id: parsed.data.product_id,
      fit_strength: parsed.data.fit_strength,
      custom_angle: parsed.data.custom_angle ?? null,
      suggested_tier: parsed.data.suggested_tier ?? null,
      suggested_use_cases: parsed.data.suggested_use_cases ?? [],
      include_in_deal_room: parsed.data.include_in_deal_room ?? false,
      display_order: parsed.data.display_order ?? 0,
      custom_features: parsed.data.custom_features ?? null,
      custom_pricing: parsed.data.custom_pricing ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select(
      "*, gtm_products(product_id, name, slug, category, tagline, demo_type)"
    )
    .single();

  if (error) {
    console.error(
      "[api/gtm/companies/[companyId]/recommendations] POST failed:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to create recommendation" },
      { status: 500 }
    );
  }

  return NextResponse.json({ recommendation: data }, { status: 201 });
}
