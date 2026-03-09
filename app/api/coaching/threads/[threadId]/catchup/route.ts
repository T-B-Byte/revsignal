import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateThreadCatchup } from "@/lib/agents/strategist";
import type { SubscriptionTier } from "@/types/database";

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * GET /api/coaching/threads/[threadId]/catchup
 * Generate a "here's where we left off" summary for thread re-entry.
 * Includes open follow-ups, deal changes since last activity, and next step recommendations.
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

  // Verify thread ownership and get metadata
  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("thread_id, deal_id, title, thread_brief, last_message_at, message_count")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  // Skip catchup for new/empty threads
  if (thread.message_count < 2) {
    return NextResponse.json({ catchup: null, reason: "new_thread" });
  }

  try {
    const catchup = await generateThreadCatchup(
      supabase,
      user.id,
      threadId,
      {
        dealId: thread.deal_id ?? undefined,
        threadBrief: thread.thread_brief ?? undefined,
        lastMessageAt: thread.last_message_at,
        threadTitle: thread.title,
      }
    );

    return NextResponse.json({ catchup });
  } catch (error) {
    console.error(
      "[api/coaching/threads/catchup] error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate catchup." },
      { status: 500 }
    );
  }
}
