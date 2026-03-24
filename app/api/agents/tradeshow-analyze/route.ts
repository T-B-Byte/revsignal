import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/stripe/config";
import { runFullTradeshowAnalysis } from "@/lib/agents/tradeshow-scout";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// Allow up to 120s for the background analysis to complete
export const maxDuration = 120;

// 5 tradeshow analyses per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  sponsorPageUrl: z.string().url().max(2000),
  dates: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
});

/**
 * POST /api/agents/tradeshow-analyze
 *
 * Creates a tradeshow record and kicks off analysis in the background.
 * Returns the tradeshowId immediately for polling.
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
    5,
    `tradeshow-analyze:${user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Check subscription tier — requires Power (aiBriefings)
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const tier: SubscriptionTier = subscription?.tier ?? "power";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "Tradeshow analysis requires the Power plan." },
      { status: 403 }
    );
  }

  // Validate body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Provide a name and sponsor page URL." },
      { status: 400 }
    );
  }

  // Create tradeshow record
  const { data: tradeshow, error: createError } = await supabase
    .from("tradeshows")
    .insert({
      user_id: user.id,
      name: body.name,
      sponsor_page_url: body.sponsorPageUrl,
      dates: body.dates ?? null,
      location: body.location ?? null,
      status: "analyzing",
    })
    .select("tradeshow_id")
    .single();

  if (createError || !tradeshow) {
    return NextResponse.json(
      { error: "Failed to create tradeshow record." },
      { status: 500 }
    );
  }

  const tradeshowId = tradeshow.tradeshow_id;

  // Use admin client for background work: the server client's cookie context
  // is not available after the response is sent
  const adminSupabase = createAdminClient();

  // Run analysis after response is sent, keeping the serverless function alive
  after(async () => {
    try {
      await runFullTradeshowAnalysis(
        adminSupabase,
        user.id,
        tradeshowId,
        body.name,
        body.sponsorPageUrl
      );
    } catch (error) {
      console.error(
        "[api/agents/tradeshow-analyze] Background analysis failed:",
        error instanceof Error ? error.message : error
      );
    }
  });

  return NextResponse.json({ tradeshowId, status: "analyzing" });
}
