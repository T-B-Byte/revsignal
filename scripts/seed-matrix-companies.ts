/**
 * Seed script: DaaS Framework Company Matrix
 *
 * Adds 37 companies from the DaaS Framework Company Matrix to
 * gtm_company_profiles and creates gtm_product_recommendations
 * based on category-to-product mappings.
 *
 * Usage:
 *   npx tsx scripts/seed-matrix-companies.ts
 *   npx tsx scripts/seed-matrix-companies.ts --user-id <uuid>
 *   npx tsx scripts/seed-matrix-companies.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanySeed {
  slug: string;
  name: string;
  description: string;
  why_they_need_us: string;
  company_tier: string;
  tags: string[];
  contacts: { name: string; title: string; linkedin?: string; why_this_person?: string }[];
  recommendations: {
    product_slug: string;
    fit_strength: string;
    custom_angle: string;
    suggested_tier?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Product recommendation mappings by tag
// ---------------------------------------------------------------------------

function buildRecommendations(tags: string[], why: string): CompanySeed['recommendations'] {
  const recs: CompanySeed['recommendations'] = [];
  const added = new Set<string>();

  function add(slug: string, strength: string) {
    // Keep the strongest recommendation if a product appears multiple times
    if (added.has(slug)) {
      const existing = recs.find((r) => r.product_slug === slug);
      if (existing && strength === 'strong' && existing.fit_strength !== 'strong') {
        existing.fit_strength = 'strong';
      }
      return;
    }
    added.add(slug);
    recs.push({ product_slug: slug, fit_strength: strength, custom_angle: why });
  }

  for (const tag of tags) {
    switch (tag) {
      case 'crm_map':
      case 'platform_partner':
        add('daas-signal-licensing', 'strong');
        add('jobson-title-expansion', 'moderate');
        break;
      case 'intent_data':
      case 'abm_platform':
        add('daas-signal-licensing', 'strong');
        break;
      case 'data_intelligence':
      case 'enrichment':
      case 'contacts':
        add('daas-signal-licensing', 'moderate');
        add('jobson-title-expansion', 'strong');
        break;
      case 'sales_platform':
        add('daas-signal-licensing', 'moderate');
        add('jobson-title-expansion', 'moderate');
        break;
      case 'lead_routing':
      case 'cpl':
        add('daas-signal-licensing', 'moderate');
        add('surge-trending', 'moderate');
        break;
      case 'agency_holding':
        add('daas-signal-licensing', 'strong');
        add('surge-dossiers', 'strong');
        add('surge-trending', 'moderate');
        break;
      case 'content_demand_gen':
        add('daas-signal-licensing', 'moderate');
        add('surge-dossiers', 'moderate');
        break;
      case 'direct_mail':
        add('surge-trending', 'moderate');
        add('surge-radar', 'moderate');
        break;
      case 'visitor_id':
        add('daas-signal-licensing', 'moderate');
        add('surge-radar', 'moderate');
        break;
      case 'distribution':
      case 'channel':
        add('daas-signal-licensing', 'strong');
        add('jobson-title-expansion', 'strong');
        add('surge-trending', 'moderate');
        break;
    }
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Company Data — 37 companies from the DaaS Framework Company Matrix
// ---------------------------------------------------------------------------

function buildCompanies(): CompanySeed[] {
  const raw: Omit<CompanySeed, 'recommendations' | 'contacts'>[] = [
    // ================================================================
    // CRM/MAP Platforms
    // ================================================================
    {
      slug: 'hubspot',
      name: 'HubSpot',
      description: "World's largest inbound marketing and CRM platform. 228K+ customers. Intent data enrichment is their next frontier.",
      why_they_need_us: 'HubSpot acquired Clearbit for contact enrichment but has no proprietary intent signals. pharosIQ contact-level intent inside HubSpot records would be the #1 requested integration.',
      company_tier: 'tier_1',
      tags: ['crm_map', 'platform_partner'],
    },
    {
      slug: 'salesforce',
      name: 'Salesforce',
      description: 'Largest CRM globally. AppExchange ecosystem reaches 150K+ customers.',
      why_they_need_us: 'Salesforce has no first-party intent data. Intent signals embedded in Salesforce records via AppExchange would be transformative for their customer base.',
      company_tier: 'tier_1',
      tags: ['crm_map', 'platform_partner'],
    },
    {
      slug: 'eloqua-oracle',
      name: 'Eloqua/Oracle',
      description: "Oracle's B2B marketing automation. Enterprise-focused. BlueKai DMP is aging.",
      why_they_need_us: "Oracle's BlueKai data is third-party and aging. First-party intent from pharosIQ would modernize their B2B data story.",
      company_tier: 'tier_2',
      tags: ['crm_map', 'platform_partner'],
    },

    // ================================================================
    // Intent Data / ABM Competitors (account-level only per restrictions)
    // ================================================================
    {
      slug: 'techtarget',
      name: 'TechTarget',
      description: 'B2B tech media publisher with purchase intent data from owned properties.',
      why_they_need_us: "Account-level intent signals only. TechTarget's model depends on declining tech media properties. pharosIQ's broader content ecosystem provides more durable signals.",
      company_tier: 'tier_2',
      tags: ['intent_data', 'account_level_only'],
    },
    {
      slug: 'bombora',
      name: 'Bombora',
      description: 'Largest B2B intent data co-op. Company Surge data powers most ABM platforms.',
      why_they_need_us: "Account-level signals only. Bombora's co-op model means every customer sees the same data. pharosIQ offers exclusive, first-party alternatives.",
      company_tier: 'tier_1',
      tags: ['intent_data', 'account_level_only'],
    },
    {
      slug: 'rollworks',
      name: 'RollWorks',
      description: 'ABM platform for mid-market. Part of NextRoll. Runs on Bombora co-op data.',
      why_they_need_us: "Dependent on Bombora's co-op intent. First-party intent from pharosIQ differentiates their targeting from every other Bombora-powered platform.",
      company_tier: 'tier_3',
      tags: ['abm_platform'],
    },
    {
      slug: 'zoominfo',
      name: 'ZoomInfo',
      description: 'Largest B2B contact database. 600M+ profiles. Streaming intent from bidstream.',
      why_they_need_us: "Account-level only. ZoomInfo's intent is bidstream-derived (noisy). pharosIQ's first-party content-based signals are higher quality.",
      company_tier: 'tier_1',
      tags: ['data_intelligence', 'account_level_only'],
    },

    // ================================================================
    // Data Intelligence
    // ================================================================
    {
      slug: 'clearbit-hubspot',
      name: 'Clearbit/HubSpot',
      description: 'B2B data enrichment, now owned by HubSpot (rebranded Breeze Intelligence).',
      why_they_need_us: 'Clearbit enriches firmographic and technographic data but has zero intent signals. Adding pharosIQ intent to Breeze Intelligence would create a new product tier.',
      company_tier: 'tier_2',
      tags: ['data_intelligence', 'enrichment'],
    },
    {
      slug: 'liveramp',
      name: 'LiveRamp',
      description: 'Identity resolution platform. Powers data connectivity across the ad ecosystem.',
      why_they_need_us: "LiveRamp connects data but doesn't produce intent signals. pharosIQ intent layered onto LiveRamp's identity graph creates a premium offering.",
      company_tier: 'tier_2',
      tags: ['data_intelligence', 'identity'],
    },
    {
      slug: 'lusha',
      name: 'Lusha',
      description: 'B2B contact and company data platform. Growing fast in SMB segment.',
      why_they_need_us: 'Contact data without intent context. pharosIQ signals tell Lusha users which contacts are actually in-market.',
      company_tier: 'tier_3',
      tags: ['data_intelligence', 'contacts'],
    },
    {
      slug: '6signal',
      name: '6signal',
      description: 'IP-to-company identification for website visitor intelligence.',
      why_they_need_us: "6signal identifies who visits your site but not what they're researching elsewhere. pharosIQ off-site intent signals complete the picture.",
      company_tier: 'tier_3',
      tags: ['visitor_id', 'intent_data'],
    },

    // ================================================================
    // Sales/Intent Platforms
    // ================================================================
    {
      slug: 'apollo',
      name: 'Apollo.io',
      description: 'All-in-one sales intelligence and engagement platform. 200M+ contacts.',
      why_they_need_us: 'Apollo has contacts but limited intent coverage. pharosIQ contact-level intent creates a premium tier that justifies higher pricing.',
      company_tier: 'tier_2',
      tags: ['sales_platform', 'contacts'],
    },
    {
      slug: 'leadiq',
      name: 'LeadIQ',
      description: 'Sales prospecting platform. Captures contact data from LinkedIn.',
      why_they_need_us: 'LeadIQ captures contacts but has no signal about buyer readiness. pharosIQ intent identifies which prospects to prioritize.',
      company_tier: 'tier_3',
      tags: ['sales_platform', 'prospecting'],
    },
    {
      slug: 'qualified',
      name: 'Qualified',
      description: 'Conversational marketing platform for Salesforce customers.',
      why_they_need_us: "Qualified knows who's on your website now. pharosIQ knows what they were researching before they arrived.",
      company_tier: 'tier_3',
      tags: ['sales_platform', 'conversational'],
    },
    {
      slug: 'foundry-idg',
      name: 'Foundry/IDG',
      description: "IDG's B2B division. Operates tech media properties and ABM services.",
      why_they_need_us: "Foundry's intent is limited to their own media properties. pharosIQ's broader content ecosystem provides wider coverage.",
      company_tier: 'tier_2',
      tags: ['content_demand_gen', 'intent_data'],
    },

    // ================================================================
    // Lead Routing (CPL Model)
    // ================================================================
    {
      slug: 'integrate',
      name: 'Integrate',
      description: 'Lead routing and validation platform for content syndication.',
      why_they_need_us: "Integrate routes leads but doesn't produce them. pharosIQ intent signals improve lead quality scoring in their routing logic.",
      company_tier: 'tier_3',
      tags: ['lead_routing', 'cpl'],
    },
    {
      slug: 'leadscale',
      name: 'LeadScale',
      description: 'Lead distribution and compliance platform for publishers and networks.',
      why_they_need_us: 'LeadScale validates and routes leads. pharosIQ intent scoring improves acceptance rates and CPL pricing.',
      company_tier: 'tier_3',
      tags: ['lead_routing', 'cpl'],
    },
    {
      slug: 'enhancio',
      name: 'Enhancio',
      description: 'Lead management platform for content syndication campaigns.',
      why_they_need_us: 'Lead quality is their core value prop. pharosIQ intent signals directly improve the metric they sell on.',
      company_tier: 'tier_4',
      tags: ['lead_routing', 'cpl'],
    },
    {
      slug: 'converter',
      name: 'Converter',
      description: 'Content syndication and lead generation platform.',
      why_they_need_us: 'Commodity CPL player. pharosIQ intent data differentiates their offering from other lead gen vendors.',
      company_tier: 'tier_4',
      tags: ['lead_routing', 'cpl'],
    },

    // ================================================================
    // Agency Holding Companies
    // ================================================================
    {
      slug: 'wpp',
      name: 'WPP',
      description: "World's largest advertising holding company. $15B+ revenue. GroupM media arm.",
      why_they_need_us: "WPP's B2B clients need intent data for ABM campaigns. Enterprise license across GroupM agencies would be massive.",
      company_tier: 'tier_1',
      tags: ['agency_holding', 'enterprise'],
    },
    {
      slug: 'publicis-groupe',
      name: 'Publicis Groupe',
      description: 'Global advertising holding company. Epsilon data arm. $14B+ revenue.',
      why_they_need_us: "Epsilon has consumer data but limited B2B intent. pharosIQ fills the B2B gap across Publicis' agency network.",
      company_tier: 'tier_1',
      tags: ['agency_holding', 'enterprise'],
    },
    {
      slug: 'omnicom',
      name: 'Omnicom',
      description: 'Advertising holding company. Annalect data division. $14B+ revenue.',
      why_they_need_us: "Annalect focuses on consumer analytics. pharosIQ provides the B2B intent layer for Omnicom's growing B2B practice.",
      company_tier: 'tier_1',
      tags: ['agency_holding', 'enterprise'],
    },
    {
      slug: 'ipg',
      name: 'IPG',
      description: 'Interpublic Group. Acxiom data arm. $10B+ revenue.',
      why_they_need_us: "Acxiom has identity and consumer data. pharosIQ adds B2B purchase intent that IPG's tech clients need.",
      company_tier: 'tier_2',
      tags: ['agency_holding', 'enterprise'],
    },
    {
      slug: 'dentsu',
      name: 'Dentsu',
      description: 'Japanese advertising holding company with global B2B practice. $9B+ revenue.',
      why_they_need_us: 'Dentsu is growing B2B services aggressively. pharosIQ intent data powers their ABM and demand gen offerings.',
      company_tier: 'tier_2',
      tags: ['agency_holding', 'enterprise'],
    },

    // ================================================================
    // Content & Demand Gen
    // ================================================================
    {
      slug: 'pathfactory',
      name: 'PathFactory',
      description: 'Content intelligence platform. Tracks how buyers engage with content.',
      why_they_need_us: 'PathFactory tracks on-platform content consumption but not off-platform intent. pharosIQ signals show what buyers research elsewhere.',
      company_tier: 'tier_3',
      tags: ['content_demand_gen'],
    },
    {
      slug: 'uberflip',
      name: 'Uberflip',
      description: 'Content experience platform for B2B marketers.',
      why_they_need_us: 'Uberflip personalizes content but lacks external intent signals to inform which content to surface.',
      company_tier: 'tier_4',
      tags: ['content_demand_gen'],
    },
    {
      slug: 'netline',
      name: 'NetLine',
      description: 'B2B content syndication network. First-party publisher network.',
      why_they_need_us: 'NetLine generates leads from content downloads. pharosIQ intent signals identify which leads are actually in-market vs. just browsing.',
      company_tier: 'tier_3',
      tags: ['content_demand_gen', 'cpl'],
    },

    // ================================================================
    // Direct Mail / ABM
    // ================================================================
    {
      slug: 'postal',
      name: 'Postal.io',
      description: 'Offline marketing automation. Corporate gifting and direct mail.',
      why_they_need_us: 'Direct mail ROI depends on targeting the right accounts. pharosIQ intent signals tell Postal.io users which accounts to send to.',
      company_tier: 'tier_4',
      tags: ['direct_mail', 'abm'],
    },
    {
      slug: 'reachdesk',
      name: 'Reachdesk',
      description: 'B2B gifting and direct mail platform. ABM-focused.',
      why_they_need_us: 'Same value prop as Postal.io. Intent-driven gifting converts better than spray-and-pray.',
      company_tier: 'tier_4',
      tags: ['direct_mail', 'abm'],
    },
    {
      slug: 'sendoso',
      name: 'Sendoso',
      description: 'Sending platform for direct mail, gifts, and eGifts in B2B sales.',
      why_they_need_us: "Sendoso's ROI depends on sending to the right people at the right time. pharosIQ intent signals optimize both.",
      company_tier: 'tier_3',
      tags: ['direct_mail', 'abm'],
    },
    {
      slug: 'alyce',
      name: 'Alyce',
      description: 'AI-powered B2B gifting platform. Personal experience platform.',
      why_they_need_us: 'Alyce personalizes gifts but needs signals about what the recipient cares about. pharosIQ intent topics inform gift selection.',
      company_tier: 'tier_4',
      tags: ['direct_mail', 'abm'],
    },

    // ================================================================
    // Visitor ID / Revenue Orchestration
    // ================================================================
    {
      slug: 'warmly',
      name: 'Warmly',
      description: 'Revenue orchestration platform. Identifies website visitors and triggers outbound.',
      why_they_need_us: 'Warmly identifies who visits your site. pharosIQ tells you what they were researching before they arrived, improving conversion messaging.',
      company_tier: 'tier_3',
      tags: ['visitor_id', 'revenue_orchestration'],
    },
    {
      slug: 'rb2b',
      name: 'RB2B',
      description: 'Person-level website visitor identification for B2B.',
      why_they_need_us: "RB2B identifies individual visitors but lacks purchase intent context. pharosIQ signals tell you why they're visiting.",
      company_tier: 'tier_4',
      tags: ['visitor_id'],
    },
    {
      slug: 'breakout',
      name: 'Breakout',
      description: 'Revenue intelligence and visitor identification platform.',
      why_they_need_us: 'Breakout identifies visitors and routes them. pharosIQ intent signals improve routing priority and messaging.',
      company_tier: 'tier_4',
      tags: ['visitor_id', 'revenue_orchestration'],
    },

    // ================================================================
    // Distribution / Channel
    // ================================================================
    {
      slug: 'td-synnex',
      name: 'TD SYNNEX',
      description: 'Largest IT distributor globally. $58B revenue. 150K+ reseller partners.',
      why_they_need_us: "TD SYNNEX's reseller partners need intent signals to prioritize which end-customers to target. Enterprise data license across the partner network.",
      company_tier: 'tier_2',
      tags: ['distribution', 'channel'],
    },
    {
      slug: 'ingram-micro',
      name: 'Ingram Micro',
      description: 'Global IT distributor. $50B+ revenue. Cloud marketplace growing.',
      why_they_need_us: 'Same model as TD SYNNEX. Intent signals distributed through the reseller channel. One deal, thousands of end-users.',
      company_tier: 'tier_2',
      tags: ['distribution', 'channel'],
    },
    {
      slug: 'arrow-electronics',
      name: 'Arrow Electronics',
      description: 'IT distributor and enterprise computing solutions. $30B+ revenue.',
      why_they_need_us: "Arrow's enterprise solutions division needs intent data for their direct sales motion and channel partners.",
      company_tier: 'tier_2',
      tags: ['distribution', 'channel'],
    },
  ];

  return raw.map((c) => ({
    ...c,
    contacts: [],
    recommendations: buildRecommendations(c.tags, c.why_they_need_us),
  }));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const userId = getUserId();

  console.log(`\n🚀 Seeding DaaS Framework Company Matrix`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const companies = buildCompanies();

  if (isDryRun) {
    const tierCounts: Record<string, number> = {};
    let totalRecs = 0;

    for (const c of companies) {
      tierCounts[c.company_tier] = (tierCounts[c.company_tier] || 0) + 1;
      totalRecs += c.recommendations.length;
      console.log(`  ${c.name} (${c.slug}) — ${c.company_tier} — ${c.recommendations.length} product recs`);
      for (const r of c.recommendations) {
        console.log(`    → ${r.product_slug} (${r.fit_strength})`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ${companies.length} companies`);
    console.log(`   ${totalRecs} product recommendations`);
    for (const [tier, count] of Object.entries(tierCounts).sort()) {
      console.log(`   ${tier}: ${count} companies`);
    }
    console.log('\n✅ Dry run complete. No data written.');
    return;
  }

  const supabase = getAdminClient();

  // Load product IDs by slug for recommendations
  const { data: existingProducts, error: prodError } = await supabase
    .from('gtm_products')
    .select('product_id, slug')
    .eq('user_id', userId);

  if (prodError) {
    console.error('❌ Failed to load products:', prodError.message);
    console.log('   Run seed-gtm-products.ts first!');
    process.exit(1);
  }

  const productMap = new Map<string, string>();
  for (const p of existingProducts || []) {
    productMap.set(p.slug, p.product_id);
  }

  if (productMap.size === 0) {
    console.error('❌ No products found. Run seed-gtm-products.ts first!');
    process.exit(1);
  }

  console.log(`📦 Found ${productMap.size} products in database\n`);

  let successCount = 0;
  let recCount = 0;

  for (const company of companies) {
    // Upsert company
    const companyRecord = {
      user_id: userId,
      slug: company.slug,
      name: company.name,
      description: company.description,
      hq_location: null as string | null,
      employee_count: null as string | null,
      annual_revenue: null as string | null,
      website: null as string | null,
      why_they_need_us: company.why_they_need_us,
      recent_news: null as string | null,
      company_tier: company.company_tier,
      contacts: company.contacts,
      tags: company.tags,
      is_active: true,
    };

    const { data: companyData, error: companyError } = await supabase
      .from('gtm_company_profiles')
      .upsert(companyRecord, { onConflict: 'user_id,slug' })
      .select('company_id')
      .single();

    if (companyError) {
      console.error(`❌ Failed to upsert ${company.name}:`, companyError.message);
      continue;
    }

    console.log(`✅ ${company.name} (${company.slug})`);
    successCount++;

    // Upsert recommendations
    for (const rec of company.recommendations) {
      const productId = productMap.get(rec.product_slug);
      if (!productId) {
        console.warn(`   ⚠️  Product not found: ${rec.product_slug}`);
        continue;
      }

      const recRecord = {
        user_id: userId,
        company_id: companyData.company_id,
        product_id: productId,
        fit_strength: rec.fit_strength,
        custom_angle: rec.custom_angle,
        suggested_tier: rec.suggested_tier || null,
        include_in_deal_room: true,
        display_order: 0,
      };

      const { error: recError } = await supabase
        .from('gtm_product_recommendations')
        .upsert(recRecord, { onConflict: 'company_id,product_id' });

      if (recError) {
        console.error(`   ❌ Rec failed (${rec.product_slug}):`, recError.message);
      } else {
        console.log(`   → ${rec.product_slug} (${rec.fit_strength})`);
        recCount++;
      }
    }
  }

  console.log(`\n🎉 Done! ${successCount} companies seeded with ${recCount} product recommendations.\n`);
}

main().catch(console.error);
