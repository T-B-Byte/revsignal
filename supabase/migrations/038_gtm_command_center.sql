-- GTM Command Center & Deal Rooms
-- Manages product catalog, company targeting, product recommendations,
-- customer-facing deal rooms with password protection, and quote builder.

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE gtm_product_category AS ENUM (
  'data_feeds',
  'intelligence_reports',
  'monitoring',
  'data_products',
  'platform'
);

CREATE TYPE deal_room_status AS ENUM (
  'draft',
  'active',
  'expired',
  'archived'
);

CREATE TYPE quote_status AS ENUM (
  'draft',
  'submitted',
  'reviewed',
  'accepted',
  'declined'
);

CREATE TYPE company_tier AS ENUM (
  'tier_1',
  'tier_2',
  'tier_3',
  'tier_4',
  'tier_5'
);

CREATE TYPE fit_strength AS ENUM (
  'strong',
  'moderate',
  'exploratory'
);

-- ============================================================
-- GTM PRODUCTS
-- ============================================================
-- Master catalog of everything pharosIQ sells.
-- Seeded from existing .md files, managed via dashboard.

CREATE TABLE gtm_products (
  product_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  name              text NOT NULL,
  category          gtm_product_category NOT NULL,
  tagline           text,

  -- Core messaging
  value_prop        text,
  problem_statement text,
  key_stats         jsonb DEFAULT '[]'::jsonb,        -- [{stat, source}]

  -- Features & benefits
  features          jsonb DEFAULT '[]'::jsonb,        -- [{name, description}]
  benefits          jsonb DEFAULT '[]'::jsonb,        -- [{benefit, for_whom}]
  use_cases         jsonb DEFAULT '[]'::jsonb,        -- [{title, description, persona}]
  differentiators   jsonb DEFAULT '[]'::jsonb,        -- [{vs_competitor, advantage}]

  -- Pricing
  pricing_tiers     jsonb DEFAULT '{}'::jsonb,        -- {tier_name: {price, unit, description}}
  packaging_notes   text,                              -- e.g. "Personas + intent topics only. Full file $1M+"

  -- Content assets
  linkedin_posts    jsonb DEFAULT '[]'::jsonb,        -- [{title, body, hashtags}]
  outreach_sequences jsonb DEFAULT '[]'::jsonb,       -- [{target_type, emails: [{subject, body}]}]
  battle_cards      jsonb DEFAULT '[]'::jsonb,        -- [{competitor, strengths, weaknesses, our_advantage}]

  -- Target personas
  target_personas   jsonb DEFAULT '[]'::jsonb,        -- [{tier, persona, why_they_buy}]

  -- Demo config (for deal rooms)
  demo_type         text,                              -- 'title_expansion' | 'icp_analyzer' | 'surge_dossier' | 'audience_dashboard' | null
  demo_config       jsonb DEFAULT '{}'::jsonb,        -- demo-specific settings

  -- Schema / integration details (for technical buyers)
  api_schema        jsonb DEFAULT '{}'::jsonb,        -- endpoint descriptions, sample payloads
  data_dictionary   jsonb DEFAULT '[]'::jsonb,        -- [{field, type, description}]
  sample_output     jsonb DEFAULT '{}'::jsonb,        -- example API response or file snippet

  -- Metadata
  is_active         boolean NOT NULL DEFAULT true,
  display_order     integer DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gtm_products_slug_user UNIQUE (user_id, slug)
);

-- ============================================================
-- GTM COMPANY PROFILES
-- ============================================================
-- Target companies with context for sales prep.

CREATE TABLE gtm_company_profiles (
  company_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug              text NOT NULL,
  name              text NOT NULL,
  logo_url          text,

  -- Company info
  description       text,
  hq_location       text,
  employee_count    text,                              -- "150+", "3,000", etc.
  annual_revenue    text,                              -- "$145M", "PE-backed", etc.
  website           text,
  linkedin_url      text,

  -- Why they matter
  why_they_need_us  text,
  recent_news       text,
  company_tier      company_tier DEFAULT 'tier_3',

  -- Key contacts
  contacts          jsonb DEFAULT '[]'::jsonb,        -- [{name, title, linkedin, email, why_this_person}]

  -- Relationship context
  deal_id           uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  prospect_id       uuid REFERENCES prospects(id) ON DELETE SET NULL,
  past_outreach     jsonb DEFAULT '[]'::jsonb,        -- [{date, channel, subject, outcome}]
  notes             text,

  -- Tags for filtering
  tags              text[] DEFAULT '{}',               -- e.g. ['abm_platform', 'pe_backed', 'new_ceo']

  -- Metadata
  is_active         boolean NOT NULL DEFAULT true,
  last_researched   timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gtm_companies_slug_user UNIQUE (user_id, slug)
);

