import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateDealStrategy } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import type { SubscriptionTier } from "@/types/database";
import { z } from "zod/v4";

const bodySchema = z.object({
  dealId: z.string().uuid(),
});

// 20 deal strategy requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

/**
 * POST /api/agents/deal-strategy
 *
 * Triggers The Strategist to generate deal-specific strategy advice.
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

  // Rate limit per user — expensive AI call
  const { success: withinLimit } = limiter.check(20, `deal-strategy:${user.id}`);
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
      { error: "Deal strategy requires the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a valid dealId." },
      { status: 400 }
    );
  }

  try {
    const result = await generateDealStrategy(supabase, user.id, body.dealId);

    if (!result) {
      return NextResponse.json(
        { error: "Deal not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      strategy: result.strategy,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/deal-strategy] Strategy generation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate deal strategy. Please try again." },
      { status: 500 }
    );
  }
}
