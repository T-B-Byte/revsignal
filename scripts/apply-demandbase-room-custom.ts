/**
 * One-off script: apply Demandbase-specific custom Use Cases + Why Us
 * content to the Demandbase deal room.
 *
 * Usage:
 *   npx tsx scripts/apply-demandbase-room-custom.ts
 *   npx tsx scripts/apply-demandbase-room-custom.ts --dry-run
 */

import { getAdminClient } from './lib/supabase';

const DEMANDBASE_COMPANY_SLUG = 'demandbase';

const customUseCasesIntro =
  "Suggested use cases, inferred from Demandbase's current product direction. A starting list, not exhaustive.";

const customUseCases = [
  {
    title: 'Buying Group AI enrichment',
    description:
      "First-party contact engagement adds directly observed committee activity alongside Demandbase's account-level signals. Especially valuable at enterprise scale.",
    persona: 'Account Intelligence Platform team',
  },
  {
    title: 'Pipeline Engine grounding',
    description:
      "Demandbase AI's agentic workflows get richer with person-level intent context. 650+ intent categories at the contact level feed the agent layer directly.",
    persona: 'Demandbase AI product team',
  },
  {
    title: 'Premier+ partner supply layer',
    description:
      'Premier+ partners deliver richer GTM outcomes with a deterministic data foundation. pharosIQ joins the ecosystem as a supply partner, strengthening the partner value prop without overlapping with platform functionality.',
    persona: 'Partnerships and ecosystem',
  },
  {
    title: 'Site Customization Agent personalization',
    description:
      'Per-visitor site customization benefits from person-level context. Contact-level intent topics deliver that signal directly.',
    persona: 'Site Customization Agent product',
  },
  {
    title: 'HubSpot Marketplace integration depth',
    description:
      "With the 2026 Essential App recognition, there's room to deepen the HubSpot integration with first-party contact+intent enrichment layered into Marketing Hub records.",
    persona: 'Marketing Hub integration team',
  },
];

const customWhyUs = [
  {
    title: 'First-party contact engagement as the signal source',
    description:
      "Every signal originates from pharosIQ's owned content ecosystem. Observed behavior from real contacts reading real content. That's what grounds the data.",
  },
  {
    title: 'Deterministic contact-level resolution',
    description:
      '360M+ first-party contacts, each signal tied to a specific person at a specific account. Contact dimension built in, not a model output layered on top.',
  },
  {
    title: 'Exclusive supply per partner',
    description:
      'Signals are licensed exclusively. Every partner gets a differentiated data layer that stays differentiated.',
  },
  {
    title: 'Built for the agent era',
    description:
      '650+ intent categories with refresh cadence and scoring tuned for AI workflows. The signal layer stays sharp as agent-driven GTM scales.',
  },
  {
    title: 'Supply layer, not platform competition',
    description:
      "pharosIQ plugs underneath the platforms Demandbase's customers already run on. Additive to the stack, never competing with it.",
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const supabase = getAdminClient();

  const { data: company, error: companyError } = await supabase
    .from('gtm_company_profiles')
    .select('company_id, name, slug')
    .eq('slug', DEMANDBASE_COMPANY_SLUG)
    .single();

  if (companyError || !company) {
    console.error(`[apply-demandbase] Company with slug "${DEMANDBASE_COMPANY_SLUG}" not found.`);
    process.exit(1);
  }

  const { data: rooms, error: roomsError } = await supabase
    .from('deal_rooms')
    .select('room_id, slug, status')
    .eq('company_id', company.company_id);

  if (roomsError || !rooms || rooms.length === 0) {
    console.error(`[apply-demandbase] No deal rooms found for company ${company.name}.`);
    process.exit(1);
  }

  console.log(`[apply-demandbase] Found ${rooms.length} deal room(s) for ${company.name}:`);
  for (const r of rooms) {
    console.log(`  - ${r.slug} (${r.status})`);
  }

  if (dryRun) {
    console.log('\n[apply-demandbase] Dry run. Would update the above rooms with:');
    console.log(JSON.stringify({ customUseCasesIntro, customUseCases, customWhyUs }, null, 2));
    return;
  }

  for (const r of rooms) {
    const { error: updateError } = await supabase
      .from('deal_rooms')
      .update({
        custom_use_cases_intro: customUseCasesIntro,
        custom_use_cases: customUseCases,
        custom_why_us: customWhyUs,
      })
      .eq('room_id', r.room_id);

    if (updateError) {
      console.error(`[apply-demandbase] Failed to update room ${r.slug}: ${updateError.message}`);
      process.exit(1);
    }
    console.log(`[apply-demandbase] Updated room: ${r.slug}`);
  }

  console.log('\n[apply-demandbase] Done.');
}

main().catch((err) => {
  console.error('[apply-demandbase] Fatal:', err);
  process.exit(1);
});
