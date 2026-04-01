import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const createCompanySchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  logo_url: z.string().url().max(2000).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  hq_location: z.string().max(200).optional().nullable(),
  employee_count: z.string().max(50).optional().nullable(),
  annual_revenue: z.string().max(50).optional().nullable(),
  website: z.string().url().max(2000).optional().nullable(),
  linkedin_url: z.string().url().max(2000).optional().nullable(),
  why_they_need_us: z.string().max(5000).optional().nullable(),
  recent_news: z.string().max(5000).optional().nullable(),
  company_tier: z.enum([
    "tier_1",
    "tier_2",
    "tier_3",
    "tier_4",
    "tier_5",
  ] as const).default("tier_3"),
  contacts: z
    .array(
      z.object({
        name: z.string(),
        title: z.string(),
        linkedin: z.string().optional(),
        email: z.string().optional(),
        why_this_person: z.string().optional(),
      })
    )
    .max(50)
    .optional(),
  deal_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional().nullable(),
  prospect_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional().nullable(),
  past_outreach: z
    .array(
      z.object({
        date: z.string(),
        channel: z.string(),
        subject: z.string(),
        outcome: z.string().optional(),
      })
    )
    .max(200)
    .optional(),
  notes: z.string().max(10000).optional().nullable(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/gtm/companies
 * List all GTM company profiles for the authenticated user, ordered by name.
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
    .from("gtm_company_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("[api/gtm/companies] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }

  return NextResponse.json({ companies: data });
}

/**
 * POST /api/gtm/companies
 * Create a new GTM company profile.
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

  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("gtm_company_profiles")
    .insert({
      user_id: user.id,
      slug: parsed.data.slug,
      name: parsed.data.name,
      logo_url: parsed.data.logo_url ?? null,
      description: parsed.data.description ?? null,
      hq_location: parsed.data.hq_location ?? null,
      employee_count: parsed.data.employee_count ?? null,
      annual_revenue: parsed.data.annual_revenue ?? null,
      website: parsed.data.website ?? null,
      linkedin_url: parsed.data.linkedin_url ?? null,
      why_they_need_us: parsed.data.why_they_need_us ?? null,
      recent_news: parsed.data.recent_news ?? null,
      company_tier: parsed.data.company_tier,
      contacts: parsed.data.contacts ?? [],
      deal_id: parsed.data.deal_id ?? null,
      prospect_id: parsed.data.prospect_id ?? null,
      past_outreach: parsed.data.past_outreach ?? [],
      notes: parsed.data.notes ?? null,
      tags: parsed.data.tags ?? [],
      is_active: parsed.data.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/gtm/companies] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }

  return NextResponse.json({ company: data }, { status: 201 });
}
