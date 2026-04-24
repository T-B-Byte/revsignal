import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const crossPostSchema = z.object({
  /** The message content (with @mentions stripped) */
  content: z.string().min(1).max(50000),
  /** Name of the source thread for context */
  source_thread_name: z.string().min(1).max(200),
  /** @mentioned names to cross-post to */
  mentions: z.array(z.string().min(1).max(200)).min(1).max(20),
});

/**
 * POST /api/coaching/threads/cross-post
 * Cross-post a message to threads matching @mentioned names.
 * If no thread exists for a name, auto-creates one.
 * Returns the list of threads that received the cross-post.
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = crossPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { content, source_thread_name, mentions } = parsed.data;

  // Fetch all user's threads to match against
  const { data: existingThreads } = await supabase
    .from("coaching_threads")
    .select("thread_id, title, contact_name, company")
    .eq("user_id", user.id)
    .eq("is_archived", false);

  const threads = existingThreads ?? [];
  const crossPosted: { thread_id: string; name: string; created: boolean }[] = [];

  // Normalize company names so "TD Synnex" matches a mention of "tdsynnex".
  const normalize = (s: string) => s.toLowerCase().replace(/[\s.,&/-]+/g, "");

  for (const mention of mentions) {
    const mentionLower = mention.toLowerCase();
    const mentionNormalized = normalize(mention);

    // Try to find a matching thread by contact_name, title, or company
    const match = threads.find((t) => {
      const contactMatch = t.contact_name?.toLowerCase().includes(mentionLower);
      const titleMatch = t.title?.toLowerCase().includes(mentionLower);
      const companyMatch =
        t.company && normalize(t.company).includes(mentionNormalized);
      // Also check first name match (e.g., "@Ben" matches "Ben Luck")
      const firstNameMatch = t.contact_name
        ?.toLowerCase()
        .split(/\s+/)[0] === mentionLower;
      return contactMatch || titleMatch || companyMatch || firstNameMatch;
    });

    let targetThreadId: string;
    let created = false;

    if (match) {
      targetThreadId = match.thread_id;
    } else {
      // Auto-create a thread for this person
      const { data: newThread, error: createErr } = await supabase
        .from("coaching_threads")
        .insert({
          user_id: user.id,
          title: mention,
          contact_name: mention,
        })
        .select("thread_id")
        .single();

      if (createErr || !newThread) {
        console.error(
          "[api/coaching/cross-post] Thread creation error:",
          createErr?.message
        );
        continue;
      }

      targetThreadId = newThread.thread_id;
      created = true;
    }

    // Insert the cross-posted message
    const crossPostContent = `**From ${source_thread_name}:**\n\n${content}`;

    const { error: insertErr } = await supabase
      .from("coaching_conversations")
      .insert({
        user_id: user.id,
        thread_id: targetThreadId,
        role: "user",
        content: crossPostContent,
        interaction_type: "coaching",
        context_used: null,
        sources_cited: [],
        tokens_used: null,
        attachments: [],
      });

    if (insertErr) {
      console.error(
        "[api/coaching/cross-post] Message insert error:",
        insertErr.message
      );
      continue;
    }

    // Update thread metadata
    await supabase
      .from("coaching_threads")
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq("thread_id", targetThreadId)
      .eq("user_id", user.id);

    crossPosted.push({
      thread_id: targetThreadId,
      name: match?.contact_name ?? match?.title ?? mention,
      created,
    });
  }

  return NextResponse.json({ cross_posted: crossPosted });
}
