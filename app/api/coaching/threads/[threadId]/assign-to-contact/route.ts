import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const assignSchema = z.object({
  contact_id: z.string().uuid(),
});

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * POST /api/coaching/threads/[threadId]/assign-to-contact
 * Compiles the thread's messages into a conversations record linked to the
 * given contact, then deletes the coaching thread.
 * Returns: { conversation_id }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { contact_id } = parsed.data;

  // Verify thread ownership
  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("thread_id, title, created_at, thread_brief, deal_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Verify contact ownership
  const { data: contact } = await supabase
    .from("contacts")
    .select("contact_id")
    .eq("contact_id", contact_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  // Fetch all messages for this thread in chronological order
  const { data: msgs } = await supabase
    .from("coaching_conversations")
    .select("role, content, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  // Compile messages into readable raw_text
  const rawText = (msgs ?? [])
    .map((m) => {
      const label = m.role === "user" ? "You" : "Strategist";
      const ts = new Date(m.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `[${label} — ${ts}]\n${m.content}`;
    })
    .join("\n\n---\n\n");

  // Create a conversations record dated at thread creation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      contact_id,
      deal_id: thread.deal_id ?? null,
      date: thread.created_at,
      channel: "manual",
      subject: thread.title,
      raw_text: rawText || null,
      ai_summary: thread.thread_brief || null,
    })
    .select("conversation_id")
    .single();

  if (convError || !conversation) {
    console.error("[assign-to-contact] Failed to create conversation:", convError?.message);
    return NextResponse.json({ error: "Failed to create conversation record" }, { status: 500 });
  }

  // Delete the coaching thread — cascade removes coaching_conversations and thread_follow_ups
  const { error: deleteError } = await supabase
    .from("coaching_threads")
    .delete()
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (deleteError) {
    console.error("[assign-to-contact] Failed to delete thread:", deleteError.message);
    // Conversation was created — return success with warning
    return NextResponse.json({
      conversation_id: conversation.conversation_id,
      warning: "Conversation saved but thread deletion failed",
    });
  }

  return NextResponse.json({ conversation_id: conversation.conversation_id });
}
