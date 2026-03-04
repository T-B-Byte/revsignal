import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateCoachingResponse } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";
import type { SubscriptionTier } from "@/types/database";

// 20 coaching requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  message: z.string().min(1).max(5000),
  dealId: z.string().uuid().optional(),
  stakeholderName: z.string().max(200).optional(),
});

/**
 * POST /api/agents/coaching
 *
 * Freeform coaching conversation with The Strategist.
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

  // Rate limit per user
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

  const tier: SubscriptionTier = subscription?.tier ?? "free";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "Coaching requires the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  try {
    const result = await generateCoachingResponse(
      supabase,
      user.id,
      parsed.data.message,
      {
        dealId: parsed.data.dealId,
        stakeholderName: parsed.data.stakeholderName,
      }
    );

    return NextResponse.json({
      response: result.response,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/coaching] Generation failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate coaching response. Please try again." },
      { status: 500 }
    );
  }
}
