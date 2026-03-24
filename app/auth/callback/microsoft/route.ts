import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/integrations/microsoft-graph";

/**
 * GET /auth/callback/microsoft
 *
 * OAuth2 callback handler for Microsoft. Receives the authorization code,
 * exchanges it for tokens, stores them, and redirects to settings.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Microsoft returned an error (user denied consent, etc.)
  if (error) {
    const desc = searchParams.get("error_description") ?? "Unknown error";
    console.error("[auth/callback/microsoft] OAuth error:", error, desc);
    return NextResponse.redirect(
      `${origin}/settings?microsoft=error&reason=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${origin}/settings?microsoft=error&reason=missing_params`
    );
  }

  // Validate state contains a user ID
  const userId = state.split(":")[0];
  if (!userId || userId.length < 32) {
    return NextResponse.redirect(
      `${origin}/settings?microsoft=error&reason=invalid_state`
    );
  }

  // Verify the authenticated user matches the state
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return NextResponse.redirect(
      `${origin}/settings?microsoft=error&reason=user_mismatch`
    );
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(
      `${origin}/settings?microsoft=error&reason=token_exchange_failed`
    );
  }

  // Store tokens via admin client (bypasses RLS in case session cookie
  // expired during the OAuth round-trip)
  const adminSupabase = createAdminClient();
  await storeTokens(adminSupabase, user.id, tokens);

  return NextResponse.redirect(`${origin}/settings?microsoft=connected`);
}
