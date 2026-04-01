import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";

const limiter = rateLimit({ interval: 60_000 });

const accessSchema = z.object({
  password: z.string().min(1).max(200),
});

/**
 * POST /api/room/[slug] — Verify password and return room data
 * Public endpoint (no auth required). Uses admin client to bypass RLS.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || slug.length > 100) {
      return NextResponse.json({ error: "Invalid room" }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = limiter.check(5, `room:${slug}:${ip}`);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = accessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch room with company data
    const { data: room, error } = await supabase
      .from("deal_rooms")
      .select(
        "*, gtm_company_profiles(company_id, name, slug, logo_url, description, website)"
      )
      .eq("slug", slug)
      .eq("status", "active")
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Check expiration
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: "This room has expired" }, { status: 410 });
    }

    // Verify password
    const valid = await bcrypt.compare(parsed.data.password, room.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Increment view count and update last_viewed_at (optimistic concurrency check)
    await supabase
      .from("deal_rooms")
      .update({
        view_count: (room.view_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      })
      .eq("room_id", room.room_id)
      .eq("view_count", room.view_count);

    // Log access
    await supabase.from("deal_room_access_log").insert({
      room_id: room.room_id,
      ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
      user_agent: request.headers.get("user-agent")?.slice(0, 500) || null,
    });

    // Fetch selected products (guard against unexpected types)
    const rawProducts = room.selected_products;
    const productIds = (Array.isArray(rawProducts) ? rawProducts : [])
      .map((p: { product_id?: string }) => p.product_id)
      .filter(Boolean);

    let products: Record<string, unknown>[] = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from("gtm_products")
        .select(
          "product_id, name, slug, category, tagline, value_prop, problem_statement, key_stats, features, benefits, use_cases, differentiators, pricing_tiers, packaging_notes, target_personas, demo_type"
        )
        .in("product_id", productIds);
      products = data ?? [];
    }

    // Return room data (exclude password_hash and internal fields)
    const { password_hash: _, user_id: __, ...safeRoom } = room;

    return NextResponse.json({
      room: safeRoom,
      products,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
