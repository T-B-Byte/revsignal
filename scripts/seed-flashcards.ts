/**
 * Seed script: Flashcards
 *
 * Populates 6 flashcard decks with ~70 cards of real pharosIQ study material:
 *   1. pharosIQ Org Structure (image cards)
 *   2. DaaS Power Phrases (fill-in-the-blank)
 *   3. pharosIQ Data Asset (standard Q&A)
 *   4. ICP Categories & Deal Sizes (standard Q&A)
 *   5. SaaSpocalypse Stats (standard Q&A)
 *   6. Bombora Differentiation (fill-in-the-blank)
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
      description: 'Key people, titles, and relationships',
      icon: 'users',
      color: 'blue',
      cards: [
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Jeff Rokuskie, CEO',
          back_detail: 'Finance background. Reports to the board. Wants pharosIQ to be a martech company, not a lead gen company. Lead gen companies trade at 2-4x revenue; martech platforms trade at 6-12x+. Tina reports directly to Jeff.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Ben Luck, Chief Data Scientist',
          back_detail: 'Internal champion and long-time mentor. Manages AtlasIQ and contentree.com signal platforms. Partner: Tim Ribich (Head of Product). Sees data feeds as defensive (keeps customers from going to Intentsify). Wants to push into LiveRamp (programmatic distribution play).',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Marty Fettig, EVP Sales',
          back_detail: "Founding member. Ex-Ziff Davis. Doesn't want data feeds mentioned on sales calls (fears cannibalizing lead gen). Tina works laterally with Marty, not under him.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Chris Vriavas, Head of Strategy',
          back_detail: 'Founding member. Ex-Ziff Davis. Involved in strategic direction and M&A considerations.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Tim Ribich, Head of Product',
          back_detail: "Ben Luck's partner in product/data. Manages product roadmap and data platform development.",
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Romano, CIO',
          back_detail: 'Ex-MRP Prelytics. Manages the data feed infrastructure. Key technical partner for any DaaS delivery.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Anna, Data Team',
          back_detail: 'Ex-Demand Science. Currently swamped and under-directed. Potential resource for DaaS operations once structured.',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Ben Lefkowitz, VP Sales',
          back_detail: 'Sales leadership team. Direct seller, not to be confused with Ben Luck (Data Scientist).',
          image_url: null,
          source_attribution: null,
        },
        {
          card_type: 'image',
          front_content: 'Who is this person?',
          back_content: 'Gurdeep "Singh" Chimni, Chairman',
          back_detail: "51% owner. Pronunciation: gur-DEEP SING CHIM-nee. TA Associates owns the other 49% (inherited via FD Technologies acquisition). TA's stake is non-core, likely 12-18 month exit window.",
          image_url: null,
          source_attribution: null,
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
