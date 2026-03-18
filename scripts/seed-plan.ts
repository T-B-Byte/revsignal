/**
 * Seed script: pharosIQ Onboarding 30-60-90 Day Plan
 *
 * Creates a 90-day plan with milestones across three phases,
 * based on the Strategist's recommended onboarding roadmap.
 *
 * Usage:
 *   npx tsx scripts/seed-plan.ts
 *   npx tsx scripts/seed-plan.ts --user-id <uuid>
 *   npx tsx scripts/seed-plan.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

const isDryRun = process.argv.includes('--dry-run');

interface Milestone {
  phase: 'day_30' | 'day_60' | 'day_90';
  title: string;
  description?: string;
  sort_order: number;
}

// ---------------------------------------------------------------------------
// Plan definition
// ---------------------------------------------------------------------------

const PLAN = {
  title: 'pharosIQ Onboarding',
  description:
    'First 90 days as SVP, Data Monetization & Partnerships. ' +
    'Learn the data asset, build DaaS products, close first deals. ' +
    'Jeff wants revenue in Q2 — speed matters.',
  start_date: '2026-03-03', // Tina's start date
};

// ---------------------------------------------------------------------------
// Milestones by phase
// ---------------------------------------------------------------------------

const MILESTONES: Milestone[] = [
  // ── DAYS 1-30: LEARN ──────────────────────────────────────────────────
  { phase: 'day_30', sort_order: 0, title: 'Sign NDA, get system access' },
  {
    phase: 'day_30',
    sort_order: 1,
    title: 'Review data dictionary from Ben',
    description: 'Understand every field, signal type, and category in the pharosIQ data asset.',
  },
  {
    phase: 'day_30',
    sort_order: 2,
    title: 'Map the full data asset',
    description: 'What do we have, how fresh is it, what\'s the volume, what\'s the quality?',
  },
  {
    phase: 'day_30',
    sort_order: 3,
    title: 'Interview Ben, Chris, and Marty about current customers and use cases',
  },
  { phase: 'day_30', sort_order: 4, title: 'Identify 3-5 quick-win data products that can be packaged fast' },
  {
    phase: 'day_30',
    sort_order: 5,
    title: 'Research competitor pricing and packaging',
    description: 'Bombora, ZoomInfo data licensing, TechTarget Priority Engine.',
  },
  { phase: 'day_30', sort_order: 6, title: 'Build initial pitch deck and one-pager' },
  { phase: 'day_30', sort_order: 7, title: 'Identify first 20 target accounts from personal network + prospect engine' },
  {
    phase: 'day_30',
    sort_order: 8,
    title: 'Work with Legal on contracts',
    description: 'Data licensing agreement templates, terms of service, MSA for DaaS customers.',
  },

  // ── DAYS 31-60: BUILD ─────────────────────────────────────────────────
  {
    phase: 'day_60',
    sort_order: 0,
    title: 'Finalize DaaS product packaging (3 tiers)',
    description: 'Signals, Intelligence, Embedded — define what\'s in each tier.',
  },
  {
    phase: 'day_60',
    sort_order: 1,
    title: 'Work with Marketing on package pricing',
    description: 'Set pricing for each tier and deployment method. Validate with market feedback.',
  },
  {
    phase: 'day_60',
    sort_order: 2,
    title: 'Build sales collateral',
    description: 'Pitch deck, one-pager, ROI calculator, sample data packages.',
  },
  {
    phase: 'day_60',
    sort_order: 3,
    title: 'Build battle cards for the sales team',
    description: 'Competitive positioning vs Bombora, ZoomInfo, TechTarget for field reps.',
  },
  {
    phase: 'day_60',
    sort_order: 4,
    title: 'New DaaS slide deck',
    description: 'Standalone DaaS-focused presentation for prospects and partners.',
  },
  { phase: 'day_60', sort_order: 5, title: 'Begin outreach to first 20 target accounts' },
  { phase: 'day_60', sort_order: 6, title: 'Schedule 10-15 discovery calls' },
  {
    phase: 'day_60',
    sort_order: 7,
    title: 'Present GTM plan to Jeff and leadership',
    description: 'Jeff wants to report sales progress in Q2 — need at least pipeline to show.',
  },

  // ── DAYS 61-90: SELL ──────────────────────────────────────────────────
  { phase: 'day_90', sort_order: 0, title: 'Close first 1-3 deals' },
  { phase: 'day_90', sort_order: 1, title: 'Build case studies from early customers' },
  { phase: 'day_90', sort_order: 2, title: 'Refine pricing based on market feedback' },
  { phase: 'day_90', sort_order: 3, title: 'Expand prospect list to 50+ accounts' },
  { phase: 'day_90', sort_order: 4, title: 'Begin platform/OEM conversations with 2-3 large targets' },
  {
    phase: 'day_90',
    sort_order: 5,
    title: 'Q2 board reporting',
    description: 'Show revenue, pipeline, and trajectory. This is what moves the valuation.',
  },
];

// ---------------------------------------------------------------------------
// Phase labels for display
// ---------------------------------------------------------------------------

const PHASE_LABELS: Record<string, string> = {
  day_30: 'Days 1-30 (LEARN)',
  day_60: 'Days 31-60 (BUILD)',
  day_90: 'Days 61-90 (SELL)',
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const userId = getUserId();

  console.log(`\n📋 Seeding pharosIQ Onboarding 30-60-90 Plan`);
  console.log(`   User: ${userId}`);
  console.log(`   Start date: ${PLAN.start_date}`);
  console.log(`   Milestones: ${MILESTONES.length}`);
  console.log('');

  // Show plan
  for (const phase of ['day_30', 'day_60', 'day_90'] as const) {
    const items = MILESTONES.filter((m) => m.phase === phase);
    console.log(`  ${PHASE_LABELS[phase]} (${items.length} milestones)`);
    for (const m of items) {
      console.log(`    [ ] ${m.title}`);
    }
    console.log('');
  }

  if (isDryRun) {
    console.log('[dry-run] No changes written.\n');
    return;
  }

  const supabase = getAdminClient();

  // Check for existing plan with same title
  const { data: existing } = await supabase
    .from('plans')
    .select('plan_id')
    .eq('user_id', userId)
    .ilike('title', PLAN.title)
    .maybeSingle();

  if (existing) {
    console.log(`⚠️  Plan "${PLAN.title}" already exists (${existing.plan_id}). Skipping.\n`);
    return;
  }

  // Create plan
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      user_id: userId,
      title: PLAN.title,
      description: PLAN.description,
      start_date: PLAN.start_date,
    })
    .select()
    .single();

  if (planError || !plan) {
    console.error('❌ Failed to create plan:', planError?.message);
    process.exit(1);
  }

  console.log(`✅ Created plan: ${plan.plan_id}`);

  // Insert milestones
  const milestoneRows = MILESTONES.map((m) => ({
    plan_id: plan.plan_id,
    user_id: userId,
    phase: m.phase,
    title: m.title,
    description: m.description ?? null,
    sort_order: m.sort_order,
  }));

  const { error: msError } = await supabase
    .from('plan_milestones')
    .insert(milestoneRows);

  if (msError) {
    console.error('❌ Failed to insert milestones:', msError.message);
    process.exit(1);
  }

  console.log(`✅ Inserted ${MILESTONES.length} milestones`);
  console.log('\nDone! View at /plan\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
