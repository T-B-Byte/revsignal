import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ roomId: string }> };

/**
 * GET /api/deal-rooms/[roomId]/access-log
 * List access logs for a deal room. Uses admin client (no RLS on access_log).
 * Limited to 100 most recent entries.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { roomId } = await params;

  if (!UUID_REGEX.test(roomId)) {
    return NextResponse.json(
      { error: "Invalid room ID format" },
      { status: 400 }
    );
  }

  // Auth check with server client (respects RLS)
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user owns this room
  const { data: room, error: roomError } = await supabase
    .from("deal_rooms")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (roomError || !room) {
    return NextResponse.json(
      { error: "Deal room not found" },
      { status: 404 }
    );
  }

  // Use admin client for access_log (no RLS policies)
  const adminSupabase = createAdminClient();

  const { data, error } = await adminSupabase
    .from("deal_room_access_log")
    .select("*")
    .eq("room_id", roomId)
    .order("accessed_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error(
      "[api/deal-rooms/[roomId]/access-log] GET failed:",
      error.message
    );
    return NextResponse.json(
      { error: "Failed to fetch access logs" },
      { status: 500 }
    );
  }

  return NextResponse.json({ access_logs: data });
}
