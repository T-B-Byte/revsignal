/**
 * Seed script: B2BMX 2026 tradeshow data
 *
 * Populates the tradeshows, tradeshow_targets, and tradeshow_contacts tables
 * with the manually researched B2BMX 2026 target list (12 companies).
 *
 * Usage:
 *   npx tsx scripts/seed-tradeshow-b2bmx.ts
 *   npx tsx scripts/seed-tradeshow-b2bmx.ts --user-id <uuid>
 *   npx tsx scripts/seed-tradeshow-b2bmx.ts --dry-run
 */

import { getAdminClient, getUserId } from './lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TargetData {
  company: string;
  sponsorship_tier: string;
  company_description: string | null;
  icp_category: string | null;
  icp_fit_strength: string | null;
  estimated_acv: number | null;
  priority: string;
  priority_rationale: string | null;
  pitch_angle: string | null;
  is_competitor: boolean;
  competitor_notes: string | null;
  bombora_angle: string | null;
  contacts: ContactData[];
}

interface ContactData {
  name: string;
  title: string | null;
  why_this_person: string | null;
  linkedin_url: string | null;
  approach_strategy: string | null;
}

// ---------------------------------------------------------------------------
// B2BMX 2026 Data
// ---------------------------------------------------------------------------

function buildTargets(): TargetData[] {
  return [
    // ===== PRIORITY 1: WALK UP =====
    {
      company: 'Integrate',
      sponsorship_tier: 'Title',
      company_description: 'ABM and demand generation platform combining intent data, account intelligence, and programmatic advertising.',
      icp_category: 'ABM Platforms',
      icp_fit_strength: 'Strong',
      estimated_acv: 350000,
      priority: 'priority_1_walk_up',
      priority_rationale: 'Already partners with Bombora for intent data. Proven buyer of data licensing deals.',
      pitch_angle: 'Integrate already buys Bombora co-op data for their platform. pharosIQ\'s first-party, contact-level signals are a different, complementary source that gives their customers exclusive intent data their competitors can\'t access.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'They already buy Bombora co-op data. pharosIQ\'s first-party, contact-level signals are a different, complementary source. Colby came from 6sense and eXelate, he\'ll get the data differentiation immediately.',
      contacts: [
        { name: 'Colby Cavanaugh', title: 'VP BD & Alliances', why_this_person: 'Owns data partnership deals. Background at 6sense and eXelate means he understands intent data differentiation.', linkedin_url: null, approach_strategy: 'Lead with the first-party vs. co-op differentiation. He\'ll immediately understand the signal quality difference.' },
        { name: 'Aaron Mahimainathan', title: 'CPO', why_this_person: 'Approves data integrations into the Integrate platform.', linkedin_url: null, approach_strategy: 'Focus on technical integration — API delivery, contact-level matching, and how pharosIQ data complements their existing Bombora feed.' },
        { name: 'Frannie Danzinger', title: 'SVP Sales/Marketing/Partnerships', why_this_person: 'Oversees partnership revenue and can champion the deal internally.', linkedin_url: null, approach_strategy: 'Frame as a revenue opportunity — offering pharosIQ data as a premium signal source differentiates Integrate from competitors using the same Bombora co-op data.' },
      ],
    },
    {
      company: 'Madison Logic',
      sponsorship_tier: 'Gold',
      company_description: 'B2B content syndication and ABM platform that activates intent data across display, content, and social channels.',
      icp_category: 'Content Syndication',
      icp_fit_strength: 'Strong',
      estimated_acv: 150000,
      priority: 'priority_1_walk_up',
      priority_rationale: 'Actively licensing intent data from multiple sources. Board member is Bombora\'s CEO.',
      pitch_angle: 'Madison Logic layers intent data on content syndication delivery. pharosIQ\'s contact-level, first-party signals would give their customers more precise targeting than account-level co-op data — a competitive differentiator.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'Bombora CEO sits on their board. Don\'t position as a Bombora replacement. Position as a unique first-party signal that complements their existing co-op data.',
      contacts: [
        { name: 'Dorothy Young', title: 'CCO', why_this_person: 'Oversees commercial strategy and data partnerships.', linkedin_url: null, approach_strategy: 'Lead with complementary positioning — pharosIQ adds exclusive signals alongside their existing Bombora integration.' },
        { name: 'Liz Ronco', title: 'SVP Product', why_this_person: 'Owns product decisions about data integrations.', linkedin_url: null, approach_strategy: 'Focus on contact-level precision and how it improves their content syndication targeting.' },
        { name: 'Erik Matlick', title: 'Board Member (Bombora CEO)', why_this_person: 'Understanding the Bombora relationship is critical. Don\'t pitch to replace Bombora.', linkedin_url: null, approach_strategy: 'Approach carefully. This is a political relationship. If you meet him, position pharosIQ as complementary, not competitive.' },
      ],
    },
    {
      company: 'Demandbase',
      sponsorship_tier: 'Silver',
      company_description: 'Full ABM platform with advertising, intent data, sales intelligence, and orchestration. Aggregates multiple intent sources.',
      icp_category: 'ABM Platforms',
      icp_fit_strength: 'Strong',
      estimated_acv: 350000,
      priority: 'priority_1_walk_up',
      priority_rationale: 'Aggregates multiple intent sources. Active data partnership buyer with budget.',
      pitch_angle: 'Demandbase already aggregates intent from Bombora, TechTarget, and proprietary sources. Adding pharosIQ\'s first-party contact-level data expands their signal coverage with an exclusive source their competitors can\'t replicate.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'They already aggregate intent from multiple sources including Bombora and TechTarget. Adding pharosIQ\'s first-party contact-level data expands their signal coverage.',
      contacts: [
        { name: 'Vanessa Willett', title: 'VP Ecosystems', why_this_person: 'Manages data and technology partnerships.', linkedin_url: null, approach_strategy: 'Lead with the multi-source aggregation angle — pharosIQ adds a signal source their competitors don\'t have access to.' },
        { name: 'Mike Hilts', title: 'SVP Data Solutions', why_this_person: 'Oversees data quality and data partnership strategy.', linkedin_url: null, approach_strategy: 'Focus on data quality differentiators — first-party vs. co-op, contact-level vs. account-level, exclusive vs. shared.' },
      ],
    },
    {
      company: '6sense',
      sponsorship_tier: 'Supporting',
      company_description: 'Revenue AI platform processing 500B+ signals/month. Full-stack ABM with intent data, predictive analytics, and orchestration.',
      icp_category: 'ABM Platforms',
      icp_fit_strength: 'Strong',
      estimated_acv: 350000,
      priority: 'priority_1_walk_up',
      priority_rationale: 'Aggregates intent signals from multiple partners. Active buyer with massive data appetite.',
      pitch_angle: '6sense is built on aggregated intent. Adding first-party, contact-level data from pharosIQ gives their platform a signal source their competitors can\'t access — and differentiates their offering in a market where Bombora co-op data is table stakes.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'Built on aggregated intent. Adding first-party, contact-level data from pharosIQ gives their platform a signal source their competitors can\'t access.',
      contacts: [
        { name: 'Elliot Smith', title: 'SVP Head of Partnerships', why_this_person: 'Directly owns data and technology partnerships.', linkedin_url: null, approach_strategy: 'Lead with exclusivity — pharosIQ data isn\'t available through co-op networks, giving 6sense a competitive advantage over platforms using shared Bombora data.' },
        { name: 'Kimberly Bloomston', title: 'CPO', why_this_person: 'Owns product strategy and data integration decisions.', linkedin_url: null, approach_strategy: 'Focus on how contact-level precision enhances their AI models and predictive accuracy.' },
      ],
    },
    {
      company: 'Influ2',
      sponsorship_tier: 'Platinum',
      company_description: 'Person-based advertising platform for B2B. Targets individual decision-makers with display ads.',
      icp_category: 'Ad Tech / DSPs',
      icp_fit_strength: 'Strong',
      estimated_acv: 175000,
      priority: 'priority_1_walk_up',
      priority_rationale: 'Person-based advertising. Contact-level intent is their exact gap.',
      pitch_angle: 'Influ2 does person-based advertising but lacks person-based intent signals. pharosIQ\'s contact-level data tells them WHICH individuals are actively researching, so they can target ads to people showing real buying intent — not just people at the right company.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'Nirosha built Bombora\'s brand. She understands intent data intimately. pharosIQ\'s contact-level precision aligns perfectly with Influ2\'s person-based advertising model.',
      contacts: [
        { name: 'Chris Murray', title: 'VP Partnerships', why_this_person: 'Owns data and technology partnerships.', linkedin_url: null, approach_strategy: 'Lead with the person-based angle — their ads target individuals, pharosIQ identifies which individuals are actively researching.' },
        { name: 'Nirosha Methananda', title: 'VP Marketing (ex-Bombora)', why_this_person: 'Built Bombora\'s brand. Understands intent data deeply. Will immediately grasp the first-party vs. co-op differentiation.', linkedin_url: null, approach_strategy: 'She knows intent data better than most. Skip the 101 and go straight to data provenance, signal freshness, and contact-level precision.' },
        { name: 'Dmitri Lisitski', title: 'CEO', why_this_person: 'Co-founder with vision for person-based marketing. Strategic decision-maker.', linkedin_url: null, approach_strategy: 'Frame as a strategic data moat — exclusive first-party intent signals that their competitors can\'t get from Bombora.' },
      ],
    },

    // ===== PRIORITY 2: STRONG CONVERSATIONS =====
    {
      company: 'Pipeline 360',
      sponsorship_tier: 'Title',
      company_description: 'B2B content syndication and demand generation platform.',
      icp_category: 'Content Syndication',
      icp_fit_strength: 'Moderate',
      estimated_acv: 150000,
      priority: 'priority_2_strong_conversation',
      priority_rationale: 'Content syndication player. Could layer intent signals on lead delivery but unclear data partnership strategy.',
      pitch_angle: 'Pipeline 360 delivers leads through content syndication. Layering pharosIQ intent signals on their delivery would let them prioritize high-intent leads and increase conversion rates for their customers.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: null,
      contacts: [
        { name: 'Michael Latchford', title: 'SVP Global Partner Marketing Solutions', why_this_person: 'Oversees partner and marketing solutions strategy.', linkedin_url: null, approach_strategy: 'Frame intent data as a way to improve lead quality scores and increase customer retention.' },
        { name: 'Tony Uphoff', title: 'CEO', why_this_person: 'Strategic decision-maker for data partnerships.', linkedin_url: null, approach_strategy: 'High-level conversation about data differentiation in the content syndication market.' },
      ],
    },
    {
      company: 'StackAdapt',
      sponsorship_tier: 'Digital',
      company_description: 'Programmatic advertising platform with B2B targeting capabilities.',
      icp_category: 'Ad Tech / DSPs',
      icp_fit_strength: 'Moderate',
      estimated_acv: 175000,
      priority: 'priority_2_strong_conversation',
      priority_rationale: 'Programmatic DSP expanding B2B capabilities. Recently integrated multiple intent data sources.',
      pitch_angle: 'StackAdapt is building B2B programmatic capabilities and has already integrated Bombora, Lead Forensics, and Leadspace. pharosIQ would add exclusive first-party intent audiences they can\'t get from other sources.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: 'Recently integrated Bombora, Lead Forensics, Leadspace. Adding pharosIQ would diversify their intent signal sources.',
      contacts: [
        { name: 'Michael Shang', title: 'SVP Advertising Technologies', why_this_person: 'Oversees data integrations and B2B advertising capabilities.', linkedin_url: null, approach_strategy: 'Focus on audience quality — pharosIQ\'s first-party contact-level data creates more precise B2B audience segments than co-op sources.' },
      ],
    },
    {
      company: 'Foundry',
      sponsorship_tier: 'Gold',
      company_description: 'IDG/Foundry. B2B data and media company. Bought KickFire.',
      icp_category: 'Data Enrichment',
      icp_fit_strength: 'Moderate',
      estimated_acv: 350000,
      priority: 'priority_2_strong_conversation',
      priority_rationale: 'IDG/Foundry. Bought KickFire. Tina knows these people.',
      pitch_angle: 'Foundry already operates in the B2B data space and bought KickFire for IP-to-company intent data. pharosIQ\'s contact-level, first-party intent signals could complement their existing data assets.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: null,
      contacts: [
        { name: 'Ann-Christel Graham', title: 'CRO', why_this_person: 'Oversees revenue and commercial partnerships.', linkedin_url: null, approach_strategy: 'Tina has relationships here from the KickFire acquisition. Warm outreach, focus on how pharosIQ data complements their existing assets.' },
        { name: 'Rajashree Rammohan', title: 'VP Partner & Alliance Marketing', why_this_person: 'Manages partner ecosystem and marketing alliances.', linkedin_url: null, approach_strategy: 'Partner-focused conversation about co-marketing and data integration opportunities.' },
      ],
    },
    {
      company: 'NetLine',
      sponsorship_tier: 'Platinum',
      company_description: 'B2B content syndication and intent data platform. Operates the largest B2B content syndication network.',
      icp_category: 'Content Syndication',
      icp_fit_strength: 'Moderate',
      estimated_acv: 150000,
      priority: 'priority_2_strong_conversation',
      priority_rationale: 'Content syndication and intent data. Competitor in some ways, partner in others.',
      pitch_angle: 'NetLine generates first-party intent from their content syndication network. pharosIQ\'s data comes from a different content ecosystem. Complementary rather than competitive — together they\'d cover more of the buyer journey.',
      is_competitor: false,
      competitor_notes: null,
      bombora_angle: null,
      contacts: [
        { name: 'David Fortino', title: 'Chief Strategy Officer', why_this_person: 'Owns strategy and partnerships. Will understand the data landscape.', linkedin_url: null, approach_strategy: 'Position as complementary data sources covering different parts of the buyer journey. Explore partnership, not just licensing.' },
      ],
    },

    // ===== PRIORITY 3: COMPETITIVE INTEL / LISTEN ONLY =====
    {
      company: 'Intentsify',
      sponsorship_tier: 'Gold',
      company_description: 'Intent data platform. Fastest-growing intent data company. #1 in Forrester Wave for intent data.',
      icp_category: 'Outside ICP',
      icp_fit_strength: 'Weak',
      estimated_acv: null,
      priority: 'priority_3_competitive_intel',
      priority_rationale: 'Direct competitor in intent data. Observe, don\'t pitch.',
      pitch_angle: null,
      is_competitor: true,
      competitor_notes: 'Walk their booth. Grab collateral. Listen to their pitch. Note pricing, positioning, new features, and customer testimonials they\'re highlighting.',
      bombora_angle: null,
      contacts: [],
    },
    {
      company: 'Demand Science',
      sponsorship_tier: 'Digital',
      company_description: 'B2B demand generation and intent data company.',
      icp_category: 'Outside ICP',
      icp_fit_strength: 'Weak',
      estimated_acv: null,
      priority: 'priority_3_competitive_intel',
      priority_rationale: 'Competitor. Anna\'s former employer. Observe.',
      pitch_angle: null,
      is_competitor: true,
      competitor_notes: 'Anna\'s former employer. Competitor. Observe their booth, note messaging changes and new product offerings.',
      bombora_angle: null,
      contacts: [],
    },
    {
      company: 'Anteriad',
      sponsorship_tier: 'Digital',
      company_description: 'B2B data-driven marketing solutions and intent data provider.',
      icp_category: 'Outside ICP',
      icp_fit_strength: 'Weak',
      estimated_acv: null,
      priority: 'priority_3_competitive_intel',
      priority_rationale: 'Straddles partner/competitor line. Approach carefully.',
      pitch_angle: null,
      is_competitor: true,
      competitor_notes: 'Straddles partner/competitor. Observe their positioning and any new data partnerships they\'re announcing.',
      bombora_angle: null,
      contacts: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// Seed function
// ---------------------------------------------------------------------------

export async function seedTradeshowB2bmx(
  options: { dryRun?: boolean } = {}
): Promise<number> {
  const { dryRun = false } = options;
  const userId = getUserId();
  const targets = buildTargets();

  const totalContacts = targets.reduce((sum, t) => sum + t.contacts.length, 0);

  console.log(
    `\n[seed:tradeshow-b2bmx] ${dryRun ? 'DRY RUN — ' : ''}Preparing B2BMX 2026 data:`
  );
  console.log(`  1 tradeshow`);
  console.log(`  ${targets.length} targets`);
  console.log(`  ${totalContacts} contacts`);

  // Summary by priority
  const p1 = targets.filter((t) => t.priority === 'priority_1_walk_up').length;
  const p2 = targets.filter((t) => t.priority === 'priority_2_strong_conversation').length;
  const p3 = targets.filter((t) => t.priority === 'priority_3_competitive_intel').length;
  console.log(`  P1: ${p1}, P2: ${p2}, P3: ${p3}\n`);

  if (dryRun) {
    console.log('[seed:tradeshow-b2bmx] DRY RUN — Preview:');
    for (const t of targets) {
      console.log(
        `  [${t.priority}] ${t.company} (${t.sponsorship_tier}) — ${t.contacts.length} contacts`
      );
    }
    console.log(
      `\n[seed:tradeshow-b2bmx] DRY RUN complete. Would insert 1 tradeshow, ${targets.length} targets, ${totalContacts} contacts.\n`
    );
    return targets.length;
  }

  const supabase = getAdminClient();

  // 1. Upsert the tradeshow
  const totalPipeline = targets
    .filter((t) => !t.is_competitor)
    .reduce((sum, t) => sum + (t.estimated_acv || 0), 0);

  const { data: tradeshow, error: tradeshowError } = await supabase
    .from('tradeshows')
    .upsert(
      {
        user_id: userId,
        name: 'B2BMX 2026',
        dates: 'March 9-11, 2026',
        location: 'Omni La Costa Resort, Carlsbad, CA',
        status: 'complete',
        analysis_summary: `Manually researched target list. ${targets.length} sponsors analyzed.`,
        total_sponsors: targets.length,
        total_estimated_pipeline: totalPipeline,
        analyzed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,name', ignoreDuplicates: false }
    )
    .select('tradeshow_id')
    .single();

  if (tradeshowError || !tradeshow) {
    // If upsert fails due to missing unique constraint, try insert
    console.log('[seed:tradeshow-b2bmx] Upsert failed, trying direct insert...');

    // Delete existing if any
    await supabase
      .from('tradeshows')
      .delete()
      .eq('user_id', userId)
      .eq('name', 'B2BMX 2026');

    const { data: inserted, error: insertError } = await supabase
      .from('tradeshows')
      .insert({
        user_id: userId,
        name: 'B2BMX 2026',
        dates: 'March 9-11, 2026',
        location: 'Omni La Costa Resort, Carlsbad, CA',
        status: 'complete',
        analysis_summary: `Manually researched target list. ${targets.length} sponsors analyzed.`,
        total_sponsors: targets.length,
        total_estimated_pipeline: totalPipeline,
        analyzed_at: new Date().toISOString(),
      })
      .select('tradeshow_id')
      .single();

    if (insertError || !inserted) {
      console.error('[seed:tradeshow-b2bmx] Error creating tradeshow:', insertError?.message);
      throw insertError || new Error('Failed to create tradeshow');
    }

    return await insertTargetsAndContacts(supabase, userId, inserted.tradeshow_id, targets);
  }

  return await insertTargetsAndContacts(supabase, userId, tradeshow.tradeshow_id, targets);
}

async function insertTargetsAndContacts(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
  tradeshowId: string,
  targets: TargetData[]
): Promise<number> {
  // 2. Delete existing targets for this tradeshow (cascade deletes contacts)
  await supabase
    .from('tradeshow_targets')
    .delete()
    .eq('tradeshow_id', tradeshowId);

  // 3. Insert targets
  const targetRows = targets.map((t, i) => ({
    tradeshow_id: tradeshowId,
    user_id: userId,
    company: t.company,
    sponsorship_tier: t.sponsorship_tier,
    company_description: t.company_description,
    icp_category: t.icp_category,
    icp_fit_strength: t.icp_fit_strength,
    estimated_acv: t.estimated_acv,
    priority: t.priority,
    priority_rationale: t.priority_rationale,
    pitch_angle: t.pitch_angle,
    is_competitor: t.is_competitor,
    competitor_notes: t.competitor_notes,
    bombora_angle: t.bombora_angle,
    research_status: t.contacts.length > 0 ? 'complete' : 'pending',
    sort_order: i,
  }));

  const { data: insertedTargets, error: targetError } = await supabase
    .from('tradeshow_targets')
    .insert(targetRows)
    .select('target_id, company');

  if (targetError) {
    console.error('[seed:tradeshow-b2bmx] Error inserting targets:', targetError.message);
    throw targetError;
  }

  const insertedTargetList = insertedTargets || [];
  console.log(`[seed:tradeshow-b2bmx] Inserted ${insertedTargetList.length} targets.`);

  // 4. Insert contacts for each target
  let totalContactsInserted = 0;
  for (const target of targets) {
    if (target.contacts.length === 0) continue;

    const matchedTarget = insertedTargetList.find(
      (t: { target_id: string; company: string }) => t.company === target.company
    );
    if (!matchedTarget) continue;

    const contactRows = target.contacts.map((c, i) => ({
      target_id: matchedTarget.target_id,
      user_id: userId,
      name: c.name,
      title: c.title,
      why_this_person: c.why_this_person,
      linkedin_url: c.linkedin_url,
      approach_strategy: c.approach_strategy,
      sort_order: i,
    }));

    const { error: contactError } = await supabase
      .from('tradeshow_contacts')
      .insert(contactRows);

    if (contactError) {
      console.error(`[seed:tradeshow-b2bmx] Error inserting contacts for ${target.company}:`, contactError.message);
    } else {
      totalContactsInserted += contactRows.length;
    }
  }

  console.log(`[seed:tradeshow-b2bmx] Inserted ${totalContactsInserted} contacts.`);
  return insertedTargetList.length;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------

const isDirectRun = process.argv[1]?.includes('seed-tradeshow-b2bmx');
if (isDirectRun) {
  const dryRun = process.argv.includes('--dry-run');

  seedTradeshowB2bmx({ dryRun })
    .then((count) => {
      console.log(`[seed:tradeshow-b2bmx] Done. ${count} targets processed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed:tradeshow-b2bmx] Fatal error:', err);
      process.exit(1);
    });
}
