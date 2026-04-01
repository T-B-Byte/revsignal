import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const createDealRoomSchema = z.object({
  company_id: z.string().regex(UUID_REGEX, "Invalid company_id format"),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase alphanumeric with hyphens only"),
  password: z.string().min(4).max(100),
  custom_header: z.string().max(500).optional(),
  welcome_message: z.string().max(2000).optional(),
  selected_products: z
    .array(
      z.object({
        product_id: z.string(),
        display_order: z.number().int().nonnegative(),
        custom_notes: z.string().optional(),
      })
    )
    .optional(),
  selected_demos: z
    .array(
      z.object({
        demo_type: z.enum([
          "title_expansion",
          "icp_analyzer",
          "surge_dossier",
          "audience_dashboard",
        ] as const),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  show_audience_dashboard: z.boolean().optional(),
  audience_dashboard_url: z.string().url().max(2000).optional().nullable(),
  show_quote_builder: z.boolean().optional(),
  company_logo_url: z.string().url().max(2000).optional().nullable(),
  accent_color: z.string().max(20).regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a valid hex color").optional().nullable(),
  expires_at: z.string().optional().nullable(),
});

/**
 * GET /api/deal-rooms
 * List all deal rooms for the authenticated user, joined with company name.
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
    .from("deal_rooms")
    .select("*, gtm_company_profiles(company_id, name, slug, logo_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/deal-rooms] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch deal rooms" },
      { status: 500 }
    );
  }

  // Strip password_hash from response
  const safeRooms = (data ?? []).map(({ password_hash, ...rest }: Record<string, unknown>) => rest);

  return NextResponse.json({ deal_rooms: safeRooms });
}

/**
 * POST /api/deal-rooms
 * Create a new deal room. Password is hashed before storage.
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

  const parsed = createDealRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const { data, error } = await supabase
    .from("deal_rooms")
    .insert({
      user_id: user.id,
      company_id: parsed.data.company_id,
      slug: parsed.data.slug,
      password_hash: passwordHash,
      password_plain: parsed.data.password,
      status: "active",
      custom_header: parsed.data.custom_header ?? null,
      welcome_message: parsed.data.welcome_message ?? null,
      selected_products: parsed.data.selected_products ?? [],
      selected_demos: parsed.data.selected_demos ?? [],
      show_audience_dashboard: parsed.data.show_audience_dashboard ?? true,
      audience_dashboard_url: parsed.data.audience_dashboard_url ?? "https://surgeengine.app/audience-dashboard.html",
      show_quote_builder: parsed.data.show_quote_builder ?? true,
      company_logo_url: parsed.data.company_logo_url ?? null,
      accent_color: parsed.data.accent_color ?? null,
      expires_at: parsed.data.expires_at ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/deal-rooms] POST failed:", error.message);
    return NextResponse.json(
      { error: "Failed to create deal room" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deal_room: data }, { status: 201 });
}
