import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { analyzeTranscript } from "@/lib/agents/call-analyst";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 5 transcript analysis requests per user per hour (expensive)
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  transcriptText: z.string().min(10).max(50_000),
  dealId: z.string().uuid().optional(),
  contactName: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, "Date must be in YYYY-MM-DD format"),
  channel: z.enum(["call", "teams"]),
});

/**
 * POST /api/agents/analyze-transcript
 *
 * Triggers the Call Analyst to process a transcript into structured intelligence.
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
    5,
    `analyze-transcript:${user.id}`
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
  if (!PLANS[tier].limits.callTranscripts) {
    return NextResponse.json(
      { error: "Transcript analysis requires the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid request. Provide transcriptText, date, and channel.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeTranscript(supabase, user.id, body.transcriptText, {
      dealId: body.dealId,
      contactName: body.contactName,
      company: body.company,
      date: body.date,
      channel: body.channel,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Failed to analyze transcript." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      summary: result.summary,
      actionItems: result.actionItems,
      objections: result.objections,
      competitorMentions: result.competitorMentions,
      pricingDiscussed: result.pricingDiscussed,
      nextSteps: result.nextSteps,
      transcriptQuality: result.transcriptQuality,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/analyze-transcript] Analysis failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to analyze transcript. Please try again." },
      { status: 500 }
    );
  }
}
