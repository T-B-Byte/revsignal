import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { SubscriptionTier, SubscriptionStatus } from "@/types/database";

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      // Map Stripe price to our tier
      const priceId = subscription.items.data[0]?.price?.id;
      let tier: SubscriptionTier = "free";
      if (priceId === process.env.STRIPE_PRICE_ID_STARTER) tier = "starter";
      if (priceId === process.env.STRIPE_PRICE_ID_POWER) tier = "power";

      if (tier === "free" && priceId) {
        console.warn(
          `[stripe-webhook] Unknown priceId "${priceId}" — defaulting to free tier`
        );
      }

      // Map Stripe status to our status — unmapped statuses default to past_due (safe)
      const statusMap: Record<string, SubscriptionStatus> = {
        active: "active",
        past_due: "past_due",
        canceled: "cancelled",
        trialing: "trialing",
        incomplete: "past_due",
        incomplete_expired: "cancelled",
        unpaid: "past_due",
        paused: "past_due",
      };
      const status: SubscriptionStatus =
        statusMap[subscription.status] ?? "past_due";

      // Read period dates from the first subscription item (Stripe v20+)
      const firstItem = subscription.items.data[0];
      const periodStart = firstItem?.current_period_start;
      const periodEnd = firstItem?.current_period_end;

      const { error: updateError } = await supabase
        .from("subscriptions")
        .update({
          stripe_subscription_id: subscription.id,
          tier,
          status,
          current_period_start: periodStart
            ? new Date(periodStart * 1000).toISOString()
            : null,
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
        })
        .eq("stripe_customer_id", customerId);

      if (updateError) {
        console.error(
          `[stripe-webhook] Failed to update subscription for ${customerId}:`,
          updateError.message
        );
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      const { error: deleteError } = await supabase
        .from("subscriptions")
        .update({
          tier: "free" as SubscriptionTier,
          status: "cancelled" as SubscriptionStatus,
        })
        .eq("stripe_customer_id", customerId);

      if (deleteError) {
        console.error(
          `[stripe-webhook] Failed to cancel subscription for ${customerId}:`,
          deleteError.message
        );
        return NextResponse.json(
          { error: "Database update failed" },
          { status: 500 }
        );
      }

      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object;

      // Only update subscription status if invoice is tied to a subscription
      if (!invoice.parent?.subscription_details?.subscription) break;

      const customerId =
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;

      if (customerId) {
        const { error: failError } = await supabase
          .from("subscriptions")
          .update({ status: "past_due" as SubscriptionStatus })
          .eq("stripe_customer_id", customerId);

        if (failError) {
          console.error(
            `[stripe-webhook] Failed to mark past_due for ${customerId}:`,
            failError.message
          );
          return NextResponse.json(
            { error: "Database update failed" },
            { status: 500 }
          );
        }
      }

      break;
    }
  }

  return NextResponse.json({ received: true });
}
