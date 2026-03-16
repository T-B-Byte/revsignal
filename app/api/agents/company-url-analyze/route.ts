import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { analyzeCompanyFromUrl } from "@/lib/agents/prospect-scout";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 10 URL analyses per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  url: z.string().url().max(2000),
});

/**
 * POST /api/agents/company-url-analyze
 *
 * Fetches a company URL and analyzes DaaS fit via the Prospect Scout.
 * Creates/updates prospect record with pre-computed fit data.
 * Requires Starter+ tier.
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
    `company-url-analyze:${user.id}`
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
  if (PLANS[tier].limits.prospectSearches <= 0) {
    return NextResponse.json(
      { error: "URL analysis requires the Starter plan or higher." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a valid URL." },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeCompanyFromUrl(supabase, user.id, body.url);

    if (!result) {
      return NextResponse.json(
        { error: "Failed to analyze company." },
        { status: 500 }
      );
    }

    return NextResponse.json({
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
    const message = error instanceof Error ? error.message : "Unknown error";

    // Return user-friendly messages for known errors
    if (message === "Invalid URL" || message === "Only HTTP/HTTPS URLs are allowed") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "Internal URLs are not allowed") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.startsWith("Failed to fetch URL:") || message.startsWith("Page content too short")) {
      return NextResponse.json({ error: message }, { status: 422 });
    }

    console.error("[api/agents/company-url-analyze] Analysis failed:", message);
    return NextResponse.json(
      { error: "Failed to analyze company. Please try again." },
      { status: 500 }
    );
  }
}
