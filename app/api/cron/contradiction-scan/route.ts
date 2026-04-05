import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getAnthropic, MODEL } from "@/lib/anthropic/client";
import { PLANS } from "@/lib/stripe/config";
import type { SubscriptionTier } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POST /api/cron/contradiction-scan
 *
 * Cron job: scans coaching threads per deal for factual contradictions.
 * For each deal with 2+ threads active in the last 14 days, pulls thread
 * briefs and asks Claude to identify conflicting information about timelines,
 * pricing, commitments, and contact roles.
 *
 * Scheduled daily at 10:00 PM (before deal-brief-refresh at 11 PM).
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
    console.error("[cron/contradiction-scan] Failed to fetch subscriptions:", subError.message);
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
  let totalDetected = 0;
  let totalResolved = 0;

  for (const sub of powerUsers) {
    try {
      const result = await scanContradictionsForUser(supabase, sub.user_id);
      succeeded++;
      totalDetected += result.detected;
      totalResolved += result.autoResolved;
    } catch (error) {
      console.error(
        `[cron/contradiction-scan] Failed for user ${sub.user_id}:`,
        error instanceof Error ? error.message : error
      );
      failed++;
    }
  }

  return NextResponse.json({
    message: `Contradiction scan: ${succeeded} users processed, ${failed} failed, ${totalDetected} contradictions detected, ${totalResolved} auto-resolved`,
    processed: succeeded + failed,
    totalDetected,
    totalResolved,
  });
}

// ---------------------------------------------------------------------------
// Core scan logic
// ---------------------------------------------------------------------------

interface ScanResult {
  detected: number;
  autoResolved: number;
}

async function scanContradictionsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ScanResult> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Find deals with 2+ active threads updated in the last 14 days
  const { data: threadRows, error: threadError } = await supabase
    .from("coaching_threads")
    .select("thread_id, deal_id, title, thread_brief, last_message_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .not("deal_id", "is", null)
    .not("thread_brief", "is", null)
    .gte("last_message_at", fourteenDaysAgo)
    .order("last_message_at", { ascending: false });

  if (threadError) {
    console.error("[contradiction-scan] Thread fetch error:", threadError.message);
    return { detected: 0, autoResolved: 0 };
  }

  // Group threads by deal
  const dealThreads = new Map<string, typeof threadRows>();
  for (const row of threadRows ?? []) {
    if (!row.deal_id) continue;
    const existing = dealThreads.get(row.deal_id) ?? [];
    existing.push(row);
    dealThreads.set(row.deal_id, existing);
  }

  let totalDetected = 0;
  let totalAutoResolved = 0;

  // Only scan deals with 2+ threads (single-thread deals can't contradict themselves)
  for (const [dealId, threads] of dealThreads) {
    if (threads.length < 2) continue;

    const result = await scanDealContradictions(supabase, userId, dealId, threads);
    totalDetected += result.detected;
    totalAutoResolved += result.autoResolved;
  }

  return { detected: totalDetected, autoResolved: totalAutoResolved };
}

interface ThreadInput {
  thread_id: string;
  title: string;
  thread_brief: string;
  last_message_at: string;
}

interface DetectedContradiction {
  thread_a_id: string;
  thread_b_id: string;
  description: string;
  category: string;
  severity: "low" | "medium" | "high";
}

/** Normalize a thread pair key so order doesn't matter (smaller UUID first). */
function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

const VALID_SEVERITIES = new Set(["low", "medium", "high"]);

