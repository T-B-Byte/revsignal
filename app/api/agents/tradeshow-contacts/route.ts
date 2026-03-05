import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { researchTargetContacts } from "@/lib/agents/tradeshow-scout";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier, TradeshowTarget } from "@/types/database";

// 20 contact research requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  targetId: z.string().uuid(),
});

/**
 * POST /api/agents/tradeshow-contacts
 *
 * Researches best contacts for a specific tradeshow target.
 * Requires Power tier (aiBriefings).
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
    20,
    `tradeshow-contacts:${user.id}`
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

  const tier: SubscriptionTier = subscription?.tier ?? "power";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "Contact research requires the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a targetId." },
      { status: 400 }
    );
  }

  // Fetch the target (scoped to user)
  const { data: target, error: targetError } = await supabase
    .from("tradeshow_targets")
    .select("*")
    .eq("target_id", body.targetId)
    .eq("user_id", user.id)
    .single();

  if (targetError || !target) {
    return NextResponse.json(
      { error: "Target not found." },
      { status: 404 }
    );
  }

  try {
    const contacts = await researchTargetContacts(
      supabase,
      user.id,
      target as TradeshowTarget
    );

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error(
      "[api/agents/tradeshow-contacts] Research failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to research contacts. Please try again." },
      { status: 500 }
    );
  }
}
