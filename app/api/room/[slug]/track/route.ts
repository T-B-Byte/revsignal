import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const limiter = rateLimit({ interval: 60_000 });

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Tabs are alphanumeric slugs — prevents injection, allows demo keys like "tal_matching"
const TAB_REGEX = /^[a-zA-Z0-9_-]{1,100}$/;

const trackSchema = z.object({
  log_id: z.string().regex(UUID_REGEX),
  tab: z.string().regex(TAB_REGEX),
});

/**
 * POST /api/room/[slug]/track — Record a tab click for an active session.
 * Public endpoint (no auth). Rate-limited per IP. Validates log_id belongs to this room.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || slug.length > 100) {
    return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { success } = limiter.check(120, `track:${slug}:${ip}`);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { log_id, tab } = parsed.data;
  const admin = createAdminClient();

  // Resolve room_id from slug
  const { data: room } = await admin
    .from("deal_rooms")
    .select("room_id")
    .eq("slug", slug)
    .single();

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  // Fetch log entry — must belong to this room to prevent cross-room injection
  const { data: logEntry } = await admin
    .from("deal_room_access_log")
    .select("log_id, pages_viewed")
    .eq("log_id", log_id)
    .eq("room_id", room.room_id)
    .single();

  if (!logEntry) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const current = (logEntry.pages_viewed ?? []) as string[];
  // Cap at 500 entries per session to prevent unbounded growth
  if (current.length >= 500) {
    return NextResponse.json({ success: true });
  }

  await admin
    .from("deal_room_access_log")
    .update({ pages_viewed: [...current, tab] })
    .eq("log_id", log_id);

  return NextResponse.json({ success: true });
}
