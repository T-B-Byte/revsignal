import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/coaching/threads/search?q=term
 * Search coaching_conversations content AND coaching_threads.thread_brief,
 * returning matching thread IDs with a snippet of the matching text.
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

  // Run both searches in parallel
  const [conversationsResult, briefsResult] = await Promise.all([
    // Search raw message content
    supabase
      .from("coaching_conversations")
      .select("thread_id, content, role")
      .eq("user_id", user.id)
      .not("thread_id", "is", null)
      .ilike("content", `%${escaped}%`)
      .order("created_at", { ascending: false })
      .limit(100),

    // Search thread briefs (AI-generated summaries stored on coaching_threads)
    supabase
      .from("coaching_threads")
      .select("thread_id, thread_brief")
      .eq("user_id", user.id)
      .not("thread_brief", "is", null)
      .ilike("thread_brief", `%${escaped}%`)
      .limit(50),
  ]);

  if (conversationsResult.error) {
    console.error("[api/coaching/threads/search] conversations error:", conversationsResult.error.message);
  }
  if (briefsResult.error) {
    console.error("[api/coaching/threads/search] briefs error:", briefsResult.error.message);
  }

  if (conversationsResult.error && briefsResult.error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const snippets: Record<string, string> = {};
  const threadIds: string[] = [];

  const addSnippet = (threadId: string, text: string) => {
    if (snippets[threadId]) return;
    threadIds.push(threadId);
    const lower = text.toLowerCase();
    const matchIdx = lower.indexOf(q.toLowerCase());
    if (matchIdx >= 0) {
      const start = Math.max(0, matchIdx - 40);
      const end = Math.min(text.length, matchIdx + q.length + 40);
      let snippet = text.slice(start, end).trim();
      if (start > 0) snippet = "…" + snippet;
      if (end < text.length) snippet = snippet + "…";
      snippets[threadId] = snippet;
    }
  };

  // Process conversation matches first (most recent messages)
  for (const row of conversationsResult.data ?? []) {
    if (!row.thread_id) continue;
    addSnippet(row.thread_id, row.content);
  }

  // Add any thread_brief matches not already covered by conversation matches
  for (const row of briefsResult.data ?? []) {
    if (!row.thread_id || !row.thread_brief) continue;
    addSnippet(row.thread_id, row.thread_brief);
  }

  return NextResponse.json({ thread_ids: threadIds, snippets });
}
