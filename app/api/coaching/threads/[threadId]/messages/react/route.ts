import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const reactSchema = z.object({
  conversation_id: z.string().uuid(),
  reaction: z.enum(["thumbs_up", "ok", "love"]).nullable(),
});

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * POST /api/coaching/threads/[threadId]/messages/react
 * Set or clear a reaction on a message.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  if (!UUID_REGEX.test(threadId)) {
    return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 });
  }

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

  const parsed = reactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("coaching_conversations")
    .update({ reaction: parsed.data.reaction })
    .eq("conversation_id", parsed.data.conversation_id)
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/coaching/react] Update error:", error.message);
    return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
