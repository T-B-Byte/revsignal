import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/microsoft-graph
 *
 * Receives change notifications from Microsoft Graph subscriptions.
 * Handles:
 *  - Subscription validation (responds to validation token)
 *  - Change notifications for Teams messages, emails, calendar events
 *
 * Microsoft Graph sends a validation request when creating a subscription.
 * We must respond with the validationToken within 10 seconds.
 *
 * Auth: GRAPH_WEBHOOK_CLIENT_STATE must be set. Notifications without
 * a matching clientState are rejected.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  // Handle subscription validation
  const validationToken = url.searchParams.get("validationToken");
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Require client state secret for webhook authentication
  const expectedState = process.env.GRAPH_WEBHOOK_CLIENT_STATE;
  if (!expectedState) {
    console.error("[webhook/microsoft-graph] GRAPH_WEBHOOK_CLIENT_STATE not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Process change notifications
  const body = await request.json();

  if (!body.value || !Array.isArray(body.value)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();

  for (const notification of body.value) {
    try {
      const { clientState, resource, changeType } = notification;

      // Timing-safe client state verification — reject on mismatch
      if (
        !clientState ||
        clientState.length !== expectedState.length ||
        !timingSafeEqual(clientState, expectedState)
      ) {
        console.error("[webhook/microsoft-graph] Client state mismatch — rejecting notification");
        continue;
      }

      // Log the notification for processing.
      // Use "system" as user_id — the actual user is resolved during processing,
      // not from the notification payload (which has no reliable user mapping).
      await supabase.from("ingested_messages").insert({
        user_id: "system",
        source: `graph-webhook-${changeType}`,
        external_id: resource,
        raw_content: JSON.stringify(notification),
        processed: false,
      });

      console.log(
        `[webhook/microsoft-graph] Received ${changeType} for ${resource}`
      );
    } catch (error) {
      console.error(
        "[webhook/microsoft-graph] Notification processing error:",
        error instanceof Error ? error.message : error
      );
    }
  }

  // Microsoft Graph expects 202 Accepted
  return NextResponse.json({ received: true }, { status: 202 });
}

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
