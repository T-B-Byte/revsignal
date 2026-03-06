/**
 * Seed script: Flashcards
 *
 * Populates 8 flashcard decks with ~90+ cards of real pharosIQ study material:
 *   1. pharosIQ Org Structure (image cards)
 *   2. DaaS Power Phrases (fill-in-the-blank)
 *   3. pharosIQ Data Asset (standard Q&A)
 *   4. ICP Categories & Deal Sizes (standard Q&A)
 *   5. SaaSpocalypse Stats (standard Q&A)
 *   6. Bombora Differentiation (fill-in-the-blank)
 *   7. Investor Perspectives on Data (fill-in-the-blank)
 *   8. Objection Handling — Data Moats (standard Q&A + fill-in-the-blank)
 *
 * Usage:
 *   npx tsx scripts/seed-flashcards.ts
 *   npx tsx scripts/seed-flashcards.ts --user-id <uuid>
 *   npx tsx scripts/seed-flashcards.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckSeed {
  name: string;
  description: string;
  icon: string;
  color: string;
  cards: CardSeed[];
}

interface CardSeed {
  card_type: 'standard' | 'fill_blank' | 'image';
  front_content: string;
  back_content: string;
  back_detail: string | null;
  image_url: string | null;
  source_attribution: string | null;
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function buildDecks(): DeckSeed[] {
  return [
    // ===== DECK 1: pharosIQ Org Structure =====
    {
      name: 'pharosIQ Org Structure',
      description: 'Key people, titles, and relationships — from org chart',
      icon: 'users',
      color: 'blue',
      cards: [
        // === CEO ===
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Jeffrey Rokuskie, Chief Executive Officer',
          back_detail: 'US PA Philadelphia. Finance background. Reports to the board. Wants pharosIQ to be a martech company, not a lead gen company. Lead gen companies trade at 2-4x revenue; martech platforms trade at 6-12x+. Tina reports directly to Jeff. Wants to sell the company this year — speed-to-revenue matters for valuation.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        // === Direct Reports (alphabetical) ===
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Anna Eliot, Chief Marketing Officer',
          back_detail: 'US MA. Admin for SFDC, Outreach, ZoomInfo. Key stakeholder for any tooling integrations. Direct API integration to her systems blocked until IT security review.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Anthony Iafolla, Senior VP of Global Sales',
          back_detail: 'US PA Philadelphia. Global sales leadership. Important to coordinate with on DaaS positioning — ensure data feeds complement, not compete with, direct sales motions.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Ben Luck, Chief Data Scientist',
          back_detail: 'Belfast. Internal champion and long-time mentor. Manages AtlasIQ and contentree.com signal platforms. Partner: Tim Ribich (Head of Product). Sees data feeds as defensive (keeps customers from going to Intentsify). Wants to push into LiveRamp (programmatic distribution play).',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Carolina Barcellos, VP of LATAM',
          back_detail: 'US PA Philadelphia. Leads Latin America region. Regional perspective useful for international DaaS expansion opportunities.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Chris Vriavas, MRP Head of Strategy',
          back_detail: 'US CA. Founding member. Ex-Ziff Davis. Involved in strategic direction and M&A considerations.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Erin Neilan, Global VP of Digital',
          back_detail: 'US MA. Leads digital operations globally. Potential alignment on data product digital distribution channels.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'James Kelly, CCO',
          back_detail: 'US NH Hooksett. Chief Commercial Officer. Commercial strategy and revenue operations.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Kristin McShane, Chief Financial Officer',
          back_detail: 'US PA Philadelphia. Key stakeholder for DaaS pricing, revenue recognition, and deal structure approvals.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Martin Fettig, Executive Vice President',
          back_detail: "US CA. Founding member. Ex-Ziff Davis. Doesn't want data feeds mentioned on sales calls (fears cannibalizing lead gen). Tina works laterally with Marty, not under him.",
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Maura Kane, Sr. VP of Global HR',
          back_detail: 'US PA Philadelphia. Human resources leadership. Key contact for onboarding, org structure, and headcount planning.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Raj Hajela, CRO',
          back_detail: 'US PA Philadelphia. Chief Revenue Officer. Critical alignment needed — DaaS revenue line must complement, not conflict with, existing revenue streams under the CRO.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Robert Karpovich, VP Sales & Operations',
          back_detail: 'US PA Philadelphia. Sales operations and process. Alignment on pipeline tracking and deal flow.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Romano DiToro, CIO',
          back_detail: 'US PA Glenside. Ex-MRP Prelytics. Manages the data feed infrastructure. Key technical partner for any DaaS delivery.',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Tina Bean, SVP Data Products & Partnerships',
          back_detail: 'US FL. That\'s you! Building the DaaS revenue line from scratch. Reports directly to Jeff. Co-founded KickFire (sold to IDG/Foundry for $12.8M at 3x revenue).',
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
        // === Advisor ===
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Singh Chimni, Active Advisor',
          back_detail: "US Nevada. Full name: Gurdeep \"Singh\" Chimni. Pronunciation: gur-DEEP SING CHIM-nee. 51% owner. TA Associates owns the other 49% (inherited via FD Technologies acquisition). TA's stake is non-core, likely 12-18 month exit window.",
          image_url: null,
          source_attribution: 'pharosIQ Org Chart',
        },
      ],
    },

    // ===== DECK 2: DaaS Power Phrases =====
    {
      name: 'DaaS Power Phrases',
      description: 'Key talking points for DaaS vs SaaS conversations',
      icon: 'zap',
      color: 'green',
      cards: [
        {
          card_type: 'fill_blank',
          front_content: "\"Data is AI's _______\"",
          back_content: 'input layer',
          back_detail: "AI replicates software. It cannot replicate unique data. Data is AI's input layer. Software is the output layer being commoditized.",
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Software is the output layer being _______"',
          back_content: 'commoditized',
          back_detail: "AI replicates software. It cannot replicate unique data. Data is AI's input layer. Software is the output layer being commoditized.",
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'fill_blank',
          front_content: '"DaaS never carried inflated valuations built on _______ expectations"',
          back_content: 'hypergrowth',
          back_detail: 'DaaS never carried inflated valuations built on hypergrowth expectations. Slow and steady turns out to be a feature, not a bug.',
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'fill_blank',
          front_content: '"What were perceived as SaaS strengths have become _______"',
          back_content: 'weaknesses',
          back_detail: 'What were perceived as SaaS strengths have become weaknesses. What were perceived as DaaS weaknesses have become strengths.',
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'fill_blank',
          front_content: '"The real moat is no longer the model, but who controls _______"',
          back_content: 'clean, fast, compliant data pipelines',
          back_detail: 'The real moat is no longer the model, but who controls clean, fast, compliant data pipelines.',
          image_url: null,
          source_attribution: 'Sandeep Kondury, Angel Investor',
        },
        {
          card_type: 'fill_blank',
          front_content: '"If you don\'t own that data, you compete on _______. If you do, you compete on _______"',
          back_content: 'price / relevance',
          back_detail: "If you don't own that data, you compete on price. If you do, you compete on relevance.",
          image_url: null,
          source_attribution: 'Velou Commerce Analysis',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Proprietary data _______ over time. The longer the product operates, the deeper the moat becomes."',
          back_content: 'compounds',
          back_detail: 'Proprietary data compounds over time. The longer the product operates, the deeper the moat becomes.',
          image_url: null,
          source_attribution: 'Attainment Labs',
        },
        {
          card_type: 'fill_blank',
          front_content: '"It\'s a commodity now to have AI that has general knowledge. It\'s very elusive to get AI that understands _______"',
          back_content: 'proprietary enterprise data',
          back_detail: "It's a commodity now to have AI that has general knowledge. It's very elusive to get AI that really works and understands that proprietary data that's inside enterprise.",
          image_url: null,
          source_attribution: 'Ali Ghodsi, CEO, Databricks',
        },
        {
          card_type: 'fill_blank',
          front_content: '"These companies possess the only two things AI cannot generate: _______ or proprietary data"',
          back_content: 'real-world physical infrastructure',
          back_detail: 'These companies possess the only two things AI cannot generate: real-world physical infrastructure or proprietary, unstructured, regulated data.',
          image_url: null,
          source_attribution: 'Luke Lango, InvestorPlace',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Most \'AI software\' will get vaporized as models get _______"',
          back_content: 'cheaper and better',
          back_detail: "Most 'AI software' will get vaporized as models get cheaper/better. But software providers with proprietary data will win big.",
          image_url: null,
          source_attribution: 'Luke Lango, InvestorPlace',
        },
        {
          card_type: 'fill_blank',
          front_content: '"The shift to data-centric AI is as important as the shift to _______ in the past decade"',
          back_content: 'deep learning',
          back_detail: 'The shift to data-centric AI is as important as the shift to deep learning in the past decade.',
          image_url: null,
          source_attribution: 'Andrew Ng, Co-founder Google Brain',
        },
        {
          card_type: 'fill_blank',
          front_content: '"In business, I look for economic castles protected by _______ moats"',
          back_content: 'unbreachable',
          back_detail: 'In business, I look for economic castles protected by unbreachable moats.',
          image_url: null,
          source_attribution: 'Warren Buffett, Chairman, Berkshire Hathaway',
        },
        {
          card_type: 'fill_blank',
          front_content: '"AI agents interpret data faster than humans ever could. More AI systems = more demand for _______"',
          back_content: 'proprietary data',
          back_detail: 'AI agents interpret data faster than humans ever could. More AI systems = more demand for proprietary data. This is the demand flywheel for DaaS.',
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'fill_blank',
          front_content: '"The moat is not the software itself but what the software has _______ over time"',
          back_content: 'ingested',
          back_detail: 'The moat is not the software itself but what the software has ingested over time. The data compounds; the software is replaceable.',
          image_url: null,
          source_attribution: 'Attainment Labs',
        },
        {
          card_type: 'fill_blank',
          front_content: '"2026 belongs to teams who treat data as _______ and AI as a decision engine"',
          back_content: 'infrastructure',
          back_detail: '2026 belongs to teams who treat data as infrastructure and AI as a decision engine. Data is the foundation layer, AI is the application layer.',
          image_url: null,
          source_attribution: 'Sandeep Kondury, Angel Investor',
        },
        {
          card_type: 'fill_blank',
          front_content: '"AI is commoditizing \'cognition,\' and the only thing that matters now is who can _______ it inside real organizations"',
          back_content: 'operationalize',
          back_detail: "AI is commoditizing 'cognition,' and the only thing that matters now is who can operationalize it inside real organizations, fast, securely, and at scale.",
          image_url: null,
          source_attribution: 'Luke Lango, InvestorPlace',
        },
        {
          card_type: 'fill_blank',
          front_content: '"A truly great business must have an enduring \'moat\' that protects excellent returns on _______"',
          back_content: 'invested capital',
          back_detail: 'A truly great business must have an enduring moat that protects excellent returns on invested capital.',
          image_url: null,
          source_attribution: 'Warren Buffett',
        },
      ],
    },

    // ===== DECK 3: pharosIQ Data Asset =====
    {
      name: 'pharosIQ Data Asset',
      description: 'Key numbers and facts about the data',
      icon: 'database',
      color: 'purple',
      cards: [
        {
          card_type: 'standard',
          front_content: 'How many total contacts does pharosIQ have?',
          back_content: '270M+ contacts across 25M+ global companies',
          back_detail: null,
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How many B2B inboxable contacts?',
          back_content: '50M',
          back_detail: 'Subset of 270M+ total. These are deliverable email addresses.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How many email openers in the database?',
          back_content: '17M',
          back_detail: 'Contacts who have opened emails, showing active engagement.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How many active engagers (90-day window)?',
          back_content: '1.5M',
          back_detail: 'Contacts actively engaging with content in the last 90 days.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How many monthly intent signals does pharosIQ generate?',
          back_content: '3-6M per month',
          back_detail: 'Majority tied back to a specific contact (contact-level, not just account-level).',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How many intent categories does pharosIQ track?',
          back_content: '650+',
          back_detail: 'Product intent categories covering the full B2B buying landscape.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is the intent score range?',
          back_content: '1-99',
          back_detail: 'Based on: content type, volume, seniority, department diversity, recency, momentum, phone signals. 90-day decay window.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is contentree.com?',
          back_content: 'Signal collection platform',
          back_detail: "pharosIQ's owned content ecosystem that generates first-party intent signals.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is AtlasIQ?',
          back_content: 'Signal visibility layer',
          back_detail: 'Free intent-to-purchase data tool. Top of funnel / freemium entry point.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How much does a pharosIQ lead sell for?',
          back_content: '$80 each',
          back_detail: "Human-verified, QA'd in Manila, title/seniority filtered. This is the lead gen product, not the DaaS product.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: "What makes pharosIQ's data different from Bombora?",
          back_content: 'First-party vs co-op, contact-level vs account-level, exclusive vs shared',
          back_detail: "Bombora = co-op model, account-level only, signals shared across all members. pharosIQ = first-party, contact-level precision, exclusive signals from owned content ecosystem.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What delivery methods does pharosIQ support for DaaS?',
          back_content: 'API, flat file, cloud delivery, platform integration, embedded/OEM',
          back_detail: null,
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is the current AWS deal worth?',
          back_content: '$10K/month',
          back_detail: '60 topics, public sector focus, CSV to Box, feeds into Salesforce + AI tools. Previous DaaS deals were disasters ($5-10K/mo, 3-month terms).',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: "What is Tina's revenue target?",
          back_content: '$1M first year',
          back_detail: 'Need ~10 customers at $100K ACV. Comp: $225K base + 25% rev-share (uncapped) + phantom equity.',
          image_url: null,
          source_attribution: null,
        },
      ],
    },

    // ===== DECK 4: ICP Categories & Deal Sizes =====
    {
      name: 'ICP Categories & Deal Sizes',
      description: 'Ideal Customer Profile categories with expected deal sizes',
      icon: 'target',
      color: 'red',
      cards: [
        {
          card_type: 'standard',
          front_content: 'ABM Platforms: Why do they buy? Deal size?',
          back_content: '$200K-$500K. Need intent signals for account targeting. pharosIQ replaces or supplements Bombora co-op data with first-party, contact-level precision.',
          back_detail: 'Examples: Demandbase, 6sense, Integrate',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Sales Intelligence: Why do they buy? Deal size?',
          back_content: '$100K-$300K. Need intent data to enrich contact databases and identify in-market buyers.',
          back_detail: 'Examples: ZoomInfo, Apollo, Lusha',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'CRM/MAP Platforms: Why do they buy? Deal size?',
          back_content: '$500K-$2M. Want native intent data as a platform feature (OEM/embed).',
          back_detail: 'Largest deal size category. Examples: HubSpot, Salesforce, Marketo',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Ad Tech / DSPs: Why do they buy? Deal size?',
          back_content: '$100K-$250K. Need B2B intent audiences for programmatic targeting.',
          back_detail: 'Examples: StackAdapt, Influ2, The Trade Desk',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Data Enrichment: Why do they buy? Deal size?',
          back_content: '$200K-$500K. Want to add intent signals to their enrichment offering.',
          back_detail: 'Examples: Foundry, Clearbit, D&B',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Content Syndication: Why do they buy? Deal size?',
          back_content: '$100K-$200K. Layer intent signals on lead delivery for better targeting.',
          back_detail: 'Examples: Madison Logic, NetLine, Pipeline 360',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Conversation Intelligence: Why do they buy? Deal size?',
          back_content: '$100K-$200K. Pre-conversation intent context makes their deal intelligence more powerful.',
          back_detail: 'Examples: Gong, Chorus, Clari',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Recruiting/HR Tech: Why do they buy? Deal size?',
          back_content: '$100K-$300K. Hiring intent signals identify companies about to scale teams.',
          back_detail: 'Examples: LinkedIn Talent, Seekout, Gem',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Financial Services: Why do they buy? Deal size?',
          back_content: '$200K-$500K. Alternative data for investment decisions and risk assessment.',
          back_detail: 'Examples: Bloomberg, S&P Global, hedge funds',
          image_url: null,
          source_attribution: null,
        },
      ],
    },

    // ===== DECK 5: SaaSpocalypse Stats =====
    {
      name: 'SaaSpocalypse Stats',
      description: 'Key valuation numbers for DaaS vs SaaS conversations',
      icon: 'chart',
      color: 'yellow',
      cards: [
        {
          card_type: 'standard',
          front_content: 'How much market cap was erased in the SaaSpocalypse?',
          back_content: '~$285B in a single trading day',
          back_detail: "Triggered when Anthropic unveiled Claude's legal automation capabilities. Traders christened it the 'SaaSpocalypse.' (Feb 2026, Jefferies)",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is the current Data Infrastructure EBITDA multiple?',
          back_content: '24.4x EBITDA',
          back_detail: 'vs median SaaS at 12.7x. Nearly double the valuation. (Finro Q4 2025)',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Which was the only SaaS product category to expand in valuation multiples YoY?',
          back_content: 'Analytics and Data Management (+11%)',
          back_detail: 'Every other SaaS category contracted. Data is going up while software goes down. (SEG 2026 Annual Report)',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What valuation haircut do companies without an AI strategy get?',
          back_content: '30%+ discount',
          back_detail: 'Companies without a clearly articulated AI strategy are getting a 30%+ haircut, per BCG.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What multiples do AI companies with proprietary data get vs traditional SaaS?',
          back_content: '30-50x revenue vs 4-6x revenue',
          back_detail: 'Companies combining AI agents + data moats achieving dramatically higher multiples.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'How much have SaaS stocks dropped since late 2025?',
          back_content: 'More than 20%',
          back_detail: 'One of the fastest drawdowns for the SaaS cohort outside of the 2022 tech unwind and the 2008 financial crisis. (InvestorPlace)',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What is the HALO trade?',
          back_content: 'Hard Assets, Low Obsolescence',
          back_detail: 'The hottest trade on the Street in 2026. Companies with physical infrastructure or proprietary data are soaring. Pure-play software is getting demolished.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'What do lead gen companies trade at vs martech platforms?',
          back_content: '2-4x revenue vs 6-12x+ revenue',
          back_detail: "Jeff's strategic vision: transform pharosIQ from a lead gen company to a martech company to unlock higher multiples.",
          image_url: null,
          source_attribution: null,
        },
      ],
    },

    // ===== DECK 6: Bombora Differentiation =====
    {
      name: 'Bombora Differentiation',
      description: 'How to position pharosIQ against Bombora in every conversation',
      icon: 'shield',
      color: 'green',
      cards: [
        {
          card_type: 'fill_blank',
          front_content: 'Bombora uses a _______ model. pharosIQ is first-party.',
          back_content: 'co-op',
          back_detail: "Bombora's data comes from a co-op of participating publishers who share browsing data. pharosIQ generates signals from its own content ecosystem.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'fill_blank',
          front_content: 'Bombora provides _______ -level data. pharosIQ is contact-level.',
          back_content: 'account',
          back_detail: 'Bombora tells you WHICH company is surging. pharosIQ tells you WHO at that company is engaging.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'fill_blank',
          front_content: 'Bombora data is _______ across all members. pharosIQ signals are exclusive.',
          back_content: 'shared',
          back_detail: "Every Bombora subscriber sees the same signals. pharosIQ's first-party signals from contentree.com are exclusive to the buyer.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'fill_blank',
          front_content: "The pitch to companies already using Bombora: we're _______, not a replacement.",
          back_content: 'complementary',
          back_detail: "Don't position against Bombora. Position as a different signal source. 'You already buy intent data. Ours is first-party, contact-level, and exclusive. It's a different signal.'",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'fill_blank',
          front_content: 'If a company already buys Bombora, that makes them a _______ buyer of intent data.',
          back_content: 'proven',
          back_detail: "They've already allocated budget for intent data. They understand the value proposition. They've built the integration. Adding pharosIQ is incremental, not greenfield.",
          image_url: null,
          source_attribution: null,
        },
      ],
    },

    // ===== DECK 7: Investor Perspectives on Data =====
    {
      name: 'Investor Perspectives on Data',
      description: 'What VCs, analysts, and investors say about data moats in the AI era',
      icon: 'trending-up',
      color: 'purple',
      cards: [
        {
          card_type: 'fill_blank',
          front_content: '"Investors are adjusting for the significant premium applied to information services assets. Companies without a clearly articulated AI strategy are getting a _______"',
          back_content: '30%+ haircut',
          back_detail: 'Companies without a clearly articulated AI strategy are getting a 30%+ haircut in valuation.',
          image_url: null,
          source_attribution: 'Fergus Jarvis, BCG',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Defensibility stems from domain expertise: _______, data moats, and multimodal interfaces built for vertical-specific needs"',
          back_content: 'integrations',
          back_detail: 'Defensibility stems from domain expertise: integrations, data moats, and multimodal interfaces built for vertical-specific needs.',
          image_url: null,
          source_attribution: 'Bessemer Venture Partners, State of AI 2025',
        },
        {
          card_type: 'fill_blank',
          front_content: '"SaaS applications that are systems of _______ will be huge beneficiaries of AI. Filing cabinets are threatened."',
          back_content: 'work',
          back_detail: 'Systems of work (active workflows) benefit from AI. Systems of record (passive storage) get disrupted. pharosIQ is a system of work — it generates signals that drive action.',
          image_url: null,
          source_attribution: 'Ryan Hinkle, Managing Director, Insight Partners',
        },
        {
          card_type: 'fill_blank',
          front_content: '"There\'s a real _______ bottleneck in enterprise AI deployments that needs addressing first"',
          back_content: 'data-layer',
          back_detail: 'Before enterprises can deploy AI effectively, they need clean, structured, proprietary data pipelines. That is exactly what pharosIQ provides.',
          image_url: null,
          source_attribution: 'Teddie Wardi, Managing Director, Insight Partners',
        },
        {
          card_type: 'fill_blank',
          front_content: '"The winners will be those who combine incumbent _______ with AI-native technical leadership"',
          back_content: 'domain expertise',
          back_detail: 'The winners will be those who combine incumbent domain expertise with AI-native technical leadership. pharosIQ has 20+ years of intent data domain expertise.',
          image_url: null,
          source_attribution: 'Harsha Kapre, Head of Snowflake Ventures',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Your data is your moat. While models such as GPT-4o are everywhere, the real value lies in _______"',
          back_content: 'the proprietary data you own',
          back_detail: 'Your data is your moat. While models such as GPT-4o are everywhere, the real value lies in the proprietary data you own.',
          image_url: null,
          source_attribution: 'Bain & Company',
        },
        {
          card_type: 'fill_blank',
          front_content: '"The next wave of AI success is going to be completely dependent on _______"',
          back_content: 'structured data',
          back_detail: 'The next wave of AI success is going to be completely dependent on structured data. This is the Databricks CEO making the case for data companies.',
          image_url: null,
          source_attribution: 'Ali Ghodsi, CEO, Databricks',
        },
        {
          card_type: 'fill_blank',
          front_content: '"Every monopoly is unique, but they usually share some combination of: proprietary technology, _______, economies of scale, and branding"',
          back_content: 'network effects',
          back_detail: 'Peter Thiel\'s four moat categories. pharosIQ has proprietary technology (first-party signal collection) and network effects (more content sites = more signals = more value).',
          image_url: null,
          source_attribution: 'Peter Thiel, Co-founder PayPal/Palantir',
        },
      ],
    },

    // ===== DECK 8: Objection Handling — Data Moats =====
    {
      name: 'Objection Handling — Data Moats',
      description: 'Counter-arguments you will hear and how to respond',
      icon: 'message-circle',
      color: 'red',
      cards: [
        {
          card_type: 'standard',
          front_content: 'Objection: "a16z says data moats are an empty promise"',
          back_content: 'a16z is talking about generic, replicable data — not first-party, permission-based, human-verified data collected over years.',
          back_detail: 'Their exact quote: "Long-term defensibility is more likely to come from differentiated technology and domain expertise, with data a key fuel for both." That actually supports pharosIQ\'s position — we have differentiated technology (contentree.com signal collection), domain expertise (20+ years in intent data), AND the proprietary data. We check all three boxes.',
          image_url: null,
          source_attribution: 'a16z, "The Empty Promise of Data Moats"',
        },
        {
          card_type: 'standard',
          front_content: 'Objection: "Can\'t AI just generate this data?"',
          back_content: 'AI cannot generate first-party behavioral signals. It can only process data that already exists.',
          back_detail: '"These companies possess the only two things AI cannot generate: real-world physical infrastructure or proprietary, unstructured, regulated data." — Luke Lango, InvestorPlace. pharosIQ\'s signals come from real humans engaging with real content. No LLM can fabricate that.',
          image_url: null,
          source_attribution: 'Luke Lango, InvestorPlace',
        },
        {
          card_type: 'standard',
          front_content: 'Objection: "Bombora already has intent data. Why do we need another source?"',
          back_content: 'Bombora is co-op, account-level, shared. pharosIQ is first-party, contact-level, exclusive. Different signal, not a replacement.',
          back_detail: 'Position as complementary: "You already buy intent data — great, you understand the value. Ours is a different signal source. First-party, contact-level, exclusive. It makes your existing intent data more precise."',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'standard',
          front_content: 'Objection: "DaaS companies trade at lower multiples than SaaS"',
          back_content: 'Not anymore. Data Infrastructure trades at 24.4x EBITDA vs median SaaS at 12.7x. The market has flipped.',
          back_detail: 'Analytics & Data Management was the ONLY SaaS category to expand in valuation multiples YoY (+11%). AI + data moat companies are getting 30-50x revenue vs traditional SaaS at 4-6x. The SaaSpocalypse erased ~$285B in SaaS market cap in a single day. Data is the new premium.',
          image_url: null,
          source_attribution: 'Finro Q4 2025, SEG 2026 Annual Report',
        },
        {
          card_type: 'standard',
          front_content: 'Objection: "AI will commoditize everything, including data"',
          back_content: 'AI commoditizes cognition (software), not collection (data). More AI systems = more demand for proprietary data inputs.',
          back_detail: '"AI replicates software. It cannot replicate unique data. Data is AI\'s input layer. Software is the output layer being commoditized." — Erik Matlick, CEO, Bombora. "AI agents interpret data faster than humans ever could. More AI systems = more demand for proprietary data."',
          image_url: null,
          source_attribution: 'Erik Matlick, CEO, Bombora',
        },
        {
          card_type: 'standard',
          front_content: 'Objection: "We can build our own intent data collection"',
          back_content: 'You can — it takes years, millions in infrastructure, and a content ecosystem at scale. Or you can buy it today.',
          back_detail: '"Proprietary data compounds over time. The longer the product operates, the deeper the moat becomes." — Attainment Labs. pharosIQ has 270M+ contacts, 650+ intent categories, and years of signal history. Building that from scratch is a multi-year, multi-million dollar project.',
          image_url: null,
          source_attribution: 'Attainment Labs',
        },
        {
          card_type: 'fill_blank',
          front_content: 'When someone says "data moats don\'t exist," the three-part rebuttal is: differentiated _______, domain _______, and proprietary _______.',
          back_content: 'technology / expertise / data',
          back_detail: 'Even a16z (the biggest data moat skeptic) says defensibility comes from "differentiated technology and domain expertise, with data a key fuel for both." pharosIQ has all three: contentree.com (tech), 20+ years in intent (expertise), 270M+ contacts (data).',
          image_url: null,
          source_attribution: 'a16z framework, applied to pharosIQ',
        },
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Seed function (exported for use by master seed script)
// ---------------------------------------------------------------------------

export async function seedFlashcards(options: { dryRun?: boolean } = {}): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const decks = buildDecks();

  const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);
  console.log(
    `\n[seed:flashcards] ${dryRun ? 'DRY RUN — ' : ''}Preparing ${decks.length} decks with ${totalCards} cards\n`
  );

  for (const deck of decks) {
    console.log(`  ${deck.name}: ${deck.cards.length} cards (${deck.color})`);
  }
  console.log();

  if (dryRun) {
    console.log('[seed:flashcards] DRY RUN — Preview of decks:');
    for (const deck of decks) {
      console.log(`\n  === ${deck.name} ===`);
      for (const card of deck.cards) {
        console.log(`    [${card.card_type}] ${card.front_content.slice(0, 60)}...`);
      }
    }
    console.log(`\n[seed:flashcards] DRY RUN complete. ${totalCards} cards would be inserted.\n`);
    return totalCards;
  }

  const supabase = getAdminClient();
  let insertedCards = 0;

  for (let di = 0; di < decks.length; di++) {
    const deck = decks[di];

    // Upsert deck
    const { data: deckRow, error: deckError } = await supabase
      .from('flashcard_decks')
      .upsert(
        {
          user_id: userId,
          name: deck.name,
          description: deck.description,
          icon: deck.icon,
          color: deck.color,
          sort_order: di,
          card_count: deck.cards.length,
        },
        { onConflict: 'user_id,name', ignoreDuplicates: false }
      )
      .select('deck_id')
      .single();

    if (deckError) {
      // If unique constraint doesn't exist, try insert
      console.error(`[seed:flashcards] Error upserting deck "${deck.name}":`, deckError.message);
      // Try a different approach: check if exists, update or insert
      const { data: existing } = await supabase
        .from('flashcard_decks')
        .select('deck_id')
        .eq('user_id', userId)
        .eq('name', deck.name)
        .single();

      let deckId: string;
      if (existing) {
        deckId = existing.deck_id;
        await supabase
          .from('flashcard_decks')
          .update({
            description: deck.description,
            icon: deck.icon,
            color: deck.color,
            sort_order: di,
          })
          .eq('deck_id', deckId);
      } else {
        const { data: newDeck, error: insertError } = await supabase
          .from('flashcard_decks')
          .insert({
            user_id: userId,
            name: deck.name,
            description: deck.description,
            icon: deck.icon,
            color: deck.color,
            sort_order: di,
          })
          .select('deck_id')
          .single();

        if (insertError) {
          console.error(`[seed:flashcards] Failed to insert deck "${deck.name}":`, insertError.message);
          continue;
        }
        deckId = newDeck!.deck_id;
      }

      // Delete existing cards for this deck and re-insert
      await supabase.from('flashcards').delete().eq('deck_id', deckId);

      const cardRows = deck.cards.map((card, ci) => ({
        deck_id: deckId,
        user_id: userId,
        card_type: card.card_type,
        front_content: card.front_content,
        back_content: card.back_content,
        back_detail: card.back_detail,
        image_url: card.image_url,
        source_attribution: card.source_attribution,
        sort_order: ci,
      }));

      const { error: cardsError } = await supabase
        .from('flashcards')
        .insert(cardRows);

      if (cardsError) {
        console.error(`[seed:flashcards] Error inserting cards for "${deck.name}":`, cardsError.message);
      } else {
        insertedCards += deck.cards.length;
        console.log(`  ✓ ${deck.name}: ${deck.cards.length} cards`);
      }
      continue;
    }

    const deckId = deckRow.deck_id;

    // Delete existing cards for this deck and re-insert
    await supabase.from('flashcards').delete().eq('deck_id', deckId);

    const cardRows = deck.cards.map((card, ci) => ({
      deck_id: deckId,
      user_id: userId,
      card_type: card.card_type,
      front_content: card.front_content,
      back_content: card.back_content,
      back_detail: card.back_detail,
      image_url: card.image_url,
      source_attribution: card.source_attribution,
      sort_order: ci,
    }));

    const { error: cardsError } = await supabase
      .from('flashcards')
      .insert(cardRows);

    if (cardsError) {
      console.error(`[seed:flashcards] Error inserting cards for "${deck.name}":`, cardsError.message);
    } else {
      insertedCards += deck.cards.length;
      console.log(`  ✓ ${deck.name}: ${deck.cards.length} cards`);
    }
  }

  console.log(`\n[seed:flashcards] Successfully inserted ${insertedCards} cards across ${decks.length} decks.\n`);
  return insertedCards;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('seed-flashcards');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');

  seedFlashcards({ dryRun })
    .then((count) => {
      console.log(`[seed:flashcards] Done. ${count} cards processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed:flashcards] Fatal error:', err);
      process.exit(1);
    });
}
