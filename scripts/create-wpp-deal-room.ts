/**
 * One-off script: create WPP deal room for Valerie Mercurio meeting follow-up.
 *
 * - Upserts WPP into gtm_company_profiles (with Valerie + Lauren + Anne-Isabelle as contacts)
 * - Selects all active products in the room (excluding surgeengine-platform, audience-dashboard)
 * - Sets custom Why Us, Use Cases, header, welcome copy tailored to WPP / Open Intelligence
 * - Auto-generates password from intent-data jargon pool
 * - Creates room with status='active', audience dashboard + DaaS Framework demo on
 *
 * Usage:
 *   npx tsx scripts/create-wpp-deal-room.ts
 *   npx tsx scripts/create-wpp-deal-room.ts --dry-run
 */

import bcrypt from 'bcryptjs';
import { getAdminClient } from './lib/supabase';

const COMPANY_SLUG = 'wpp';
const ROOM_SLUG = 'wpp-apr-2026';

const companyData = {
  slug: COMPANY_SLUG,
  name: 'WPP',
  description:
    "World's largest advertising holding company. Mid-Elevate28 restructuring (Feb 2026), collapsed into four operating units (Creative, Media, Production, Enterprise Solutions). Open Intelligence (built on InfoSum, $150M acquisition) is the data spine. Agent Hub launched at CES Jan 2026.",
  hq_location: 'London, UK',
  employee_count: '~100,000',
  annual_revenue: '$15B+',
  website: 'https://www.wpp.com',
  why_they_need_us:
    'Open Intelligence and Agent Hub were built around consumer brand data (Nestlé, Coca-Cola). WPP agency clients running B2B ABM (tech, enterprise software) need account- and contact-level B2B intent. pharosIQ is the signal source that plugs into Open Intelligence without competing with it.',
  recent_news:
    'Elevate28 restructuring (Feb 2026). Anne-Isabelle Choueiri hired as Chief Transformation Officer (April 2026, ex-Estée Lauder). Lauren Wetzel running Open Intelligence as Global President, Data and Technology Solutions. Negotiating outcome-based pricing with Jaguar Land Rover.',
  company_tier: 'tier_1' as const,
  contacts: [
    {
      name: 'Valerie Mercurio',
      title: 'Global Head of Data Enablement',
      why_this_person:
        "Operationalizing the connected intelligence thesis across 100,000 people. Building the infrastructure and signal layer that makes WPP's data strategy real. Intro via Neil Glass.",
    },
    {
      name: 'Lauren Wetzel',
      title: 'Global President, Data and Technology Solutions / CEO of InfoSum',
      why_this_person:
        'Architect of Open Intelligence. The internal stakeholder Valerie is likely trying to impress. Her thesis: "Growth no longer comes from owning the most data. It comes from connecting the right intelligence."',
    },
    {
      name: 'Anne-Isabelle Choueiri',
      title: 'Chief Transformation Officer',
      why_this_person:
        'New (April 2026). Built "One ELC" at Estée Lauder. Reshaping how data capabilities are resourced across the four-unit structure.',
    },
    {
      name: 'Mark Read',
      title: 'CEO',
      why_this_person:
        'Under pressure to show growth by 2028. Partnerships that accelerate B2B outcomes for major clients are politically valuable.',
    },
  ],
};

const customHeader = 'Built for WPP: Connected Intelligence for B2B';

const welcomeMessage =
  'Welcome. This room is built around where WPP is going: connected intelligence, output-based outcomes, and a signal layer that activates across agencies. pharosIQ surfaces first-party B2B behavioral signals at the account and contact level, an additive input source for Open Intelligence as it extends intent-driven outcomes to enterprise marketer clients.';

