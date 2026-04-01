/**
 * Seed script: GTM Product Catalog
 *
 * Populates the `gtm_products` table with pharosIQ's product catalog.
 * Data sourced from existing .md files in docs/ and campaigns/.
 *
 * Usage:
 *   npx tsx scripts/seed-gtm-products.ts
 *   npx tsx scripts/seed-gtm-products.ts --user-id <uuid>
 *   npx tsx scripts/seed-gtm-products.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

interface GtmProductSeed {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  value_prop: string;
  problem_statement: string;
  key_stats: { stat: string; source?: string }[];
  features: { name: string; description: string }[];
  benefits: { benefit: string; for_whom?: string }[];
  use_cases: { title: string; description: string; persona?: string }[];
  differentiators: { vs_competitor: string; advantage: string }[];
  pricing_tiers: Record<string, { price: string; unit: string; description: string }>;
  packaging_notes: string;
  target_personas: { tier: string; persona: string; why_they_buy: string }[];
  demo_type: string | null;
  display_order: number;
}

function buildProducts(): GtmProductSeed[] {
  return [
    // ================================================================
    // 1. DaaS Signal Licensing (Personas + Intent Topics)
    // ================================================================
    {
      slug: 'daas-signal-licensing',
      name: 'DaaS Signal Licensing',
      category: 'data_feeds',
      tagline: 'First-party contacts + intent topic intelligence for platforms',
      value_prop: 'OEM contact-level intent signals that platforms embed into their products. Your customers see better results, you differentiate vs. competitors. Built on 360M+ first-party contacts with 650+ intent categories. Standard offering includes contact records matched to intent topics.',
      problem_statement: 'Platforms need proprietary intent data to power lead scoring, account prioritization, and ad targeting. Co-op data (Bombora) is shared across competitors. Account-level signals miss the contact dimension.',
      key_stats: [
        { stat: '360M+ first-party contacts across 25M+ companies', source: 'pharosIQ' },
        { stat: '650+ intent categories with scores from 1-99', source: 'pharosIQ' },
        { stat: '3-6M intent signals generated per month', source: 'pharosIQ' },
        { stat: 'Data Infrastructure companies trade at 24.4x EBITDA', source: 'Finro Q4 2025' },
      ],
      features: [
        { name: 'Contact-level intent', description: 'Contact records matched to intent topics showing which contacts at which accounts are in-market, not just which accounts are surging' },
        { name: 'First-party signals', description: 'Generated from pharosIQ\'s owned content ecosystem. Not a co-op. Not scraped.' },
        { name: 'Exclusive to each buyer', description: 'Signals are not shared across competitors like co-op models' },
        { name: '650+ intent categories', description: 'Granular topic coverage across the full B2B buying landscape' },
        { name: 'Flexible delivery', description: 'API, flat file, cloud delivery, or embedded OEM' },
        { name: 'Real-time scoring (1-99)', description: 'Weighted by content type, seniority, recency, and momentum' },
      ],
      benefits: [
        { benefit: 'Build a data moat competitors can\'t replicate', for_whom: 'Platform product teams' },
        { benefit: 'Improve customer retention through better targeting results', for_whom: 'Customer success' },
        { benefit: 'Command premium pricing with proprietary data features', for_whom: 'Revenue leaders' },
      ],
      use_cases: [
        { title: 'Lead Scoring Enhancement', description: 'Embed intent signals into CRM lead scoring. Leads showing active research behavior get prioritized automatically.', persona: 'CRM/MAP platforms' },
        { title: 'Ad Targeting Intelligence', description: 'Power ABM ad targeting with persona-level signals. Know which roles at surging accounts to reach.', persona: 'B2B DSPs and ABM platforms' },
        { title: 'Predictive Deal Intelligence', description: 'Feed intent signals into revenue forecasting. Accounts with surging personas close faster.', persona: 'Revenue intelligence platforms' },
      ],
      differentiators: [
        { vs_competitor: 'Bombora', advantage: 'First-party vs. co-op. Persona-level vs. account-level. Exclusive vs. shared across competitors.' },
        { vs_competitor: '6sense', advantage: 'Data licensing model (no platform lock-in). Lower price point. Healthier company trajectory.' },
        { vs_competitor: 'TechTarget', advantage: 'Broader content ecosystem. Not dependent on declining tech media properties.' },
      ],
      pricing_tiers: {
        'Standard OEM': { price: '$100K-200K', unit: '/year', description: 'Persona + intent topic signals. Standard deployment.' },
        'Premium OEM': { price: '$200K-500K', unit: '/year', description: 'Higher volume, exclusivity options, custom categories.' },
        'Enterprise Platform': { price: '$500K-2M', unit: '/year', description: 'Full API access, CRM/MAP integration, dedicated support.' },
      },
      packaging_notes: 'CRITICAL: Standard offering is contacts + intent topics (contact records matched to which intent topics the account is surging on). Full file (contacts + content consumed, i.e. which specific content each contact downloaded) is $1M+ enterprise partners only (SFDC, HubSpot scale). Selling content consumption data cannibalizes lead gen.',
      target_personas: [
        { tier: 'Tier 1', persona: 'CRM/MAP Platforms (HubSpot, Salesforce, Marketo)', why_they_buy: 'Intent signals inside CRM records is the #1 requested data enrichment type' },
        { tier: 'Tier 2', persona: 'Sales Intelligence (Apollo, Cognism, Clay, Seamless.ai)', why_they_buy: 'Limited intent coverage. First-party intent layered onto contacts creates premium tier' },
        { tier: 'Tier 3', persona: 'ABM Platforms (Demandbase, RollWorks, DemandScience)', why_they_buy: 'First-party intent differentiates from co-op data reliance' },
        { tier: 'Tier 4', persona: 'Data Enrichment (D&B, Clearbit/Breeze)', why_they_buy: 'No proprietary intent signals. New product line opportunity.' },
        { tier: 'Tier 5', persona: 'Conversation Intelligence (Gong, Clari)', why_they_buy: 'Pre-conversation intent context improves deal intelligence' },
      ],
      demo_type: null,
      display_order: 1,
    },

    // ================================================================
    // 2. Surge Dossiers
    // ================================================================
    {
      slug: 'surge-dossiers',
      name: 'Surge Dossiers',
      category: 'intelligence_reports',
      tagline: 'AI-assembled account intelligence that turns naked leads into research-ready leads',
      value_prop: 'Modular account intelligence packages delivered alongside demand gen leads. 14 module types assembled into 5 report configurations. Each dossier saves SDRs 2-3 hours of research per account.',
      problem_statement: 'SDRs spend 2-3 hours researching each account before outreach. At $75K salary ($36/hr fully loaded), that research cost often exceeds the CPL. Most leads arrive as just a name and email with zero context.',
      key_stats: [
        { stat: '$25 CPL premium replaces 2-3 hours of SDR research ($72-108 value)', source: 'pharosIQ' },
        { stat: '14 module types assembled into 5 report configurations', source: 'pharosIQ' },
        { stat: '15-25% adoption target in Year 1 = $4.5-7.5M incremental', source: 'pharosIQ' },
      ],
      features: [
        { name: 'Buyer Overview', description: 'Contextualized value propositions for the target account' },
        { name: 'Buying Committee', description: 'LinkedIn profiles, work history, recent activity for key decision-makers' },
        { name: 'Competitive Heat Map', description: 'Objections and battle card talking points vs. competitors' },
        { name: 'Personalized Outreach', description: 'Email drafts + LinkedIn scripts for each committee member' },
        { name: 'Call Preparation', description: 'Per-person scripts ("If you get Priya on the phone, here\'s what to talk about")' },
        { name: 'Sequenced Activity Plan', description: 'Week 1, 2, 3 playbook for working the account' },
        { name: 'Employee/Customer Sentiment', description: 'Reddit, Glassdoor, job boards intelligence' },
        { name: 'Account Health Scorecard', description: 'Renewal risk, expansion opportunity for existing customers' },
      ],
      benefits: [
        { benefit: 'Save 2-3 hours of SDR research per account', for_whom: 'Sales development teams' },
        { benefit: 'Higher lead-to-meeting conversion rates', for_whom: 'Demand gen buyers' },
        { benefit: 'Differentiate CPL offering from commodity lead gen', for_whom: 'pharosIQ sales team' },
      ],
      use_cases: [
        { title: 'SDR Outreach Package', description: 'Everything an SDR needs to work a new lead. All outreach modules + intelligence.', persona: 'SDR teams' },
        { title: 'AE Deep Dive', description: 'Strategic account planning for named accounts. All modules including buyer challenges and capability fit.', persona: 'Account executives' },
        { title: 'Event Prep Brief', description: 'Condensed overview and conversation starters. One-pager to glance at before walking up to someone.', persona: 'Conference attendees' },
        { title: 'QBR Package', description: 'Health scorecard, recommended actions, sentiment. Retention and expansion focused.', persona: 'Account management' },
        { title: 'Executive Brief', description: '2-minute read: key facts, top threat, 3 actions. A CEO reads this and knows exactly what\'s happening.', persona: 'C-suite' },
      ],
      differentiators: [
        { vs_competitor: 'CompanyCompass (B2B Tech Group)', advantage: 'Self-service platform, 60-second generation, Surge Trending/Radar (no equivalent), intent signal integration, scalable vs. manual' },
        { vs_competitor: 'Generic research firms', advantage: 'AI-assembled from first-party data. Minutes not days. $200-500 not $2,000-5,000.' },
      ],
      pricing_tiers: {
        'CPL Premium': { price: '$25', unit: '/lead', description: 'Added to standard CPL (~$30 base). Positioned as "research-ready leads" not a price increase.' },
        'Standalone': { price: '$200-500', unit: '/dossier', description: 'Individual purchase via SurgeEngine.ai' },
        'Subscription': { price: '$1,500-3,000', unit: '/month', description: '10-25 dossiers/month' },
      },
      packaging_notes: 'Sells to existing demand gen customer base. No new logos required for Year 1. Pilot with top 20 customers by CPL volume.',
      target_personas: [
        { tier: 'Tier 1', persona: 'Existing pharosIQ demand gen customers', why_they_buy: 'Already buying leads. Dossier is an upsell on existing spend.' },
        { tier: 'Tier 2', persona: 'Mid-market sales teams (50-200 reps)', why_they_buy: 'No internal research teams. Need account intel at scale.' },
        { tier: 'Tier 3', persona: 'Outbound agencies', why_they_buy: 'Research is their biggest cost. Dossiers at $200-500 beat hiring researchers.' },
      ],
      demo_type: 'surge_dossier',
      display_order: 2,
    },

    // ================================================================
    // 3. Surge Trending
    // ================================================================
    {
      slug: 'surge-trending',
      name: 'Surge Trending',
      category: 'monitoring',
      tagline: 'Which companies are surging for your intent topics this week',
      value_prop: 'Weekly ranked lists of companies showing surge behavior on your selected intent topics. The early warning system that tells you which accounts to prioritize before your competitors know they\'re in-market.',
      problem_statement: 'Sales teams waste time on accounts that aren\'t in-market. Without surge signals, outreach is untargeted and conversion rates are low. By the time an account raises their hand, competitors are already engaged.',
      key_stats: [
        { stat: 'Updated weekly with ranked surge activity', source: 'pharosIQ' },
        { stat: '650+ intent topics to monitor', source: 'pharosIQ' },
      ],
      features: [
        { name: 'Weekly ranked lists', description: 'Companies ranked by surge intensity on your selected topics' },
        { name: 'Topic selection', description: 'Choose from 650+ intent categories to monitor' },
        { name: 'Surge scoring', description: 'Intensity scoring shows which accounts are heating up fastest' },
        { name: 'Historical trending', description: 'See surge patterns over time, not just snapshots' },
      ],
      benefits: [
        { benefit: 'Prioritize outreach to accounts showing active buying behavior', for_whom: 'Sales teams' },
        { benefit: 'Prove retainer value with weekly evidence of targeting precision', for_whom: 'Agency owners' },
        { benefit: 'Identify new accounts entering the market before competitors', for_whom: 'Business development' },
      ],
      use_cases: [
        { title: 'Weekly Sales Prioritization', description: 'Sales leadership uses Surge Trending to set weekly outbound priorities based on which accounts are actively researching.', persona: 'VP Sales' },
        { title: 'Agency Client Reporting', description: 'Agencies deliver weekly surge reports to clients showing which accounts they targeted and why.', persona: 'Demand gen agencies' },
        { title: 'Competitive Early Warning', description: 'Monitor competitors\' customers for surge activity on your topics. Catch accounts considering a switch.', persona: 'Competitive intelligence' },
      ],
      differentiators: [
        { vs_competitor: 'Bombora Surge Analytics', advantage: 'Persona-level vs. account-level. First-party vs. co-op. Exclusive signals.' },
      ],
      pricing_tiers: {
        '10 Topics': { price: '$500', unit: '/month', description: 'Monitor 10 intent topics. Weekly delivery.' },
        '25 Topics': { price: '$1,000', unit: '/month', description: 'Monitor 25 intent topics. Weekly delivery.' },
        '50 Topics': { price: '$2,000', unit: '/month', description: 'Monitor 50 intent topics. Weekly delivery + priority support.' },
      },
      packaging_notes: '"Fries with that" upsell to Surge Dossiers. Customer sees a surging account, natural next step is to generate a dossier.',
      target_personas: [
        { tier: 'Tier 1', persona: 'Demand gen agencies', why_they_buy: 'Weekly proof of targeting precision for client retention' },
        { tier: 'Tier 2', persona: 'Sales teams at mid-market companies', why_they_buy: 'Prioritize outreach without expensive ABM platforms' },
        { tier: 'Tier 3', persona: 'Competitive intelligence teams', why_they_buy: 'Early warning on competitor account movement' },
      ],
      demo_type: null,
      display_order: 3,
    },

    // ================================================================
    // 4. Surge Radar
    // ================================================================
    {
      slug: 'surge-radar',
      name: 'Surge Radar',
      category: 'monitoring',
      tagline: 'What are your target accounts researching right now',
      value_prop: 'Real-time visibility into what your named target accounts are actively evaluating. Flip the question: instead of "who is surging on my topic," ask "what is my target account surging on."',
      problem_statement: 'Account teams know which companies they want to sell to, but don\'t know what those accounts are evaluating right now. Outreach is generic because there\'s no insight into current research behavior.',
      key_stats: [
        { stat: 'Real-time intent topic monitoring for named accounts', source: 'pharosIQ' },
        { stat: '650+ intent categories tracked per account', source: 'pharosIQ' },
      ],
      features: [
        { name: 'Named account monitoring', description: 'Upload your target account list and see what they\'re researching' },
        { name: 'Topic discovery', description: 'See which intent topics your accounts are surging on, even outside your category' },
        { name: 'Competitive signals', description: 'Know when a target account starts researching competitor categories' },
        { name: 'Alert triggers', description: 'Get notified when a target account surges on a topic you care about' },
      ],
      benefits: [
        { benefit: 'Personalize outreach based on what the account is actually evaluating', for_whom: 'Account executives' },
        { benefit: 'Catch competitive threats early when accounts research alternatives', for_whom: 'Customer success' },
        { benefit: 'Discover cross-sell opportunities from unexpected topic surges', for_whom: 'Account management' },
      ],
      use_cases: [
        { title: 'Pre-Call Intelligence', description: 'Before any call, check Surge Radar to see what the account has been researching. Walk in with context.', persona: 'Account executives' },
        { title: 'Churn Prevention', description: 'Monitor existing customers for competitor category surges. Proactive retention.', persona: 'Customer success' },
        { title: 'Expansion Triggers', description: 'See when an existing customer starts researching adjacent categories. Time your upsell.', persona: 'Account management' },
      ],
      differentiators: [
        { vs_competitor: 'Generic intent providers', advantage: 'Account-centric view (what are MY accounts doing) vs. topic-centric (who is surging on THIS topic)' },
      ],
      pricing_tiers: {
        'Starter': { price: '$500', unit: '/month', description: 'Monitor up to 100 named accounts' },
        'Growth': { price: '$1,500', unit: '/month', description: 'Monitor up to 500 named accounts' },
        'Enterprise': { price: '$3,000', unit: '/month', description: 'Unlimited accounts + API access' },
      },
      packaging_notes: 'Pairs naturally with Surge Trending. Trending answers "who is surging," Radar answers "what are they surging on." Sell together.',
      target_personas: [
        { tier: 'Tier 1', persona: 'Enterprise sales teams with named account lists', why_they_buy: 'Real-time intelligence on target accounts' },
        { tier: 'Tier 2', persona: 'Customer success teams', why_they_buy: 'Churn prevention through early competitive signals' },
        { tier: 'Tier 3', persona: 'ABM practitioners', why_they_buy: 'Account-centric intent view for campaign planning' },
      ],
      demo_type: null,
      display_order: 4,
    },

    // ================================================================
    // 5. ICP Analyzer
    // ================================================================
    {
      slug: 'icp-analyzer',
      name: 'ICP Analyzer',
      category: 'intelligence_reports',
      tagline: 'Closed-won intelligence that reveals your real ICP',
      value_prop: 'Upload your closed-won accounts. ICP Analyzer cross-references against pharosIQ\'s intent data to reveal which firmographic, technographic, and behavioral patterns your best customers share. Stop guessing at ICP. Let the data tell you.',
      problem_statement: 'Most companies define their ICP based on gut feel or a handful of deals. They target accounts that "look right" without data to validate. The result: wasted outreach on accounts that will never close.',
      key_stats: [
        { stat: 'Built on 360M+ contact records and 650+ intent categories', source: 'pharosIQ' },
      ],
      features: [
        { name: 'Closed-won pattern matching', description: 'Upload your wins, we find the common signals' },
        { name: 'Intent topic correlation', description: 'Which topics your best customers were researching before they bought' },
        { name: 'Firmographic clustering', description: 'Industry, size, geography, technographic patterns across winners' },
        { name: 'Lookalike identification', description: 'Find new accounts that match your closed-won profile' },
      ],
      benefits: [
        { benefit: 'Data-driven ICP definition replaces gut feel', for_whom: 'Marketing leadership' },
        { benefit: 'Focus outreach budget on accounts with proven fit patterns', for_whom: 'Demand gen teams' },
        { benefit: 'Shorten sales cycle by targeting accounts that look like your winners', for_whom: 'Sales leadership' },
      ],
      use_cases: [
        { title: 'ICP Validation', description: 'Validate or challenge your current ICP definition with actual closed-won data.', persona: 'CMO / VP Marketing' },
        { title: 'New Market Entry', description: 'Expanding to a new vertical? Analyze which of your existing wins map to the new market.', persona: 'Business development' },
        { title: 'ABM List Building', description: 'Generate a target account list based on closed-won lookalike signals.', persona: 'ABM practitioners' },
      ],
      differentiators: [
        { vs_competitor: 'Manual ICP workshops', advantage: 'Data-driven, not opinion-driven. Minutes, not weeks. Repeatable, not one-time.' },
      ],
      pricing_tiers: {
        'Single Report': { price: '$500', unit: '/report', description: 'One ICP analysis based on your closed-won list' },
        'Quarterly': { price: '$1,500', unit: '/quarter', description: 'Quarterly refresh as new deals close' },
      },
      packaging_notes: 'Strong lead magnet. Offer a sample ICP analysis to open conversations with data-savvy buyers.',
      target_personas: [
        { tier: 'Tier 1', persona: 'Marketing leadership at B2B SaaS companies', why_they_buy: 'Data-driven ICP validation' },
        { tier: 'Tier 2', persona: 'ABM practitioners', why_they_buy: 'Lookalike account identification' },
        { tier: 'Tier 3', persona: 'PE portfolio operations', why_they_buy: 'Portfolio-wide ICP analysis across companies' },
      ],
      demo_type: 'icp_analyzer',
      display_order: 5,
    },

    // ================================================================
    // 6. Jobson Title Expansion
    // ================================================================
    {
      slug: 'jobson-title-expansion',
      name: 'Jobson Title Expansion Engine',
      category: 'data_products',
      tagline: 'Your audience lists are missing half the buyers',
      value_prop: 'Feed it one job title, get back every real-world variation across LinkedIn, CRMs, job boards, and 12+ languages. Powered by 360M+ business contacts. Increases matched audience coverage by ~40%.',
      problem_statement: 'LinkedIn only recognizes 55% of job titles on its own platform. When you target "VP of Marketing," you miss 200+ real-world variations. There\'s no broad match, no fuzzy logic. You\'re either in the list or invisible.',
      key_stats: [
        { stat: 'LinkedIn only recognizes 55% of job titles on its platform', source: 'LinkedIn/pharosIQ analysis' },
        { stat: '200+ real-world variations for a single title like "VP of Marketing"', source: 'pharosIQ Jobson' },
        { stat: 'B2B programmatic match rates: 25-55% (40% considered "good")', source: 'Industry research' },
        { stat: '18,400 unique title strings for 900 actual roles at a typical enterprise', source: 'Academic research' },
        { stat: '30%+ annual decay rate for B2B contact data', source: 'Industry research' },
      ],
      features: [
        { name: 'Title expansion API', description: 'One title in, every real-world variation out. REST API, <500ms response.' },
        { name: '12+ language support', description: 'International translations including German, French, Japanese, and more' },
        { name: 'Seniority mapping', description: 'Variations grouped by seniority level (C-suite, VP, Director, Manager, IC)' },
        { name: 'Ground truth data', description: 'Every variation comes from a real person\'s real profile. Not NLP inference.' },
      ],
      benefits: [
        { benefit: '~40% larger matched audiences from the same targeting setup', for_whom: 'Media buyers' },
        { benefit: 'Lower CPL: same budget reaches more actual buyers', for_whom: 'Demand gen agencies' },
        { benefit: 'Higher lead acceptance rates from better title qualification', for_whom: 'Content syndication platforms' },
      ],
      use_cases: [
        { title: 'LinkedIn Audience Expansion', description: 'Expand title-based targeting on LinkedIn to capture 200+ variations per seed title.', persona: 'B2B media buyers' },
        { title: 'Platform Audience Builder', description: 'Embed title expansion into your platform\'s audience building workflow via API.', persona: 'ABM platforms / DSPs' },
        { title: 'Lead Routing Accuracy', description: 'Improve lead acceptance/rejection rates by expanding title matching in routing logic.', persona: 'Content syndication / lead routing' },
      ],
      differentiators: [
        { vs_competitor: 'People Data Labs', advantage: 'PDL returns only 5 matching titles. Jobson returns hundreds of real-world variations.' },
        { vs_competitor: 'Textkernel', advantage: 'Textkernel is HR/recruiting-focused. Jobson is built for B2B marketing audience building.' },
        { vs_competitor: 'Cleanlist', advantage: 'Cleanlist normalizes (collapses) titles. Jobson expands them. Opposite direction. Different use case.' },
      ],
      pricing_tiers: {
        'Annual License': { price: '$50K', unit: '/year', description: 'Full data brick access. Flat file delivery.' },
        'API Access': { price: '$0.01-0.05', unit: '/query', description: 'Per-query pricing with volume tiers' },
        'OEM Embed': { price: '$150K+', unit: '/year', description: 'Unlimited API for platform embedding' },
      },
      packaging_notes: 'This is a data product (title taxonomy), not the contact database. We sell the title variations, not the contacts behind them.',
      target_personas: [
        { tier: 'Tier 1', persona: 'B2B demand gen agencies & media buyers', why_they_buy: 'ROI directly measurable against ad spend. One sale = usage across dozens of client campaigns.' },
        { tier: 'Tier 2', persona: 'ABM platforms & B2B DSPs (OEM/Embed)', why_they_buy: 'Title is a core targeting parameter. They consume clean title data but don\'t produce it.' },
        { tier: 'Tier 3', persona: 'Enterprise marketers', why_they_buy: 'Massive pain for global companies with multi-language targeting needs.' },
        { tier: 'Tier 4', persona: 'Data enrichment / intent data companies', why_they_buy: 'Title accuracy is a known weakness (G2 reviews cite outdated titles).' },
      ],
      demo_type: 'title_expansion',
      display_order: 6,
    },

    // ================================================================
    // 7. SurgeEngine.ai Platform
    // ================================================================
    {
      slug: 'surgeengine-platform',
      name: 'SurgeEngine.ai',
      category: 'platform',
      tagline: 'Self-service intelligence platform powered by pharosIQ data',
      value_prop: 'A self-service web platform where anyone can generate Surge Dossiers, monitor Surge Trending, run Surge Radar, analyze ICPs, and expand titles. Also functions as a lead generation engine: every form submission captures qualification data.',
      problem_statement: 'Buyers want to try before they buy. Enterprise sales cycles are long. SurgeEngine.ai gives prospects immediate value while capturing discovery-call-quality intel on every interaction.',
      key_stats: [
        { stat: 'Every form submission captures: product, competitors, buyer persona, email', source: 'pharosIQ' },
        { stat: '5-question intake generates full Surge Dossier in minutes', source: 'pharosIQ' },
      ],
      features: [
        { name: 'Surge Dossier Generator', description: 'Answer 5 questions, get a complete account intelligence package' },
        { name: 'Surge Trending Dashboard', description: 'See which companies are surging on your topics' },
        { name: 'Surge Radar View', description: 'Monitor what your target accounts are researching' },
        { name: 'ICP Analyzer', description: 'Upload closed-won accounts, get data-driven ICP analysis' },
        { name: 'Title Expansion Demo', description: 'Try the Jobson title expansion engine live' },
        { name: 'Built-in Lead Gen', description: 'Every interaction captures qualification data for pharosIQ sales' },
      ],
      benefits: [
        { benefit: 'Immediate time-to-value for prospects (minutes, not weeks)', for_whom: 'Prospects evaluating pharosIQ' },
        { benefit: 'Pre-qualified leads from every platform interaction', for_whom: 'pharosIQ sales team' },
        { benefit: 'Self-service reduces sales cycle length for smaller deals', for_whom: 'pharosIQ revenue' },
      ],
      use_cases: [
        { title: 'Freemium Lead Magnet', description: '1 free Surge Dossier captures full qualification data.', persona: 'Marketing' },
        { title: 'Self-Service Purchase', description: 'Smaller buyers purchase dossiers directly without sales involvement.', persona: 'Individual contributors' },
        { title: 'Demo Platform', description: 'Sales uses SurgeEngine.ai as the demo environment during calls.', persona: 'pharosIQ sales' },
      ],
      differentiators: [
        { vs_competitor: 'CompanyCompass', advantage: 'Self-service platform, 60-second generation, intent signal integration, scalable vs. manual' },
      ],
      pricing_tiers: {
        'Free': { price: '$0', unit: '', description: '1 free Surge Dossier (lead capture)' },
        'Pay-Per-Report': { price: '$200-500', unit: '/dossier', description: 'Individual dossier purchase' },
        'Monthly': { price: '$1,500', unit: '/month', description: '10 dossiers/month' },
        'Enterprise': { price: '$3,000', unit: '/month', description: '25 dossiers/month + full platform access' },
      },
      packaging_notes: 'Domain: surgeengine.ai (owned). Working MVP is live with 5 report types. Also serves as deal room demo platform.',
      target_personas: [
        { tier: 'Tier 1', persona: 'Mid-market sales teams (50-200 reps)', why_they_buy: 'No internal research teams. Need account intel on demand.' },
        { tier: 'Tier 2', persona: 'PE/VC portfolio companies', why_they_buy: 'Portfolio-wide rollout. One fund drives 10-20 subscriptions.' },
        { tier: 'Tier 3', persona: 'Outbound agencies', why_they_buy: 'Research is their biggest cost. Dossiers beat hiring researchers.' },
      ],
      demo_type: null,
      display_order: 7,
    },

    // ================================================================
    // 8. Audience Intelligence Dashboard
    // ================================================================
    {
      slug: 'audience-dashboard',
      name: 'Audience Intelligence Dashboard',
      category: 'platform',
      tagline: 'Interactive data asset visualization for DaaS prospects',
      value_prop: 'An interactive dashboard that visualizes pharosIQ\'s data universe: 125M+ audience contacts, 349M+ intent signals, broken down by vertical, geography, seniority, and intent topic. Used in sales demos to prove data depth and breadth.',
      problem_statement: 'Prospects ask "how big is your data?" and "do you have coverage in my vertical?" A spreadsheet doesn\'t sell. An interactive dashboard with filters, charts, and a query builder does.',
      key_stats: [
        { stat: '125.3M total audience contacts', source: 'pharosIQ Audience Dashboard' },
        { stat: '348.9M total intent signals (last 90 days)', source: 'pharosIQ Audience Dashboard' },
        { stat: '7,879 unique intent topics tracked', source: 'pharosIQ Audience Dashboard' },
      ],
      features: [
        { name: 'Overview Dashboard', description: 'KPI cards, vertical distribution, regional breakdown' },
        { name: 'Vertical Deep Dive', description: 'IT, Sales, Healthcare, Finance, Executive Mgmt breakdowns with sub-verticals' },
        { name: 'Geography View', description: 'NAMER, EMEA, APAC, LATAM audience and signal coverage' },
        { name: 'Intent Signal Explorer', description: 'Search and filter 7,879+ intent topics' },
        { name: 'Query Builder', description: 'Filter by vertical, sub-vertical, seniority. See filtered audience counts.' },
        { name: 'Data Dictionary', description: '5 dataset schemas with field-level descriptions' },
        { name: 'PDF Report Generator', description: 'Export filtered views as print-ready reports' },
      ],
      benefits: [
        { benefit: 'Proves data depth and breadth visually during sales demos', for_whom: 'pharosIQ sales' },
        { benefit: 'Self-service exploration for technical buyers evaluating data quality', for_whom: 'Data/analytics buyers' },
        { benefit: 'Takeaway asset after demo (shareable link)', for_whom: 'Sales enablement' },
      ],
      use_cases: [
        { title: 'Sales Demo', description: 'Walk prospects through the data universe interactively. Filter to their vertical and show relevant coverage.', persona: 'pharosIQ sales' },
        { title: 'Deal Room Embed', description: 'Embedded in customer deal rooms as proof of data quality.', persona: 'Prospects' },
        { title: 'Conference Booth', description: 'Run on a screen at trade shows. Interactive, draws people in.', persona: 'Marketing / events' },
      ],
      differentiators: [
        { vs_competitor: 'Static data sheets', advantage: 'Interactive, filterable, explorable. Not a PDF.' },
      ],
      pricing_tiers: {
        'Included': { price: '$0', unit: '', description: 'Included as sales asset. Not sold separately.' },
      },
      packaging_notes: 'Internal sales tool, not a standalone product. Embedded in deal rooms via iframe.',
      target_personas: [
        { tier: 'Internal', persona: 'pharosIQ sales team', why_they_buy: 'Demo tool for every DaaS conversation' },
      ],
      demo_type: 'audience_dashboard',
      display_order: 8,
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const userId = getUserId();

  console.log(`\n🚀 Seeding GTM Products`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const products = buildProducts();

  if (isDryRun) {
    console.log(`Would insert ${products.length} products:\n`);
    for (const p of products) {
      console.log(`  ${p.display_order}. ${p.name} (${p.slug}) — ${p.category}`);
      console.log(`     ${p.features.length} features, ${p.use_cases.length} use cases, ${Object.keys(p.pricing_tiers).length} pricing tiers`);
      console.log(`     ${p.target_personas.length} target personas, ${p.differentiators.length} battle cards`);
      console.log(`     Demo: ${p.demo_type || 'none'}\n`);
    }
    console.log('✅ Dry run complete. No data written.');
    return;
  }

  const supabase = getAdminClient();

  // Upsert products (idempotent by slug)
  for (const product of products) {
    const record = {
      user_id: userId,
      slug: product.slug,
      name: product.name,
      category: product.category,
      tagline: product.tagline,
      value_prop: product.value_prop,
      problem_statement: product.problem_statement,
      key_stats: product.key_stats,
      features: product.features,
      benefits: product.benefits,
      use_cases: product.use_cases,
      differentiators: product.differentiators,
      pricing_tiers: product.pricing_tiers,
      packaging_notes: product.packaging_notes,
      target_personas: product.target_personas,
      demo_type: product.demo_type,
      demo_config: {},
      api_schema: {},
      data_dictionary: [],
      sample_output: {},
      linkedin_posts: [],
      outreach_sequences: [],
      battle_cards: [],
      is_active: true,
      display_order: product.display_order,
    };

    const { error } = await supabase
      .from('gtm_products')
      .upsert(record, { onConflict: 'user_id,slug' });

    if (error) {
      console.error(`❌ Failed to upsert ${product.name}:`, error.message);
    } else {
      console.log(`✅ ${product.name} (${product.slug})`);
    }
  }

  console.log(`\n🎉 Done! ${products.length} products seeded.\n`);
}

main().catch(console.error);
