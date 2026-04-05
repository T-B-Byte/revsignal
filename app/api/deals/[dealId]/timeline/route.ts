import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/deals/[dealId]/timeline
 * Merged chronological timeline of all activity for a deal:
 * - Coaching messages from all linked threads
 * - Logged conversations
 * - Completed tasks
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  const { dealId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify deal ownership
  const { data: deal } = await supabase
    .from("deals")
    .select("deal_id")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .single();

  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  // Fetch all threads for this deal
  const { data: threads } = await supabase
    .from("coaching_threads")
    .select("thread_id, title")
    .eq("deal_id", dealId)
    .eq("user_id", user.id);

  const threadIds = (threads ?? []).map((t) => t.thread_id);
  const threadMap = new Map((threads ?? []).map((t) => [t.thread_id, t.title]));

  // Fetch data in parallel
  const [coachingRes, convsRes, tasksRes] = await Promise.all([
    // Coaching messages from all deal threads
    threadIds.length > 0
      ? supabase
          .from("coaching_conversations")
          .select("conversation_id, thread_id, role, content, interaction_type, created_at")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    // Logged conversations on the deal
    supabase
      .from("conversations")
      .select("conversation_id, date, channel, subject, ai_summary, contact_id")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(50),
    // Completed tasks for this deal (last 30 days)
    supabase
      .from("user_tasks")
      .select("task_id, description, completed_at, source")
      .eq("deal_id", dealId)
      .eq("user_id", user.id)
      .eq("status", "done")
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  type TimelineEntry = {
    id: string;
    type: "coaching" | "conversation" | "task_completed";
    date: string;
    thread_id?: string;
    thread_title?: string;
    role?: string;
    content: string;
    channel?: string;
    interaction_type?: string;
  };

  const entries: TimelineEntry[] = [];

  // Coaching messages
  for (const msg of coachingRes.data ?? []) {
    entries.push({
      id: msg.conversation_id,
      type: "coaching",
      date: msg.created_at,
      thread_id: msg.thread_id,
      thread_title: threadMap.get(msg.thread_id) ?? "Thread",
      role: msg.role,
      content: msg.content.length > 300 ? msg.content.slice(0, 300) + "..." : msg.content,
      interaction_type: msg.interaction_type,
    });
  }

  // Logged conversations
  for (const conv of convsRes.data ?? []) {
    entries.push({
      id: conv.conversation_id,
      type: "conversation",
      date: conv.date,
      content: conv.ai_summary ?? conv.subject ?? "Logged conversation",
      channel: conv.channel,
    });
  }

  // Completed tasks
  for (const task of tasksRes.data ?? []) {
    if (!task.completed_at) continue;
    entries.push({
      id: task.task_id,
      type: "task_completed",
      date: task.completed_at,
      content: task.description,
    });
  }

  // Sort by date descending
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({
    entries: entries.slice(0, 100),
    thread_count: threadIds.length,
    total_entries: entries.length,
  });
}
