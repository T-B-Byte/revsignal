import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * GET /api/coaching/threads/[threadId]/follow-ups
 * List open follow-ups for a thread.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify thread ownership
  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: followUps, error } = await supabase
    .from("thread_follow_ups")
    .select("*")
    .eq("thread_id", threadId)
    .eq("status", "open")
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[api/coaching/threads/follow-ups] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
  }

  return NextResponse.json(followUps || []);
}
