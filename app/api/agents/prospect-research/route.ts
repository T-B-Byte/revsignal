import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { runProspectResearch } from "@/lib/agents/prospect-scout";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 20 prospect research requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  company: z.string().min(1).max(200),
  icpCategory: z.string().max(100).optional(),
});

/**
 * POST /api/agents/prospect-research
 *
 * Triggers the Prospect Scout to research a specific company.
 * Requires Starter+ tier (prospectSearches > 0).
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
    `prospect-research:${user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Check subscription tier — requires prospect searches
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const tier: SubscriptionTier = subscription?.tier ?? 'power';
  if (PLANS[tier].limits.prospectSearches <= 0) {
    return NextResponse.json(
      { error: "Prospect research requires the Starter plan or higher." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a company name." },
      { status: 400 }
    );
  }

  try {
    const result = await runProspectResearch(
      supabase,
      user.id,
      body.company,
      body.icpCategory
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to generate research." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      prospectId: result.prospectId,
      company: result.company,
      researchNotes: result.researchNotes,
      icpCategory: result.icpCategory,
      nextAction: result.nextAction,
      fitScore: result.fitScore,
      fitAnalysis: result.fitAnalysis,
      whyTheyBuy: result.whyTheyBuy,
      suggestedContacts: result.suggestedContacts,
      estimatedAcv: result.estimatedAcv,
      website: result.website,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/prospect-research] Research failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to complete prospect research. Please try again." },
      { status: 500 }
    );
  }
}
