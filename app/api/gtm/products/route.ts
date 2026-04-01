import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createProductSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  category: z.enum([
    "data_feeds",
    "intelligence_reports",
    "monitoring",
    "data_products",
    "platform",
  ] as const),
  tagline: z.string().max(500).optional().nullable(),
  value_prop: z.string().max(2000).optional().nullable(),
  problem_statement: z.string().max(2000).optional().nullable(),
  key_stats: z
    .array(z.object({ stat: z.string(), source: z.string().optional() }))
    .optional(),
  features: z
    .array(z.object({ name: z.string(), description: z.string() }))
    .optional(),
  benefits: z
    .array(z.object({ benefit: z.string(), for_whom: z.string().optional() }))
    .optional(),
  use_cases: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        persona: z.string().optional(),
      })
    )
    .optional(),
  differentiators: z
    .array(z.object({ vs_competitor: z.string(), advantage: z.string() }))
    .optional(),
  pricing_tiers: z.record(
    z.string(),
    z.object({ price: z.string(), unit: z.string(), description: z.string() })
  ).optional(),
  packaging_notes: z.string().max(2000).optional().nullable(),
  linkedin_posts: z
    .array(
      z.object({
        title: z.string(),
        body: z.string(),
        hashtags: z.array(z.string()).optional(),
      })
    )
    .optional(),
  outreach_sequences: z
    .array(
      z.object({
        target_type: z.string(),
        emails: z.array(z.object({ subject: z.string(), body: z.string() })),
      })
    )
    .optional(),
  battle_cards: z
    .array(
      z.object({
        competitor: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        our_advantage: z.string(),
      })
    )
    .optional(),
  target_personas: z
    .array(
      z.object({
        tier: z.string(),
        persona: z.string(),
        why_they_buy: z.string(),
      })
    )
    .optional(),
  demo_type: z
    .enum([
      "title_expansion",
      "icp_analyzer",
      "surge_dossier",
      "audience_dashboard",
    ] as const)
    .optional()
    .nullable(),
  demo_config: z.record(z.string(), z.unknown()).optional(),
  api_schema: z.record(z.string(), z.unknown()).optional(),
  data_dictionary: z
    .array(
      z.object({
        field: z.string(),
        type: z.string(),
        description: z.string(),
      })
    )
    .optional(),
  sample_output: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().nonnegative().optional(),
});

/**
 * GET /api/gtm/products
 * List all GTM products for the authenticated user, ordered by display_order.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("gtm_products")
    .select("*")
    .eq("user_id", user.id)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("[api/gtm/products] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data });
}

/**
 * POST /api/gtm/products
 * Create a new GTM product.
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

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("gtm_products")
    .insert({
      user_id: user.id,
      slug: parsed.data.slug,
      name: parsed.data.name,
      category: parsed.data.category,
      tagline: parsed.data.tagline ?? null,
      value_prop: parsed.data.value_prop ?? null,
      problem_statement: parsed.data.problem_statement ?? null,
      key_stats: parsed.data.key_stats ?? [],
      features: parsed.data.features ?? [],
      benefits: parsed.data.benefits ?? [],
      use_cases: parsed.data.use_cases ?? [],
      differentiators: parsed.data.differentiators ?? [],
      pricing_tiers: parsed.data.pricing_tiers ?? {},
      packaging_notes: parsed.data.packaging_notes ?? null,
      linkedin_posts: parsed.data.linkedin_posts ?? [],
      outreach_sequences: parsed.data.outreach_sequences ?? [],
      battle_cards: parsed.data.battle_cards ?? [],
      target_personas: parsed.data.target_personas ?? [],
      demo_type: parsed.data.demo_type ?? null,
      demo_config: parsed.data.demo_config ?? {},
      api_schema: parsed.data.api_schema ?? {},
      data_dictionary: parsed.data.data_dictionary ?? [],
      sample_output: parsed.data.sample_output ?? {},
      is_active: parsed.data.is_active ?? true,
      display_order: parsed.data.display_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/gtm/products] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }

  return NextResponse.json({ product: data }, { status: 201 });
}
