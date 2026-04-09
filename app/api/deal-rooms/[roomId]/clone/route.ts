import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteParams = { params: Promise<{ roomId: string }> };

function generatePassword(): string {
  const pools = [
    ["surge", "intent", "signal", "persona", "funnel", "pipeline", "inmarket", "topical"],
    ["contact", "account", "domain", "seniority", "vertical", "taxonomy", "segment", "enrichment"],
    ["nurture", "retarget", "syndicate", "lifecycle", "attribution", "qualified", "MQL", "ABM"],
  ];
  const pool1 = pools[Math.floor(Math.random() * pools.length)];
  const pool2 = pools[Math.floor(Math.random() * pools.length)];
  const w1 = pool1[Math.floor(Math.random() * pool1.length)];
  const w2 = pool2[Math.floor(Math.random() * pool2.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${w1}-${w2}-${num}`;
}

/**
 * POST /api/deal-rooms/[roomId]/clone
 * Clone a deal room with a new slug and password.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
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

  // Fetch the source room
  const { data: source, error: fetchError } = await supabase
    .from("deal_rooms")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !source) {
    return NextResponse.json(
      { error: "Deal room not found" },
      { status: 404 }
    );
  }

  const newPassword = generatePassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const newSlug = `${source.slug}-copy-${Date.now().toString(36)}`;

  const { data: cloned, error: insertError } = await supabase
    .from("deal_rooms")
    .insert({
      user_id: user.id,
      company_id: source.company_id,
      slug: newSlug,
      password_hash: passwordHash,
      password_plain: newPassword,
      status: "draft" as const,
      custom_header: source.custom_header,
      welcome_message: source.welcome_message,
      selected_products: source.selected_products,
      selected_demos: source.selected_demos,
      show_audience_dashboard: source.show_audience_dashboard,
      audience_dashboard_url: source.audience_dashboard_url,
      show_quote_builder: source.show_quote_builder,
      custom_pricing: source.custom_pricing,
      custom_use_cases: source.custom_use_cases,
      company_logo_url: source.company_logo_url,
      accent_color: source.accent_color,
      expires_at: null,
    })
    .select()
    .single();

  if (insertError || !cloned) {
    console.error("[api/deal-rooms/[roomId]/clone] POST failed:", insertError?.message);
    return NextResponse.json(
      { error: "Failed to clone deal room" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deal_room: cloned }, { status: 201 });
}
