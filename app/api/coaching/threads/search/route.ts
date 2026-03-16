import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/coaching/threads/search?q=term
 * Search coaching_conversations content and return matching thread IDs
 * with a snippet of the matching message.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2 || q.length > 200) {
    return NextResponse.json({ thread_ids: [], snippets: {} });
  }

  // Escape LIKE wildcards so user input is treated literally
  const escaped = q.replace(/[%_\\]/g, (ch) => `\\${ch}`);

  // Search message content for the query string (case-insensitive)
  // Only search user's own threads via the thread ownership check
  const { data: matches, error } = await supabase
    .from("coaching_conversations")
    .select("thread_id, content, role")
    .eq("user_id", user.id)
    .not("thread_id", "is", null)
    .ilike("content", `%${escaped}%`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[api/coaching/threads/search] error:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  // Deduplicate by thread_id, keep first (most recent) match per thread
  const snippets: Record<string, string> = {};
  const threadIds: string[] = [];

  for (const row of matches || []) {
    if (!row.thread_id || snippets[row.thread_id]) continue;

    threadIds.push(row.thread_id);

    // Extract a snippet around the match
    const lowerContent = row.content.toLowerCase();
    const matchIdx = lowerContent.indexOf(q.toLowerCase());
    if (matchIdx >= 0) {
      const start = Math.max(0, matchIdx - 40);
      const end = Math.min(row.content.length, matchIdx + q.length + 40);
      let snippet = row.content.slice(start, end).trim();
      if (start > 0) snippet = "…" + snippet;
      if (end < row.content.length) snippet = snippet + "…";
      snippets[row.thread_id] = snippet;
    }
  }

  return NextResponse.json({ thread_ids: threadIds, snippets });
}
