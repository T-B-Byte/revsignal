/**
 * Master seed script — runs all seeders in sequence.
 *
 * Populates:
 *   1. prospects (ICP categories + example companies)
 *   2. competitive_intel (6 competitors, multiple data points each)
 *   3. playbook_items (GTM playbook checklist from daas-gtm-playbook.md)
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *   npx tsx scripts/seed.ts --user-id <uuid>
 *   npm run seed
 *   npm run seed -- --user-id <uuid>
 */

import { seedIcps } from './seed-icps';
import { seedCompetitors } from './seed-competitors';
import { seedPlaybook } from './seed-playbook';

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('  RevSignal — Seed All Data');
  console.log('='.repeat(60));

  const results: { name: string; count: number }[] = [];

  // 1. ICPs & Prospect Companies
  console.log('\n--- Step 1/3: Seeding ICP categories & prospect companies ---');
  try {
    const count = await seedIcps();
    results.push({ name: 'ICP Prospects', count });
  } catch {
    console.error('[seed] ICP seeding failed. Continuing with remaining seeders...');
    results.push({ name: 'ICP Prospects', count: -1 });
  }

  // 2. Competitive Intelligence
  console.log('\n--- Step 2/3: Seeding competitive intelligence ---');
  try {
    const count = await seedCompetitors();
    results.push({ name: 'Competitive Intel', count });
  } catch {
    console.error('[seed] Competitor seeding failed. Continuing with remaining seeders...');
    results.push({ name: 'Competitive Intel', count: -1 });
  }

  // 3. GTM Playbook
  console.log('\n--- Step 3/3: Seeding GTM playbook items ---');
  try {
    const count = await seedPlaybook();
    results.push({ name: 'Playbook Items', count });
  } catch {
    console.error('[seed] Playbook seeding failed.');
    results.push({ name: 'Playbook Items', count: -1 });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('  Seed Summary');
  console.log('='.repeat(60));

  let totalRecords = 0;
  let failures = 0;
  for (const r of results) {
    if (r.count === -1) {
      console.log(`  FAILED  ${r.name}`);
      failures++;
    } else {
      console.log(`  OK      ${r.name}: ${r.count} records`);
      totalRecords += r.count;
    }
  }

  console.log('-'.repeat(60));
  console.log(`  Total: ${totalRecords} records seeded${failures > 0 ? ` (${failures} seeder(s) failed)` : ''}`);
  console.log('='.repeat(60));

  if (failures > 0) {
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('\n[seed] All done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[seed] Unexpected error:', err);
    process.exit(1);
  });
