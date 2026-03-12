import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/stripe/config";
import { draftEmail, draftMessage } from "@/lib/agents/email-composer";
import type { MessageChannel, EmailType, LinkedInType } from "@/lib/agents/email-composer";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import type { SubscriptionTier } from "@/types/database";

// 30 compose requests per user per hour
const limiter = rateLimit({ interval: 60 * 60 * 1000 });

const EMAIL_TYPES = [
  "cold_outreach",
  "follow_up",
  "proposal",
  "check_in",
  "intro_request",
  "thank_you",
  "meeting_request",
] as const;

const LINKEDIN_TYPES = [
  "comment",
  "dm",
  "connection_request",
  "post_reply",
  "congratulate",
] as const;

const bodySchema = z
  .object({
    channel: z.enum(["email", "linkedin"]).default("email"),
    // Accept any valid email or LinkedIn type — we validate per-channel below
    messageType: z.string().optional(),
    // Legacy field for backwards compatibility
    emailType: z.enum(EMAIL_TYPES).optional(),
    dealId: z.string().uuid().optional(),
    contactId: z.string().uuid().optional(),
    instructions: z.string().max(1000).optional(),
    sourceContent: z.string().max(5000).optional(),
    replyToConversationId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.dealId || data.contactId || data.instructions || data.replyToConversationId || data.sourceContent,
    {
      message:
        "Provide at least one of: dealId, contactId, instructions, sourceContent, or replyToConversationId.",
    }
  );

/**
 * POST /api/agents/compose-email
 *
 * Triggers the Message Composer to draft an email or LinkedIn message in Tina's voice.
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
    30,
    `compose-email:${user.id}`
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

  const tier: SubscriptionTier = subscription?.tier ?? 'power';
  if (!PLANS[tier].limits.integrations) {
    return NextResponse.json(
      { error: "Message composing requires the Starter plan or higher." },
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
          "Invalid request. Provide a channel/messageType and at least one context field.",
      },
      { status: 400 }
    );
  }

  // Resolve message type: prefer messageType, fall back to legacy emailType
  const channel: MessageChannel = body.channel;
  let messageType: string;

  if (body.messageType) {
    messageType = body.messageType;
  } else if (body.emailType) {
    messageType = body.emailType;
  } else {
    messageType = channel === "email" ? "cold_outreach" : "comment";
  }

  // Validate messageType against channel
  if (channel === "email" && !EMAIL_TYPES.includes(messageType as typeof EMAIL_TYPES[number])) {
    return NextResponse.json(
      { error: `Invalid email type: ${messageType}` },
      { status: 400 }
    );
  }
  if (channel === "linkedin" && !LINKEDIN_TYPES.includes(messageType as typeof LINKEDIN_TYPES[number])) {
    return NextResponse.json(
      { error: `Invalid LinkedIn type: ${messageType}` },
      { status: 400 }
    );
  }

  try {
    const result = await draftMessage(supabase, user.id, {
      channel,
      messageType: messageType as EmailType | LinkedInType,
      dealId: body.dealId,
      contactId: body.contactId,
      instructions: body.instructions,
      sourceContent: body.sourceContent,
      replyToConversationId: body.replyToConversationId,
    });

    if (!result) {
      return NextResponse.json(
        {
          error:
            "Could not generate message. Provide a dealId, contactId, sourceContent, or instructions for context.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      subject: result.subject,
      body: result.body,
      channel: result.channel,
      messageType: result.messageType,
      // Legacy field for backwards compat
      emailType: channel === "email" ? result.messageType : undefined,
      generatedAt: result.generatedAt,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error(
      "[api/agents/compose-email] Draft failed:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to compose message. Please try again." },
      { status: 500 }
    );
  }
}
