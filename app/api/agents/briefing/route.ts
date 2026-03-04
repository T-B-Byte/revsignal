import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateMorningBriefing } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import type { SubscriptionTier } from "@/types/database";

// 10 briefing requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

/**
 * POST /api/agents/briefing
 *
 * Triggers The Strategist to generate a morning briefing.
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

  // Rate limit per user — expensive AI call
  const { success: withinLimit } = limiter.check(10, `briefing:${user.id}`);
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

  const tier: SubscriptionTier = subscription?.tier ?? 'power';
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "AI briefings require the Power plan." },
      { status: 403 }
    );
  }

  try {
    const result = await generateMorningBriefing(supabase, user.id);

    return NextResponse.json({
      briefing: result.briefing,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/briefing] Briefing generation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate briefing. Please try again." },
      { status: 500 }
    );
  }
}
