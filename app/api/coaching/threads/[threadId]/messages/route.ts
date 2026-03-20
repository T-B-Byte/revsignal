import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateThreadResponse } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";
import type { SubscriptionTier } from "@/types/database";

// 20 coaching requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const VALID_INTERACTION_TYPES = [
  "email",
  "conversation",
  "call_transcript",
  "web_meeting",
  "in_person_meeting",
  "coaching",
] as const;

const sendMessageSchema = z.object({
  message: z.string().min(1).max(50000),
  interaction_type: z.enum(VALID_INTERACTION_TYPES).default("coaching"),
  attachments: z.array(z.string().url()).max(10).optional(),
});

const editMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(50000),
});

const deleteMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  /** If true, also delete the AI response that immediately follows this user message */
  delete_pair: z.boolean().default(false),
});

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * GET /api/coaching/threads/[threadId]/messages
 * Fetch messages for a thread, paginated.
 */
export async function GET(request: NextRequest, context: RouteContext) {
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

  const { searchParams } = request.nextUrl;
  const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50", 10)), 100);
  const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

  const { data: messages, error } = await supabase
    .from("coaching_conversations")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[api/coaching/threads/messages] GET error:", error.message);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  return NextResponse.json(messages || []);
}

/**
 * POST /api/coaching/threads/[threadId]/messages
 * Send a message in a coaching thread. Calls the Strategist for a response.
 * Requires Power tier subscription.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const { success: withinLimit } = limiter.check(20, `coaching:${user.id}`);
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Check subscription tier
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const tier: SubscriptionTier = subscription?.tier ?? "power";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "Coaching requires the Power plan." },
      { status: 403 }
    );
  }

  // Verify thread ownership and get deal_id
  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("thread_id, deal_id, ma_entity_id, thread_brief, message_count")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const interactionType = parsed.data.interaction_type;

  // For non-coaching interaction types, just save the note (no AI response)
  if (interactionType !== "coaching") {
    const { data: savedMsg, error: saveErr } = await supabase
      .from("coaching_conversations")
      .insert({
        user_id: user.id,
        thread_id: threadId,
        role: "user",
        content: parsed.data.message,
        interaction_type: interactionType,
        context_used: null,
        sources_cited: [],
        tokens_used: null,
        attachments: parsed.data.attachments ?? [],
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[api/coaching/threads/messages] Save error:", saveErr.message);
      return NextResponse.json(
        { error: "Failed to save note." },
        { status: 500 }
      );
    }

    // Update thread metadata (atomic increment to avoid race conditions)
    await supabase.rpc("increment_thread_message_count", {
      p_thread_id: threadId,
      p_last_message_at: savedMsg.created_at,
    }).then(({ error: rpcErr }) => {
      // Fallback to non-atomic update if RPC doesn't exist yet
      if (rpcErr) {
        return supabase
          .from("coaching_threads")
          .update({
            last_message_at: savedMsg.created_at,
            message_count: thread.message_count + 1,
          })
          .eq("thread_id", threadId);
      }
    });

    return NextResponse.json({
      saved: true,
      message: savedMsg,
      interactionType,
    });
  }

  // Coaching mode — call the Strategist with retry for transient errors
  const RETRYABLE_STATUSES = new Set([429, 503, 529]);
  const MAX_RETRIES = 2;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await generateThreadResponse(
        supabase,
        user.id,
        threadId,
        parsed.data.message,
        {
          dealId: thread.deal_id ?? undefined,
          maEntityId: thread.ma_entity_id ?? undefined,
          threadBrief: thread.thread_brief ?? undefined,
          messageCount: thread.message_count,
          imageUrls: parsed.data.attachments,
        }
      );

      return NextResponse.json({
        response: result.response,
        generatedAt: result.generatedAt,
        tokensUsed: result.tokensUsed,
        followUpsExtracted: result.followUpsExtracted ?? [],
        meetingDetected: result.meetingDetected ?? null,
      });
    } catch (err) {
      lastError = err;
      const status = (err as { status?: number }).status;
      if (status && RETRYABLE_STATUSES.has(status) && attempt < MAX_RETRIES) {
        // Exponential backoff: 2s, 4s
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      break;
    }
  }

  {
    const error = lastError;
    const errMsg = error instanceof Error ? error.message : String(error);
    const apiErr = error as Error & { status?: number; error?: { message?: string } };
    console.error(
      "[api/coaching/threads/messages] POST error:",
      errMsg,
      apiErr.status ?? "",
    );

    let message = "Failed to generate response. Please try again.";
    if (apiErr.status === 429) {
      message = "Rate limited by Claude — wait a moment and try again.";
    } else if (apiErr.status === 529 || apiErr.status === 503) {
      message = "Claude is temporarily overloaded. Try again in a few seconds.";
    } else if (apiErr.status === 400) {
      message = `Claude rejected the request: ${apiErr.error?.message ?? errMsg}`;
    } else if (apiErr.status === 500) {
      message = "Claude API error — try again in a moment.";
    } else if (errMsg) {
      message = `Failed to generate response: ${errMsg}`;
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/coaching/threads/[threadId]/messages
 * Edit a user message's content.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
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

  const parsed = editMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Update message — scoped to user_id, thread_id, and role=user (can't edit AI responses)
  const { data: updated, error } = await supabase
    .from("coaching_conversations")
    .update({ content: parsed.data.content })
    .eq("conversation_id", parsed.data.conversation_id)
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .eq("role", "user")
    .select()
    .single();

  if (error || !updated) {
    console.error("[api/coaching/threads/messages] PATCH error:", error?.message);
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
  }

  return NextResponse.json(updated);
}

/**
 * DELETE /api/coaching/threads/[threadId]/messages
 * Delete a message. If delete_pair is true and the message is a user message,
 * also delete the AI response that immediately follows it.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
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

  const parsed = deleteMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Verify message belongs to this thread and user
  const { data: msg } = await supabase
    .from("coaching_conversations")
    .select("conversation_id, role, created_at")
    .eq("conversation_id", parsed.data.conversation_id)
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!msg) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }

  const deletedIds: string[] = [msg.conversation_id];

  // If deleting a user message with delete_pair, find and delete the next assistant message
  if (parsed.data.delete_pair && msg.role === "user") {
    const { data: nextMsg } = await supabase
      .from("coaching_conversations")
      .select("conversation_id")
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .eq("role", "assistant")
      .gt("created_at", msg.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextMsg) {
      deletedIds.push(nextMsg.conversation_id);
    }
  }

  // Delete the message(s)
  const { error } = await supabase
    .from("coaching_conversations")
    .delete()
    .in("conversation_id", deletedIds)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/coaching/threads/messages] DELETE error:", error.message);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }

  // Update thread message count and last_message_at
  const { count: remainingCount } = await supabase
    .from("coaching_conversations")
    .select("conversation_id", { count: "exact", head: true })
    .eq("thread_id", threadId);

  const { data: latestMsg } = await supabase
    .from("coaching_conversations")
    .select("created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("coaching_threads")
    .update({
      message_count: Math.max(0, remainingCount ?? 0),
      last_message_at: latestMsg?.created_at ?? new Date().toISOString(),
    })
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  return NextResponse.json({ success: true, deletedIds });
}
