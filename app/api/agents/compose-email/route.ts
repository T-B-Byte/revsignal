import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { draftEmail } from "@/lib/agents/email-composer";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 30 email compose requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const bodySchema = z
  .object({
    dealId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    emailType: z.enum([
      "cold_outreach",
      "follow_up",
      "proposal",
      "check_in",
      "intro_request",
      "thank_you",
      "meeting_request",
    ]),
    instructions: z.string().max(1000).optional(),
    replyToConversationId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.dealId || data.contactId || data.instructions || data.replyToConversationId,
    {
      message:
        "Provide at least one of: dealId, contactId, instructions, or replyToConversationId.",
    }
  );

/**
 * POST /api/agents/compose-email
 *
 * Triggers the Email Composer to draft an email in Tina's voice.
 * Requires Starter+ tier (integrations enabled).
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
    30,
    `compose-email:${user.id}`
  );
  if (!withinLimit) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  // Check subscription tier — requires integrations
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const tier: SubscriptionTier = subscription?.tier ?? 'power';
  if (!PLANS[tier].limits.integrations) {
    return NextResponse.json(
      { error: "Email composing requires the Starter plan or higher." },
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
          "Invalid request. Provide at least an emailType and one of: dealId, contactId, or instructions.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await draftEmail(supabase, user.id, {
      dealId: body.dealId,
      contactId: body.contactId,
      emailType: body.emailType,
      instructions: body.instructions,
      replyToConversationId: body.replyToConversationId,
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Could not generate email. Provide a dealId, contactId, or instructions for context.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      subject: result.subject,
      body: result.body,
      emailType: result.emailType,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/compose-email] Draft failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to compose email. Please try again." },
      { status: 500 }
    );
  }
}
