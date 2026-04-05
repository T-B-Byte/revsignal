/**
 * Migrate existing follow-ups and action items into the unified user_tasks table.
 *
 * Reads from:
 *   - thread_follow_ups (open items) -> user_tasks with source='strategist'
 *   - action_items (pending/overdue) -> user_tasks with source='action_item'
 *
 * Dedup: skips if same description + same deal_id already exists in user_tasks.
 *
 * Usage:
 *   npx tsx scripts/migrate-tasks-to-unified.ts          # dry run
 *   npx tsx scripts/migrate-tasks-to-unified.ts --apply   # actually insert
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(import.meta.dirname ?? __dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const dryRun = !process.argv.includes("--apply");

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== APPLYING ===");

  // Fetch existing open user_tasks for dedup
  const { data: existingTasks } = await supabase
    .from("user_tasks")
    .select("description, deal_id")
    .eq("status", "open");

  const existingKeys = new Set(
    (existingTasks ?? []).map(
      (t) => `${(t.description || "").toLowerCase().trim()}|${t.deal_id || ""}`
    )
  );

  function isDuplicate(description: string, dealId: string | null): boolean {
    return existingKeys.has(`${description.toLowerCase().trim()}|${dealId || ""}`);
  }

  // ---------- Thread Follow-Ups ----------

  const { data: followUps } = await supabase
    .from("thread_follow_ups")
    .select("follow_up_id, description, due_date, thread_id, user_id, created_at, coaching_threads(deal_id)")
    .eq("status", "open");

  let fuMigrated = 0;
  let fuSkipped = 0;
  const fuInserts: Record<string, unknown>[] = [];

  for (const fu of followUps ?? []) {
    const thread = fu.coaching_threads as { deal_id: string | null } | null;
    const dealId = thread?.deal_id ?? null;

    if (isDuplicate(fu.description, dealId)) {
      fuSkipped++;
      continue;
    }

    fuInserts.push({
      user_id: fu.user_id,
      description: fu.description,
      due_date: fu.due_date,
      deal_id: dealId,
      thread_id: fu.thread_id,
      owner: "me",
      source: "strategist",
      created_at: fu.created_at,
    });

    // Add to dedup set so we don't create duplicates within this batch
    existingKeys.add(`${fu.description.toLowerCase().trim()}|${dealId || ""}`);
    fuMigrated++;
  }

  console.log(`\nThread follow-ups: ${fuMigrated} to migrate, ${fuSkipped} duplicates skipped`);

  // ---------- Action Items ----------

  const { data: actionItems } = await supabase
    .from("action_items")
    .select("item_id, description, owner, due_date, status, escalation_level, deal_id, contact_id, user_id, created_at")
    .in("status", ["pending", "overdue"]);

  let aiMigrated = 0;
  let aiSkipped = 0;
  const aiInserts: Record<string, unknown>[] = [];

  for (const ai of actionItems ?? []) {
    if (isDuplicate(ai.description, ai.deal_id)) {
      aiSkipped++;
      continue;
    }

    aiInserts.push({
      user_id: ai.user_id,
      description: ai.description,
      due_date: ai.due_date,
      deal_id: ai.deal_id,
      contact_id: ai.contact_id,
      owner: ai.owner,
      source: "action_item",
      escalation_level: ai.escalation_level,
      created_at: ai.created_at,
    });

    existingKeys.add(`${ai.description.toLowerCase().trim()}|${ai.deal_id || ""}`);
    aiMigrated++;
  }

  console.log(`Action items: ${aiMigrated} to migrate, ${aiSkipped} duplicates skipped`);

  // ---------- Insert ----------

  const allInserts = [...fuInserts, ...aiInserts];
  console.log(`\nTotal: ${allInserts.length} tasks to insert`);

  if (dryRun) {
    console.log("\nDry run complete. Run with --apply to insert.");
    if (allInserts.length > 0) {
      console.log("\nSample inserts:");
      for (const item of allInserts.slice(0, 5)) {
        console.log(`  - [${item.source}] ${item.description} (deal: ${item.deal_id || "none"})`);
      }
    }
    return;
  }

  if (allInserts.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  // Insert in batches of 50
  let inserted = 0;
  for (let i = 0; i < allInserts.length; i += 50) {
    const batch = allInserts.slice(i, i + 50);
    const { error } = await supabase.from("user_tasks").insert(batch);
    if (error) {
      console.error(`Batch insert failed at offset ${i}:`, error.message);
      break;
    }
    inserted += batch.length;
  }

  console.log(`\nInserted ${inserted} tasks into user_tasks.`);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
