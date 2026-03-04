import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";
import { PLANS } from "@/lib/stripe/config";
import { ACTIVE_STAGES } from "@/types/database";
import type { SubscriptionTier, NudgePriority } from "@/types/database";

/**
 * POST /api/cron/generate-nudges
 *
 * Cron job: generates proactive coaching nudges for Power-tier users.
 * Checks for rule-based triggers (cheap, no AI needed):
 *   - Stakeholder gaps (14+ days since interaction)
 *   - Upcoming meetings without prep
 *   - Stale deals (7+ days no activity)
 *   - Neglected playbook items (30+ days)
 *
 * Also expires old pending nudges (7+ days).
 * Scheduled daily at 8:00 AM.
 *
 * Auth: CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find all users with active Power subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("subscriptions")
    .select("user_id, tier")
    .eq("status", "active");

  if (subError) {
    console.error(
      "[cron/generate-nudges] Failed to fetch subscriptions:",
      subError.message
    );
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const powerUsers = (subscriptions ?? []).filter(
    (s) => PLANS[s.tier as SubscriptionTier]?.limits.aiBriefings
  );

  if (powerUsers.length === 0) {
    return NextResponse.json({ message: "No eligible users", processed: 0 });
  }

  let succeeded = 0;
  let failed = 0;
  let totalNudges = 0;
  let totalExpired = 0;

  for (const sub of powerUsers) {
    try {
      const result = await generateNudgesForUser(supabase, sub.user_id);
      succeeded++;
      totalNudges += result.created;
      totalExpired += result.expired;
    } catch (error) {
      console.error(
        `[cron/generate-nudges] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      failed++;
    }
  }

  return NextResponse.json({
    message: `Nudge generation: ${succeeded} users processed, ${failed} failed, ${totalNudges} nudges created, ${totalExpired} expired`,
    processed: succeeded + failed,
    totalNudges,
    totalExpired,
  });
}

// ---------------------------------------------------------------------------
// Nudge generation logic (rule-based, no AI calls)
// ---------------------------------------------------------------------------

interface NudgeCandidate {
  title: string;
  message: string;
  priority: NudgePriority;
  action_url?: string;
  source_agent: string;
  context?: Record<string, unknown>;
  expires_at: string;
}

async function generateNudgesForUser(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<{ created: number; expired: number }> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  // Expire old pending nudges (older than 7 days)
  const { data: expiredData } = await supabase
    .from("nudges")
    .update({ status: "dismissed" })
    .eq("user_id", userId)
    .eq("status", "pending")
    .lt("created_at", sevenDaysAgo.toISOString())
    .select("nudge_id");

  const expiredCount = expiredData?.length ?? 0;

  // Parallel fetch: stakeholders, active deals, playbook items, upcoming meetings, existing pending nudges
  const [
    stakeholdersResult,
    dealsResult,
    playbookResult,
    meetingsResult,
    pendingNudgesResult,
  ] = await Promise.all([
    supabase
      .from("stakeholders")
      .select("stakeholder_id, name, organization, last_interaction_date")
      .eq("user_id", userId),
    supabase
      .from("deals")
      .select("deal_id, company, stage, last_activity_date, acv")
      .eq("user_id", userId)
      .in("stage", ACTIVE_STAGES),
    supabase
      .from("playbook_items")
      .select("item_id, workstream, description, last_touched, status")
      .eq("user_id", userId)
      .neq("status", "completed"),
    supabase
      .from("meeting_notes")
      .select("meeting_note_id, title, meeting_date, attendees")
      .eq("user_id", userId)
      .gte("meeting_date", now.toISOString())
      .order("meeting_date", { ascending: true })
      .limit(10),
    supabase
      .from("nudges")
      .select("title, status")
      .eq("user_id", userId)
      .eq("status", "pending"),
  ]);

  // Build a set of existing pending nudge titles to avoid duplicates
  const existingTitles = new Set(
    (pendingNudgesResult.data ?? []).map((n) => n.title)
  );

  const candidates: NudgeCandidate[] = [];

  // --- Rule 1: Stakeholder gaps (14+ days since last interaction) ---
  for (const s of stakeholdersResult.data ?? []) {
    if (!s.last_interaction_date) continue;
    const lastInteraction = new Date(s.last_interaction_date);
    if (lastInteraction < fourteenDaysAgo) {
      const daysSince = Math.floor(
        (now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24)
      );
      candidates.push({
        title: `Reconnect with ${s.name}`,
        message: `It's been ${daysSince} days since your last interaction with ${s.name} (${s.organization}). Consider reaching out to maintain the relationship.`,
        priority: daysSince > 30 ? "high" : "medium",
        action_url: `/stakeholders`,
        source_agent: "strategist",
        context: { stakeholder_id: s.stakeholder_id, days_since: daysSince },
        expires_at: sevenDaysFromNow,
      });
    }
  }

  // --- Rule 2: Stale deals (7+ days no activity) ---
  for (const deal of dealsResult.data ?? []) {
    if (!deal.last_activity_date) continue;
    const lastActivity = new Date(deal.last_activity_date);
    if (lastActivity < sevenDaysAgo) {
      const daysSince = Math.floor(
        (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      );
      const priority: NudgePriority =
        (deal.acv ?? 0) >= 100000 ? "high" : "medium";
      candidates.push({
        title: `${deal.company} needs attention`,
        message: `No activity on ${deal.company} (${deal.stage}) for ${daysSince} days. ACV: $${((deal.acv ?? 0) / 1000).toFixed(0)}K.`,
        priority,
        action_url: `/deals/${deal.deal_id}`,
        source_agent: "strategist",
        context: { deal_id: deal.deal_id, days_since: daysSince },
        expires_at: sevenDaysFromNow,
      });
    }
  }

  // --- Rule 3: Neglected playbook items (30+ days untouched) ---
  for (const item of playbookResult.data ?? []) {
    if (!item.last_touched) continue;
    const lastTouched = new Date(item.last_touched);
    if (lastTouched < thirtyDaysAgo) {
      candidates.push({
        title: `Playbook: ${item.workstream}`,
        message: `"${item.description}" hasn't been touched in 30+ days. Review and update.`,
        priority: "low",
        action_url: "/playbook",
        source_agent: "strategist",
        context: { item_id: item.item_id, workstream: item.workstream },
        expires_at: sevenDaysFromNow,
      });
    }
  }

  // --- Rule 4: Upcoming meetings without prep (next 3 days) ---
  const threeDaysFromNow = new Date(
    now.getTime() + 3 * 24 * 60 * 60 * 1000
  );
  for (const meeting of meetingsResult.data ?? []) {
    const meetingDate = new Date(meeting.meeting_date);
    if (meetingDate <= threeDaysFromNow) {
      candidates.push({
        title: `Prep for: ${meeting.title}`,
        message: `Meeting "${meeting.title}" is coming up on ${meetingDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}. Generate a prep brief in Coach.`,
        priority: "high",
        action_url: "/coach",
        source_agent: "strategist",
        context: {
          meeting_note_id: meeting.meeting_note_id,
          attendees: meeting.attendees,
        },
        expires_at: meeting.meeting_date,
      });
    }
  }

  // Filter out duplicates (by title) and limit to 5 new nudges per run
  const newCandidates = candidates
    .filter((c) => !existingTitles.has(c.title))
    .slice(0, 5);

  if (newCandidates.length > 0) {
    const { error: insertError } = await supabase.from("nudges").insert(
      newCandidates.map((c) => ({
        user_id: userId,
        priority: c.priority,
        status: "pending" as const,
        title: c.title,
        message: c.message,
        action_url: c.action_url ?? null,
        source_agent: c.source_agent,
        context: c.context ?? null,
        expires_at: c.expires_at,
      }))
    );

    if (insertError) {
      console.error(
        `[cron/generate-nudges] Insert failed for user ${userId}:`,
        insertError.message
      );
    }
  }

  return {
    created: newCandidates.length,
    expired: expiredCount ?? 0,
  };
}
