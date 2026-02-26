/**
 * Seed script: GTM Playbook items
 *
 * Reads the daas-gtm-playbook.md file, extracts all checklist items
 * (lines starting with `- [ ]`), groups them by workstream (## headings),
 * and populates the `playbook_items` table.
 *
 * Usage:
 *   npx tsx scripts/seed-playbook.ts
 *   npx tsx scripts/seed-playbook.ts --user-id <uuid>
 *   npx tsx scripts/seed-playbook.ts --dry-run
 */

import * as fs from 'fs';
import * as path from 'path';
import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Workstream name mapping (## heading number -> clean name)
// ---------------------------------------------------------------------------

const WORKSTREAM_NAMES: Record<string, string> = {
  '1': 'Legal & Compliance',
  '2': 'Data Product Development',
  '3': 'Pricing & Packaging',
  '4': 'Sales Operations',
  '5': 'Marketing & Demand Generation',
  '6': 'Partnerships & Channel',
  '7': 'Customer Success & Retention',
  '8': 'Internal Stakeholder Management',
  '9': 'Competitive Positioning',
  '10': 'Revenue Operations & Forecasting',
  '11': 'Personal Development & Network Activation',
  '12': 'The Things You\'re Probably Forgetting',
};

// ---------------------------------------------------------------------------
// Playbook item parser
// ---------------------------------------------------------------------------

interface PlaybookItemRecord {
  workstream: string;
  description: string;
  status: string;
  sort_order: number;
  user_id: string;
}

function parsePlaybookFile(userId: string): PlaybookItemRecord[] {
  const playbookPath = path.resolve(__dirname, '../daas-gtm-playbook.md');

  if (!fs.existsSync(playbookPath)) {
    throw new Error(`[seed:playbook] Playbook file not found at ${playbookPath}`);
  }

  const content = fs.readFileSync(playbookPath, 'utf-8');
  const lines = content.split('\n');

  const items: PlaybookItemRecord[] = [];
  let currentWorkstream = '';
  let currentWorkstreamOrder = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect workstream headings: ## 1. LEGAL & COMPLIANCE — ...
    // Also handles ### sub-headings within section 12
    const h2Match = trimmed.match(/^##\s+(\d+)\.\s+/);
    const h3Match = trimmed.match(/^###\s+(.+)/);

    if (h2Match) {
      const num = h2Match[1];
      currentWorkstream = WORKSTREAM_NAMES[num] ?? `Workstream ${num}`;
      currentWorkstreamOrder = 0;
      continue;
    }

    // Section 12 has sub-headings (### Data Delivery Infrastructure, etc.)
    // These are sub-groups within "The Things You're Probably Forgetting"
    // We keep the parent workstream but can note the sub-heading
    if (h3Match && currentWorkstream === "The Things You're Probably Forgetting") {
      // Sub-headings within section 12 — items still belong to workstream 12
      // but we prepend the sub-heading to description for clarity
      continue;
    }

    // Detect checklist items: - [ ] **Bold title** — description text
    const checkMatch = trimmed.match(/^- \[ \]\s+\*\*(.+?)\*\*/);
    if (checkMatch && currentWorkstream) {
      currentWorkstreamOrder++;

      // Extract the bold title as the description
      const boldTitle = checkMatch[1].trim();

      // Remove trailing " —" if present (some titles end with an em dash)
      const description = boldTitle.replace(/\s*—\s*$/, '').trim();

      items.push({
        workstream: currentWorkstream,
        description,
        status: 'not_started',
        sort_order: currentWorkstreamOrder,
        user_id: userId,
      });
    }

    // Also detect non-bold checklist items (section 12 has items without bold)
    // e.g., "- [ ] Who builds and maintains the API? Do you have engineering resources?"
    const plainCheckMatch = trimmed.match(/^- \[ \]\s+(?!\*\*)(.+)/);
    if (plainCheckMatch && currentWorkstream && !checkMatch) {
      currentWorkstreamOrder++;

      // Use the full line text as description
      const description = plainCheckMatch[1].trim();

      items.push({
        workstream: currentWorkstream,
        description,
        status: 'not_started',
        sort_order: currentWorkstreamOrder,
        user_id: userId,
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Seed function (exported for use by master seed script)
// ---------------------------------------------------------------------------

export async function seedPlaybook(options: { dryRun?: boolean } = {}): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const records = parsePlaybookFile(userId);

  console.log(
    `\n[seed:playbook] ${dryRun ? 'DRY RUN — ' : ''}Parsed ${records.length} playbook items across 12 workstreams\n`
  );

  // Log summary by workstream
  const workstreams = new Map<string, number>();
  for (const r of records) {
    workstreams.set(r.workstream, (workstreams.get(r.workstream) ?? 0) + 1);
  }
  for (const [ws, count] of workstreams) {
    console.log(`  ${ws}: ${count} items`);
  }
  console.log();

  if (dryRun) {
    console.log('[seed:playbook] DRY RUN — Preview of records:');
    for (const r of records) {
      const desc = r.description.length > 70 ? r.description.slice(0, 70) + '...' : r.description;
      console.log(`  [${r.workstream}] #${r.sort_order}: ${desc}`);
    }
    console.log(`\n[seed:playbook] DRY RUN complete. ${records.length} records would be inserted.\n`);
    return records.length;
  }

  const supabase = getAdminClient();

  // Upsert using workstream + description + user_id as the natural key
  const { data, error } = await supabase
    .from('playbook_items')
    .upsert(records, {
      onConflict: 'workstream,description,user_id',
      ignoreDuplicates: false,
    })
    .select('workstream');

  if (error) {
    console.error('[seed:playbook] Error upserting playbook items:', error.message);
    console.error('[seed:playbook] Details:', error.details);
    throw error;
  }

  const count = data?.length ?? records.length;
  console.log(`[seed:playbook] Successfully upserted ${count} playbook items.\n`);
  return count;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('seed-playbook');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');

  seedPlaybook({ dryRun })
    .then((count) => {
      console.log(`[seed:playbook] Done. ${count} records processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed:playbook] Fatal error:', err);
      process.exit(1);
    });
}
