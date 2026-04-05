import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/coaching/contradictions?deal_id=X
 *
 * Returns unresolved contradictions for a deal (or all deals if no deal_id).
 * Used by the landing view attention strip and deal hub.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dealId = request.nextUrl.searchParams.get("deal_id");

  let query = supabase
    .from("deal_contradictions")
    .select("*")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("detected_at", { ascending: false });

  if (dealId) {
    query = query.eq("deal_id", dealId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[api/coaching/contradictions] DB error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  // Resolve thread titles for display
  const threadIds = new Set<string>();
  for (const c of data ?? []) {
    if (c.thread_a_id) threadIds.add(c.thread_a_id);
    if (c.thread_b_id) threadIds.add(c.thread_b_id);
  }

  const threadTitles = new Map<string, string>();
  if (threadIds.size > 0) {
    const { data: threads } = await supabase
      .from("coaching_threads")
      .select("thread_id, title")
      .eq("user_id", user.id)
      .in("thread_id", Array.from(threadIds));

    for (const t of threads ?? []) {
      threadTitles.set(t.thread_id, t.title ?? "Untitled");
    }
  }

  const enriched = (data ?? []).map((c) => ({
    ...c,
    thread_a_title: c.thread_a_id ? threadTitles.get(c.thread_a_id) ?? null : null,
    thread_b_title: c.thread_b_id ? threadTitles.get(c.thread_b_id) ?? null : null,
  }));

  return NextResponse.json({ contradictions: enriched });
}

/**
 * PATCH /api/coaching/contradictions
 *
 * Resolves a contradiction by ID.
 * Body: { contradiction_id: string }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contradictionId = body?.contradiction_id;

  if (!contradictionId || typeof contradictionId !== "string") {
    return NextResponse.json({ error: "contradiction_id required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("deal_contradictions")
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq("contradiction_id", contradictionId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/coaching/contradictions] Resolve error:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
