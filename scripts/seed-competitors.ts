/**
 * Seed script: Competitive intelligence
 *
 * Populates the `competitive_intel` table with structured data points
 * for 13 key competitors. Each competitor has multiple entries across
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
      data_point: 'Revenue declining 6% YoY following Informa acquisition (2024). $459M goodwill impairment writedown. Stock price down 94% from highs. Cut 10% of global workforce (July 2025) to save $20M/year in operating expenses. One-time charges of $19.5-45M for the restructuring. Revenue "started to crash and burn" per Glassdoor reviews.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'model',
      data_point: 'Operates 220+ tech-focused media properties with 50M+ permissioned members. Generates 1M+ directly observed intent signals/day from content consumption. Products: Priority Engine (Prospect-Level Intent data platform, Account Intent Feeds, Sales Interface, Market Monitor), content syndication, display advertising. First-party data from owned tech publisher network. Fueled by 32M opt-in, active buying group members. CEO Gary Nugent (took over after President Rebecca Kitchens departed July 2025). Tech-vertical focused (cannot serve non-tech B2B).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'weakness',
      data_point: '10% global layoff (July 2025). President Rebecca Kitchens departed, CEO consolidating authority (flattened org). Glassdoor reviews cite post-merger chaos: "leadership did all the wrong things." $459M goodwill impairment. Priority Engine G2 complaints: contact data accuracy issues (engaged contacts not responding or no longer in roles), slow system performance (login issues, long load times), unintuitive UI for filtering, auto-fill confuses specific interests with account averages, no direct integration with prospecting tools (Outreach, Groove). Tech-vertical only: cannot serve healthcare, financial services, or other non-tech B2B verticals (recent healthcare launch is minimal).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'pharosiq_advantage',
      data_point: 'pharosIQ covers all B2B verticals with 650+ intent categories vs. TechTarget\'s tech-only focus. 360M+ contacts vs. 32M active buying group members. pharosIQ has stable leadership and growing revenue vs. TechTarget\'s declining revenue, massive layoffs, and post-merger turmoil. DaaS licensing flexibility (API, flat file, cloud) vs. Priority Engine platform lock-in. NOTE: TechTarget has legitimate first-party data from owned properties (similar to pharosIQ model), but they are operationally distracted and financially weakened. Restricted to account-level-only data per leakage risk.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'TechTarget (Informa)',
      category: 'landmine',
      data_point: 'Ask prospects: "TechTarget just laid off 10% of their workforce and their President left. Are you confident your account team and product roadmap won\'t be affected?" and "Their Priority Engine only covers tech verticals. What happens when you need intent signals for non-tech buying committees?" and "Have you experienced the login issues and slow load times other customers report? How much productivity are you losing to platform friction?" and "Can you export raw intent data to feed your own models, or are you locked into their interface?"',
      source: 'web_research',
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
      data_point: 'B2B intent data and activation platform co-founded by Marc Laplante (CEO, ex-TechTarget, co-founded Prelytix sold to MRP in 2015). PE-backed by BV Investment Partners (invested Dec 2021). Monitors 1.1T+ intent signals/month using AI classification. Products: Orbit Intelligence (intent analytics), Buying Group Intent (persona-level tracking), Intent-Activated Demand Gen (content syndication + display). Acquired 5x5 (member-driven data ecosystem) and Salutary Data (Jan 2026, contacts/company intelligence). #1 in Forrester Wave Q1 2025 (highest score in 12 of 21 criteria).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'growth',
      data_point: '21% overall revenue growth in 2025 with 50% growth in data solutions segment. Profitable since first full year (2019). Revenue quadrupled in both 2019 and 2020, tripled in 2021, grew 62% in 2022. Inc. 5000 fastest-growing company (2023). 150+ customers. Aggressive acquisition strategy: 5x5 and Salutary Data (Jan 2026). Median annual spend estimated mid-five-figure range per Vendr benchmarks.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'weakness',
      data_point: 'Account-level intent only (company level, not individual contacts). Contact-level activation requires separate demand gen program at additional CPL cost. Co-op/aggregated data model fundamentally: multiple proprietary and third-party sources, not a single owned content ecosystem. Expensive CPL pricing limits volume for budget-constrained buyers (top G2 complaint). Integration gaps: intent data not natively aligned with major ABM platforms. Requires dedicated follow-up resources to leverage effectively. 5x5 and Salutary Data acquisitions are data network expansions, not first-party content generation.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'pharosiq_advantage',
      data_point: 'pharosIQ generates first-party intent from owned content ecosystem vs. Intentsify\'s aggregated multi-source model. pharosIQ has 650+ intent categories from proprietary taxonomy vs. Intentsify\'s AI-classified topics from third-party content. pharosIQ delivers contact-level intent natively; Intentsify is account-level only (contact activation requires separate paid programs). pharosIQ sells raw data (DaaS licensing via API/flat file); Intentsify bundles data with managed services. Data provenance is cleaner and more auditable with single-source first-party data.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'landmine',
      data_point: 'Ask prospects: "Intentsify monitors a trillion signals, but from how many distinct sources? Do they own the content generating those signals, or are they aggregating other people\'s data?" and "Their intent is account-level only. To get contact names, you pay extra for their demand gen program at CPL rates. With pharosIQ you get contact-level intent natively in the data feed." and "Can you get Intentsify\'s raw intent data via API to feed your own models, or do you have to use their platform and managed programs?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Intentsify',
      category: 'positioning',
      data_point: 'NOTE: Intentsify is EXCLUDED from pharosIQ DaaS target list per CEO Jeff Rokuskie. This battlecard is for defensive positioning only when Intentsify comes up in competitive situations, not for selling data to them. Intentsify positions as "market leader for B2B intent data and buyer intelligence." Strong Forrester validation. Key differentiator is Buying Group Intent (persona-level tracking within accounts).',
      source: 'web_research',
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

    // ===== PROSPECTBASE =====
    {
      competitor: 'ProspectBase',
      category: 'model',
      data_point: 'UK-based demand gen services company founded in 2024 by ex-DemandScience/Leadiro leadership (Ian Cullen, Chris Whife, Steve Skillcorn, David Scott). Multi-channel lead generation: content syndication, display, social, ConnectedTV, email. Not a pure data/DaaS company. Sells leads (CPL model), not raw data feeds. Claims 238M+ verified contacts across 142+ countries.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ProspectBase',
      category: 'product',
      data_point: 'Key products: CommitSignal (predictive growth intelligence layer monitoring 50+ hiring/growth/investment signals to identify accounts 3-6 months before traditional intent spikes, claims 7M+ signals with 2+ years trend data), Intent-Acceleration Engine (in-market account identification), AI ProspectHub (campaign analytics). 100% in-house delivery, no third-party outsourcing.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ProspectBase',
      category: 'weakness',
      data_point: 'Founded 2024 with zero disclosed funding (bootstrapped from DemandScience exits). No significant press coverage or market validation. Ex-DemandScience origin raises questions about IP independence and data provenance. CommitSignal is hiring/growth signal data, not content-consumption intent, making it complementary not competitive to first-party intent. 100% in-house delivery model is expensive to scale and limits margins. Contact universe (238M) is smaller than pharosIQ (360M+).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ProspectBase',
      category: 'pharosiq_advantage',
      data_point: 'ProspectBase sells leads, not data. No DaaS/data licensing offering means zero overlap with pharosIQ\'s DaaS revenue line. pharosIQ\'s first-party content-consumption intent signals are fundamentally different from (and more valuable than) ProspectBase\'s hiring/growth signals. 360M+ contacts vs. 238M. pharosIQ has 650+ intent categories from owned content ecosystem; ProspectBase has no comparable first-party intent taxonomy.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ProspectBase',
      category: 'landmine',
      data_point: 'Ask prospects: "How do you verify the provenance of their data? Were the founders under non-competes from DemandScience?" and "Their CommitSignal tracks hiring signals, not actual content consumption intent. How do you distinguish between a company that\'s hiring vs. one that\'s actively researching solutions?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'ProspectBase',
      category: 'positioning',
      data_point: 'Positions as full-service demand gen with proprietary predictive intelligence. Claims clients include HPE, Palo Alto Networks, NVIDIA, Salesforce, AWS, Dell. Large leadership team for a 2024 startup: CEO, COO, CTO, CRO, CFO, CCO, plus regional MDs and VPs across APAC, NA, EMEA, Ireland. Likely brought clients and team from DemandScience/Leadiro.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== ANTERIAD =====
    {
      competitor: 'Anteriad',
      category: 'revenue',
      data_point: 'Formerly MeritB2B, rebranded to Anteriad. Raised $222M total funding. CEO: Rob Sanchez. Named Strong Performer in Forrester Wave Intent Data Providers Q1 2025. Ranked #15 on Fortune Best Workplaces in Advertising & Marketing 2025. Actively hiring (more open sales roles than any time in past 12 months). Global expansion: non-US data grew 122% in 2025.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Anteriad',
      category: 'model',
      data_point: 'Full-funnel B2B marketing and data solutions provider. Combines multiple intent data types: proprietary publisher network, first-party data, web/digital by-products, Google Analytics, Bidstream, third-party aggregated data, social media feeds. 414M+ total contacts enriched with 500+ audience attributes (expanded 122% in 2025). 8,000+ intent topics (growing). Covers 21M+ companies. 2,500+ data sources. Products: Anteriad Marketing Cloud, BDR-as-a-Service, audience identification/activation, content syndication, ABM. Data available via one-off purchase, monthly/yearly license, or usage-based pricing. Listed on Datarade (sells raw data).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Anteriad',
      category: 'weakness',
      data_point: 'Mixes multiple data sources (first-party publisher network, bidstream, Google Analytics, third-party, social media), making data provenance harder to audit. "Strong Performer" not "Leader" in Forrester Wave (behind Intentsify). Offshore operations create timezone challenges (per G2 reviews, recently adding local hires). 8,000+ topics sounds large but quality/specificity varies when sourced from 2,500+ sources vs. a single owned ecosystem. Bidstream data is increasingly unreliable as browsers deprecate third-party cookies. Custom pricing with no transparency. Not as well-known brand as Bombora, 6sense, or TechTarget in the enterprise buyer mindset.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Anteriad',
      category: 'pharosiq_advantage',
      data_point: 'pharosIQ generates first-party intent from a single owned content ecosystem with clear provenance. Anteriad aggregates 2,500+ sources including bidstream and third-party data (provenance is murkier). pharosIQ\'s 650+ categories are purpose-built from owned content; Anteriad\'s 8,000+ topics are aggregated from diverse sources with varying quality. Both have large contact universes (pharosIQ 360M+ vs. Anteriad 414M+), but pharosIQ\'s data is first-party with cleaner consent chain. Anteriad is a closer competitor than most because they actually sell data (listed on Datarade), not just leads.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Anteriad',
      category: 'landmine',
      data_point: 'Ask prospects: "Anteriad aggregates from 2,500+ sources including bidstream data. With third-party cookies going away, how confident are you in the reliability of bidstream-derived intent signals?" and "When they report intent on one of their 8,000 topics, can they tell you exactly which content asset was consumed and on which owned property? Or is it inferred from aggregated signals across multiple third-party sources?" and "How do you audit the consent chain when data comes from 2,500+ sources across multiple collection methods?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== DIGITALZONE =====
    {
      competitor: 'DigitalZone',
      category: 'model',
      data_point: 'B2B demand gen and content syndication company founded by Rishikkes Pawar (CEO). Bootstrapped, no external funding. 350+ employees in USA and India. Claims 120M+ unique business professionals in proprietary owned database curated over 10+ years, across 130+ countries. Products: Content Syndication, Programmatic Nurture (multi-channel demand gen), Waterfall Content Syndication, list building, webinar registration. CPL pricing ($15-100/lead). Inc. 5000 fastest-growing company. C-suite additions (2024): Sonjoy Ganguly (CPO), Thomas Koletas (CRO).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DigitalZone',
      category: 'product',
      data_point: 'DigitalZone Data Cloud: proprietary ID graph enriched with first-party data and AI engine for identity resolution across lead journey. Claims contact-level precision targeting (not just account-level). Programmatic Nurture powers multi-channel demand gen with transparent journeys. Positions as "only demand gen partner delivering contact-level insights across every channel." Differentiator is multi-dimensional approach to data combining proprietary database, intent signals, and AI enrichment.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DigitalZone',
      category: 'weakness',
      data_point: 'Pricing described as high and not competitive (primary G2 complaint). Small bootstrapped company with no external funding, limiting R&D investment and scaling capacity. 120M contacts vs. pharosIQ\'s 360M+. India-heavy operations (350+ staff, significant delivery in India). No evidence of DaaS/data licensing capability. Sells leads through managed programs, not raw data feeds. Proprietary database claims are hard to verify (10+ years of curation, but what is the data provenance and consent chain?).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DigitalZone',
      category: 'pharosiq_advantage',
      data_point: 'pharosIQ has 360M+ contacts vs. DigitalZone\'s 120M. pharosIQ generates first-party intent from owned content ecosystem with 650+ categories; DigitalZone\'s "Data Cloud" combines multiple sources with AI enrichment (less transparent provenance). pharosIQ sells raw data via DaaS licensing (API, flat file, cloud); DigitalZone sells leads through managed campaigns only. pharosIQ can power companies like DigitalZone as a data supplier.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DigitalZone',
      category: 'landmine',
      data_point: 'Ask prospects: "Their Data Cloud combines \'proprietary\' data with AI enrichment. Can they show you exactly where each contact record originated and when it was last verified?" and "If you need raw intent data for your own models or platforms, can DigitalZone deliver via API, or do you have to use their managed programs?" and "120M contacts sounds good, but how does that compare to your total addressable market? Are there gaps in coverage for your target verticals or geographies?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== MADISON LOGIC =====
    {
      competitor: 'Madison Logic',
      category: 'revenue',
      data_point: 'Estimated $80-120M annual revenue. Founded 2005, New York. PE-backed by ABS Capital Partners (growth equity, invested ~2018-2019). Reported layoffs in 2023. ~350-500 employees (likely lower post-layoffs). Content syndication margins under industry-wide pressure.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Madison Logic',
      category: 'model',
      data_point: 'B2B ABM activation platform. Core business is content syndication lead delivery on CPL basis ($40-80+/lead). Also offers display advertising (CPM), LinkedIn activation, and ABM Connected TV. Key dependency: uses Bombora Company Surge for ALL intent data (not proprietary). Bombora CEO Erik Matlick sits on Madison Logic board. Products: ML Platform (ABM activation), ML Insights (Bombora-powered intent), Content Syndication, Display, ABM Account Journey Analytics. Platform subscription estimated $50-150K+/year. NOT a data licensing company.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Madison Logic',
      category: 'weakness',
      data_point: 'No proprietary data moat. Entire intent layer is rented from Bombora co-op data. Account-level only (cannot identify individual contacts, only surging companies). Zero data exclusivity: every Bombora customer sees the same surging accounts. Bombora dependency is single point of failure (if Bombora raises prices or quality degrades, Madison Logic has no fallback). Layoffs in 2023. Content syndication model faces declining CPLs and buyer skepticism about lead quality. PE pressure from ABS Capital on return timeline. Cannot sell raw data, only activation services.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Madison Logic',
      category: 'pharosiq_advantage',
      data_point: 'First-party owned data vs. rented Bombora co-op. Contact-level intent vs. account-level only. Exclusive signals (competitors cannot buy pharosIQ data) vs. zero exclusivity (all Bombora customers see same signals). 360M+ contacts and 650+ intent categories vs. no proprietary contact database or taxonomy. DaaS licensing (API, flat file, cloud) vs. activation-only model. No platform lock-in. NOTE: Madison Logic is also a potential pharosIQ DaaS CUSTOMER (account-level data only per leakage risk restriction). Sell as complement to Bombora, not replacement (Bombora CEO on their board).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'Madison Logic',
      category: 'landmine',
      data_point: 'Ask prospects: "Are you concerned that your competitors see the exact same surging accounts you do? If everyone uses the same co-op intent data, where\'s your targeting advantage?" and "When you get an account-level signal, how much time does your SDR team spend identifying the right person to contact?" and "Do you know whether your vendor owns their intent data or rents it? If their data supplier raises prices, how does that affect your cost?" and "How fresh are the signals? Is it real-time content consumption, or is there a co-op aggregation lag?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== DEMANDSCIENCE =====
    {
      competitor: 'DemandScience',
      category: 'revenue',
      data_point: 'Estimated $150-200M annual revenue (combined entity post-acquisitions). PE-backed by Audax Private Equity (invested 2019). Audax approaching 5-7 year exit window (2025-2026), meaning cost-cutting and margin optimization mode.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandScience',
      category: 'model',
      data_point: 'B2B demand gen and data intelligence company (formerly Selling Simplified). Primarily sells qualified leads on CPL basis, not raw data feeds. Products: PureSyndication (content syndication), PureABM (account-based marketing), PurePush (display/programmatic), ContentIQ (new content intelligence layer, unproven). Acquired Terminus ABM platform (2023), Leadiro (2021, UK contacts), Internal Results (2021, lead gen), TrueInfluence (B2B data). Claims 70M+ verified contacts.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandScience',
      category: 'pricing',
      data_point: 'CPL model: $30-80 per lead depending on targeting criteria (title seniority, company size, geography, BANT qualification). Content syndication sold as campaigns with guaranteed volume (e.g., 500 leads/90 days). Terminus platform: estimated $30-75K/year subscription. Annual contracts standard, multi-year discounts available.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandScience',
      category: 'weakness',
      data_point: 'Four acquisitions in 3 years creating massive integration debt (different tech stacks, databases, operational models). Entire ex-Leadiro senior team left to found ProspectBase in 2024, taking relationships and know-how. PE cost pressure (Audax in exit window) means reduced R&D and headcount cuts. Terminus showing product stagnation post-acquisition. No true first-party content-consumption intent data; relies on campaign interactions and third-party/co-op signals. Multiple acquired databases with questionable dedup and consent chain for GDPR. ContentIQ is brand new and unproven. Operationally heavy services model with lower margins than data/SaaS.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandScience',
      category: 'pharosiq_advantage',
      data_point: 'pharosIQ is a data supplier; DemandScience is a services company that happens to have data. pharosIQ has 360M+ contacts vs. 70M. First-party content-consumption intent from owned ecosystem vs. acquired/third-party signals. 650+ intent categories vs. ContentIQ (new, unproven). Clean data provenance vs. four merged databases. DaaS licensing model (API, flat file, cloud) vs. managed services only. DemandScience is actually a potential DaaS CUSTOMER for pharosIQ, not just a competitor.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandScience',
      category: 'landmine',
      data_point: 'Ask prospects: "Can DemandScience tell you which specific content asset a contact consumed, on which date, from which owned property? Or are they aggregating third-party signals?" and "They\'ve acquired four companies in three years. How did they harmonize the contact databases for GDPR consent chain?" and "The entire Leadiro leadership team left to start a competitor in 2024. What does that tell you about the internal situation?" and "Audax PE invested in 2019. Are you comfortable signing a multi-year contract with a company likely about to change ownership?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // ===== DEMANDWORKS MEDIA =====
    {
      competitor: 'DemandWorks Media',
      category: 'model',
      data_point: 'Chicago-based B2B demand gen and content syndication company founded 2014 by Gareth Brown. Offers content syndication, ABM, geofencing, webinar promotions, and intent-based monitoring. Uses email newsletters to deliver gated content (whitepapers, ebooks) to buyers. Claims 87M+ subscribers across 130+ countries. CPL/pay-for-performance pricing. Clients include Intel, AWS, Payscale, Salesforce, Oracle.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandWorks Media',
      category: 'product',
      data_point: 'Two main plans: Generate Plan (lead gen through intent-driven content experiences) and Influence Plan (engagement and brand trust among decision-makers). Monitors millions of contact-level engagements monthly. Offers intent layering, predictive targeting, and personalized email delivery. Can launch campaigns within 48 hours. Dashboard for campaign reporting (described as clunky by users).',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandWorks Media',
      category: 'weakness',
      data_point: 'Small company with no disclosed revenue or significant funding. Pricing described as expensive by G2 reviewers. Dashboard is clunky and slow, often requires emailing a rep for data pulls. Limited visibility into lead qualification and contact filtering process. No formal ROI reporting. Primarily a lead delivery shop, not a data or technology company. No proprietary intent taxonomy or first-party content ecosystem.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandWorks Media',
      category: 'pharosiq_advantage',
      data_point: 'DemandWorks sells leads, not data. Zero DaaS/data licensing capability. pharosIQ has 360M+ first-party contacts vs. DemandWorks\' 87M subscribers. pharosIQ owns its content ecosystem and generates proprietary intent signals across 650+ categories; DemandWorks layers third-party intent onto email delivery. pharosIQ can power platforms like DemandWorks as a data supplier.',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },
    {
      competitor: 'DemandWorks Media',
      category: 'landmine',
      data_point: 'Ask prospects: "Where does their intent data actually come from? Do they own the content that generates the signals, or are they licensing third-party data?" and "Can you see exactly how leads are qualified and filtered before delivery, or is that a black box?" and "What happens when you need raw data for your own models instead of pre-packaged leads?"',
      source: 'web_research',
      captured_date: capturedDate,
      user_id: userId,
    },

    // =============================================================
    // MARCH 2026 DEMAND GEN INTEL + CUSTOMER SENTIMENT
    // =============================================================

    // --- DemandScience: Content-IQ launch ---
    {
      competitor: 'DemandScience',
      category: 'demand_gen',
      data_point: 'March 2026: Launched Content-IQ (analyzes organic market share, identifies authority gaps across topic clusters, evaluates brand visibility in AI Overviews and LLM responses). Content-IQ is an analytics layer, NOT a data source: it does not generate proprietary intent signals. Pushing narrative that content syndication + display should run as "one system" (upsell play). Leadership changes in March 2026. G2 Winter 2026: 26 badges, 167 reports, #1 in three Enterprise categories. 935 reviews, 4.3/5. Top complaint: reporting features need improvement for campaign performance visibility.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- Anteriad: Forrester 5/5 Buying Group ---
    {
      competitor: 'Anteriad',
      category: 'demand_gen',
      data_point: 'March 2026: Received Forrester 5/5 in Buying Group Detail criterion (Forrester Wave: Marketing and Sales Data Providers Q1 2026). Launched AI-Driven Buying Group Profiles in Anteriad Marketing Cloud: combines proprietary B2B data with AI to dynamically identify, assemble, and activate complete buying groups. Activation across managed multichannel campaigns, content syndication, and BDR outreach in 30 languages. KEY WEAKNESS: AI-assembled buying groups from 2,500+ aggregated sources is modeled/inferred, not observed behavior from owned content properties.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- TechTarget: New products March 2026 ---
    {
      competitor: 'TechTarget (Informa)',
      category: 'demand_gen',
      data_point: 'March 2026: Launched AI Visibility Audit (shows where brand appears in AI-generated answers) and GEO Topic Planner (Generative Engine Optimization for AI systems). Also launched Priority Engine Demand: bundles account-level intent + 32M contacts + content syndication + lead gen with Content Hubs (whitepapers, videos, webinars via TechTarget + BrightTALK). These products optimize CLIENT content visibility but do NOT improve quality of leads TechTarget delivers. Contact accuracy only ~60% per TrustRadius reviewer. G2: 451 reviews. Top complaints: login issues, slow loading, data described as "wonky," no Outreach/Groove integration.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- Intentsify: Salutary Data "last mile" ---
    {
      competitor: 'Intentsify',
      category: 'demand_gen',
      data_point: 'March 2026: Salutary Data acquisition (Jan 2026) framed by analysts as solving the "last mile" problem: the gap between an intent signal and a verified human contact. Confirms core weakness: account-level only, had to BUY contact-level capability. Industry shifting to "declared intent over inferred behavior" as 2026-2030 trend (per @360MarTech). Intentsify\'s aggregated/inferred model is on the wrong side of that shift. pharosIQ\'s first-party content consumption signals ARE declared intent. G2: 4.4/5, 33 reviews. #1 complaint: expensive CPL limits volume. 2-3 week onboarding for new campaigns.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- Madison Logic: Customer sentiment ---
    {
      competitor: 'Madison Logic',
      category: 'customer_sentiment',
      data_point: 'G2: 235 reviews. Expanded Adobe partnership and Convertr integration (for lead quality transparency, suggesting it was a known gap). Positives: high-quality leads, quick results, responsive support. Negatives: complex, unintuitive UI (steep learning curve, unclear buttons, frustrating navigation), missing features for data management. Convertr integration needed to add transparency they lacked. Still 100% Bombora-dependent for all intent data.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- ProspectBase: B2BMX + hiring ---
    {
      competitor: 'ProspectBase',
      category: 'demand_gen',
      data_point: 'March 2026: Present at B2BMX 2026 marketplace. Named in TechConnectr Top B2B Lead Gen Companies 2026 Awards. Rich Stone joined as SVP Sales, NA (May 2025), building US sales presence. CommitSignal positioned as "complement to traditional intent" with growth-based intelligence (hiring, tech adoption, financial movement). No G2/TrustRadius reviews available (company too new, founded 2024). Note: unrelated SaaS product also called "CommitSignal" exists (@JesusAnutrof on X), not the same as ProspectBase.',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- DigitalZone: Buying Group Syndication push ---
    {
      competitor: 'DigitalZone',
      category: 'demand_gen',
      data_point: 'March 2026: Publishing thought leadership on "Buying Group Syndication" as Q2 2026 trend (AI agents deliver role-specific content to different personas simultaneously). 54% YoY revenue growth (2023), 128% client acquisition growth. Inc. 5000 three years running. Surveyed 1,500 B2B marketers (2025 State of Demand Gen) and 1,500 B2B buyers (2026 report). G2 reviews: top complaint is pricing (high and not competitive).',
      source: 'web_research_mar2026',
      captured_date: capturedDate,
      user_id: userId,
    },

    // --- Industry Trend: Buying Group Syndication ---
    {
      competitor: 'Industry Trend',
      category: 'market_shift',
      data_point: 'March 2026: "Buying Group Syndication" emerging as the next battleground in demand gen. Anteriad (Forrester 5/5 Buying Group), DemandScience, DemandWorks, and DigitalZone all messaging around targeting 10+ stakeholders per deal simultaneously. TechTarget launched Priority Engine Demand for buying group identification. pharosIQ advantage: we show the ACTUAL people who consumed content from owned properties, not AI-assembled profiles guessed from aggregated data. Also: industry shifting from inferred intent to declared intent (2026-2030 trend per @360MarTech). pharosIQ\'s first-party content consumption signals are declared intent by definition.',
      source: 'web_research_mar2026',
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
    `\n[seed:competitors] ${dryRun ? 'DRY RUN — ' : ''}Preparing ${records.length} competitive intel records for 13 competitors\n`
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