const customWhyUs = [
  {
    title: 'First-party signal, deterministic resolution',
    description:
      '360M+ first-party contacts, 650+ intent categories. Every signal originates from owned content consumption, tied to a specific person at a specific account.',
  },
  {
    title: 'Built to plug into the spine',
    description:
      'Designed as a pure signal source. Pairs naturally with Open Intelligence and InfoSum as an additional data input.',
  },
  {
    title: 'A B2B layer for enterprise marketer clients',
    description:
      'Account- and contact-level signals from observed B2B content consumption. An additive input that broadens signal coverage for B2B-skewed engagements.',
  },
  {
    title: 'Closed-loop input for outcome-based pricing',
    description:
      'Confirms the audience was in-market, not just reached. Closes the loop on outcome models.',
  },
  {
    title: 'Agent-ready',
    description:
      'Signal cadence and scoring tuned for agentic GTM workflows. Stays sharp as agent-driven activation scales.',
  },
];

const customUseCasesIntro =
  "Suggested use cases, mapped to WPP's connected intelligence direction. A starting list, not exhaustive.";

const customUseCases = [
  {
    title: 'B2B enrichment for ABM agency clients',
    description:
      'Tech and enterprise software clients running ABM through Mindshare or EssenceMediacom get account- and contact-level intent signals for targeting and personalization.',
    persona: 'WPP Media, agency leads',
  },
  {
    title: 'Open Intelligence input layer',
    description:
      'First-party B2B behavioral signals enrich Open Intelligence queries for B2B-skewed clients. Plugs into InfoSum infrastructure without overlap.',
    persona: 'Open Intelligence team',
  },
  {
    title: 'Agent Hub data foundation for B2B clients',
    description:
      'Brand Analytics Agent and future agents serving enterprise software, financial services, or industrial clients benefit from a B2B signal feed.',
    persona: 'Agent Hub product team',
  },
  {
    title: 'Outcome-pricing proof for B2B engagements',
    description:
      'Outcome models need closed-loop validation. Intent signals confirm in-market audience composition for B2B campaign reporting.',
    persona: 'Commercial / pricing team',
  },
  {
    title: 'Differentiated signal layer for WPP Enterprise Solutions',
    description:
      'First-party B2B intent adds a distinctive input source to the Enterprise Solutions data services line. Pairs with existing capabilities to broaden the unit value proposition.',
    persona: 'Enterprise Solutions leadership',
  },
];

