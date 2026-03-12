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
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

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
    .select("thread_id, deal_id, thread_brief, message_count")
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

  // Coaching mode — call the Strategist for a response
  try {
    const result = await generateThreadResponse(
      supabase,
      user.id,
      threadId,
      parsed.data.message,
      {
        dealId: thread.deal_id ?? undefined,
        threadBrief: thread.thread_brief ?? undefined,
        messageCount: thread.message_count,
      }
    );

    return NextResponse.json({
      response: result.response,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
      followUpsExtracted: result.followUpsExtracted ?? [],
    });
  } catch (error) {
    console.error(
      "[api/coaching/threads/messages] POST error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}
