/**
 * Seed script: Competitive intelligence
 *
 * Populates the `competitive_intel` table with structured data points
 * for 6 key competitors. Each competitor has multiple entries across
 * categories: revenue, valuation, pricing, model, weakness, growth,
 * and pharosiq_advantage.
 *
 * Usage:
 *   npx tsx scripts/seed-competitors.ts
 *   npx tsx scripts/seed-competitors.ts --user-id <uuid>
 *   npx tsx scripts/seed-competitors.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Competitive intel data
// ---------------------------------------------------------------------------

interface CompetitiveIntelRecord {
  competitor: string;
  category: string;
  data_point: string;
  source: string;
  captured_date: string;
  user_id: string;
}

function buildCompetitorData(userId: string): CompetitiveIntelRecord[] {
  const capturedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return [
    // ===== BOMBORA =====
    {
      competitor: 'Bombora',
      category: 'revenue',
      data_point: 'Estimated $56M annual revenue.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Bombora',
      category: 'valuation',
      data_point: 'Estimated $168M valuation at approximately 3x revenue multiple.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Bombora',
      category: 'pricing',
      data_point: '$30-80K/year for account-level intent data. Pricing scales with number of topics and volume of accounts monitored.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Bombora',
      category: 'model',
      data_point: 'Third-party co-op model aggregating data from 5,000+ publisher sites. Account-level only — cannot identify individual contacts. Data is shared across all co-op members, meaning competitors see the same signals.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Bombora',
      category: 'weakness',
      data_point: 'Account-level only (no contact-level precision). Co-op model raises quality concerns — data is shared across competing customers. Growing market skepticism about co-op data accuracy and signal freshness.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Bombora',
      category: 'pharosiq_advantage',
      data_point: 'First-party data is inherently more trustworthy than co-op aggregated data. Contact-level precision vs. account-level only. pharosIQ\'s owned content ecosystem provides exclusive signals not shared with competitors.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== 6SENSE =====
    {
      competitor: '6sense',
      category: 'revenue',
      data_point: 'Estimated $200M annual revenue.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: '6sense',
      category: 'valuation',
      data_point: 'Valuation crashed from $5.2B to approximately $906M. Massive down round reflecting market correction in MarTech valuations.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: '6sense',
      category: 'pricing',
      data_point: '$50-150K+/year. Enterprise-focused pricing with significant platform lock-in. Multi-year contracts common. High switching costs by design.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: '6sense',
      category: 'model',
      data_point: 'Revenue AI platform processing 500B+ signals per month. Full-stack ABM platform combining intent data, predictive analytics, advertising, and orchestration into a single walled garden.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: '6sense',
      category: 'weakness',
      data_point: 'Expensive with significant platform lock-in. Constant layoffs indicating financial pressure. Reports of toxic internal culture. Valuation crash from $5.2B to ~$900M signals market loss of confidence. Buyers increasingly wary of vendor lock-in.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: '6sense',
      category: 'pharosiq_advantage',
      data_point: 'Cleaner, more transparent data without platform lock-in. Lower price point for the data component alone. Flexible deployment (API, flat file, cloud) vs. 6sense\'s walled garden approach. Financial stability — no valuation implosion.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== TECHTARGET (INFORMA) =====
    {
      competitor: 'TechTarget (Informa)',
      category: 'revenue',
      data_point: 'Revenue declining 6% year-over-year following Informa acquisition. Core intent data business under pressure.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'model',
      data_point: 'Operates 220+ tech-focused websites reaching 50M+ monthly audience. Priority Engine product delivers purchase intent insights based on content consumption across their network.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'weakness',
      data_point: '$459M goodwill impairment writedown post-Informa acquisition. Stock price down 94% from highs. Declining revenue trajectory. Integration challenges with Informa creating operational distraction.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'pharosiq_advantage',
      data_point: 'Healthier company with growing revenue vs. TechTarget\'s decline. Contact-level precision across broader topic categories. No acquisition integration baggage affecting product delivery.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== ZOOMINFO =====
    {
      competitor: 'ZoomInfo',
      category: 'revenue',
      data_point: 'Approximately $1.25B annual revenue but growing only 1% year-over-year. Core contact data business commoditizing.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ZoomInfo',
      category: 'pricing',
      data_point: '$15-50K+/year for contact data with Bombora intent data bundled. Enterprise packages significantly higher. Aggressive annual contract requirements.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ZoomInfo',
      category: 'model',
      data_point: 'Commoditizing contact data platform. Uses Bombora for intent data (not proprietary). Attempting pivot to revenue operating system but facing headwinds from cheaper alternatives (Apollo, Lusha, Cognism).',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ZoomInfo',
      category: 'weakness',
      data_point: 'Stock price down 93% from highs. Flat 1% revenue growth signals market saturation. Contact data commoditizing as competitors offer similar data at lower prices. Intent data is resold Bombora (third-party, not proprietary).',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ZoomInfo',
      category: 'pharosiq_advantage',
      data_point: 'First-party owned data vs. ZoomInfo\'s aggregated third-party approach. Proprietary intent signals vs. resold Bombora data. Purpose-built for intent data licensing vs. ZoomInfo\'s contact-data-first model.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== INTENTSIFY =====
    {
      competitor: 'Intentsify',
      category: 'model',
      data_point: 'Fastest-growing intent data company. Named #1 in Forrester Wave for intent data. PE-backed by BV Investment Partners. Acquired 5x5 and Salutary Data to expand co-op network.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'growth',
      data_point: '21% overall revenue growth with 50% growth in data solutions segment. Fastest-growing player in the intent data market. Aggressive acquisition strategy (5x5, Salutary Data).',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'weakness',
      data_point: 'Still relies on co-op model fundamentally. Acquisitions of 5x5 and Salutary Data are co-op network expansions, not first-party data generation. Integration risk from multiple acquisitions.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'pharosiq_advantage',
      data_point: 'Owned content ecosystem generating first-party signals vs. Intentsify\'s co-op aggregation. Global coverage from pharosIQ\'s own publisher network. Data provenance is cleaner and more auditable.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== DEMANDBASE =====
    {
      competitor: 'Demandbase',
      category: 'revenue',
      data_point: 'Estimated $250M+ annual revenue. Profitable with double-digit growth. One of the healthiest companies in the ABM space.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Demandbase',
      category: 'model',
      data_point: 'Full ABM platform with advertising, intent data, sales intelligence, and orchestration. Double-digit growth and profitability. Strong brand in enterprise B2B marketing.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Demandbase',
      category: 'pharosiq_advantage',
      data_point: 'Unique positioning: pharosIQ is a potential data SUPPLIER to Demandbase, not just a competitor. Purer first-party data at contact level. Can embed pharosIQ data inside Demandbase\'s platform as a premium signal source. Dual opportunity: sell to Demandbase AND sell to Demandbase\'s customers.',
      source: 'seed_data',
      captured_date: capturedDate,
      user_id: userId,
    },
  ];
}

// ---------------------------------------------------------------------------
// Seed function (exported for use by master seed script)
// ---------------------------------------------------------------------------

export async function seedCompetitors(options: { dryRun?: boolean } = {}): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const records = buildCompetitorData(userId);

  console.log(
    `\n[seed:competitors] ${dryRun ? 'DRY RUN — ' : ''}Preparing ${records.length} competitive intel records for 6 competitors\n`
  );

  // Log summary by competitor
  const competitors = new Map<string, number>();
  for (const r of records) {
    competitors.set(r.competitor, (competitors.get(r.competitor) ?? 0) + 1);
  }
  for (const [comp, count] of competitors) {
    console.log(`  ${comp}: ${count} data points`);
  }
  console.log();

  if (dryRun) {
    console.log('[seed:competitors] DRY RUN — Preview of records:');
    for (const r of records) {
      console.log(`  - ${r.competitor} [${r.category}]: ${r.data_point.slice(0, 80)}...`);
    }
    console.log(`\n[seed:competitors] DRY RUN complete. ${records.length} records would be inserted.\n`);
    return records.length;
  }

  const supabase = getAdminClient();

  // Upsert using competitor + category + user_id as the natural key
  const { data, error } = await supabase
    .from('competitive_intel')
    .upsert(records, {
      onConflict: 'competitor,category,user_id',
      ignoreDuplicates: false,
    })
    .select('competitor');

  if (error) {
    console.error('[seed:competitors] Error upserting competitive intel:', error.message);
    console.error('[seed:competitors] Details:', error.details);
    throw error;
  }

  const count = data?.length ?? records.length;
  console.log(`[seed:competitors] Successfully upserted ${count} competitive intel records.\n`);
  return count;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('seed-competitors');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');

  seedCompetitors({ dryRun })
    .then((count) => {
      console.log(`[seed:competitors] Done. ${count} records processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed:competitors] Fatal error:', err);
      process.exit(1);
    });
}
