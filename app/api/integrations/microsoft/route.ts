import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/integrations/microsoft-graph";
import crypto from "crypto";

/**
 * GET /api/integrations/microsoft
 *
 * Initiates the Microsoft OAuth flow by returning the authorization URL.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const state = `${user.id}:${nonce}`;

  const authUrl = buildAuthUrl(state);
  if (!authUrl) {
    return NextResponse.json(
      { error: "Microsoft integration not configured" },
      { status: 503 }
    );
  }

  return NextResponse.json({ authUrl, state });
}

/**
 * DELETE /api/integrations/microsoft
 *
 * Disconnects the Microsoft integration by removing stored tokens.
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("integration_tokens")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "microsoft");

  if (error) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ message: "Disconnected" });
}
