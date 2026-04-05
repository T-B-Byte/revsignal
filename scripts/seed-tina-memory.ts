/**
 * Seed script: Tina's Memory
 *
 * Populates the Strategist's context layer with everything learned from
 * Week 1 meetings (Ben Luck, Ben Lefkowitz, Chris Vriavas, Tim Ribich,
 * Marty Fettig) plus Tina's voice rules and working preferences.
 *
 * This is what makes the Strategist as smart as Claude Code.
 *
 * Populates:
 *   - `stakeholders` (updated with rich detail from meetings)
 *   - `strategic_notes` (institutional context, competitive intel,
 *     political dynamics, voice rules, data asset knowledge)
 *
 * Usage:
 *   npx tsx scripts/seed-tina-memory.ts
 *   npx tsx scripts/seed-tina-memory.ts --user-id <uuid>
 *   npx tsx scripts/seed-tina-memory.ts --dry-run
 */

import { getAdminClient, getUserId } from "./lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StakeholderSeed {
  name: string;
  role: string;
  organization: string;
  is_internal: boolean;
  relationship: string;
  communication_style: string | null;
  sensitivities: string | null;
  motivations: string | null;
  influence_level: number;
  notes: string | null;
  tags: string[];
}

interface NoteSeed {
  category: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Stakeholder data (from Week 1 meetings)
// ---------------------------------------------------------------------------

function buildStakeholders(): StakeholderSeed[] {
  return [
    {
      name: "Jeff Rokuskie",
      role: "CEO",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "sponsor",
      communication_style:
        "Direct, concise. Finance background. Lead with revenue math and valuation impact. Don't explain valuation multiples to him (he already knows). Prefers executive summaries with numbers.",
      sensitivities:
        "TA Associates owns 49%, likely 12-18 month exit window. Everything Tina builds needs to increase the company's valuation multiple. Speed-to-revenue matters. Don't reference the exit timeline in writing.",
      motivations:
        "Wants pharosIQ to be a martech company, not a lead gen company. Lead gen trades at 2-4x; martech at 6-12x+. Brought Tina in specifically to build DaaS revenue line. Wants to show a credible, growing DaaS line for acquirers.",
      influence_level: 5,
      notes:
        "Tina reports directly to Jeff. He hired her specifically for DaaS monetization. Built trust during KickFire days. Frame everything in terms of how it lifts the company's multiple.",
      tags: ["c-suite", "decision-maker", "sponsor"],
    },
    {
      name: "Marty Fettig",
      role: "EVP Sales",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "neutral",
      communication_style:
        "Sales-minded, relationship-driven, competitive. Prefers quick calls over long emails. Responds to pipeline metrics and win stories. Founding member, ex-Ziff Davis.",
      sensitivities:
        "Fears DaaS will cannibalize lead gen revenue. Does NOT want data feeds mentioned on sales calls. Manages wholesale relationships ($3-4M/yr including Foundry). Controls the sales org. Don't approach his accounts without coordination. Never say 'cannibalize.'",
      motivations:
        "Hitting sales targets. 15 clients over the 7-figure mark. If DaaS closes deals, he benefits. Asked 'Are we ready for this?' about DaaS (open, but wants solid execution plan). Currently in Belfast with SAP, who wants to move forward on data.",
      influence_level: 4,
      notes:
        "SAP is 80% lead gen budget (~$10M/yr via OND Agency). Intentsify already selling SAP first-party data. Marty's take: 'They only aggregate other people's intent data. We make our own first-party intent signals.' Confirms Foundry wholesale relationship. Revenue tiers: lead gen is base, '4 levels higher' exist. Tina meets Marty Tuesday after Belfast trip.",
      tags: ["sales-leadership", "coordination-required", "founding-member"],
    },
    {
      name: "Ben Luck",
      role: "Chief Data Scientist",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "champion",
      communication_style:
        "Technical, thoughtful, data-driven. Appreciates understanding the 'why.' Based in Belfast. Responsive via Slack and email.",
      sensitivities:
        "Protective of data quality and science team bandwidth. Don't position DaaS as replacing existing data products. He mentioned data feeds on the SAP call against Marty's preference, and it saved the account. Don't put him in that position publicly.",
      motivations:
        "Wants to see the data used innovatively. Sees data feeds as defensive (prevents customers from defecting to Intentsify). Wants to push into LiveRamp (programmatic distribution). Excited about DaaS validating the data asset's market value.",
      influence_level: 4,
      notes:
        "Tina's internal champion and long-time mentor. Only person who has closed a DaaS deal (AWS: $10K/mo, 60 topics, CSV to Box). Added industry cohort analysis and serial researcher identification to scoring model. Partner: Tim Ribich. Key for data access, API design, sample data generation. Romano (CIO) resurrecting client pixel at his direction.",
      tags: ["technical", "data-access", "champion", "mentor"],
    },
    {
      name: "Chris Vriavas",
      role: "Head of Strategy",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "supporter",
      communication_style:
        "Strategic, big-picture. Founding member, ex-Ziff Davis. Wants fresh thinking. 'PREVENT me from hearing this is how we have done it.' Appreciates structured presentations.",
      sensitivities:
        "Responsible for overall company strategy. DaaS must fit his vision. Don't go around him on strategic decisions.",
      motivations:
        "His mandate for Tina: 'Tell us how to sell this.' Nobody has done it. Wants Tina in front of the sales team showing them how to position and defend the data. No canned slide decks exist. Aligned with Marty on the moat narrative.",
      influence_level: 4,
      notes:
        "Cannibalization answer: 'Different ICP.' Moat definition (CV + Marty agree): content insights + call center transcription + multi-channel signal fusion. Abandoned bidstream 100%. 'Fewer but deeper.' 6Sense wanted to buy pharosIQ (validates asset). Jim Kelly (CCO) controls newsletters; can 'load the dice.' Wholesale biz $3-4M/yr. Non-tech expansion: commercial trucking, commercial building.",
      tags: ["c-suite", "strategy", "founding-member", "supporter"],
    },
    {
      name: "Tim Ribich",
      role: "Head of Product",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "supporter",
      communication_style:
        "Pragmatic, product-focused. Ben Luck's partner on data/product. Thinks about tradeoffs and feasibility before vision.",
      sensitivities:
        "TrustRadius + Purespot agreements expired under his watch (originally MRP deals). Cost vs. value analysis still pending. Competitor suppression is manual and he knows it's a gap.",
      motivations:
        "Wants to see the product used. Biggest challenge he sees: adoption (getting customers to actually use AtlasIQ). Interested in how DaaS can drive product investment.",
      influence_level: 3,
      notes:
        "Data delivery: CSV only, no API ('won't be built until we see a lot of demand'). 16-20 existing newsletters, can spin up new ones. Content type hierarchy: case studies (strongest) > ebooks > news (weakest, false flags). Post-pandemic IP mapping broke, pharosIQ's email signals avoid this. Buying committee detection built into scoring. Scale: 5M emails/week, 240K unique clicks. Content freshness: deactivated pre-2021 content, automated crawler + AI classification + manual go/no-go.",
      tags: ["product", "technical", "data-delivery"],
    },
    {
      name: "Jim Kelly",
      role: "Chief Content Officer (CCO)",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "unknown",
      communication_style: null,
      sensitivities:
        "Controls the signal generation machine. Don't bypass him on newsletter or content decisions.",
      motivations:
        "Content reach and engagement. Newsletter performance.",
      influence_level: 3,
      notes:
        "Controls all newsletter titles, audiences, topic cycling. 25-30 tech topics cycled through 16-20 newsletters. Can 'load the dice' on signal generation for specific categories. Person to talk to about launching new newsletters for specific verticals/ICPs. Not yet met by Tina.",
      tags: ["content", "signal-generation", "key-contact"],
    },
    {
      name: "Ben Lefkowitz",
      role: "VP Sales, International",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "supporter",
      communication_style:
        "Sales-minded, international perspective. Runs EMEA/APAC. Data pipeline aware. Candid about competitive gaps.",
      sensitivities:
        "His team does ~50% of revenue (goal 55-60%). North America underperforming. Don't position DaaS in ways that complicate his international deals.",
      motivations:
        "Wants battle cards for sales team. His reps hear keywords but don't know what to do. Wants tools to help reps sell smarter.",
      influence_level: 3,
      notes:
        "Products sold (ranked): content syndication, SDRs/BANT, partner enablement, display/Vyde. Big accounts: Cisco (30K accounts, $6/each), Lenovo, Google, Dell. AtlasIQ gaps: not campaign-aware, Intentsify has better UX. 'If we get one shot with the head of Marketing Operations at IBM, they will poke holes in it.' Data pipeline: ~1B raw > 100M cleansed > safe to send > newsletter > QA. Vyde: conversational ad product (chatbot in ad format). 'Perpetual engine' = continuous signal defensibility.",
      tags: ["sales", "international", "competitive-intel"],
    },
    {
      name: "Raj Hajela",
      role: "CRO",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "unknown",
      communication_style: null,
      sensitivities:
        "Board member. Responsible for every single dollar that goes to Jeff. DaaS revenue line must complement, not conflict with, existing revenue streams.",
      motivations: "Revenue accountability.",
      influence_level: 4,
      notes:
        "Per Marty: sits on the board, accountable for all revenue to Jeff. Understand his priorities before pitching DaaS positioning changes.",
      tags: ["c-suite", "revenue", "board-member"],
    },
    {
      name: "Romano Ditoro",
      role: "CIO",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "unknown",
      communication_style: null,
      sensitivities: null,
      motivations: "Infrastructure reliability and security.",
      influence_level: 3,
      notes:
        "Ex-MRP Prelytics. Manages the data feed infrastructure. Resurrecting client pixel for client websites (new signal source). Technical gatekeeper for data delivery.",
      tags: ["technical", "infrastructure", "data-delivery"],
    },
    {
      name: "Anna Eliot",
      role: "CMO",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "unknown",
      communication_style: null,
      sensitivities:
        "Currently swamped and under-directed. Don't pile on without understanding her workload.",
      motivations: null,
      influence_level: 2,
      notes:
        "Ex-Demand Science. Potential ally for DaaS marketing, but needs clear direction first. Admin for SFDC, Outreach, ZoomInfo.",
      tags: ["marketing", "tools-admin"],
    },
    {
      name: "Taylor Maldo",
      role: "Sales Overlay, Display",
      organization: "pharosIQ",
      is_internal: true,
      relationship: "unknown",
      communication_style: null,
      sensitivities: null,
      motivations: null,
      influence_level: 2,
      notes:
        "Helps sell the display product. Mentioned by Marty as a resource.",
      tags: ["sales", "display"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Strategic notes (Tina's full context layer)
// ---------------------------------------------------------------------------

function buildNotes(): NoteSeed[] {
  return [
    // === INSTITUTIONAL CONTEXT ===
    {
      category: "institutional_context",
      title: "pharosIQ Company Overview",
      content:
        "B2B intent data company from MRP + CONTENTgine merger (March 2024). ~$60M revenue, $11M profit, no debt, ~1,373 employees. Ownership: Gurdeep 'Singh' Chimni 51% (Chairman), TA Associates 49% (inherited via FD Technologies acquisition). TA's 49% is a non-core asset, likely 12-18 month exit window. Jeff (CEO) wants pharosIQ to be a martech company (6-12x multiples), not a lead gen company (2-4x multiples).",
      source: "week1_meetings",
      tags: ["company", "ownership", "foundational"],
    },
    {
      category: "institutional_context",
      title: "Tina Bean: Who She Is",
      content:
        "SVP, Data Products & Partnerships (started March 2026). Co-founded KickFire (first-party IP-to-company intent data), built GTM and data monetization engine, sold to IDG/Foundry for $12.8M at 3x revenue. Reports directly to Jeff (CEO). Works laterally with Marty, Chris, Ben Luck. Ben Luck is her internal champion and long-time mentor. Comp: $225K base + 25% rev-share (uncapped) + phantom equity (0.25-0.5%). OTE $450K at $900K revenue. Need ~10 customers at ~$100K ACV.",
      source: "week1_meetings",
      tags: ["tina", "background", "foundational"],
    },
    {
      category: "institutional_context",
      title: "pharosIQ Product Suite (Full Stack)",
      content:
        "pharosIQ is NOT just a signal/data provider. They own signal AND activation: IQsyndicate (content syndication), IQengage (interactive display/Vyde), IQconnect (full-funnel lead gen + direct mail), IQconvert (confirmed buyer opportunities/SQLs), IQdirect (physical mail), IQevents (custom B2B events), IQappend (mobile phone data append), atlasIQ (free intent data, freemium entry), Channel marketing (partner/channel GTM). 360M+ contacts, 650+ intent categories. This is the moat: owning both signal generation AND activation. Nobody else does both.",
      source: "week1_meetings",
      tags: ["products", "moat", "foundational"],
    },
    {
      category: "institutional_context",
      title: "IRIS: Branded Data Methodology",
      content:
        "IRIS stands for Individual-Resolution Intent Signals. Branded name for pharosIQ's contact-level, first-party, permission-based B2B intent data methodology. The name positions pharosIQ as proprietary technology, not a commodity 'intent data' vendor. Use IRIS when discussing the data product externally.",
      source: "tina_branding",
      tags: ["iris", "branding", "positioning"],
    },
    {
      category: "institutional_context",
      title: "Revenue Structure and DaaS Opportunity",
      content:
        "Current revenue is predominantly services-based (managed campaigns, content syndication). Leads sell for $80 each (human-verified, QA'd in Manila). Previous DaaS deals were disasters: $5-10K/mo on 3-month terms, way too cheap. AWS is the only surviving DaaS customer ($10K/mo, 60 topics, public sector, CSV to Box). SAP is ~1/6th of total revenue (~$10M/yr via OND Agency, not direct). 15 clients over $1M/yr. Wholesale business: $3-4M/yr (e.g., Foundry). DaaS revenue carries near-100% margin after initial setup (costs sunk in existing lead gen operations).",
      source: "week1_meetings",
      tags: ["revenue", "daas", "pricing", "foundational"],
    },

    // === DATA ASSET KNOWLEDGE ===
    {
      category: "institutional_context",
      title: "Data Asset: The Numbers",
      content:
        "300M total contacts, 50M B2B inboxable, 17M email openers, 1.5M active engagers (90-day window). 3-6M monthly signals, majority tied to a contact. 650+ intent categories. All contacts US-based. Weekly signal generation: 5M emails sent, 240K unique content clicks, 530K total clicks. contentree.com = signal collection platform. AtlasIQ = signal visibility layer.",
      source: "ben_luck_day1_tim_ribich",
      tags: ["data-asset", "scale", "numbers"],
    },
    {
      category: "institutional_context",
      title: "Intent Score Methodology (Six Factors)",
      content:
        "Intent score 1-99, six factors: (1) Frequency & Intensity (open=1pt, click=3pt), (2) Contact Seniority (VP/C-Level=5x, Director=3x, Manager=2x), (3) Behavioural Trends (spike vs. historical run rate), (4) Account Concentration (multi-contact multiplier, capped at 10 for large enterprises), (5) Recency (sliding multiplier 7x this week down to 2x at 6 weeks), (6) Peer Account Baselining (cumulative distribution vs. industry look-alikes). Score is relative (percentile), not absolute. A 75 in cybersecurity = 75th percentile vs similar companies.",
      source: "chris_vriavas_scoring_diagram",
      tags: ["scoring", "methodology", "technical"],
    },
    {
      category: "institutional_context",
      title: "Signal Generation Engine",
      content:
        "16-20 existing newsletters, each with 2-3 pieces of content. Jim Kelly (CCO) controls topics and audiences. 25-30 tech topics cycled. Can 'load the dice' by cycling specific topics to generate signals in categories DaaS customers need. Content type hierarchy for scoring: case studies (strongest) > ebooks/white papers/buyer's guides > news articles/blogs (weakest, can create false flags). AI model recommends additional content after initial click. Can spin up new newsletters for new verticals.",
      source: "tim_ribich_chris_vriavas",
      tags: ["signal-generation", "newsletters", "content"],
    },
    {
      category: "institutional_context",
      title: "Three Pillars of Signal Collection",
      content:
        "pharosIQ's genesis and differentiation: (1) 100% corporate email addresses (know the account via domain), (2) know the specific content consumed, (3) know the individual person. All three together at the contact level. Most competitors have one or two. pharosIQ has all three because they own the engagement channels.",
      source: "chris_vriavas",
      tags: ["differentiation", "signal-collection", "foundational"],
    },
    {
      category: "institutional_context",
      title: "Data Delivery: Current State",
      content:
        "CSV only today. No API. Tim Ribich: 'API won't be built until we see a lot of demand.' Weekly delivery. Can do slight customizations and prebaked CSVs. Push model, not pull. AWS deal delivers CSV to Box, feeds into Salesforce + AI tools. API delivery, cloud connectors, and real-time feeds would justify higher pricing and attract platform buyers.",
      source: "tim_ribich",
      tags: ["delivery", "product-gap", "opportunity"],
    },

    // === COMPETITIVE INTELLIGENCE ===
    {
      category: "competitive_insight",
      title: "Bombora: Positioning",
      content:
        "Bombora = bidstream aggregation (co-op model). More signal volume, but anonymous, account-level, content-agnostic, shared across all members. pharosIQ abandoned bidstream 100%. Position as 'fewer but deeper.' Bombora has no activation channels (signals only). Intentsify clients combine their own data with Bombora, meaning Bombora is a component not a platform. Don't position against Bombora directly; position as complementary ('different signal source').",
      source: "chris_vriavas_tim_ribich",
      tags: ["bombora", "competitor", "positioning"],
    },
    {
      category: "competitive_insight",
      title: "TechTarget: Positioning",
      content:
        "TechTarget does offer contact-level data (Priority Engine, 32M contacts). But locked inside their platform. pharosIQ delivers 360M+ as an open feed. TechTarget weakness per Tim Ribich: 'Majority of their traffic is to a What-is page. Could be an intern. What is the real intent?' Beat them on: scale (360M vs 32M), delivery flexibility (open feed vs locked platform), content quality (case studies vs What-is pages).",
      source: "tim_ribich_competitive_analysis",
      tags: ["techtarget", "competitor", "positioning"],
    },
    {
      category: "competitive_insight",
      title: "Intentsify: Closest Competitor",
      content:
        "Very similar profile to pharosIQ. Ben Lefkowitz: more signal volume, cleaner dashboard, more product investment. Tim Ribich: clients appreciate combining client's own data with Bombora. Marty Fettig: 'They only aggregate other people's intent data. We make our own first-party intent signals.' Key weakness: doesn't own activation channels. pharosIQ owns newsletters, call centers, content syndication, Vyde, direct mail. Big focus on Tier 1 (SAP, Google, IBM). Ben Luck sees data feeds as defensive against Intentsify specifically.",
      source: "ben_lefkowitz_tim_ribich_marty_fettig",
      tags: ["intentsify", "competitor", "urgent"],
    },
    {
      category: "competitive_insight",
      title: "Other Competitors",
      content:
        "6Sense wanted to acquire pharosIQ (validates asset value). DemandScience: PE-backed, ex-ZoomInfo execs, created ContentIQ 4 months ago, unclear capabilities. MadisonLogic: 'friendly at a really high level' (potential partner/customer). Purespot: previously $140K contract, limited data, expired. TrustRadius: negotiated by Marty, expired. DemandAI, ProspectBase: saying similar things. ZoomInfo, LeadSift: different flavors.",
      source: "chris_vriavas_ben_lefkowitz",
      tags: ["competitors", "landscape"],
    },
    {
      category: "competitive_insight",
      title: "Post-Pandemic IP Advantage",
      content:
        "Remote work broke IP-to-company mapping accuracy. Competitors relying on IP matching (bidstream, website visitor tracking) have degraded signal quality. pharosIQ's email-based signals come from the inbox directly. Tim Ribich: 'From ground zero, more complete picture of who they are and where they work. Not having the data fall off.' This is a key selling point for data buyers who care about accuracy.",
      source: "tim_ribich",
      tags: ["competitive-advantage", "post-pandemic", "accuracy"],
    },

    // === POLITICAL DYNAMICS ===
    {
      category: "political_dynamic",
      title: "The Marty Dynamic",
      content:
        "Three navigation rules: (1) Frame DaaS as 'different ICP, different buyer, different contract' (Chris Vriavas's language). (2) Never imply data feeds replace lead gen. Never say 'cannibalize.' (3) Position DaaS revenue as lifting the whole company's valuation multiple, not competing with Marty's pipeline. Never say 'every dollar of DaaS is worth more than a dollar of lead gen.' Ben Luck's approach (mentioning data feeds on SAP call) worked but doing it publicly creates friction. Build the case with data and wins, not confrontation.",
      source: "week1_meetings",
      tags: ["marty", "politics", "critical"],
    },
    {
      category: "political_dynamic",
      title: "SAP: Politically Sensitive Account",
      content:
        "SAP represents roughly 1/6th of total revenue (~$10M/yr lead gen via OND Agency). Intentsify is already selling them first-party data. pharosIQ is 80% of SAP's lead gen budget. Ben Luck mentioned data feeds on SAP call against Marty's preference because SAP was considering Intentsify, and it saved the account. Marty is currently in Belfast wining and dining SAP; they want to move forward on data. If touching anything SAP-related, coordinate with Ben Luck first. Don't go direct without internal alignment.",
      source: "ben_luck_marty_fettig",
      tags: ["sap", "sensitive", "opportunity", "urgent"],
    },
    {
      category: "political_dynamic",
      title: "Never Imply the Team Failed",
      content:
        "Frame everything as additive. 'Diversifies the revenue mix' not 'replaces the low-margin business.' 'Adds a new buyer segment' not 'finally sells the data properly.' Chris Vriavas wants fresh thinking, but that's an invitation to lead, not to criticize. The signal collection infrastructure, newsletters, call centers, content engine all exist and are funded. Tina is monetizing existing assets, not building from scratch.",
      source: "tina_working_rules",
      tags: ["framing", "politics", "voice"],
    },
    {
      category: "political_dynamic",
      title: "Paper Trail Rules",
      content:
        "Never put in writing: (1) Specific target company names in sensitive emails (say 'platforms that embed our data'). (2) Compensation numbers outside comp negotiations. (3) Board-level or insider information. (4) Anything about TA Associates' exit timeline or valuation expectations. (5) Andrew Colony's name (previous DaaS deals were disasters at $5-10K/mo, but don't blame someone who's gone). Emails get forwarded.",
      source: "tina_working_rules",
      tags: ["paper-trail", "security", "critical"],
    },

    // === RELATIONSHIP NOTES ===
    {
      category: "relationship_note",
      title: "Foundry: Warm DaaS Prospect",
      content:
        "Two connections: (1) pharosIQ already supplies leads wholesale to Foundry ($3-4M/yr). Marty confirms: 'We were Foundry's lead gen house.' (2) Tina personally sold KickFire to IDG/Foundry for $12.8M. They already know pharosIQ's data quality from the wholesale relationship. Tina has existing relationships from the acquisition. Warm intro, not cold outreach. Coordinate with Marty since he manages the wholesale relationship.",
      source: "chris_vriavas_marty_fettig",
      tags: ["foundry", "prospect", "warm-lead"],
    },
    {
      category: "relationship_note",
      title: "Key Internal Resources for DaaS Execution",
      content:
        "Chris Vriavas: will get Tina the database fields. Tim Ribich: product and data structure. Jim Kelly: newsletter launch and audience strategy (not yet met). Romano Ditoro: data feed infrastructure and client pixel. Ben Luck: data access, API design, sample data generation, scoring model details. Taylor Maldo: display product sales overlay.",
      source: "marty_fettig",
      tags: ["resources", "internal", "execution"],
    },

    // === STRATEGIC OBSERVATIONS ===
    {
      category: "strategic_observation",
      title: "The Moat (Consensus View)",
      content:
        "pharosIQ owns both signal generation AND activation. Competitors sell signals OR activation, never both. The moat: content insights + call center transcription + email engagement + conversational ads (Vyde) + direct mail, all feeding a unified contact-level intelligence layer. Intentsify doesn't own activation channels. Bombora is signal-only. 6Sense wanted to acquire pharosIQ specifically for this. The perpetual engine: signals never stop because pharosIQ owns the content, newsletters, call centers, and ad units.",
      source: "chris_vriavas_marty_fettig_ben_lefkowitz",
      tags: ["moat", "defensibility", "positioning"],
    },
    {
      category: "strategic_observation",
      title: "Buying Committee Detection Capability",
      content:
        "The scoring algorithm detects buying committee formation: multiple departments engaging on similar topics + seniority distribution (manager, director, VP) + increasing frequency. Ben Luck layered in industry cohort analysis and serial researcher identification. This is a premium insight that account-level data cannot provide. Only contact-level data can show the VP of IT, Director of Procurement, and Compliance Manager all researching the same category independently.",
      source: "tim_ribich_ben_luck",
      tags: ["buying-committee", "premium-feature", "selling-point"],
    },
    {
      category: "strategic_observation",
      title: "Signal Diversity Gap",
      content:
        "TrustRadius and Purespot signal source agreements have expired. These were used to diversify signals and identify engagement spikes. MRP originally signed them (pre-merger). Cost vs. value analysis needed. Tim Ribich thinks about signal diversity as a concern. Could renegotiate under DaaS model (different value equation). Don't frame externally as a weakness; pharosIQ's first-party signals are the strength, third-party sources were supplementary.",
      source: "tim_ribich_chris_vriavas",
      tags: ["signal-diversity", "gap", "opportunity"],
    },
    {
      category: "strategic_observation",
      title: "AtlasIQ Adoption Challenge",
      content:
        "AtlasIQ is not campaign-aware (can't show intent data in campaign context). Intentsify has a cleaner, more intuitive dashboard with more product investment. Biggest challenge per Tim Ribich: adoption (getting customers to actually use it). Ben Lefkowitz: 'If we get one shot with the head of Marketing Operations at IBM, they will poke holes in it.' This matters less for DaaS (feed buyers don't need a pretty dashboard) but matters for platform-level deals. Lead with the data asset, not the platform.",
      source: "ben_lefkowitz_tim_ribich",
      tags: ["atlasiq", "product-gap", "competitive"],
    },
    {
      category: "strategic_observation",
      title: "Battle Cards: #1 Quick Win",
      content:
        "Independently requested by Ben Lefkowitz ('When you hear X, here are 5-10 questions to ask'), Chris Vriavas ('show them how to position and defend the data'), and confirmed by Ben Luck's intel. The sales team hears keywords from prospects but doesn't know what to do with them. Battle cards for DaaS positioning, competitive differentiation, and objection handling are the fastest way to build internal credibility and enable the sales org.",
      source: "ben_lefkowitz_chris_vriavas",
      tags: ["battle-cards", "sales-enablement", "quick-win"],
    },

    // === TINA'S VOICE & WORKING RULES ===
    {
      category: "institutional_context",
      title: "Tina's Voice Rules (For All Communications)",
      content:
        "Lead with the point, not the setup. No 'Here's why I'm telling you this' or 'I wanted to reach out because...' Just state it. Never sound defensive or apologetic. 'Just' is a minimizer. State what you need with confidence. Never imply the existing team hasn't done something. Frame work as additive. Don't teach people what they already know (no explaining valuation math to a finance CEO). Concise beats verbose. 'On my own time, not yours' beats 'on my own time (nights and weekends).' NEVER use em dashes in any written output (known AI writing signal). Use comma, period, colon, or parentheses instead. No exceptions. Warm, professional, direct. A smart peer talking to another smart peer.",
      source: "tina_voice_profile",
      tags: ["voice", "writing-rules", "critical"],
    },
  ];
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

export async function seedTinaMemory(
  options: { dryRun?: boolean } = {}
): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const supabase = getAdminClient();

  const stakeholders = buildStakeholders();
  const notes = buildNotes();

  console.log(
    `\n[seed:tina-memory] ${dryRun ? "DRY RUN \u2014 " : ""}Preparing ${stakeholders.length} stakeholders + ${notes.length} strategic notes\n`
  );

  let totalRecords = 0;

  if (dryRun) {
    console.log("  === Stakeholders ===");
    for (const s of stakeholders) {
      console.log(`    ${s.name} (${s.role}) [${s.relationship}]`);
    }
    console.log(`\n  === Strategic Notes (${notes.length}) ===`);
    for (const n of notes) {
      console.log(`    [${n.category}] ${n.title}`);
    }
    console.log(
      `\n[seed:tina-memory] DRY RUN complete. ${stakeholders.length + notes.length} records would be inserted.\n`
    );
    return stakeholders.length + notes.length;
  }

  // --- Stakeholders ---
  console.log("  Seeding stakeholders...");
  for (const s of stakeholders) {
    const row = { ...s, user_id: userId };

    // Check if exists
    const { data: existing } = await supabase
      .from("stakeholders")
      .select("stakeholder_id")
      .eq("user_id", userId)
      .eq("name", s.name)
      .eq("organization", s.organization)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("stakeholders")
        .update({
          role: s.role,
          relationship: s.relationship,
          communication_style: s.communication_style,
          sensitivities: s.sensitivities,
          motivations: s.motivations,
          influence_level: s.influence_level,
          notes: s.notes,
          tags: s.tags,
        })
        .eq("stakeholder_id", existing.stakeholder_id);

      if (error) {
        console.error(`    [stakeholder] Update failed for "${s.name}":`, error.message);
      } else {
        console.log(`    Updated: ${s.name}`);
        totalRecords++;
      }
    } else {
      const { error } = await supabase.from("stakeholders").insert(row);
      if (error) {
        console.error(`    [stakeholder] Insert failed for "${s.name}":`, error.message);
      } else {
        console.log(`    Inserted: ${s.name}`);
        totalRecords++;
      }
    }
  }

  // --- Strategic Notes ---
  console.log("\n  Seeding strategic notes...");
  for (const n of notes) {
    const row = { ...n, user_id: userId };

    // Check if exists by title
    const { data: existing } = await supabase
      .from("strategic_notes")
      .select("note_id")
      .eq("user_id", userId)
      .eq("title", n.title)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("strategic_notes")
        .update({
          category: n.category,
          content: n.content,
          source: n.source,
          tags: n.tags,
        })
        .eq("note_id", existing.note_id);

      if (error) {
        console.error(`    [note] Update failed for "${n.title}":`, error.message);
      } else {
        console.log(`    Updated: ${n.title}`);
        totalRecords++;
      }
    } else {
      const { error } = await supabase.from("strategic_notes").insert(row);
      if (error) {
        console.error(`    [note] Insert failed for "${n.title}":`, error.message);
      } else {
        console.log(`    Inserted: ${n.title}`);
        totalRecords++;
      }
    }
  }

  console.log(
    `\n[seed:tina-memory] Seeded ${totalRecords} total records (${stakeholders.length} stakeholders + ${notes.length} notes).\n`
  );

  return totalRecords;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes("seed-tina-memory");
if (isDirectRun) {
  const dryRun = process.argv.includes("--dry-run");

  seedTinaMemory({ dryRun })
    .then((count) => {
      console.log(`[seed:tina-memory] Done. ${count} records.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed:tina-memory] Fatal error:", err);
      process.exit(1);
    });
}
