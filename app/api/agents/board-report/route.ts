import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateBoardReport } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import type { SubscriptionTier } from "@/types/database";

// 5 board report requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

/**
 * POST /api/agents/board-report
 *
 * Generate a board meeting one-pager via The Strategist.
 * Returns structured sections the user can toggle and edit before printing.
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

  // Rate limit per user
  const { success: withinLimit } = limiter.check(5, `board-report:${user.id}`);
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
      { error: "Board reports require the Power plan." },
      { status: 403 }
    );
  }

  try {
    const result = await generateBoardReport(supabase, user.id);

    return NextResponse.json({
      sections: result.sections,
      generatedAt: result.generatedAt,
      weekNumber: result.weekNumber,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/board-report] Generation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate board report. Please try again." },
      { status: 500 }
    );
  }
}
