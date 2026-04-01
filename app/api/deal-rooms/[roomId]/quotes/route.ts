import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ roomId: string }> };

/**
 * GET /api/deal-rooms/[roomId]/quotes
 * List all quotes for a deal room, ordered by created_at desc.
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

  const { data, error } = await supabase
    .from("deal_room_quotes")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[api/deal-rooms/[roomId]/quotes] GET failed:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch quotes" },
      { status: 500 }
    );
  }

  return NextResponse.json({ quotes: data });
}
