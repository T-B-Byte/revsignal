/**
 * Seed script: Flashcards
 *
 * Populates flashcard decks with real pharosIQ study material:
 *   1. People & Dynamics (key stakeholders, politics, relationships)
 *   2. DaaS Power Phrases (selling language, positioning, objection handling)
 *   3. Data Asset & Signals (pipeline, scoring, delivery, methodology)
 *   4. Competitive Intel (competitor positioning, strengths/weaknesses)
 *   5. Internal Landmines (political sensitivities, things to never say)
 *   6. ICP Categories & Deal Sizes (target customer segments)
 *   7. SaaSpocalypse Stats (valuation numbers for DaaS conversations)
 *   8. Investor Perspectives on Data (VC/analyst quotes on data moats)
 *   9. Objection Handling (counter-arguments and responses)
 *
 * Source: pharosiq/notes/flashcards-*.md (meeting notes from Ben Luck,
 * Ben Lefkowitz, Chris Vriavas, Tim Ribich, Marty Fettig)
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
    // ===== DECK 1: People & Dynamics =====
    {
      name: 'People & Dynamics',
      description: 'Key stakeholders, their roles, priorities, and how to work with each person at pharosIQ',
      icon: 'users',
      color: 'blue',
      cards: [
        {
          card_type: 'standard',
          front_content: 'Who is Jeff Rokuskie and what does he want?',
          back_content: 'CEO. Finance background. Wants pharosIQ to be a martech company, not a lead gen company. Lead gen trades at 2-4x revenue; martech trades at 6-12x+.',
          back_detail: 'Reports to him directly. He brought Tina in specifically to build the DaaS revenue line. Don\'t explain valuation math to him (he\'s a finance CEO, he already knows). Frame everything in terms of how it lifts the company\'s multiple.',
          image_url: null,
          source_attribution: 'Jeff Rokuskie call',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Marty Fettig and what\'s his concern about DaaS?',
          back_content: 'EVP Sales. Founding member, ex-Ziff Davis. Fears data feeds will cannibalize lead gen revenue. Doesn\'t want data feeds mentioned on sales calls.',
          back_detail: 'Marty controls the sales org and wholesale relationships ($3-4M/yr). He negotiated the TrustRadius deal. Approach with care: frame DaaS as additive ("different ICP, different buyer, different contract"), never as replacing lead gen. He and Chris Vriavas are aligned on the moat narrative.',
          image_url: null,
          source_attribution: 'Marty Fettig call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Ben Luck and why is he important to Tina?',
          back_content: 'Chief Data Scientist. Tina\'s internal champion and long-time mentor. He sees data feeds as defensive (prevents customers from going to Intentsify). Only person who has closed a DaaS deal (AWS).',
          back_detail: 'Ben added industry cohort analysis and serial researcher identification to the scoring model. He wants to push into LiveRamp (programmatic distribution). He mentioned data feeds on the SAP call even though Marty didn\'t want him to, and it saved the account.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Chris Vriavas and what\'s his mandate for Tina?',
          back_content: 'Head of Strategy. Founding member, ex-Ziff. His mandate: "Tina tells us how to sell this." He wants fresh thinking: "PREVENT me from hearing \'this is how we have done it.\'"',
          back_detail: 'CV\'s cannibalization answer: "Different ICP." He and Marty agree on the moat (content insights + call centers + multi-channel signal fusion). CV wants Tina in front of the sales team showing them how to position and defend the data. No canned slide decks exist.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Tim Ribich and what does he own?',
          back_content: 'Head of Product. Ben Luck\'s partner on data/product. Owns AtlasIQ, content freshness strategy, and the intent scoring algorithm.',
          back_detail: 'Tim is pragmatic about delivery: CSV only today, no API until demand justifies it. He thinks about signal diversity (TrustRadius/Purespot agreements expired). He built recency decay into the scoring model. Biggest challenge he sees: adoption (getting customers to actually use the platform).',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Jim Kelly and why does he matter for DaaS?',
          back_content: 'Chief Content Officer. Controls all newsletter titles, audiences, and topic cycling. 25-30 tech topics cycled through 16-20 newsletters.',
          back_detail: 'Jim is the person who can "load the dice" on signal generation. Need signals in AP/AR automation? Jim cycles that topic through the newsletters. He decides which audiences get which content. Talk to him about launching new newsletters for specific verticals or ICPs.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Ben Lefkowitz and what does he run?',
          back_content: 'VP Sales, International (EMEA/APAC). His team was close to half of total company revenue last year; goal is 55-60% this year. North America is underperforming.',
          back_detail: 'Products he sells (ranked): content syndication, SDRs/BANT leads, partner enablement, display/Vyde. Big accounts: Cisco (30K accounts, $6/account), Lenovo, Google, Dell. He independently identified the same need CV did: battle cards for the sales team. His reps hear keywords but don\'t know what to do with them.',
          image_url: null,
          source_attribution: 'Ben Lefkowitz call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Romano Ditoro?',
          back_content: 'CIO, ex-MRP Prelytics. Manages the data feed infrastructure.',
          back_detail: 'Romano is resurrecting the client pixel for client websites (a new signal source). He\'s the technical gatekeeper for data delivery and infrastructure.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Anna Eliot?',
          back_content: 'CMO, ex-Demand Science. Currently swamped and under-directed.',
          back_detail: 'Potential ally for DaaS marketing, but she needs clear direction. Don\'t pile on without understanding her current workload first.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'Who is Raj Hajela?',
          back_content: 'CRO (Chief Revenue Officer). Board member. Responsible for every single dollar that goes to Jeff.',
          back_detail: 'Revenue leadership. Understand his priorities before pitching DaaS positioning changes that affect the sales narrative.',
          image_url: null,
          source_attribution: 'Marty Fettig call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How do you navigate the Marty tension around DaaS?',
          back_content: 'Three rules: (1) Frame DaaS as "different ICP, different buyer, different contract" (Chris Vriavas\'s language). (2) Never imply data feeds replace lead gen. (3) Position DaaS revenue as lifting the whole company\'s valuation multiple, not competing with Marty\'s pipeline.',
          back_detail: 'Ben Luck\'s approach (mentioning data feeds on the SAP call) worked because it saved the account. But going around Marty publicly is risky. Build the case with data and wins, not confrontation.',
          image_url: null,
          source_attribution: 'Multiple Week 1 calls',
        },
        {
          card_type: 'standard',
          front_content: 'Why is Foundry a warm DaaS prospect?',
          back_content: 'Two connections: (1) pharosIQ already supplies leads wholesale to Foundry ($3-4M/yr wholesale business). (2) Tina personally sold KickFire to IDG/Foundry for $12.8M.',
          back_detail: 'Foundry is a big player in the data/media space. They already know pharosIQ\'s data quality from the wholesale relationship, and Tina has existing relationships from the acquisition. Warm intro, not cold outreach.',
          image_url: null,
          source_attribution: 'Chris Vriavas + Marty Fettig calls',
        },
        {
          card_type: 'standard',
          front_content: 'Marty confirmed: sales team needs "Data 101." What does that mean?',
          back_content: 'Marty said "we\'re going to have to educate sales on some level too. What this data product is like. Data 101. How to pitch it, how to sell it. It\'s not just set up for them to sell, you have to teach them."',
          back_detail: 'This validates the battle card strategy. Marty also framed the key strategic question: do a centralized strategic review, or train the broader sales team to sell data themselves? Both paths need enablement materials. Andy Graham independently asked for more clarity on the data, confirming the gap.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
      ],
    },

    // ===== DECK 2: DaaS Power Phrases =====
    {
      name: 'DaaS Power Phrases',
      description: 'Key phrases and positioning language for selling pharosIQ\'s data asset',
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
        // === pharosIQ-specific power phrases (from Week 1 meetings) ===
        {
          card_type: 'standard',
          front_content: 'How do you describe what pharosIQ does in a positioning statement?',
          back_content: 'pharosIQ is a first-party intelligence & activation company.',
          back_detail: "We help organizations identify and prioritize actively engaged buyers. We bring clarity to where real and actual demand exists — across accounts, personas, and buying stages. We make it easier to drive measurable pipeline and prove revenue impact.\n\npharosIQ is the combination of two things: the intelligence itself, built on 20 years of expertise, and the ability to build, execute, and manage programs that actually activate that intelligence.",
          image_url: null,
          source_attribution: 'pharosIQ positioning',
        },
        {
          card_type: 'standard',
          front_content: 'What does IRIS stand for?',
          back_content: 'Individual-Resolution Intent Signals',
          back_detail: 'Our branded methodology for contact-level, first-party, permission-based B2B intent data. The name positions us as proprietary technology, not a commodity "intent data" vendor.',
          image_url: null,
          source_attribution: 'IRIS branding (Tina Bean)',
        },
        {
          card_type: 'standard',
          front_content: 'What is "multi-modal behavioral intelligence"?',
          back_content: 'Intent signals captured across multiple channels: email engagement, call center transcription, conversational ads (Vyde), direct mail, and digital content consumption, all fused at the contact level.',
          back_detail: 'This is what separates pharosIQ from pure-play signal vendors. We don\'t just observe one channel. We see the same buyer across email, phone, ads, and content. No competitor owns all these activation channels.',
          image_url: null,
          source_attribution: 'Multiple Week 1 calls',
        },
        {
          card_type: 'standard',
          front_content: 'How do you explain individual-resolution vs. account-level intent?',
          back_content: 'Account-level: "Someone at Acme searched for cybersecurity." Individual-resolution: "Sarah Chen, VP of IT Security at Acme, downloaded a firewall migration guide on Tuesday, opened our newsletter on Thursday, and took a call from our SDR on Friday."',
          back_detail: 'Most competitors (Bombora, G2) only do account-level. TechTarget does contact-level but locks it in their platform (32M contacts). We deliver 360M+ contacts as an open feed.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 + competitive analysis',
        },
        {
          card_type: 'standard',
          front_content: 'What is the "perpetual engine" and why does it matter?',
          back_content: 'pharosIQ\'s continuous signal collection across owned channels. Unlike campaign-based models (buy media, campaign ends, engagement stops), pharosIQ\'s engine runs continuously, generating fresh signals every day.',
          back_detail: 'This is the defensibility narrative. Publisher model (Ziff Davis): campaign ends, signals stop. Our model: signals never stop because we own the content, the newsletters, the call centers, and the ad units.',
          image_url: null,
          source_attribution: 'Ben Lefkowitz call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How do you position pharosIQ against Bombora\'s signal volume?',
          back_content: '"Fewer but deeper." Bombora has more signals via bidstream aggregation, but those are anonymous, account-level, and content-agnostic. pharosIQ signals are contact-level, content-aware, and verified through first-party engagement.',
          back_detail: 'We abandoned bidstream 100%. Our signals come from owned email, newsletters, call centers, and content syndication. Every signal maps to a known person consuming known content.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What are pharosIQ\'s contact-level data numbers?',
          back_content: '360M+ total contacts, 650+ intent categories, 3-6M monthly signals (majority tied to a contact), 50M B2B inboxable, 17M email openers, 1.5M active engagers in 90-day window.',
          back_detail: null,
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'How do you handle the "won\'t this cannibalize lead gen?" objection?',
          back_content: 'Different ICP. DaaS buyers are platforms, aggregators, and AI companies that embed data into their own products. Lead gen buyers are marketing teams at enterprises running campaigns. Different buyer, different use case, different contract.',
          back_detail: 'Chris Vriavas (Head of Strategy) confirmed: "Different ICP." Also: DaaS revenue carries a higher valuation multiple (6-12x vs. 2-4x for services), lifting the entire company\'s value.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ\'s delivery model differ from TechTarget?',
          back_content: 'TechTarget locks contact-level data inside Priority Engine (their own platform, 32M contacts). IRIS delivers as a raw data feed designed to be embedded into the buyer\'s own systems: API, flat file, cloud delivery, or OEM integration. 360M+ contacts.',
          back_detail: 'Buyers build workflows and products around our feed. That\'s stickier than a platform login they can cancel.',
          image_url: null,
          source_attribution: 'Competitive analysis',
        },
        {
          card_type: 'standard',
          front_content: 'What\'s the margin story for DaaS revenue?',
          back_content: 'Near-100% margin after initial sales and delivery setup. The data already exists. Licensing it costs us almost nothing to deliver.',
          back_detail: 'The signals are generated by the existing content syndication, newsletter, and call center operations. Those costs are already covered by the lead gen business. DaaS revenue is incremental with no incremental cost of goods.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'What is pharosIQ\'s competitive moat for DaaS?',
          back_content: 'We own both signal generation AND activation. Competitors sell signals OR activation, never both. Our moat: content insights + call center transcription + email engagement + conversational ads (Vyde) + direct mail, all feeding a unified contact-level intelligence layer.',
          back_detail: 'Intentsify is closest competitor but doesn\'t own activation channels. Bombora is signal-only with no activation. 6Sense wanted to acquire pharosIQ specifically for the data asset.',
          image_url: null,
          source_attribution: 'Chris Vriavas + Marty Fettig calls',
        },
        {
          card_type: 'standard',
          front_content: 'Can pharosIQ generate signals in specific categories on demand?',
          back_content: 'Yes. Jim Kelly (CCO) controls newsletter topics and audiences. By cycling specific topics through newsletters (e.g., AP/AR automation, cybersecurity, AI for professionals), pharosIQ can "load the dice" to generate signals in categories that matter to DaaS customers.',
          back_detail: '25-30 tech topics are cycled through newsletters. If a customer needs signals in a specific vertical, we can increase topic coverage to generate more data in that category.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What is "content-weighted intent" and why does it matter?',
          back_content: 'Not all content consumption is equal. Case studies indicate stronger buying intent than ebooks, which indicate stronger intent than news articles or blog posts. pharosIQ weights signals by content type, so a case study download scores higher than a blog click.',
          back_detail: 'TechTarget\'s traffic is mostly "What-is" pages (generic, low-intent). pharosIQ started with case studies first specifically to build on the strongest signal type. "Could be an intern reading that page several times. What is the real intent in that?"',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How do you explain pharosIQ\'s post-pandemic advantage?',
          back_content: 'Remote work broke IP-to-company mapping. Competitors relying on IP matching have degraded accuracy. pharosIQ\'s signals come from email engagement (corporate inbox), so we always know the person, the company (via domain), and the content. No IP dependency.',
          back_detail: '"From ground zero, more complete picture of who they are and where they work. Not having the data fall off."',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How do you describe pharosIQ\'s buying committee detection?',
          back_content: '"We can see when a buying committee is forming." Multiple contacts from different departments at the same company, with increasing seniority, all engaging on related topics. That pattern indicates a purchase decision is taking shape.',
          back_detail: 'This is a premium insight that account-level data can\'t provide. You need contact-level data to see the VP of IT, the Director of Procurement, and the Compliance Manager all researching the same category independently.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'A prospect asks: "What stops someone from replicating your data?" What\'s the answer?',
          back_content: 'Five layers, each hard to replicate alone, nearly impossible together: (1) 360M+ permission-based contacts built over years. (2) Owned engagement channels (newsletters, call centers, Vyde, direct mail, syndication) generating fresh signals weekly. (3) Six-factor scoring algorithm tuned on years of behavioral data. (4) Content-weighted signals (case studies, not "What-is" pages). (5) Contact-level resolution in a post-pandemic world where IP-based competitors lost accuracy.',
          back_detail: 'The real answer is time. A competitor would need years to build the contact database, the newsletter subscriber base, the call center infrastructure, and the behavioral history to train the scoring model. The engine runs continuously (the "perpetual engine"), so the data gets richer every week without additional investment.',
          image_url: null,
          source_attribution: 'Multiple Week 1 calls',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ weight contact seniority in intent scoring?',
          back_content: 'VP or C-Level engagement = 5x multiplier. Director = 3x. Manager = 2x. A single VP clicking a case study generates 15 points (3 for click x 5 for seniority). A manager opening a newsletter generates 2 points (1 for open x 2 for seniority).',
          back_detail: 'pharosIQ\'s scores reflect WHO is researching, not just that someone is. A competitor using anonymous bidstream data can\'t weight by seniority because they don\'t know who the person is.',
          image_url: null,
          source_attribution: 'Internal scoring diagram (Chris Vriavas)',
        },
        {
          card_type: 'standard',
          front_content: 'What makes pharosIQ\'s intent score relative, not absolute?',
          back_content: 'Peer Account Baselining. Every company\'s score is compared to "look-alikes" in the same industry using cumulative distribution statistics. A score of 75 in cybersecurity means that company is in the 75th percentile compared to similar companies researching cybersecurity.',
          back_detail: 'Crucial for DaaS buyers building models. A raw activity count isn\'t useful across industries (a 50-person startup and a 50,000-person enterprise have different baselines). Relative scoring normalizes for company size and industry norms.',
          image_url: null,
          source_attribution: 'Internal scoring diagram (Chris Vriavas)',
        },
        {
          card_type: 'standard',
          front_content: 'Why is lead provenance a competitive advantage for pharosIQ?',
          back_content: 'The lead gen industry is built on aggregation. Most sellers didn\'t originate the lead; they bought it and resold it. pharosIQ always originates its own leads. Full chain of custody: timestamp, content piece, source. Almost nobody else can offer this.',
          back_detail: 'Robin (LeadScale) wants to tell his clients exactly where each lead came from. The industry can\'t cooperate on this because it would expose the aggregation model. pharosIQ can solve it because they are the source. Marty suggested a data play could help Robin "round out his narrative and story of provenance" at the lead level, not just account level.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
        {
          card_type: 'standard',
          front_content: 'How do you position private audiences as an easy upsell?',
          back_content: '"Do you want fries with that." Custom/private audiences are something the existing sales team can offer as an add-on to current deals. Buyers can advertise anything they want against the audience, not just pharosIQ\'s conversational ads.',
          back_detail: 'Marty confirmed: private audiences are platform-agnostic. This makes them a low-friction upsell for salespeople already in the conversation. No need to change the sales motion, just add a line item.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
      ],
    },

    // ===== DECK 3: Data Asset & Signals =====
    {
      name: 'Data Asset & Signals',
      description: 'How pharosIQ\'s data pipeline works, signal generation, scoring methodology, and delivery',
      icon: 'database',
      color: 'purple',
      cards: [
        {
          card_type: 'standard',
          front_content: 'What is pharosIQ\'s data funnel from raw to engagement?',
          back_content: '~1B raw records acquired \u2192 cleansed to ~100M records \u2192 email bounce-back QA \u2192 50M B2B inboxable \u2192 "safe to send" bucket \u2192 newsletter engagement \u2192 17M email openers \u2192 1.5M active engagers (90-day window)',
          back_detail: 'From Ben Lefkowitz. The funnel shows why pharosIQ\'s data is higher quality than scraped/aggregated sources. Every contact has been through multiple quality gates before generating a signal.',
          image_url: null,
          source_attribution: 'Ben Lefkowitz call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What are the six factors in pharosIQ\'s intent score (1-99)?',
          back_content: '(1) Frequency & Intensity: open=1pt, click=3pt. (2) Contact Seniority: VP/C-Level=5x, Director=3x, Manager=2x. (3) Behavioural Trends: recent engagement vs. historical run rate. (4) Account Concentration: multi-contact multiplier, capped at 10 for large enterprises. (5) Recency: sliding multiplier from 7x (this week) down to 2x (6 weeks ago). (6) Peer Account Baselining: score compared to industry "look-alikes" using cumulative distribution statistics.',
          back_detail: 'From Chris Vriavas (internal diagram). The score is relative (percentile vs. peers), not absolute. A 75 in cybersecurity means that company is in the 75th percentile compared to similar companies in that category.',
          image_url: null,
          source_attribution: 'Internal scoring diagram (Chris Vriavas)',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ weight different content types for intent scoring?',
          back_content: 'Case studies (strongest signal) \u2192 ebooks, white papers, research reports, buyer\'s guides \u2192 news articles and blogs (weakest, can create false flags).',
          back_detail: 'From Tim Ribich. Key differentiator vs. TechTarget. "Majority of TechTarget\'s traffic is to a What-is page. Could be an intern reading that page several times. What is the real intent?" pharosIQ started with case studies specifically to avoid false signals.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ detect buying committee formation?',
          back_content: 'The scoring algorithm looks for: (1) multiple departments engaging on similar topics, (2) seniority distribution (manager, director, VP all researching), (3) increasing engagement frequency across contacts at the same account.',
          back_detail: 'Ben Luck layered in industry cohort analysis and serial researcher identification. If a VP of IT Security, a Director of Procurement, and a Manager of Compliance at the same company are all reading firewall content, that\'s a committee forming.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ generate signals every week?',
          back_content: '16-20 newsletters, each with 2-3 pieces of content, sent to targeted audiences. 5M emails per week \u2192 240K unique content clicks \u2192 530K total clicks. Jim Kelly (CCO) controls topics and audiences.',
          back_detail: 'The newsletters are the engine. Can spin up new ones for new verticals. After initial click, an AI model recommends related content, driving secondary engagement ("pretty good engagement into the next asset").',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What are the three pillars of pharosIQ\'s signal collection?',
          back_content: '(1) 100% corporate email addresses (know the account via domain), (2) know the specific content consumed, (3) know the individual person. All three together at the contact level.',
          back_detail: 'This was the genesis of the data asset. Most competitors have one or two of these. pharosIQ has all three because they own the engagement channels (newsletters, content, call centers).',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Why did the pandemic help pharosIQ\'s competitive position?',
          back_content: 'Remote work broke IP-to-company mapping accuracy. Competitors relying on IP matching (bidstream, website visitor tracking) have degraded signal quality. pharosIQ\'s email-based signals come from the inbox directly, so they\'re not affected.',
          back_detail: '"If we can get a click or an open signal from their inbox, seniority. From ground zero, more complete picture of who they are and where they work. Not having the data fall off."',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What is contentree.com?',
          back_content: 'pharosIQ\'s signal collection platform. Where content is hosted, served, and tracked. Generates the engagement data that feeds the intent scoring model.',
          back_detail: 'Not all newsletters point to contentree directly. Some content is created automatically. AtlasIQ is the visibility layer on top of this data.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'What is AtlasIQ?',
          back_content: 'pharosIQ\'s intent data visibility platform. Shows segmentation, audience creation, account insights, and intent scores. Free tier available (freemium entry point).',
          back_detail: 'Current gaps: not campaign-aware, data not accessible in campaign context. Biggest challenge is adoption. But it works for showing account-level intent to sales teams.',
          image_url: null,
          source_attribution: 'Ben Lefkowitz + Tim Ribich calls',
        },
        {
          card_type: 'standard',
          front_content: 'How is pharosIQ data currently delivered to DaaS customers?',
          back_content: 'CSV only. Weekly delivery. No API yet. "Won\'t be built until we see a lot of demand for it." Can do slight customizations and prebaked CSVs from the platform.',
          back_detail: 'The AWS deal delivers CSV to Box, which feeds into Salesforce + AI tools. API delivery, cloud connectors, and real-time feeds would justify higher pricing and attract platform buyers.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What\'s the difference between pharosIQ leads and intent data?',
          back_content: 'Leads: $80 each, human-verified, QA\'d in Manila, title/seniority filtered, campaign-specific. Intent data: same business card data but unfiltered, no QA, delivered as a weekly CSV feed.',
          back_detail: 'Previous DaaS deals priced intent data at $5-10K/month on 3-month terms. Way too cheap for the asset. The data is the same underlying asset, just different packaging and QA levels.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ handle signal freshness in scoring?',
          back_content: 'Built into the model: as engagement wanes over time, the intent score decreases. A contact who hits 99 won\'t stay there indefinitely. Low-level weighting on initial opens/clicks, heavier weighting on deeper engagement.',
          back_detail: 'Standard lookback windows: 30/60/90 days, 6 months, 1 year. Standard is 90 days. This prevents stale signals from polluting the data.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'How does pharosIQ keep its content library current?',
          back_content: 'Automated crawler discovers content from domains, matches against DB, deduplicates, AI classification, then manual go/no-go queue. All content older than 2020-2021 deactivated. Product specs and investor reports excluded.',
          back_detail: 'Major cleanup happened last year. Previously, people would search and find content from 2012. Content freshness directly affects signal quality.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What are pharosIQ\'s weekly signal generation numbers?',
          back_content: '5M emails sent, 240K unique content clicks, 530K total content clicks, 3-6M monthly signals (majority tied to a contact).',
          back_detail: 'These numbers demonstrate the perpetual engine at work. The signals are generated continuously, not campaign-by-campaign.',
          image_url: null,
          source_attribution: 'Tim Ribich (weekly) + Ben Luck (monthly)',
        },
        {
          card_type: 'standard',
          front_content: 'What is the current AWS deal worth?',
          back_content: '$10K/month, 60 topics, public sector focus, CSV to Box, feeds into Salesforce + AI tools.',
          back_detail: 'Previous DaaS deals were disasters ($5-10K/mo, 3-month terms). Andrew Colony (gone) set up those deals. Way too cheap for the asset.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'How big is the untapped data surplus at pharosIQ?',
          back_content: '~5M unique downloads per month (Tim Ribich\'s engine), but only 250K leads sold. That\'s a 95% surplus. 4.75M monthly downloads sitting on the table, unmonetized.',
          back_detail: 'pharosIQ always originates its own leads (confirmed by Marty). Never buys from other providers. This means the entire surplus is first-party, provenance-verified data that could be monetized as intent feeds, custom audiences, enrichment layers, benchmarking reports, or seed audiences.',
          image_url: null,
          source_attribution: 'Marty Fettig call (Tina + Marty)',
        },
        {
          card_type: 'standard',
          front_content: 'What is the cost difference between a lead push and a data push?',
          back_content: 'Lead converter cost is ~$0.20 per push. Data records need a different (lower) fee structure. "We\'re definitely not going to be twenty cents to push a data record through that probably costs less than twenty cents."',
          back_detail: 'This matters for pricing data delivery. API direct into customer solutions is the preferred path for data. The economics are different from lead gen: lower per-record cost but higher volume and margin.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
        {
          card_type: 'standard',
          front_content: 'Are LiveRamp connectors feasible for data delivery?',
          back_content: 'Yes. Marty confirmed: "We\'d be able to offer connectors because it\'s client side. We\'ll just figure out an agreement for that." Programmatic distribution through LiveRamp is on the table.',
          back_detail: 'This opens up the private marketplace / PMP audience play. Taylor Maldo (SAP conversation) specifically suggested companies like SAP might want to pick up audiences through LiveRamp. Two delivery paths: (A) fuel display campaigns via LiveRamp, or (B) run campaigns directly.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
        // === Monetization paths for the 95% surplus ===
        {
          card_type: 'standard',
          front_content: 'Monetization path #1: Intent data feeds. How does it work?',
          back_content: 'Aggregate the 4.75M unmonetized monthly downloads into account-level and contact-level intent signals. Sell as a data subscription. This is the core DaaS play.',
          back_detail: 'This is exactly what Intentsify sells SAP for $1/account. pharosIQ has the raw material, it just isn\'t packaged yet. Pricing model: per-account or per-contact subscription with topic/category filters.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #2: Custom/private audiences. How does it work?',
          back_content: 'Bundle downloaders into targetable audience segments by topic, industry, company size, or buying stage. Sell through LiveRamp or direct to DSPs. The "do you want fries with that" upsell.',
          back_detail: 'Marty confirmed private audiences are platform-agnostic (buyers advertise anything against them). LiveRamp connectors are feasible (client-side). Low-friction add-on to existing sales conversations.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #3: Lookalike/seed audiences. How does it work?',
          back_content: 'Use the 5M monthly downloaders as seed data for platforms like Meta, Google, LinkedIn. Sell audience modeling packages: "Here are 50K people actively researching cybersecurity. Build your campaign around them."',
          back_detail: 'The value is that seed audiences based on real behavioral data outperform generic targeting. pharosIQ\'s seeds are first-party, verified engagers, not scraped lists.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #4: Enrichment layer. How does it work?',
          back_content: 'Customers already buying 250K leads could pay a premium to see what else those contacts downloaded across the network. Turns a one-time lead into an ongoing signal feed.',
          back_detail: 'Upsell to existing lead gen customers. "You bought 500 leads from us last quarter. 340 of them downloaded additional content since delivery. Want to see what they\'re researching now?" Recurring revenue on top of transactional lead sales.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #5: Benchmarking and trend reports. How does it work?',
          back_content: 'Aggregate anonymized download patterns into market intelligence. "Downloads of AI/ML content up 40% in financial services this quarter." Sell to analysts, VCs, strategy teams. No PII exposure.',
          back_detail: 'With 5M data points/month on what B2B professionals actually consume, pharosIQ can see market trends before they show up in earnings calls. Could be a standalone product or a value-add for premium data subscribers.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #6: Provenance-verified leads. How does it work?',
          back_content: 'Premium tier leads with full chain of custody: timestamp, content piece, source URL, opt-in proof. Charge more because you\'re selling certainty, not just a contact record.',
          back_detail: 'Robin (LeadScale) wants this. The industry can\'t deliver it because most sellers didn\'t originate the lead. pharosIQ can because they are the source. Buyers: regulated industries (finance, healthcare, government), enterprise marketing ops that audit lead sources, GDPR/CCPA-sensitive buyers, agencies proving lead quality to clients.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #7: Content engagement scoring for publishers. How does it work?',
          back_content: 'Publishers and content sponsors want to know what content performs. pharosIQ has 5M data points/month on what people actually download. Sell content performance analytics back to the brands sponsoring the content.',
          back_detail: 'This flips the relationship: instead of pharosIQ being a vendor to brands, brands pay for intelligence about their own content performance across pharosIQ\'s network. "Your cybersecurity whitepaper drove 3x more engagement than your competitor\'s ebook in the same category."',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #8: Retargeting-as-a-service. How does it work?',
          back_content: 'Companies pay pharosIQ to retarget downloaders who match their ICP. pharosIQ owns the audience, buyers rent access to it. No data leaves pharosIQ\'s control.',
          back_detail: 'Data-clean-room-friendly model. The buyer defines their ICP criteria, pharosIQ matches against the 5M monthly downloaders, and runs the retargeting through Vyde or DSP partners. Recurring revenue tied to campaign performance.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #9: Data co-ops / clean rooms. How does it work?',
          back_content: 'Bring first-party data into clean room environments (LiveRamp, Snowflake, AWS). Customers match against their own data without either side exposing raw records. Per-match or subscription pricing.',
          back_detail: 'Privacy-forward model that works in a post-cookie world. Enterprise buyers (especially in regulated industries) increasingly require clean room matching. pharosIQ\'s 360M+ contacts become a matching asset, not just a delivery asset.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
        },
        {
          card_type: 'standard',
          front_content: 'Monetization path #10: Lead scoring validation. How does it work?',
          back_content: 'Companies already buying intent data from competitors (Bombora, Intentsify, TechTarget) use pharosIQ\'s independent signal as a second-source validation layer. "Does our intent data agree with yours?" Sold as a confidence multiplier.',
          back_detail: 'Positions pharosIQ as complementary, not competitive. A company paying Bombora $200K/year would pay $50-100K for an independent signal to validate their existing data. Low friction sale because the buyer already understands intent data.',
          image_url: null,
          source_attribution: 'Monetization strategy (Marty Fettig call analysis)',
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

    // ===== DECK 6: Competitive Intel =====
    {
      name: 'Competitive Intel',
      description: 'Competitor positioning, strengths, weaknesses, and how to sell against each one',
      icon: 'shield',
      color: 'green',
      cards: [
        {
          card_type: 'standard',
          front_content: 'How do you position pharosIQ against Bombora?',
          back_content: 'Bombora = bidstream aggregation. More signal volume, but anonymous, account-level, content-agnostic. pharosIQ = contact-level, content-aware, first-party, verified engagement. "Fewer but deeper."',
          back_detail: 'pharosIQ abandoned bidstream 100%. Bombora has no activation channels. They sell signals only. Intentsify clients combine their own data with Bombora, which means Bombora is a component, not a platform.',
          image_url: null,
          source_attribution: 'Chris Vriavas + Tim Ribich calls',
        },
        {
          card_type: 'standard',
          front_content: 'How do you position pharosIQ against TechTarget?',
          back_content: 'TechTarget does offer contact-level data (Priority Engine, 32M contacts). But it\'s locked inside their platform. pharosIQ delivers 360M+ contacts as an open feed designed for embedding. Also: TechTarget\'s traffic is mostly "What-is" pages (generic, low-intent).',
          back_detail: 'Beat them on scale (360M vs 32M), delivery flexibility (open feed vs locked platform), and content quality (case studies vs What-is pages).',
          image_url: null,
          source_attribution: 'Tim Ribich + competitive analysis',
        },
        {
          card_type: 'standard',
          front_content: 'What makes Intentsify the closest competitor?',
          back_content: 'Very similar profile to pharosIQ. More signal volume, cleaner/more intuitive dashboard, more product investment. Clients appreciate that Intentsify combines client\'s own data with Bombora.',
          back_detail: 'Key weakness: Intentsify doesn\'t own activation channels. pharosIQ owns content syndication, call centers, newsletters, Vyde, direct mail. Marty\'s take: "They only aggregate other people\'s intent data. We make our own first-party intent signals."',
          image_url: null,
          source_attribution: 'Ben Lefkowitz + Tim Ribich + Marty Fettig calls',
        },
        {
          card_type: 'standard',
          front_content: 'What\'s the 6Sense relationship to pharosIQ?',
          back_content: '6Sense wanted to acquire pharosIQ at one point. If they valued the data enough to pursue an acquisition, that validates the asset\'s worth.',
          back_detail: 'Use as a validation proof point in DaaS positioning. Don\'t overuse it or get into specifics.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What do you know about DemandScience?',
          back_content: 'Leadership changes, PE-backed, ex-ZoomInfo executives. Created ContentIQ about 4 months ago. Unknown where they are with intelligence capabilities.',
          back_detail: 'They\'re making moves but it\'s unclear how strong their first-party signal capabilities are. Monitor but don\'t position directly against them until you know more.',
          image_url: null,
          source_attribution: 'Chris Vriavas + Ben Lefkowitz calls',
        },
        {
          card_type: 'standard',
          front_content: 'Why did pharosIQ abandon bidstream data?',
          back_content: 'Bidstream = anonymous, cookie-based, account-level at best, no content context. Post-pandemic, IP mapping accuracy dropped even further. pharosIQ went 100% first-party: email engagement, call centers, content consumption. Every signal maps to a known person consuming known content.',
          back_detail: 'Most intent providers still use bidstream as their primary signal source. pharosIQ made the strategic decision to go all first-party, which means fewer signals but dramatically higher precision and defensibility.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Where does AtlasIQ fall short vs. competitors?',
          back_content: 'AtlasIQ is not campaign-aware (can\'t show intent data in context of a running campaign). Intentsify has a cleaner, more intuitive dashboard. Biggest challenge is adoption.',
          back_detail: '"If we get one shot with the head of Marketing Operations at IBM, they will poke holes in it." This matters less for DaaS (raw feed buyers don\'t need a pretty dashboard) but matters a lot for platform-level deals.',
          image_url: null,
          source_attribution: 'Ben Lefkowitz + Tim Ribich calls',
        },
        {
          card_type: 'standard',
          front_content: 'Where do different competitors get their signals?',
          back_content: 'Bombora: bidstream aggregation. TechTarget: owned media properties (What-is pages, editorial). Intentsify: combines client data + Bombora + their own. pharosIQ: owned newsletters, call centers, content syndication, Vyde conversational ads, direct mail.',
          back_detail: 'pharosIQ is the only one that owns both signal generation AND activation. That\'s the moat. Competitors sell signals OR activation, never both.',
          image_url: null,
          source_attribution: 'Multiple Week 1 calls',
        },
        {
          card_type: 'fill_blank',
          front_content: 'The pitch to companies already using Bombora: we\'re _______, not a replacement.',
          back_content: 'complementary',
          back_detail: 'Don\'t position against Bombora. Position as a different signal source. "You already buy intent data. Ours is first-party, contact-level, and exclusive. It\'s a different signal."',
          image_url: null,
          source_attribution: 'DaaS positioning strategy',
        },
        {
          card_type: 'fill_blank',
          front_content: 'If a company already buys Bombora, that makes them a _______ buyer of intent data.',
          back_content: 'proven',
          back_detail: 'They\'ve already allocated budget for intent data. They understand the value proposition. They\'ve built the integration. Adding pharosIQ is incremental, not greenfield.',
          image_url: null,
          source_attribution: 'DaaS positioning strategy',
        },
        {
          card_type: 'standard',
          front_content: 'What is SAP currently buying from Intentsify?',
          back_content: '90,000 account records at $1/account = $90K deal. Delivered over 10 months. Marty says pharosIQ could deliver that in 30 days. "That should be a no-brainer."',
          back_detail: 'Carl is the procurement contact ("does all the buying"). Key question for Carl: what fields are you getting, what\'s must-have vs. nice-to-have? Two paths forward: (A) fuel display campaigns through LiveRamp (Taylor Maldo\'s angle), or (B) run campaigns directly for SAP. Marty is trying to get Carl on a call.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
        {
          card_type: 'standard',
          front_content: 'What happened when Integrate split into two businesses?',
          back_content: 'Audax (owner) split Integrate into: (1) Integrate, the software platform itself, and (2) Pipeline 360, the sales team that sells lead generation. The marketplace lives inside the Integrate platform, members-only access.',
          back_detail: 'The marketplace became a "race to the bottom" with call centers and scheduling. Lead providers that once had premium positioning were commoditized. pharosIQ participated at one point. Integrate\'s ~1,000 customers can buy leads through the platform via Pipeline 360. This is a cautionary tale for commodity lead gen.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
      ],
    },

    // ===== DECK 7: Internal Landmines =====
    {
      name: 'Internal Landmines',
      description: 'Political dynamics, sensitivities, and things to never say or do at pharosIQ',
      icon: 'alert-triangle',
      color: 'red',
      cards: [
        {
          card_type: 'standard',
          front_content: 'What word should you never use around the sales team?',
          back_content: '"Cannibalize." Marty and the sales team fear DaaS will eat into lead gen revenue. Always use Chris Vriavas\'s framing: "Different ICP, different buyer, different contract."',
          back_detail: 'The sales team knows how to sell leads at $80 each. They don\'t understand data licensing and don\'t want it competing with their pipeline. DaaS buyers are platforms, aggregators, and AI companies. Zero overlap with lead gen buyers.',
          image_url: null,
          source_attribution: 'Multiple Week 1 calls',
        },
        {
          card_type: 'standard',
          front_content: 'What does Marty not want mentioned on sales calls?',
          back_content: 'Data feeds. He fears it will confuse the lead gen sales process or give customers the idea they can get raw data cheaper than leads.',
          back_detail: 'Ben Luck mentioned data feeds on the SAP call anyway, and it saved the account (SAP was considering Intentsify). But doing this publicly or repeatedly will create friction with Marty. Build the case with results first.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 + Marty Fettig call',
        },
        {
          card_type: 'standard',
          front_content: 'What\'s the fastest way to lose internal trust?',
          back_content: 'Implying that the existing team hasn\'t done something or failed at something. Chris Vriavas specifically said he wants "fresh thinking," but that doesn\'t mean criticizing what came before.',
          back_detail: 'Frame everything as additive. "Diversifies the revenue mix" not "replaces the low-margin business." "Adds a new buyer segment" not "finally sells the data properly." People built this company. Respect that.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'Why were the previous DaaS deals a disaster?',
          back_content: 'Andrew Colony (no longer at the company) set up deals at $5-10K/month on 3-month terms. Way too cheap for the asset. The AWS deal ($10K/month, 60 topics) was the only survivor.',
          back_detail: 'Don\'t bring up Andrew Colony by name in meetings. Focus on "we now know the asset\'s true value" and price accordingly.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 meeting',
        },
        {
          card_type: 'standard',
          front_content: 'What should you never put in writing?',
          back_content: '(1) Specific target company names in sensitive emails, (2) compensation numbers outside comp negotiations, (3) board-level or insider information, (4) anything about TA Associates\' exit timeline or valuation expectations.',
          back_detail: 'Say "platforms that embed our data" not specific company names. Say "the revenue opportunity" not dollar targets. Emails get forwarded.',
          image_url: null,
          source_attribution: 'Tina Bean working rules',
        },
        {
          card_type: 'standard',
          front_content: 'Why is SAP a politically sensitive account?',
          back_content: 'SAP represents roughly one-sixth of total revenue (~$10M/year in lead gen). It flows through OND Agency, not direct. Ben Luck mentioned data feeds on the SAP call (against Marty\'s preference) because SAP was about to defect to Intentsify.',
          back_detail: 'SAP is too big to lose. If you touch anything SAP-related, coordinate with Ben Luck first. He has the relationship context. Don\'t go direct to SAP without internal alignment.',
          image_url: null,
          source_attribution: 'Ben Luck Day 1 + Marty Fettig call',
        },
        {
          card_type: 'standard',
          front_content: 'What framing should you avoid when talking about DaaS pricing?',
          back_content: 'Never say "every dollar of DaaS is worth more than a dollar of lead gen." It\'s true (multiples-wise), but it devalues the core business and insults the people who built it.',
          back_detail: 'Instead: "DaaS diversifies the revenue mix and lifts the whole company." Let the math speak for itself. Jeff knows the multiple math. Marty knows leads are his business. Don\'t pit them against each other.',
          image_url: null,
          source_attribution: 'Tina Bean working rules',
        },
        {
          card_type: 'standard',
          front_content: 'Why is "nobody here has done this before" dangerous to say?',
          back_content: 'It sounds like criticism of the existing team. Chris Vriavas said the concept was always to sell data, but nobody internally has actually done it. That\'s an invitation for Tina to lead, not an invitation to point out a gap.',
          back_detail: 'Reframe: "I\'m here to build on what\'s already working." The signal collection infrastructure, the newsletters, the call centers, the content engine: all of that exists and is funded. Tina is monetizing existing assets, not building from scratch.',
          image_url: null,
          source_attribution: 'Chris Vriavas call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What operational gap should you know about but not broadcast?',
          back_content: 'Competitor account suppression in intent data is still manual. Example: making sure Cisco\'s competitors aren\'t showing up in Cisco\'s intent signals.',
          back_detail: 'Don\'t mention this to external prospects as a current feature gap. It\'s a product improvement opportunity, not a selling point.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What internal concern should you be aware of regarding signal sources?',
          back_content: 'TrustRadius and Purespot signal source agreements have expired. This reduces signal diversity. Tim Ribich thinks about this, but a cost vs. value analysis hasn\'t been done yet.',
          back_detail: 'MRP originally signed these agreements (pre-merger). Renegotiating could be positioned differently under a DaaS model. Don\'t frame this externally as a weakness.',
          image_url: null,
          source_attribution: 'Tim Ribich call, Week 1',
        },
        {
          card_type: 'standard',
          front_content: 'What are the two paths for the SAP data deal, and why is it sensitive?',
          back_content: '(A) Fuel SAP\'s display campaigns through LiveRamp (Taylor Maldo\'s angle), or (B) pharosIQ runs campaigns directly for SAP. Carl (procurement) is the key contact. Marty is trying to get him on a call.',
          back_detail: 'SAP is currently buying 90K accounts from Intentsify at $1/account. Marty wants to understand exactly what fields SAP gets, what\'s must-have vs. nice-to-have, then position pharosIQ as faster (30 days vs 10 months). Coordinate with Marty before any SAP outreach. Don\'t go around him on this one.',
          image_url: null,
          source_attribution: 'Marty Fettig call',
        },
      ],
    },

    // ===== DECK 8: Investor Perspectives on Data =====
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

    // ===== DECK 9: Objection Handling — Data Moats =====
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
          back_detail: '"Proprietary data compounds over time. The longer the product operates, the deeper the moat becomes." — Attainment Labs. pharosIQ has 360M+ contacts, 650+ intent categories, and years of signal history. Building that from scratch is a multi-year, multi-million dollar project.',
          image_url: null,
          source_attribution: 'Attainment Labs',
        },
        {
          card_type: 'fill_blank',
          front_content: 'When someone says "data moats don\'t exist," the three-part rebuttal is: differentiated _______, domain _______, and proprietary _______.',
          back_content: 'technology / expertise / data',
          back_detail: 'Even a16z (the biggest data moat skeptic) says defensibility comes from "differentiated technology and domain expertise, with data a key fuel for both." pharosIQ has all three: contentree.com (tech), 20+ years in intent (expertise), 360M+ contacts (data).',
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