async function scanDealContradictions(
  supabase: SupabaseClient,
  userId: string,
  dealId: string,
  threads: ThreadInput[]
): Promise<{ detected: number; autoResolved: number }> {
  const anthropic = getAnthropic();

  // Build the prompt with all thread briefs for this deal
  const threadContext = threads
    .map((t, i) => `--- Thread ${i + 1}: "${t.title}" (ID: ${t.thread_id}, last active: ${t.last_message_at.slice(0, 10)}) ---\n${t.thread_brief}`)
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are a deal intelligence analyst. Your job is to find factual contradictions across multiple conversation threads for the same deal.

Focus on contradictions in:
- **Timelines**: Conflicting close dates, budget cycle dates, go-live dates
- **Pricing/Budget**: Different numbers mentioned for the same deal element
- **Commitments**: One thread says something was agreed, another says it wasn't
- **Contact roles**: Conflicting info about who makes decisions, who has authority
- **Deal status**: One thread implies the deal is progressing, another suggests blockers

Rules:
- Only flag genuine contradictions where two threads contain incompatible facts.
- Do NOT flag information that is simply different (e.g., different topics discussed). They must actually conflict.
- Do NOT flag evolving situations as contradictions (e.g., "budget was $50K in March, increased to $75K in April" is progression, not contradiction).
- Include the specific conflicting facts in your description.
- If there are no contradictions, return an empty array.

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {
    "thread_a_id": "uuid",
    "thread_b_id": "uuid",
    "description": "Thread A says close date is Q2, but Thread B references Q3 timeline with no indication the date changed",
    "category": "timeline",
    "severity": "high"
  }
]

Severity guide:
- high: Contradicts pricing, commitments, or close dates (could lose the deal)
- medium: Conflicting contact roles, decision-maker info, or project scope
- low: Minor discrepancies in background details or secondary facts`,
    messages: [
      {
        role: "user",
        content: `Analyze the following ${threads.length} conversation threads for deal contradictions:\n\n${threadContext}`,
      },
    ],
  });

  // Parse response
  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  let contradictions: DetectedContradiction[] = [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      contradictions = parsed.filter(
        (c) => c.thread_a_id && c.thread_b_id && c.description
      );
    }
  } catch {
    console.error("[contradiction-scan] Failed to parse Claude response for deal", dealId, text.slice(0, 200));
    return { detected: 0, autoResolved: 0 };
  }

  // Validate that referenced thread IDs actually belong to this deal's threads
  const validThreadIds = new Set(threads.map((t) => t.thread_id));
  contradictions = contradictions.filter(
    (c) => validThreadIds.has(c.thread_a_id) && validThreadIds.has(c.thread_b_id)
  );

  // Auto-resolve existing contradictions that were NOT re-detected
  const { data: existing } = await supabase
    .from("deal_contradictions")
    .select("contradiction_id, thread_a_id, thread_b_id, description")
    .eq("user_id", userId)
    .eq("deal_id", dealId)
    .eq("resolved", false);

  const existingMap = new Map(
    (existing ?? []).map((e) => [pairKey(e.thread_a_id, e.thread_b_id), e])
  );

  // Find which existing contradictions are no longer detected
  const newKeys = new Set(
    contradictions.map((c) => pairKey(c.thread_a_id, c.thread_b_id))
  );
  const toResolve = (existing ?? []).filter(
    (e) => !newKeys.has(pairKey(e.thread_a_id, e.thread_b_id))
  );

  let autoResolved = 0;
  if (toResolve.length > 0) {
    const { error: resolveError } = await supabase
      .from("deal_contradictions")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .in("contradiction_id", toResolve.map((r) => r.contradiction_id));

    if (!resolveError) autoResolved = toResolve.length;
  }

  // Upsert new contradictions (skip if already tracked for same thread pair)
  let detected = 0;
  for (const c of contradictions) {
    const key = pairKey(c.thread_a_id, c.thread_b_id);
    if (existingMap.has(key)) continue; // Already tracked

    // Normalize severity to valid enum value
    const severity = VALID_SEVERITIES.has(c.severity?.toLowerCase())
      ? c.severity.toLowerCase() as "low" | "medium" | "high"
      : "medium";

    // Normalize thread order (smaller UUID first) for consistent storage
    const [normA, normB] = c.thread_a_id < c.thread_b_id
      ? [c.thread_a_id, c.thread_b_id]
      : [c.thread_b_id, c.thread_a_id];

    const { error: insertError } = await supabase
      .from("deal_contradictions")
      .insert({
        user_id: userId,
        deal_id: dealId,
        thread_a_id: normA,
        thread_b_id: normB,
        description: c.description,
        category: c.category || "general",
        severity,
      });

    if (!insertError) detected++;
  }

  return { detected, autoResolved };
}
