/**
 * Seed script: GTM Company Profiles & Product Recommendations
 *
 * Populates gtm_company_profiles and gtm_product_recommendations
 * from existing target account lists in docs/.
 *
 * Sources:
 * - docs/jobson-gtm-playbook.md (Jobson target accounts)
 * - docs/jobson-outreach-sequences.md (OEM/platform targets)
 * - docs/contact-level-intent-outreach-sequences.md (person-level ad/ABM targets)
 * - Earlier conversation: demand gen agency outreach list (45 agencies)
 *
 * Usage:
 *   npx tsx scripts/seed-gtm-companies.ts
 *   npx tsx scripts/seed-gtm-companies.ts --user-id <uuid>
 *   npx tsx scripts/seed-gtm-companies.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompanySeed {
  slug: string;
  name: string;
  description: string;
  hq_location?: string;
  employee_count?: string;
  annual_revenue?: string;
  website?: string;
  why_they_need_us: string;
  recent_news?: string;
  company_tier: string;
  contacts: { name: string; title: string; linkedin?: string; why_this_person?: string }[];
  tags: string[];
  // Product recommendations (by product slug)
  recommendations: {
    product_slug: string;
    fit_strength: string;
    custom_angle: string;
    suggested_tier?: string;
  }[];
}

// ---------------------------------------------------------------------------
// Company Data
// ---------------------------------------------------------------------------

function buildCompanies(): CompanySeed[] {
  return [
    // ================================================================
    // TIER 1: Platform Partners (OEM/Embed) — $200K-$2M ACV
    // ================================================================
    {
      slug: 'demandscience',
      name: 'DemandScience',
      description: 'PE-backed (Audax) demand gen and data company. Absorbed Terminus (Nov 2024), DemandJump, Bound. Runs title-qualified lead gen at massive scale. 70M+ contacts.',
      hq_location: 'Hingham, MA',
      annual_revenue: '$145M (record)',
      why_they_need_us: 'Already resells intent. First-party persona + intent signals are a competitive upgrade over co-op. New CEO from ZoomInfo understands data product value.',
      recent_news: 'Derek Schoettle (ex-ZoomInfo) named CEO. 9 acquisitions, 3 new products launched Jan 2026.',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Derek Schoettle', title: 'CEO', why_this_person: 'Ex-ZoomInfo. Understands data product value. Decision maker.' },
        { name: 'Rich Howarth', title: 'CTO (ex-Terminus CEO)', why_this_person: 'Technical evaluation path.' },
        { name: 'Ned Leutz', title: 'President (ex-ZoomInfo)', why_this_person: 'Revenue-side decision maker.' },
      ],
      tags: ['pe_backed', 'content_syndication', 'intent_data', 'new_ceo', 'acquisitive'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'They already resell intent. pharosIQ\'s first-party signals upgrade their co-op dependency. PE backing means budget exists.', suggested_tier: 'Premium OEM' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Title-qualified lead gen at scale. Better title taxonomy = higher lead acceptance rates.', suggested_tier: 'OEM Embed' },
      ],
    },
    {
      slug: 'anteriad',
      name: 'Anteriad',
      description: 'Global B2B data + demand gen leader. Forrester Strong Performer for Marketing & Sales Data Providers Q1 2026. Content syndication, ABM, data solutions across NA, EMEA, APAC.',
      hq_location: 'Ewing, NJ',
      why_they_need_us: '25+ years in B2B data. Multi-regional coverage. Would understand the value of first-party intent immediately.',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Rob Sanchez', title: 'CEO (25+ year tenure)', why_this_person: 'Inc. 5000 entrepreneur, one of the data industry\'s most tenured experts.' },
      ],
      tags: ['data_company', 'content_syndication', 'global', 'forrester_recognized'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Data company that would understand first-party intent value immediately. Global coverage aligns with their multi-regional reach.', suggested_tier: 'Premium OEM' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'moderate', custom_angle: 'Title accuracy for content syndication lead qualification.', suggested_tier: 'Annual License' },
      ],
    },
    {
      slug: 'demandbase',
      name: 'Demandbase',
      description: 'ABM platform leader. Buying Groups AI auto-builds committees from 150M contacts. Forrester Leader 2026.',
      why_they_need_us: 'Buying Groups AI needs more contacts (150M vs. 360M+). Title expansion fills gaps their AI can\'t see. First-party intent differentiates from co-op reliance.',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Vanessa Willett', title: 'VP of Ecosystems', why_this_person: 'Runs data partnerships. Announced Informa TechTarget integration. This is her job.' },
        { name: 'Rachel Truair', title: 'CMO', why_this_person: 'Product marketing angle for positioning data enhancements.' },
      ],
      tags: ['abm_platform', 'buying_groups', 'forrester_leader', 'data_partnerships'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'First-party intent differentiates from competitors relying on Bombora co-op. Persona-level precision improves Buying Groups AI.', suggested_tier: 'Enterprise Platform' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: '150M contacts vs 360M+. Title expansion fills buying committee gaps their AI surfaces but can\'t resolve.', suggested_tier: 'OEM Embed' },
      ],
    },
    {
      slug: 'madison-logic',
      name: 'Madison Logic',
      description: 'Global ABM platform + content syndication. Named Top ABM Leader. Content syndication, display, social across NA, EMEA, APAC.',
      hq_location: 'NYC',
      why_they_need_us: 'Intent data from pharosIQ complements their own data assets. Global coverage for multi-region campaigns.',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Tom O\'Regan', title: 'CEO', why_this_person: 'Pioneer of ad tech and intent data. Led Madison Logic\'s global expansion.' },
      ],
      tags: ['abm_platform', 'content_syndication', 'global', 'intent_data'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Global ABM platform. pharosIQ\'s persona-level signals complement their account-level data.', suggested_tier: 'Premium OEM' },
      ],
    },
    {
      slug: 'stackadapt',
      name: 'StackAdapt',
      description: 'Fastest-growing B2B DSP. Title + seniority are core targeting params in their Data Hub. Multi-channel: native, display, CTV, audio. Positioning as "marketing orchestration platform."',
      hq_location: 'Toronto, Canada',
      employee_count: '800+',
      why_they_need_us: 'Signed Experian data partnership Feb 2026, actively buying data for match rate improvements. Title expansion fills the gap between knowing accounts and reaching the right people.',
      recent_news: 'Expanded ABM ecosystem with Bombora, Lead Forensics, Leadspace integrations (Nov 2025). Experian identity resolution partnership (Feb 2026).',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Michael Shang', title: 'SVP Advertising Technologies', why_this_person: 'Oversees data and technology strategy.' },
        { name: 'Becky Tasker', title: 'VP Growth', why_this_person: 'Confirmed via web search, owns growth strategy.' },
      ],
      tags: ['dsp', 'programmatic', 'data_partnerships', 'abm', 'fast_growing'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Jobson fills the gap between Bombora (intent) and Experian (ID resolution). Title expansion makes their B2B audience builder reach 40% more buyers.', suggested_tier: 'OEM Embed' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'First-party persona signals complement Bombora\'s account-level data in their Data Hub.', suggested_tier: 'Standard OEM' },
      ],
    },
    {
      slug: '6sense',
      name: '6sense',
      description: 'Revenue AI platform. No dedicated buying group product. Account-level intent only. Biggest contact-level gap in the market. New CEO looking for quick wins.',
      why_they_need_us: 'Valuation crashed from $5.2B to ~$906M. New CEO (Chris Ball, ex-Instructure) needs quick wins. Persona-level intent fills their biggest product gap.',
      company_tier: 'tier_1',
      contacts: [
        { name: 'Chris Ball', title: 'CEO (ex-Instructure)', why_this_person: 'New CEO with fresh strategic priorities.' },
        { name: 'Tim O\'Neil', title: 'CSO (ex-ThoughtSpot/Alation)', why_this_person: 'Revenue-side decision maker.' },
      ],
      tags: ['abm_platform', 'new_ceo', 'valuation_decline', 'account_level_only_restriction'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Biggest persona-level gap in the market. NOTE: Restricted to account-level data only per target account restrictions (data leakage risk).', suggested_tier: 'Standard OEM' },
      ],
    },

    // ================================================================
    // TIER 2: Person-Level Ad Platforms & ABM Tools
    // ================================================================
    {
      slug: 'influ2',
      name: 'Influ2',
      description: 'Targets named individuals with ads. Only as good as the contact list they\'re given. Title accuracy IS their product quality. Forrester Challenger.',
      employee_count: '~50',
      why_they_need_us: 'Their product literally targets named individuals. Title expansion = direct product quality improvement. Persona-level intent tells their customers which individuals to target.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Dmitri Lisitski', title: 'CEO & Co-Founder', why_this_person: 'Small team, CEO is accessible. Columbia/LBS MBA. Understands data partnerships.' },
        { name: 'Joe McNeill', title: 'CRO', why_this_person: 'Revenue-side evaluation.' },
      ],
      tags: ['person_level_ads', 'forrester_challenger', 'small_team', 'accessible_ceo'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Their product targets named individuals. Title accuracy IS their product quality. 200+ variations per title = larger, more accurate audiences.', suggested_tier: 'OEM Embed' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Persona-level intent tells their customers which individuals at surging accounts to target. Perfect fit for person-level ad delivery.', suggested_tier: 'Standard OEM' },
      ],
    },
    {
      slug: 'metadata-io',
      name: 'Metadata.io',
      description: 'Automated B2B campaign engine. Patented MetaMatch identity graph for audience building. Launching AI agents (Feb 2025). Title is THE primary targeting lever.',
      why_they_need_us: 'Title is their primary targeting lever. MetaMatch can only match against titles it recognizes. 55% LinkedIn recognition rate limits their audience coverage.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Gil Allouche', title: 'CEO & Co-Founder', why_this_person: 'Accessible founder. $58M+ raised. 4 patents in ad targeting. Clients: Zoom, Okta, ThoughtSpot.' },
      ],
      tags: ['campaign_automation', 'identity_graph', 'ai_agents', 'accessible_founder'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'MetaMatch identity graph + Jobson title expansion = larger audiences with the same targeting setup. AI agents could auto-expand personas before campaign launch.', suggested_tier: 'OEM Embed' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Persona-level intent layered into MetaMatch improves which contacts get prioritized for campaign targeting.' },
      ],
    },
    {
      slug: 'clay',
      name: 'Clay',
      description: 'Data orchestration platform chaining 75+ enrichment providers. Clay Ads launched: 60-70% match rates on Meta for B2B. $1.25B valuation.',
      why_they_need_us: 'Clay enriches existing contacts but doesn\'t discover new ones. pharosIQ\'s 360M+ contacts = bigger starting pool. Title expansion adds value to their audience building.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Varun Anand', title: 'Co-Founder & Head of Ops', why_this_person: 'COO path for data partnerships.' },
        { name: 'Kareem Amin', title: 'CEO & Co-Founder', why_this_person: 'Top-level decision maker.' },
      ],
      tags: ['data_orchestration', 'enrichment', 'clay_ads', 'high_valuation', 'fast_growing'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Native integration reaches thousands of sales teams. High-leverage distribution. Intent signals as a Clay enrichment step.', suggested_tier: 'Standard OEM' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'moderate', custom_angle: 'Title expansion as a Clay enrichment waterfall step. Expand titles before audience building.' },
      ],
    },
    {
      slug: 'hockeystack',
      name: 'HockeyStack',
      description: 'Evolving from attribution into unified GTM operating system. Launching AI agents + execution layer in 2026. Persona mapping depends on title accuracy.',
      why_they_need_us: 'Revenue attribution depends on accurate persona mapping. His own co-founder said "GTM teams have a data problem, not a tooling problem."',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Emir Atli', title: 'Co-Founder & CRO', why_this_person: '$22.7M raised (Bessemer-led Series A). Fast-growing. Accessible founder.' },
      ],
      tags: ['attribution', 'gtm_platform', 'ai_agents', 'bessemer_backed', 'fast_growing'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Persona mapping for attribution requires title accuracy. "GTM teams have a data problem, not a tooling problem" — his own co-founder\'s quote.', suggested_tier: 'API Access' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Intent signals as leading indicators for their revenue forecasting and attribution models.' },
      ],
    },

    // ================================================================
    // TIER 2: Demand Gen Agencies (from today's research)
    // ================================================================
    {
      slug: 'directive',
      name: 'Directive Consulting',
      description: 'B2B performance marketing for SaaS. "Customer Generation" methodology. 150+ person agency across NA, LATAM, Europe. Acquired Content Harmony.',
      hq_location: 'Irvine, CA',
      employee_count: '150+',
      why_they_need_us: 'Customer Generation model needs intent data to identify in-market accounts for paid campaigns. Data-driven culture. High-profile clients.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Garrett Mehrguth', title: 'CEO & Co-Founder', why_this_person: 'Loud in the market. A reference customer here signals credibility. Clients: Adobe, Amazon, Cisco.' },
      ],
      tags: ['demand_gen_agency', 'saas_focused', 'performance_marketing', 'global'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Customer Generation model needs persona + intent signals to identify in-market accounts. Intent data makes their paid campaigns smarter.', suggested_tier: 'Standard OEM' },
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly surge reports prove targeting precision to their SaaS clients. Retention play.' },
      ],
    },
    {
      slug: 'belkins',
      name: 'Belkins',
      description: 'Massive outbound operation. Appointment setting at scale. Known for high-volume B2B lead gen.',
      hq_location: 'Dover, DE',
      why_they_need_us: 'Massive volume. Small improvement in targeting = big impact. Persona + intent layering would differentiate them from every other cold email shop.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Vlad Podoliako', title: 'Founder & CEO', why_this_person: 'Founder. Decision maker. Built the outbound machine.' },
      ],
      tags: ['demand_gen_agency', 'outbound', 'appointment_setting', 'high_volume'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Massive outbound operation. Intent signals tell their reps which accounts are actively evaluating. Higher connect and conversion rates.' },
        { product_slug: 'surge-trending', fit_strength: 'strong', custom_angle: 'Weekly surge lists for their SDR teams to prioritize outreach. Direct ROI on every campaign.' },
      ],
    },
    {
      slug: 'martal-group',
      name: 'Martal Group',
      description: 'Competitor conquest model. Outsourced SDR for B2B tech. Watches for churn signals and pricing friction, then positions alternatives.',
      hq_location: 'Oakville, ON',
      why_they_need_us: 'Competitor conquest approach is a perfect intent data use case. Intent signals show which accounts are researching alternatives.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Vito Vishnepolsky', title: 'Founder & CEO', why_this_person: 'Founded Martal in 2009. 14 years building sales teams for tech vendors.' },
      ],
      tags: ['demand_gen_agency', 'competitor_conquest', 'outsourced_sdr', 'tech_focused'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'Competitor conquest model is supercharged with intent data showing which accounts are researching alternatives. Perfect fit.' },
        { product_slug: 'surge-radar', fit_strength: 'strong', custom_angle: 'Monitor target accounts for competitor category surges. Catch churn signals early. This IS their business model.' },
      ],
    },
    {
      slug: 'cience',
      name: 'CIENCE',
      description: 'AI prospecting + human qualification. 3,000 employees. Blends AI with human SDR qualification for 50% more sales-ready leads.',
      hq_location: 'Denver, CO',
      employee_count: '3,000',
      why_they_need_us: 'Scale buyer. Their AI prospecting platform needs better signal inputs. Persona + intent data improves their lead scoring and qualification.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'James Dobbs', title: 'CEO', why_this_person: 'Decision maker at scale.' },
      ],
      tags: ['demand_gen_agency', 'ai_prospecting', 'large_team', 'sdr_outsourcing'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: '3,000 employees. Their AI prospecting platform needs better signal inputs. Persona + intent data is the intelligence layer their AI needs.' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'moderate', custom_angle: 'At their scale, title accuracy improvements compound across thousands of campaigns.' },
      ],
    },
    {
      slug: 'refine-labs',
      name: 'Refine Labs',
      description: 'Demand creation strategy. Shifted from Chris Walker\'s founder-led to Megan Bowen as CEO/owner. Built around demand creation rather than demand capture.',
      hq_location: 'Boston, MA',
      why_they_need_us: 'Intent signals validate their "dark funnel" thesis. Persona-level data shows which roles engage with brand content before entering the pipeline.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Megan Bowen', title: 'CEO & Owner', why_this_person: 'Took over from Chris Walker. Running the business. Decision maker.' },
      ],
      tags: ['demand_gen_agency', 'demand_creation', 'thought_leadership', 'dark_funnel'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Intent signals validate their "dark funnel" thesis. Persona data shows which roles engage before pipeline entry.' },
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly evidence of which accounts are responding to demand creation efforts.' },
      ],
    },
    {
      slug: 'abstrakt-marketing',
      name: 'Abstrakt Marketing Group',
      description: 'Full-service B2B lead gen agency. SDR outsourcing, digital marketing, creative. $180M annual revenue.',
      hq_location: 'St. Louis, MO',
      annual_revenue: '$180M',
      why_they_need_us: 'At this scale ($180M revenue), they need data differentiation. Intent signals improve every SDR campaign they run.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Scott Scully', title: 'CEO & Founder', why_this_person: '30-year marketing professional. Built Abstrakt from scratch. Enterprise buyer.' },
      ],
      tags: ['demand_gen_agency', 'sdr_outsourcing', 'large_revenue', 'full_service'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: '$180M revenue agency. At this scale, small targeting improvements compound into millions in client value.' },
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly surge reports for their SDR teams across dozens of client campaigns.' },
      ],
    },

    // ================================================================
    // TIER 3: Content Syndication & ABM Agencies
    // ================================================================
    {
      slug: 'vereigen-media',
      name: 'Vereigen Media',
      description: 'US-based B2B content syndication agency. Proprietary Verified Content Engagement (VCE) methodology. 200+ data experts.',
      why_they_need_us: '"Verified Content Engagement" methodology is philosophically aligned with first-party data. Supports hundreds of global B2B brands.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Anuj Pakhare', title: 'Founder & CEO', why_this_person: 'Founded the company. Decision maker.' },
        { name: 'Ameya Pawar', title: 'Co-Founder & COO', why_this_person: 'Operations lead for data partnerships.' },
      ],
      tags: ['content_syndication', 'verified_engagement', 'data_focused'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'strong', custom_angle: 'VCE methodology aligns with first-party intent philosophy. Persona signals improve their content targeting precision.' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'moderate', custom_angle: 'Title accuracy for persona-qualified lead delivery.' },
      ],
    },
    {
      slug: 'pipeline360',
      name: 'Pipeline360 (Integrate)',
      description: 'Content syndication + display for B2B. Lead routing marketplace. PE-backed by Audax. New CEO Mehul Nagrani (Jan 2025).',
      why_they_need_us: 'Lead routing depends on title validation. Title expansion improves lead acceptance/rejection accuracy. New CEO = fresh data strategy.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Mehul Nagrani', title: 'CEO', why_this_person: 'New CEO (Jan 2025) after Jeremy Bloom stepped down. Fresh strategic priorities.' },
        { name: 'Tony Uphoff', title: 'Exec (prominent B2BMX speaker)', why_this_person: 'B2B media veteran. Industry relationships.' },
      ],
      tags: ['content_syndication', 'lead_routing', 'pe_backed', 'new_ceo', 'lead_routing_only'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Lead routing depends on title matching. Expanding title taxonomy improves acceptance rates without changing buyer specs.', suggested_tier: 'OEM Embed' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Intent signals layered into their marketplace improve lead quality for both supply and demand sides.' },
      ],
    },
    {
      slug: 'ironpaper',
      name: 'Ironpaper',
      description: 'NYC B2B growth agency. ABM + demand gen for mid-market SaaS/tech. Founded 2003.',
      hq_location: 'NYC',
      why_they_need_us: 'Founder-led, ABM-focused, fast decision-maker. Persona + intent data improves their account targeting.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Jonathan Franchell', title: 'Founder & CEO', why_this_person: 'Founded 2003. Deep ABM expertise. Small enough that CEO makes buying decisions.' },
      ],
      tags: ['abm_agency', 'demand_gen_agency', 'nyc', 'founder_led', 'mid_market'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'ABM-focused agency. Persona + intent signals improve their account-level targeting for mid-market SaaS clients.' },
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly surge reports for ABM campaign planning and client reporting.' },
      ],
    },
    {
      slug: 'inbox-insight',
      name: 'Inbox Insight',
      description: 'UK-based B2B demand gen. Content syndication, ABM, intent-driven campaigns across EMEA and NA. $25.5M Mobeus-backed MBO in 2022.',
      hq_location: 'Winchester, UK',
      why_they_need_us: 'UK base, growing US presence. First-party intent data differentiates in EMEA market. Multi-market campaigns where title conventions vary by region/language.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Jamie Hendrie', title: 'Founder & CEO', why_this_person: 'Founded in 2010. CEO.' },
        { name: 'Aaron Bailey', title: 'CEO North America', why_this_person: 'US expansion lead.' },
      ],
      tags: ['content_syndication', 'demand_gen_agency', 'uk', 'emea', 'pe_backed'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'First-party intent differentiates their EMEA offering. Multi-language persona signals for cross-border campaigns.' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Multi-market campaigns where title conventions vary by region/language. 12+ language support is directly relevant.' },
      ],
    },
    {
      slug: 'demanddrive',
      name: 'demandDrive',
      description: 'Outsourced SDR and sales dev agency. Helps B2B tech clients build and manage sales development teams.',
      hq_location: 'Boston, MA',
      why_they_need_us: 'Their SDR teams need better targeting signals. Intent data = higher connect rates for their reps.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Lindsay Frey', title: 'CEO & Co-Founder', why_this_person: 'Co-founded in 2011 with Dan Paul. Nearly two decades in tech consulting.' },
      ],
      tags: ['demand_gen_agency', 'outsourced_sdr', 'boston', 'b2b_tech'],
      recommendations: [
        { product_slug: 'surge-trending', fit_strength: 'strong', custom_angle: 'Weekly surge lists for their SDR teams to prioritize outreach. Direct ROI on connect rates.' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Intent signals improve targeting for their outsourced SDR campaigns.' },
      ],
    },

    // ================================================================
    // TIER 2: OEM Platform Targets (from Jobson playbook)
    // ================================================================
    {
      slug: 'nextroll',
      name: 'NextRoll (AdRoll ABM)',
      description: 'ABM + B2B display DSP. Title is core ad targeting dimension. Rebranded from RollWorks. Brand new CEO Vibhor Kapoor (Feb 2026).',
      why_they_need_us: 'New CEO from Adobe/Box/Microsoft. Title expansion in their audience builder improves campaign performance. Fresh strategic priorities.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Vibhor Kapoor', title: 'CEO (Feb 2026, ex-Adobe/Box/Microsoft)', why_this_person: 'Brand new CEO. 30 years industry experience. Fresh strategic priorities = open to new partnerships.' },
        { name: 'Mihir Nanavati', title: 'President, AdRoll ABM', why_this_person: 'ABM-specific product decisions.' },
      ],
      tags: ['dsp', 'abm_platform', 'new_ceo', 'b2b_advertising'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'Title is core targeting dimension. New CEO = window for data partnerships that improve product performance.', suggested_tier: 'OEM Embed' },
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Persona-level intent signals enhance their ABM targeting beyond existing ad-based signals.' },
      ],
    },
    {
      slug: 'leadspace',
      name: 'Leadspace',
      description: 'B2B CDP. Title normalization is core to data unification and lead scoring. $46M funding (JVP-backed). New CEO Eric Presbrey (Apr 2025).',
      why_they_need_us: 'Title normalization is core to what they do. But normalization and expansion are different problems. Jobson adds expansion capability they don\'t have.',
      company_tier: 'tier_2',
      contacts: [
        { name: 'Eric Presbrey', title: 'CEO (Apr 2025, ex-PebblePost/Centrical)', why_this_person: 'New CEO = window to pitch data partnership. Already a StackAdapt data partner (Nov 2025) — warm intro path.' },
      ],
      tags: ['cdp', 'data_unification', 'lead_scoring', 'new_ceo', 'stackadapt_partner'],
      recommendations: [
        { product_slug: 'jobson-title-expansion', fit_strength: 'strong', custom_angle: 'They normalize (collapse) titles. Jobson expands them. Complementary, not competitive. Differentiating feature for their CDP.', suggested_tier: 'OEM Embed' },
      ],
    },

    // ================================================================
    // More agencies from the research
    // ================================================================
    {
      slug: 'salesbread',
      name: 'SalesBread',
      description: 'LinkedIn lead gen, "1 lead per day" model. Boutique, quality-focused. Founded 2014.',
      why_they_need_us: 'Small-list, high-conversion model aligns perfectly with intent signals. Quality over volume.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Jack Reamer', title: 'Founder & CEO', why_this_person: 'Known as the B2B matchmaker. Background in copywriting, B2B sales.' },
      ],
      tags: ['demand_gen_agency', 'linkedin', 'boutique', 'quality_focused'],
      recommendations: [
        { product_slug: 'surge-trending', fit_strength: 'strong', custom_angle: 'Small-list, high-conversion model. Intent signals tell them exactly which accounts to target. Perfect alignment.' },
      ],
    },
    {
      slug: 'operatix',
      name: 'Operatix (memoryBlue)',
      description: 'SDR for B2B software vendors. Acquired by memoryBlue. Global offices: London, Dallas, San Jose, Singapore.',
      hq_location: 'London / Dallas',
      why_they_need_us: 'Global SDR operation needs intent signals for market entry campaigns. Title expansion across languages for international outreach.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Aurelien Mottier', title: 'CEO & Co-Founder', why_this_person: 'Founded Operatix in 2012. Now meaningful leadership role in combined company.' },
      ],
      tags: ['demand_gen_agency', 'outsourced_sdr', 'global', 'b2b_software', 'acquired'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Global SDR operation. Intent signals improve targeting across NA, EMEA, APAC, LATAM markets.' },
        { product_slug: 'jobson-title-expansion', fit_strength: 'moderate', custom_angle: 'Multi-language title expansion for their international market entry campaigns.' },
      ],
    },
    {
      slug: 'televerde',
      name: 'Televerde',
      description: 'B2B demand gen + lead qualification at scale. Unique social impact workforce model.',
      hq_location: 'Phoenix, AZ',
      why_they_need_us: 'Qualifies thousands of leads monthly by title/seniority. Intent data improves the quality of every call.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Morag Lucey', title: 'CEO', why_this_person: 'First learned of Televerde as a customer before joining. Enterprise relationships.' },
      ],
      tags: ['demand_gen_agency', 'lead_qualification', 'social_impact', 'enterprise_clients'],
      recommendations: [
        { product_slug: 'daas-signal-licensing', fit_strength: 'moderate', custom_angle: 'Enterprise clients. Intent data improves the quality of every call their team makes.' },
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly surge reports for lead prioritization across their call center operations.' },
      ],
    },
    {
      slug: 'tripledart',
      name: 'TripleDart',
      description: 'SaaS demand gen agency. Paid + SEO. Founded by Shiyam Sunder (ex-Remote.com, Freshworks). 50+ SaaS clients.',
      hq_location: 'Bengaluru / Remote',
      why_they_need_us: 'Intent data adds a new service line for their SaaS clients. 50+ client base means distribution.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Shiyam Sunder', title: 'Founder', why_this_person: '9+ years B2B SaaS demand gen. Helped 50+ companies optimize acquisition.' },
      ],
      tags: ['demand_gen_agency', 'saas_focused', 'paid_media', 'seo'],
      recommendations: [
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'Weekly surge data for their 50+ SaaS clients. Adds a new data-driven service line.' },
      ],
    },
    {
      slug: 'single-grain',
      name: 'Single Grain',
      description: 'ROI-focused digital marketing agency. CEO Eric Siu (high-profile podcaster, content creator). SaaS, ecommerce, B2B.',
      hq_location: 'Los Angeles',
      why_they_need_us: 'High-profile founder. If he endorses intent data, it signals the market. Influence play.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Eric Siu', title: 'CEO', why_this_person: 'High-profile founder with large audience. Endorsement = market signal.' },
      ],
      tags: ['demand_gen_agency', 'influencer_ceo', 'roi_focused', 'content_marketing'],
      recommendations: [
        { product_slug: 'surge-trending', fit_strength: 'moderate', custom_angle: 'If Eric Siu endorses intent data as a demand gen input, it signals the market. Influence play as much as revenue.' },
      ],
    },
    {
      slug: 'cleverly',
      name: 'Cleverly',
      description: 'LinkedIn-focused lead gen agency. 1,000+ five-star reviews. Multi-channel system refined across thousands of campaigns.',
      hq_location: 'Los Angeles',
      why_they_need_us: 'LinkedIn-only play. Intent data tells them when to hit which accounts on LinkedIn. Timing is everything.',
      company_tier: 'tier_3',
      contacts: [
        { name: 'Nicholas Verity', title: 'Co-Founder', why_this_person: 'Co-founded Cleverly. Runs operations.' },
      ],
      tags: ['demand_gen_agency', 'linkedin', 'high_reviews', 'multi_channel'],
      recommendations: [
        { product_slug: 'surge-trending', fit_strength: 'strong', custom_angle: 'LinkedIn-only play. Intent data tells them WHEN to hit which accounts on LinkedIn. Timing = conversion.' },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const userId = getUserId();

  console.log(`\n🚀 Seeding GTM Companies & Product Recommendations`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN' : 'LIVE'}\n`);

  const companies = buildCompanies();

  if (isDryRun) {
    const tierCounts: Record<string, number> = {};
    let totalRecs = 0;

    for (const c of companies) {
      tierCounts[c.company_tier] = (tierCounts[c.company_tier] || 0) + 1;
      totalRecs += c.recommendations.length;
      console.log(`  ${c.name} (${c.slug}) — ${c.company_tier} — ${c.contacts.length} contacts, ${c.recommendations.length} product recs`);
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

  // First, load product IDs by slug for recommendations
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

  for (const company of companies) {
    // Upsert company
    const companyRecord = {
      user_id: userId,
      slug: company.slug,
      name: company.name,
      description: company.description,
      hq_location: company.hq_location || null,
      employee_count: company.employee_count || null,
      annual_revenue: company.annual_revenue || null,
      website: company.website || null,
      why_they_need_us: company.why_they_need_us,
      recent_news: company.recent_news || null,
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
      }
    }
  }

  console.log(`\n🎉 Done! ${companies.length} companies seeded.\n`);
}

main().catch(console.error);
