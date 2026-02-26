/**
 * Seed script: ICP categories and example companies
 *
 * Populates the `prospects` table with 9 ICP categories and their
 * representative companies. Each record includes a specific reason
 * why that ICP category would buy pharosIQ's data.
 *
 * Usage:
 *   npx tsx scripts/seed-icps.ts
 *   npx tsx scripts/seed-icps.ts --user-id <uuid>
 *   npx tsx scripts/seed-icps.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// ICP data
// ---------------------------------------------------------------------------

interface ProspectRecord {
  company: string;
  icp_category: string;
  estimated_acv: number;
  why_they_buy: string;
  source: string;
  user_id: string;
}

function buildIcpData(userId: string): ProspectRecord[] {
  return [
    // ----- ABM Platforms ($200-500K, midpoint $350K) -----
    {
      company: 'Demandbase',
      icp_category: 'ABM Platforms',
      estimated_acv: 350000,
      why_they_buy:
        'Needs first-party intent signals to differentiate their ABM platform from competitors relying on Bombora co-op data. Contact-level precision improves their customers\' account scoring and ad targeting.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'RollWorks',
      icp_category: 'ABM Platforms',
      estimated_acv: 350000,
      why_they_buy:
        'Division of NextRoll — needs proprietary intent data to power account identification and prioritization beyond their existing ad-based signals.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Terminus',
      icp_category: 'ABM Platforms',
      estimated_acv: 350000,
      why_they_buy:
        'Currently relies on Bombora for intent data. First-party contact-level signals would give their customers better campaign targeting and reduce dependency on a single data supplier.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'N.Rich',
      icp_category: 'ABM Platforms',
      estimated_acv: 350000,
      why_they_buy:
        'European ABM platform expanding globally — needs global intent coverage, especially first-party data with clean GDPR consent basis for EU operations.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Triblio',
      icp_category: 'ABM Platforms',
      estimated_acv: 350000,
      why_they_buy:
        'Mid-market ABM platform that can differentiate by embedding pharosIQ\'s contact-level intent into their orchestration engine. White-label opportunity.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Sales Intelligence ($100-300K, midpoint $200K) -----
    {
      company: 'Apollo',
      icp_category: 'Sales Intelligence',
      estimated_acv: 200000,
      why_they_buy:
        'Massive contact database but limited intent signal coverage. Adding first-party intent layered onto their contact data creates a premium tier product for enterprise customers.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Cognism',
      icp_category: 'Sales Intelligence',
      estimated_acv: 200000,
      why_they_buy:
        'Strong in EMEA compliance (phone-verified contacts, GDPR-ready). pharosIQ\'s permission-based intent data complements their compliance-first positioning for EU buyers.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Lusha',
      icp_category: 'Sales Intelligence',
      estimated_acv: 200000,
      why_they_buy:
        'Contact enrichment platform that wants to expand into intent signals without building their own content network. OEM integration opportunity.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'LeadIQ',
      icp_category: 'Sales Intelligence',
      estimated_acv: 200000,
      why_they_buy:
        'Prospecting workflow tool — adding real-time intent signals helps their users prioritize which leads to capture and when, increasing platform stickiness.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Seamless.ai',
      icp_category: 'Sales Intelligence',
      estimated_acv: 200000,
      why_they_buy:
        'AI-powered lead finder that currently lacks intent data. Embedding pharosIQ signals would let them surface "in-market" leads, a top-requested feature from their users.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- CRM/MAP Platforms ($500K-2M, midpoint $1.25M) -----
    {
      company: 'HubSpot',
      icp_category: 'CRM/MAP Platforms',
      estimated_acv: 1250000,
      why_they_buy:
        'Moving upmarket into enterprise — needs intent data in their Smart CRM to compete with Salesforce + ZoomInfo bundle. App Marketplace integration or OEM deal.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Salesforce (AppExchange)',
      icp_category: 'CRM/MAP Platforms',
      estimated_acv: 1250000,
      why_they_buy:
        'AppExchange data enrichment apps drive massive distribution. Intent signals inside Salesforce records (leads, accounts, opportunities) is the #1 requested data type.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Marketo (Adobe)',
      icp_category: 'CRM/MAP Platforms',
      estimated_acv: 1250000,
      why_they_buy:
        'Marketing automation platform where intent-driven lead scoring dramatically improves MQL quality. Adobe LaunchPoint integration creates distribution channel.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Ad Tech / DSPs ($100-250K, midpoint $175K) -----
    {
      company: 'The Trade Desk',
      icp_category: 'Ad Tech / DSPs',
      estimated_acv: 175000,
      why_they_buy:
        'Largest independent DSP — B2B intent audiences are high-value segments for their advertisers. pharosIQ data as custom audience segments on TTD drives premium CPMs.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'StackAdapt',
      icp_category: 'Ad Tech / DSPs',
      estimated_acv: 175000,
      why_they_buy:
        'Multi-channel programmatic platform growing fast in B2B. Intent-based audience segments improve campaign performance and justify higher spend from B2B advertisers.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Data Enrichment ($200-500K, midpoint $350K) -----
    {
      company: 'Clearbit (Breeze)',
      icp_category: 'Data Enrichment',
      estimated_acv: 350000,
      why_they_buy:
        'Now part of HubSpot — enriches company and contact records but lacks intent signals. pharosIQ adds the "in-market timing" layer to their firmographic enrichment.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'ZoomInfo',
      icp_category: 'Data Enrichment',
      estimated_acv: 350000,
      why_they_buy:
        'Currently resells Bombora intent data. First-party alternative reduces single-vendor dependency and provides contact-level precision that Bombora cannot deliver.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Dun & Bradstreet',
      icp_category: 'Data Enrichment',
      estimated_acv: 350000,
      why_they_buy:
        'Enterprise data giant with deep firmographic and risk data but no proprietary intent signals. Adding intent creates a new product line for their sales and marketing data cloud.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Content Syndication ($100-200K, midpoint $150K) -----
    {
      company: 'NetLine',
      icp_category: 'Content Syndication',
      estimated_acv: 150000,
      why_they_buy:
        'Content syndication platform that could layer intent signals on top of their lead delivery to improve lead quality scoring and justify premium pricing to advertisers.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'TechTarget',
      icp_category: 'Content Syndication',
      estimated_acv: 150000,
      why_they_buy:
        'Direct competitor in intent data but declining. Their customers are looking for alternatives. pharosIQ as a supplemental or replacement data source for TechTarget\'s Priority Engine customers.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Madison Logic',
      icp_category: 'Content Syndication',
      estimated_acv: 150000,
      why_they_buy:
        'ABM content syndication platform using Bombora data. Diversifying intent data sources with first-party signals improves their campaign targeting accuracy.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Conversation Intelligence ($100-200K, midpoint $150K) -----
    {
      company: 'Gong',
      icp_category: 'Conversation Intelligence',
      estimated_acv: 150000,
      why_they_buy:
        'Revenue intelligence platform that analyzes conversations but lacks pre-conversation intent context. Knowing what a prospect researched BEFORE the call makes their deal intelligence more powerful.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Chorus',
      icp_category: 'Conversation Intelligence',
      estimated_acv: 150000,
      why_they_buy:
        'Now part of ZoomInfo — intent signals flowing into conversation intelligence creates a feedback loop: what they researched + what they said on the call = better deal prediction.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Clari',
      icp_category: 'Conversation Intelligence',
      estimated_acv: 150000,
      why_they_buy:
        'Revenue platform focused on forecasting accuracy. Intent signals as leading indicators improve their predictive models and help customers identify at-risk deals earlier.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Recruiting/HR Tech ($100-300K, midpoint $200K) -----
    {
      company: 'LinkedIn',
      icp_category: 'Recruiting/HR Tech',
      estimated_acv: 200000,
      why_they_buy:
        'Talent Solutions division can use hiring intent signals (companies researching recruitment, HRIS, or talent management topics) to identify companies about to scale their teams.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Indeed',
      icp_category: 'Recruiting/HR Tech',
      estimated_acv: 200000,
      why_they_buy:
        'World\'s largest job site — intent data identifying companies researching hiring tools, workforce planning, or expansion topics helps their enterprise sales team target the right accounts.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'ZipRecruiter',
      icp_category: 'Recruiting/HR Tech',
      estimated_acv: 200000,
      why_they_buy:
        'AI-driven recruiting marketplace that can embed intent signals to help employers identify candidates who are actively researching career moves in specific industries.',
      source: 'seed_data',
      user_id: userId,
    },

    // ----- Financial Services ($200-500K, midpoint $350K) -----
    {
      company: 'Bloomberg',
      icp_category: 'Financial Services',
      estimated_acv: 350000,
      why_they_buy:
        'Alternative data for investment decisions — B2B intent signals reveal which companies are actively evaluating new vendors, expanding into new markets, or experiencing growth/contraction.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'S&P Global',
      icp_category: 'Financial Services',
      estimated_acv: 350000,
      why_they_buy:
        'Market intelligence division needs alternative data signals for credit risk assessment and M&A prediction. Intent data showing technology evaluation patterns correlates with company growth trajectories.',
      source: 'seed_data',
      user_id: userId,
    },
    {
      company: 'Hedge Funds (Various)',
      icp_category: 'Financial Services',
      estimated_acv: 350000,
      why_they_buy:
        'Quantitative and fundamental hedge funds use alternative data as trading signals. B2B intent data showing technology adoption trends is an uncorrelated alpha source.',
      source: 'seed_data',
      user_id: userId,
    },
  ];
}

// ---------------------------------------------------------------------------
// Seed function (exported for use by master seed script)
// ---------------------------------------------------------------------------

export async function seedIcps(options: { dryRun?: boolean } = {}): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const records = buildIcpData(userId);

  console.log(`\n[seed:icps] ${dryRun ? 'DRY RUN — ' : ''}Preparing ${records.length} prospect records across 9 ICP categories\n`);

  // Log summary by category
  const categories = new Map<string, number>();
  for (const r of records) {
    categories.set(r.icp_category, (categories.get(r.icp_category) ?? 0) + 1);
  }
  for (const [cat, count] of categories) {
    console.log(`  ${cat}: ${count} companies`);
  }
  console.log();

  if (dryRun) {
    console.log('[seed:icps] DRY RUN — Preview of records:');
    for (const r of records) {
      console.log(`  - ${r.company} (${r.icp_category}) — $${r.estimated_acv.toLocaleString()} ACV`);
    }
    console.log(`\n[seed:icps] DRY RUN complete. ${records.length} records would be inserted.\n`);
    return records.length;
  }

  const supabase = getAdminClient();

  // Upsert using company + user_id as the natural key
  // (Supabase upsert requires a unique constraint — we use onConflict on company)
  const { data, error } = await supabase
    .from('prospects')
    .upsert(records, {
      onConflict: 'company,user_id',
      ignoreDuplicates: false,
    })
    .select('company');

  if (error) {
    console.error('[seed:icps] Error upserting prospects:', error.message);
    console.error('[seed:icps] Details:', error.details);
    throw error;
  }

  const count = data?.length ?? records.length;
  console.log(`[seed:icps] Successfully upserted ${count} prospect records.\n`);
  return count;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('seed-icps');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');

  seedIcps({ dryRun })
    .then((count) => {
      console.log(`[seed:icps] Done. ${count} records processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed:icps] Fatal error:', err);
      process.exit(1);
    });
}
