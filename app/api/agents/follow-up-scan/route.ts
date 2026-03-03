import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { scanForOverdueItems } from "@/lib/agents/follow-up-enforcer";
import { rateLimit } from "@/lib/rate-limit";
import type { SubscriptionTier } from "@/types/database";

// 10 follow-up scan requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

/**
 * POST /api/agents/follow-up-scan
 *
 * Triggers the Follow-Up Enforcer to scan and escalate overdue action items.
 * Requires Power tier subscription.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success: withinLimit } = limiter.check(
    10,
    `followup-scan:${user.id}`
  );
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

  const tier: SubscriptionTier = subscription?.tier ?? "free";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "Follow-up scanning requires the Power plan." },
      { status: 403 }
    );
  }

  try {
    const result = await scanForOverdueItems(supabase, user.id);

    return NextResponse.json({
      escalated: result.escalated,
      summary: result.summary,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/follow-up-scan] Scan failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to scan follow-ups. Please try again." },
      { status: 500 }
    );
  }
}