-- ============================================================
-- GTM PRODUCT RECOMMENDATIONS
-- ============================================================
-- Junction table: which products fit which companies, and why.

CREATE TABLE gtm_product_recommendations (
  recommendation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES gtm_company_profiles(company_id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES gtm_products(product_id) ON DELETE CASCADE,

  -- Fit assessment
  fit_strength      fit_strength NOT NULL DEFAULT 'moderate',
  custom_angle      text,                              -- "Their MetaMatch identity graph needs title expansion"
  suggested_tier    text,                              -- "Intelligence", "OEM", etc.
  suggested_use_cases jsonb DEFAULT '[]'::jsonb,      -- [{title, description}]

  -- Deal room config
  include_in_deal_room boolean NOT NULL DEFAULT true,
  display_order     integer DEFAULT 0,
  custom_features   jsonb,                             -- Override product features for this company
  custom_pricing    jsonb,                             -- Override pricing for this company

  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT gtm_recs_unique UNIQUE (company_id, product_id)
);

-- ============================================================
-- DEAL ROOMS
-- ============================================================
-- Customer-facing, password-protected presentation pages.

CREATE TABLE deal_rooms (
  room_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES gtm_company_profiles(company_id) ON DELETE CASCADE,

  -- Access control
  slug              text NOT NULL UNIQUE,              -- URL-friendly identifier (e.g. "rollworks-apr-2026")
  password_hash     text NOT NULL,                     -- bcrypt hash of room password
  status            deal_room_status NOT NULL DEFAULT 'draft',
  expires_at        timestamptz,                       -- Optional expiration

  -- Customization
  custom_header     text,                              -- "Built for RollWorks" override
  welcome_message   text,

  -- Content selection
  selected_products jsonb DEFAULT '[]'::jsonb,        -- [{product_id, display_order, custom_notes}]
  selected_demos    jsonb DEFAULT '[]'::jsonb,        -- [{demo_type, config}]
  show_audience_dashboard boolean NOT NULL DEFAULT true,
  audience_dashboard_url  text,                       -- iframe src URL
  show_quote_builder boolean NOT NULL DEFAULT true,

  -- Branding
  company_logo_url  text,
  accent_color      text,                              -- Override brand-500 for this room

  -- Analytics
  view_count        integer NOT NULL DEFAULT 0,
  last_viewed_at    timestamptz,

  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DEAL ROOM QUOTES
-- ============================================================
-- Quotes generated by prospects in the deal room.

CREATE TABLE deal_room_quotes (
  quote_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           uuid NOT NULL REFERENCES deal_rooms(room_id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES gtm_company_profiles(company_id) ON DELETE CASCADE,

  -- Quote contents
  selected_items    jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{product_id, product_name, tier, quantity, unit_price, subtotal, notes}]
  total_price       numeric(12,2),
  currency          text NOT NULL DEFAULT 'USD',

  -- Prospect info (optional, captured at submission)
  prospect_name     text,
  prospect_email    text,
  prospect_title    text,
  prospect_notes    text,                              -- "Interested in pilot program" etc.

  -- Status
  status            quote_status NOT NULL DEFAULT 'draft',
  submitted_at      timestamptz,
  reviewed_at       timestamptz,

  -- Notification tracking
  tina_notified     boolean NOT NULL DEFAULT false,
  tina_notified_at  timestamptz,
  calendar_link_shown boolean NOT NULL DEFAULT false,

  -- Metadata
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DEAL ROOM ACCESS LOG
-- ============================================================
-- Track who accessed which room and when.

CREATE TABLE deal_room_access_log (
  log_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           uuid NOT NULL REFERENCES deal_rooms(room_id) ON DELETE CASCADE,
  accessed_at       timestamptz NOT NULL DEFAULT now(),
  ip_address        text,
  user_agent        text,
  pages_viewed      text[] DEFAULT '{}',
  duration_seconds  integer
);

-- ============================================================
-- DATA TEST REQUESTS
-- ============================================================
-- Prospects can upload up to 100 domains for a limited data test.
-- Standard test returns personas + intent topics only.
-- Full schema test (all fields) requires pre-approval from Tina.

CREATE TYPE data_test_scope AS ENUM (
  'personas_intent',       -- Standard: personas + intent topics only
  'full_schema'            -- All fields — requires pre-approval
);

CREATE TYPE data_test_status AS ENUM (
  'pending_upload',        -- Room created, awaiting domain list
  'domains_uploaded',      -- Domains received, awaiting processing
  'pending_approval',      -- Full-schema test awaiting Tina's approval
  'processing',            -- Running the data match
  'completed',             -- Results ready
  'expired',               -- Results expired / cleaned up
  'denied'                 -- Full-schema request denied
);

CREATE TABLE deal_room_data_tests (
  test_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           uuid NOT NULL REFERENCES deal_rooms(room_id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        uuid NOT NULL REFERENCES gtm_company_profiles(company_id) ON DELETE CASCADE,

  -- Test configuration
  scope             data_test_scope NOT NULL DEFAULT 'personas_intent',
  status            data_test_status NOT NULL DEFAULT 'pending_upload',

  -- Domain input (max 100)
  uploaded_domains  jsonb DEFAULT '[]'::jsonb,         -- ["acme.com", "globex.com", ...]
  domain_count      integer NOT NULL DEFAULT 0,

  -- Approval (for full_schema only)
  approval_requested_at timestamptz,
  approved_by       uuid REFERENCES auth.users(id),
  approved_at       timestamptz,
  denial_reason     text,

  -- Results
  results           jsonb,                             -- matched data, schema depends on scope
  match_count       integer,                           -- how many domains had data
  match_rate        numeric(5,2),                      -- percentage of domains matched

  -- Prospect info
  prospect_name     text,
  prospect_email    text,
  prospect_company  text,

  -- Metadata
  expires_at        timestamptz,                       -- Results auto-expire
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  -- Enforce 100 domain limit at DB level
  CONSTRAINT data_test_max_domains CHECK (domain_count <= 100)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Products
CREATE INDEX idx_gtm_products_user ON gtm_products(user_id);
CREATE INDEX idx_gtm_products_category ON gtm_products(user_id, category);
CREATE INDEX idx_gtm_products_slug ON gtm_products(user_id, slug);
CREATE INDEX idx_gtm_products_active ON gtm_products(user_id) WHERE is_active = true;

-- Companies
CREATE INDEX idx_gtm_companies_user ON gtm_company_profiles(user_id);
CREATE INDEX idx_gtm_companies_slug ON gtm_company_profiles(user_id, slug);
CREATE INDEX idx_gtm_companies_tier ON gtm_company_profiles(user_id, company_tier);
CREATE INDEX idx_gtm_companies_tags ON gtm_company_profiles USING gin(tags);
CREATE INDEX idx_gtm_companies_active ON gtm_company_profiles(user_id) WHERE is_active = true;

-- Recommendations
CREATE INDEX idx_gtm_recs_company ON gtm_product_recommendations(company_id);
CREATE INDEX idx_gtm_recs_product ON gtm_product_recommendations(product_id);
CREATE INDEX idx_gtm_recs_user ON gtm_product_recommendations(user_id);

-- Deal rooms
CREATE INDEX idx_deal_rooms_user ON deal_rooms(user_id);
CREATE INDEX idx_deal_rooms_company ON deal_rooms(company_id);
CREATE INDEX idx_deal_rooms_slug ON deal_rooms(slug);
CREATE INDEX idx_deal_rooms_active ON deal_rooms(user_id) WHERE status = 'active';

-- Quotes
CREATE INDEX idx_deal_room_quotes_room ON deal_room_quotes(room_id);
CREATE INDEX idx_deal_room_quotes_user ON deal_room_quotes(user_id);
CREATE INDEX idx_deal_room_quotes_status ON deal_room_quotes(user_id, status);
CREATE INDEX idx_deal_room_quotes_submitted ON deal_room_quotes(user_id) WHERE status = 'submitted';

-- Access log
CREATE INDEX idx_deal_room_access_room ON deal_room_access_log(room_id);
CREATE INDEX idx_deal_room_access_time ON deal_room_access_log(room_id, accessed_at DESC);

-- Data tests
CREATE INDEX idx_data_tests_room ON deal_room_data_tests(room_id);
CREATE INDEX idx_data_tests_user ON deal_room_data_tests(user_id);
CREATE INDEX idx_data_tests_status ON deal_room_data_tests(user_id, status);
CREATE INDEX idx_data_tests_pending ON deal_room_data_tests(user_id) WHERE status = 'pending_approval';

-- ============================================================
-- FULL TEXT SEARCH
-- ============================================================

ALTER TABLE gtm_products ADD COLUMN search_vector tsvector;
ALTER TABLE gtm_company_profiles ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_gtm_product_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.tagline, '') || ' ' ||
    coalesce(NEW.value_prop, '') || ' ' ||
    coalesce(NEW.problem_statement, '') || ' ' ||
    coalesce(NEW.packaging_notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_gtm_company_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.why_they_need_us, '') || ' ' ||
    coalesce(NEW.recent_news, '') || ' ' ||
    coalesce(NEW.notes, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_gtm_product_search
  BEFORE INSERT OR UPDATE ON gtm_products
  FOR EACH ROW EXECUTE FUNCTION update_gtm_product_search_vector();

CREATE TRIGGER trg_gtm_company_search
  BEFORE INSERT OR UPDATE ON gtm_company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_gtm_company_search_vector();

CREATE INDEX idx_gtm_products_search ON gtm_products USING gin(search_vector);
CREATE INDEX idx_gtm_companies_search ON gtm_company_profiles USING gin(search_vector);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER set_gtm_products_updated_at
  BEFORE UPDATE ON gtm_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_gtm_companies_updated_at
  BEFORE UPDATE ON gtm_company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_gtm_recs_updated_at
  BEFORE UPDATE ON gtm_product_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_deal_rooms_updated_at
  BEFORE UPDATE ON deal_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_deal_room_quotes_updated_at
  BEFORE UPDATE ON deal_room_quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_data_tests_updated_at
  BEFORE UPDATE ON deal_room_data_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- GTM Products (user-scoped)
ALTER TABLE gtm_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtm_products_select" ON gtm_products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gtm_products_insert" ON gtm_products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gtm_products_update" ON gtm_products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gtm_products_delete" ON gtm_products FOR DELETE USING (auth.uid() = user_id);

-- GTM Company Profiles (user-scoped)
ALTER TABLE gtm_company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtm_companies_select" ON gtm_company_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gtm_companies_insert" ON gtm_company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gtm_companies_update" ON gtm_company_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gtm_companies_delete" ON gtm_company_profiles FOR DELETE USING (auth.uid() = user_id);

-- GTM Product Recommendations (user-scoped)
ALTER TABLE gtm_product_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gtm_recs_select" ON gtm_product_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "gtm_recs_insert" ON gtm_product_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gtm_recs_update" ON gtm_product_recommendations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "gtm_recs_delete" ON gtm_product_recommendations FOR DELETE USING (auth.uid() = user_id);

-- Deal Rooms (user-scoped for management, public access via password in app logic)
ALTER TABLE deal_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_rooms_select" ON deal_rooms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deal_rooms_insert" ON deal_rooms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deal_rooms_update" ON deal_rooms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deal_rooms_delete" ON deal_rooms FOR DELETE USING (auth.uid() = user_id);

-- Deal Room Quotes (user-scoped for viewing; inserts happen via admin client from public room)
ALTER TABLE deal_room_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_room_quotes_select" ON deal_room_quotes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deal_room_quotes_update" ON deal_room_quotes FOR UPDATE USING (auth.uid() = user_id);
-- No insert/delete policy via RLS — quotes are created by the admin client from the public deal room API

-- Deal Room Access Log (no direct user access, admin client only)
ALTER TABLE deal_room_access_log ENABLE ROW LEVEL SECURITY;
-- Access logs are written by admin client, read via admin client in dashboard

-- Data Tests (user-scoped for management; uploads happen via admin client from public room)
ALTER TABLE deal_room_data_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "data_tests_select" ON deal_room_data_tests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "data_tests_update" ON deal_room_data_tests FOR UPDATE USING (auth.uid() = user_id);
-- No insert/delete via RLS — tests are created by admin client from the public deal room
