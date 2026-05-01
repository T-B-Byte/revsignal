import { NextRequest, NextResponse, after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimit } from "@/lib/rate-limit";
import { sendDealRoomAccessNotification } from "@/lib/sendgrid";

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

    // Check if the request comes from the authenticated room owner (dashboard preview).
    // Owner previews don't count as prospect opens and generate no logs or notifications.
    const serverClient = await createClient();
    const { data: { user: sessionUser } } = await serverClient.auth.getUser();
    const isOwnerPreview = sessionUser?.id === room.user_id;

    let logId: string | null = null;

    if (!isOwnerPreview) {
      // Increment view count and update last_viewed_at (optimistic concurrency check)
      await supabase
        .from("deal_rooms")
        .update({
          view_count: (room.view_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        })
        .eq("room_id", room.room_id)
        .eq("view_count", room.view_count);

      const accessIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
      const accessUserAgent = request.headers.get("user-agent")?.slice(0, 500) || null;

      // Log access — capture log_id so the client can tie tab clicks to this session
      const { data: logEntry } = await supabase.from("deal_room_access_log").insert({
        room_id: room.room_id,
        ip_address: accessIp,
        user_agent: accessUserAgent,
      }).select("log_id").single();
      logId = logEntry?.log_id ?? null;

      // Send access notification after the response is sent.
      // after() keeps the serverless function alive until the callback completes.
      const newViewCount = (room.view_count || 0) + 1;
      const companyName = (room.gtm_company_profiles as { name?: string } | null)?.name ?? slug;
      after(async () => {
        try {
          const { data } = await supabase
            .from("user_profiles")
            .select("email")
            .eq("user_id", room.user_id)
            .maybeSingle();
          if (data?.email) {
            await sendDealRoomAccessNotification(
              data.email,
              companyName,
              slug,
              newViewCount,
              accessIp,
              accessUserAgent
            );
          }
        } catch {
          // Non-critical
        }
      });
    }

    // Fetch selected products (guard against unexpected types)
    const rawProducts = room.selected_products;
    const selectionsById = new Map<string, { display_order: number; custom_notes: string | null }>();
    for (const p of (Array.isArray(rawProducts) ? rawProducts : []) as Array<{
      product_id?: string;
      display_order?: unknown;
      custom_notes?: unknown;
    }>) {
      if (typeof p?.product_id === "string") {
        selectionsById.set(p.product_id, {
          display_order: typeof p.display_order === "number" ? p.display_order : 0,
          custom_notes: typeof p.custom_notes === "string" && p.custom_notes.trim() ? p.custom_notes : null,
        });
      }
    }
    const productIds = Array.from(selectionsById.keys());

    let products: Record<string, unknown>[] = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from("gtm_products")
        .select(
          "product_id, name, slug, category, tagline, value_prop, problem_statement, key_stats, features, benefits, use_cases, differentiators, pricing_tiers, packaging_notes, target_personas, demo_type"
        )
        .in("product_id", productIds);
      products = (data ?? [])
        .map((p) => {
          const sel = selectionsById.get(p.product_id as string);
          return { ...p, custom_notes: sel?.custom_notes ?? null, display_order: sel?.display_order ?? 0 };
        })
        .sort((a, b) => (a.display_order as number) - (b.display_order as number));
    }

    // Return room data (exclude password_hash and internal fields)
    const { password_hash: _, user_id: __, password_plain: ___, ...safeRoom } = room;

    return NextResponse.json({
      log_id: logId,
      room: safeRoom,
      products,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
