import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateBattleCard } from "@/lib/agents/competitive-watcher";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 10 battle card requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  competitor: z.string().min(1).max(200),
});

/**
 * POST /api/agents/battle-card
 *
 * Triggers the Competitive Watcher to generate a battle card for a competitor.
 * Requires Power tier subscription.
 */
export async function POST(request: NextRequest) {
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
    `battle-card:${user.id}`
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
      { error: "Battle cards require the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a competitor name." },
      { status: 400 }
    );
  }

  try {
    const result = await generateBattleCard(supabase, user.id, body.competitor);

    if (!result) {
      return NextResponse.json(
        {
          error: "No competitive intelligence found for this competitor. Add intel first.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      competitor: result.competitor,
      battleCard: result.battleCard,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/battle-card] Generation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate battle card. Please try again." },
      { status: 500 }
    );
  }
}
