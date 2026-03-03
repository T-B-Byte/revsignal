import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";
import { logAgentCall } from "@/lib/agents/log";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";

/**
 * POST /api/cron/playbook-check
 *
 * Cron job: flags neglected playbook items (30+ days untouched).
 * Logs findings so The Strategist picks them up in the next briefing.
 * Scheduled Friday at 3:00 PM. Only processes Power-tier users.
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Find all users with active Power subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, tier")
    .eq("status", "active");

  if (subError) {
    console.error(
      "[cron/playbook-check] Failed to fetch subscriptions:",
      subError.message
    );
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const eligibleUserIds = (subscriptions ?? [])
    .filter((s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings)
    .map((s) => s.user_id);

  if (eligibleUserIds.length === 0) {
    return NextResponse.json({
      message: "No eligible users",
      processed: 0,
    });
  }

  let usersWithNeglected = 0;
  let totalNeglected = 0;

  for (const userId of eligibleUserIds) {
    try {
      // Find neglected items for this user
      const { data: neglectedItems } = await supabase
        .from("playbook_items")
        .select("item_id, workstream, description, status, last_touched")
        .eq("user_id", userId)
        .neq("status", "completed")
        .neq("status", "deprecated")
        .or(`last_touched.is.null,last_touched.lt.${thirtyDaysAgo}`);

      if (neglectedItems && neglectedItems.length > 0) {
        // Log for The Strategist to pick up in next briefing
        const itemSummary = neglectedItems
          .map((i) => `[${i.workstream}] ${i.description}`)
          .join("; ");

        await logAgentCall({
          supabase,
          userId,
          agentName: "strategist",
          action: "playbook-check",
          inputContext: {
            neglectedCount: neglectedItems.length,
            items: neglectedItems.map((i) => ({
              workstream: i.workstream,
              description: i.description,
              lastTouched: i.last_touched,
            })),
          },
          output: `${neglectedItems.length} playbook items neglected (30+ days untouched): ${itemSummary}`,
          sourcesCited: [],
        });

        usersWithNeglected++;
        totalNeglected += neglectedItems.length;
      }
    } catch (error) {
      console.error(
        `[cron/playbook-check] Failed for user ${userId}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return NextResponse.json({
    message: `Checked ${eligibleUserIds.length} users, ${usersWithNeglected} have neglected items (${totalNeglected} total)`,
    processed: eligibleUserIds.length,
    totalNeglected,
  });
}
