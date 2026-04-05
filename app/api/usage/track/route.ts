import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/usage/track
 * Records a page view for the authenticated user.
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const pageKey = typeof raw.page_key === "string" ? raw.page_key.trim().slice(0, 64) : "";
  const pageLabel = typeof raw.page_label === "string" ? raw.page_label.trim().slice(0, 64) : "";

  if (!pageKey || !pageLabel) {
    return NextResponse.json(
      { error: "page_key and page_label are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("page_views").insert({
    user_id: user.id,
    page_key: pageKey,
    page_label: pageLabel,
  });

  if (error) {
    console.error("[usage/track] Insert failed:", error.message);
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
