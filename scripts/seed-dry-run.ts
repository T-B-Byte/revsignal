/**
 * Dry-run seed script — previews all seed data without writing to the database.
 *
 * Runs all three seeders in preview mode, logging exactly what would be
 * inserted. No database writes occur.
 *
 * Usage:
 *   npx tsx scripts/seed-dry-run.ts
 *   npx tsx scripts/seed-dry-run.ts --user-id <uuid>
 *   npm run seed:dry-run
 */

import { seedIcps } from './seed-icps';
import { seedCompetitors } from './seed-competitors';
import { seedPlaybook } from './seed-playbook';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  RevSignal — Seed Dry Run (NO DATABASE WRITES)');
  console.log('='.repeat(60));

  const results: { name: string; count: number }[] = [];

  // 1. ICPs & Prospect Companies
  console.log('\n--- Preview 1/3: ICP categories & prospect companies ---');
  try {
    const count = await seedIcps({ dryRun: true });
    results.push({ name: 'ICP Prospects', count });
  } catch (err) {
    console.error('[dry-run] ICP preview failed:', err);
    results.push({ name: 'ICP Prospects', count: -1 });
  }

  // 2. Competitive Intelligence
  console.log('\n--- Preview 2/3: Competitive intelligence ---');
  try {
    const count = await seedCompetitors({ dryRun: true });
    results.push({ name: 'Competitive Intel', count });
  } catch (err) {
    console.error('[dry-run] Competitor preview failed:', err);
    results.push({ name: 'Competitive Intel', count: -1 });
  }

  // 3. GTM Playbook
  console.log('\n--- Preview 3/3: GTM playbook items ---');
  try {
    const count = await seedPlaybook({ dryRun: true });
    results.push({ name: 'Playbook Items', count });
  } catch (err) {
    console.error('[dry-run] Playbook preview failed:', err);
    results.push({ name: 'Playbook Items', count: -1 });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Dry Run Summary (NO DATA WAS WRITTEN)');
  console.log('='.repeat(60));

  let totalRecords = 0;
  for (const r of results) {
    if (r.count === -1) {
      console.log(`  ERROR   ${r.name}: failed to preview`);
    } else {
      console.log(`  PREVIEW ${r.name}: ${r.count} records would be inserted`);
      totalRecords += r.count;
    }
  }

  console.log('-'.repeat(60));
  console.log(`  Total: ${totalRecords} records would be seeded`);
  console.log('='.repeat(60));
  console.log('\nTo actually seed the database, run: npm run seed');
}

main()
  .then(() => {
    console.log('\n[dry-run] Preview complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[dry-run] Unexpected error:', err);
    process.exit(1);
  });
