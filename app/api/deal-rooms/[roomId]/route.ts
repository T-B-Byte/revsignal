import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const updateDealRoomSchema = z.object({
  custom_header: z.string().max(500).optional().nullable(),
  welcome_message: z.string().max(2000).optional().nullable(),
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
          "icp_analyzer",
          "audience_dashboard",
          "daas_framework",
        ] as const),
        config: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional(),
  show_audience_dashboard: z.boolean().optional(),
  audience_dashboard_url: z.string().url().max(2000).optional().nullable(),
  show_quote_builder: z.boolean().optional(),
  custom_pricing: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        price: z.string().min(1).max(100),
        unit: z.string().max(100),
        description: z.string().max(500),
      })
    )
    .max(20)
    .optional(),
  custom_use_cases: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(1000),
        persona: z.string().max(200).optional(),
      })
    )
    .max(20)
    .optional(),
  custom_use_cases_intro: z.string().max(1000).optional().nullable(),
  custom_why_us: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(1000),
      })
    )
    .max(20)
    .optional(),
  company_logo_url: z.string().url().max(2000).optional().nullable(),
  accent_color: z.string().max(20).regex(/^#[0-9a-fA-F]{3,8}$/, "Must be a valid hex color").optional().nullable(),
  expires_at: z.string().optional().nullable(),
  status: z
    .enum(["draft", "active", "expired", "archived"] as const)
    .optional(),
  password: z.string().min(4).max(100).optional(),
});

type RouteParams = { params: Promise<{ roomId: string }> };

/**
 * GET /api/deal-rooms/[roomId]
 * Return a single deal room with company data and aggregate counts.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      { error: "Invalid room ID format" },
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

  const { data: room, error } = await supabase
    .from("deal_rooms")
    .select("*, gtm_company_profiles(company_id, name, slug, logo_url)")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (error || !room) {
    return NextResponse.json(
      { error: "Deal room not found" },
      { status: 404 }
    );
  }

  // Fetch aggregate counts in parallel
  const [quotesResult, accessLogResult, dataTestsResult] = await Promise.all([
    supabase
      .from("deal_room_quotes")
      .select("quote_id", { count: "exact", head: true })
      .eq("room_id", roomId),
    supabase
      .from("deal_room_access_log")
      .select("log_id", { count: "exact", head: true })
      .eq("room_id", roomId),
    supabase
      .from("deal_room_data_tests")
      .select("test_id", { count: "exact", head: true })
      .eq("room_id", roomId),
  ]);

  // Strip password_hash from response
  const { password_hash: _, ...safeRoom } = room as Record<string, unknown>;

  return NextResponse.json({
    deal_room: safeRoom,
    counts: {
      quotes: quotesResult.count ?? 0,
      access_logs: accessLogResult.count ?? 0,
      data_tests: dataTestsResult.count ?? 0,
    },
  });
}

/**
 * PATCH /api/deal-rooms/[roomId]
 * Update deal room fields.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      { error: "Invalid room ID format" },
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateDealRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Build update payload, only including fields that were provided
  const updates: Record<string, unknown> = {};
  const fields = parsed.data;

  if (fields.custom_header !== undefined) updates.custom_header = fields.custom_header;
  if (fields.welcome_message !== undefined) updates.welcome_message = fields.welcome_message;
  if (fields.selected_products !== undefined) updates.selected_products = fields.selected_products;
  if (fields.selected_demos !== undefined) updates.selected_demos = fields.selected_demos;
  if (fields.show_audience_dashboard !== undefined) updates.show_audience_dashboard = fields.show_audience_dashboard;
  if (fields.audience_dashboard_url !== undefined) updates.audience_dashboard_url = fields.audience_dashboard_url;
  if (fields.show_quote_builder !== undefined) updates.show_quote_builder = fields.show_quote_builder;
  if (fields.custom_pricing !== undefined) updates.custom_pricing = fields.custom_pricing;
  if (fields.custom_use_cases !== undefined) updates.custom_use_cases = fields.custom_use_cases;
  if (fields.custom_use_cases_intro !== undefined) updates.custom_use_cases_intro = fields.custom_use_cases_intro;
  if (fields.custom_why_us !== undefined) updates.custom_why_us = fields.custom_why_us;
  if (fields.company_logo_url !== undefined) updates.company_logo_url = fields.company_logo_url;
  if (fields.accent_color !== undefined) updates.accent_color = fields.accent_color;
  if (fields.expires_at !== undefined) updates.expires_at = fields.expires_at;
  if (fields.status !== undefined) updates.status = fields.status;

  if (fields.password) {
    updates.password_hash = await bcrypt.hash(fields.password, 10);
    updates.password_plain = fields.password;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("deal_rooms")
    .update(updates)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error || !data) {
    console.error("[api/deal-rooms/[roomId]] PATCH failed:", error?.message);
    return NextResponse.json(
      { error: "Failed to update deal room" },
      { status: 500 }
    );
  }

  const { password_hash: _h, ...safePatch } = data as Record<string, unknown>;
  return NextResponse.json({ deal_room: safePatch });
}

/**
 * DELETE /api/deal-rooms/[roomId]
 * Delete a deal room.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      { error: "Invalid room ID format" },
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

  const { error } = await supabase
    .from("deal_rooms")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/deal-rooms/[roomId]] DELETE failed:", error.message);
    return NextResponse.json(
      { error: "Failed to delete deal room" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