function generatePassword(): string {
  const intentWords = [
    'surge', 'intent', 'signal', 'persona', 'funnel', 'pipeline',
    'inmarket', 'topical', 'firmographic', 'technographic',
    'bombora', 'bidstream', 'cohort', 'propensity', 'lookalike',
  ];
  const schemaWords = [
    'contact', 'account', 'domain', 'seniority', 'vertical',
    'taxonomy', 'segment', 'enrichment', 'webhook', 'schema',
    'dataset', 'payload', 'record', 'field', 'index',
  ];
  const martechWords = [
    'nurture', 'retarget', 'syndicate', 'lifecycle', 'attribution',
    'qualified', 'MQL', 'ABM', 'CPL', 'TAM', 'ICP',
    'programmatic', 'demand', 'conversion', 'outbound',
  ];
  const pools = [intentWords, schemaWords, martechWords];
  const pool1 = pools[Math.floor(Math.random() * pools.length)];
  const pool2 = pools[Math.floor(Math.random() * pools.length)];
  const w1 = pool1[Math.floor(Math.random() * pool1.length)];
  const w2 = pool2[Math.floor(Math.random() * pool2.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${w1}-${w2}-${num}`;
}

const EXCLUDED_PRODUCT_SLUGS = new Set(['surgeengine-platform', 'audience-dashboard']);

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const supabase = getAdminClient();

  // Resolve user_id from any existing company in the catalog (Tina's DB).
  // Falls back to USER_ID env if no companies exist.
  let userId: string | undefined;
  const { data: anyCompany } = await supabase
    .from('gtm_company_profiles')
    .select('user_id')
    .limit(1)
    .maybeSingle();
  userId = anyCompany?.user_id ?? process.env.USER_ID;

  if (!userId) {
    console.error('[wpp-room] Could not resolve user_id. Set USER_ID env var.');
    process.exit(1);
  }
  console.log(`[wpp-room] Using user_id: ${userId}`);

  // Upsert WPP company
  const { data: company, error: companyError } = await supabase
    .from('gtm_company_profiles')
    .upsert(
      { ...companyData, user_id: userId, is_active: true },
      { onConflict: 'user_id,slug' }
    )
    .select('company_id, name')
    .single();

  if (companyError || !company) {
    console.error('[wpp-room] Failed to upsert WPP company:', companyError?.message);
    process.exit(1);
  }
  console.log(`[wpp-room] WPP company ready: ${company.company_id}`);

  // Pull active products (exclude surgeengine-platform + audience-dashboard like the UI does)
  const { data: products, error: productsError } = await supabase
    .from('gtm_products')
    .select('product_id, slug, name, display_order')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('display_order');

  if (productsError) {
    console.error('[wpp-room] Failed to fetch products:', productsError.message);
    process.exit(1);
  }

  const selectedProducts = (products ?? [])
    .filter((p) => !EXCLUDED_PRODUCT_SLUGS.has(p.slug))
    .map((p, i) => ({ product_id: p.product_id, display_order: i }));

  console.log(`[wpp-room] Including ${selectedProducts.length} product(s):`);
  for (const p of products ?? []) {
    if (!EXCLUDED_PRODUCT_SLUGS.has(p.slug)) {
      console.log(`  - ${p.name} (${p.slug})`);
    }
  }

  // Check for existing room with same slug
  const { data: existingRoom } = await supabase
    .from('deal_rooms')
    .select('room_id, slug')
    .eq('slug', ROOM_SLUG)
    .maybeSingle();

  if (existingRoom) {
    console.error(
      `[wpp-room] Room with slug "${ROOM_SLUG}" already exists (room_id=${existingRoom.room_id}). Aborting to avoid clobber. Delete it first or change ROOM_SLUG.`
    );
    process.exit(1);
  }

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const roomPayload = {
    user_id: userId,
    company_id: company.company_id,
    slug: ROOM_SLUG,
    password_hash: passwordHash,
    password_plain: password,
    status: 'active' as const,
    custom_header: customHeader,
    welcome_message: welcomeMessage,
    selected_products: selectedProducts,
    selected_demos: [{ demo_type: 'daas_framework' }],
    show_audience_dashboard: true,
    audience_dashboard_url: 'https://atlasiq.pharosiq.com/audience-dashboard.html',
    show_quote_builder: true,
    custom_pricing: [],
    custom_use_cases: customUseCases,
    custom_use_cases_intro: customUseCasesIntro,
    custom_why_us: customWhyUs,
  };

  if (dryRun) {
    console.log('\n[wpp-room] DRY RUN — would create room with:');
    console.log(JSON.stringify({ ...roomPayload, password_hash: '<bcrypt>', password_plain: password }, null, 2));
    return;
  }

  const { data: room, error: roomError } = await supabase
    .from('deal_rooms')
    .insert(roomPayload)
    .select('room_id, slug')
    .single();

  if (roomError || !room) {
    console.error('[wpp-room] Failed to create deal room:', roomError?.message);
    process.exit(1);
  }

  console.log('\n[wpp-room] Done.');
  console.log(`  Room ID:  ${room.room_id}`);
  console.log(`  Slug:     ${room.slug}`);
  console.log(`  Password: ${password}`);
  console.log(`  URL:      https://revsignal.vercel.app/room/${room.slug}`);
  console.log(`            (or your prod RevSignal domain — confirm path /room/${room.slug})`);
}

main().catch((err) => {
  console.error('[wpp-room] Fatal:', err);
  process.exit(1);
});
