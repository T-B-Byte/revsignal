import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { generateMorningBriefing } from "@/lib/agents/strategist";
import { rateLimit } from "@/lib/rate-limit";
import type { SubscriptionTier } from "@/types/database";

// 10 briefing requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * GET /api/agents/briefing
 *
 * Load today's saved briefing from the database.
 * Returns null if no briefing exists for today.
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: briefing } = await supabase
    .from("daily_briefings")
    .select("*")
    .eq("user_id", user.id)
    .eq("briefing_date", todayDate())
    .maybeSingle();

  if (!briefing) {
    return NextResponse.json({ briefing: null });
  }

  return NextResponse.json({
    briefing: briefing.edited_content || briefing.content,
    originalContent: briefing.content,
    isEdited: !!briefing.edited_content,
    generatedAt: briefing.generated_at,
    briefingId: briefing.briefing_id,
  });
}

/**
 * POST /api/agents/briefing
 *
 * Generate a new briefing via The Strategist and save to daily_briefings.
 * Upserts: if a briefing exists for today, it overwrites.
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

  const tier: SubscriptionTier = subscription?.tier ?? "power";
  if (!PLANS[tier].limits.aiBriefings) {
    return NextResponse.json(
      { error: "AI briefings require the Power plan." },
      { status: 403 }
    );
  }

  try {
    const result = await generateMorningBriefing(supabase, user.id);

    // Upsert today's briefing
    const { data: saved } = await supabase
      .from("daily_briefings")
      .upsert(
        {
          user_id: user.id,
          briefing_date: todayDate(),
          content: result.briefing,
          edited_content: null,
          sources_cited: result.sourcesCited,
          tokens_used: result.tokensUsed,
          generated_at: result.generatedAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,briefing_date" }
      )
      .select("briefing_id")
      .single();

    return NextResponse.json({
      briefing: result.briefing,
      originalContent: result.briefing,
      isEdited: false,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
      briefingId: saved?.briefing_id ?? null,
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

const editSchema = z.object({
  edited_content: z.string().min(1).max(50000),
});

/**
 * PATCH /api/agents/briefing
 *
 * Save user edits to today's briefing.
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = editSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Validation failed" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("daily_briefings")
    .update({
      edited_content: parsed.data.edited_content,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("briefing_date", todayDate());

  if (error) {
    console.error("[api/agents/briefing] Edit save failed:", error);
    return NextResponse.json(
      { error: "Failed to save edits" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
