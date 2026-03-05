-- ============================================================================
-- RevSignal: Tradeshows Migration
-- Tradeshows, tradeshow targets (sponsor analysis), and tradeshow contacts
-- for the Tradeshow Scout agent.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE tradeshow_status AS ENUM (
  'draft',
  'analyzing',
  'partial',
  'complete',
  'error'
);

CREATE TYPE tradeshow_priority AS ENUM (
  'priority_1_walk_up',
  'priority_2_strong_conversation',
  'priority_3_competitive_intel'
);

CREATE TYPE target_research_status AS ENUM (
  'pending',
  'researching',
  'complete',
  'error'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. tradeshows (parent record for each tradeshow event)
CREATE TABLE tradeshows (
  tradeshow_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  dates               text,
  location            text,
  sponsor_page_url    text,
  raw_html            text,
  status              tradeshow_status NOT NULL DEFAULT 'draft',
  analysis_summary    text,
  total_sponsors      int NOT NULL DEFAULT 0,
  total_estimated_pipeline numeric(12,2) NOT NULL DEFAULT 0,
  tokens_used         int NOT NULL DEFAULT 0,
  analyzed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. tradeshow_targets (one row per sponsor company at a tradeshow)
CREATE TABLE tradeshow_targets (
  target_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tradeshow_id          uuid NOT NULL REFERENCES tradeshows(tradeshow_id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company               text NOT NULL,
  sponsorship_tier      text,
  company_description   text,
  icp_category          text,
  icp_fit_strength      text,
  estimated_acv         numeric(12,2),
  priority              tradeshow_priority,
  priority_rationale    text,
  pitch_angle           text,
  is_competitor         boolean NOT NULL DEFAULT false,
  competitor_notes      text,
  bombora_angle         text,
  research_status       target_research_status NOT NULL DEFAULT 'pending',
  research_notes        text,
  existing_deal_id      uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  existing_prospect_id  uuid,
  sort_order            int NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tradeshow_id, company)
);

-- 3. tradeshow_contacts (best contacts to approach at each sponsor company)
CREATE TABLE tradeshow_contacts (
  contact_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id           uuid NOT NULL REFERENCES tradeshow_targets(target_id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  title               text,
  why_this_person     text,
  linkedin_url        text,
  approach_strategy   text,
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- tradeshows
CREATE INDEX idx_tradeshows_user_id ON tradeshows(user_id);
CREATE INDEX idx_tradeshows_user_id_status ON tradeshows(user_id, status);
CREATE INDEX idx_tradeshows_user_id_created ON tradeshows(user_id, created_at DESC);

-- tradeshow_targets
CREATE INDEX idx_tradeshow_targets_user_id ON tradeshow_targets(user_id);
CREATE INDEX idx_tradeshow_targets_tradeshow_id ON tradeshow_targets(tradeshow_id);
CREATE INDEX idx_tradeshow_targets_tradeshow_priority ON tradeshow_targets(tradeshow_id, priority);
CREATE INDEX idx_tradeshow_targets_user_id_company ON tradeshow_targets(user_id, company);

-- tradeshow_contacts
CREATE INDEX idx_tradeshow_contacts_user_id ON tradeshow_contacts(user_id);
CREATE INDEX idx_tradeshow_contacts_target_id ON tradeshow_contacts(target_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at triggers (reuse function from 001)
CREATE TRIGGER trg_tradeshows_updated_at
  BEFORE UPDATE ON tradeshows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tradeshow_targets_updated_at
  BEFORE UPDATE ON tradeshow_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_tradeshow_contacts_updated_at
  BEFORE UPDATE ON tradeshow_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- tradeshows
ALTER TABLE tradeshows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tradeshows_select" ON tradeshows
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tradeshows_insert" ON tradeshows
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tradeshows_update" ON tradeshows
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tradeshows_delete" ON tradeshows
  FOR DELETE USING (auth.uid() = user_id);

-- tradeshow_targets
ALTER TABLE tradeshow_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tradeshow_targets_select" ON tradeshow_targets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tradeshow_targets_insert" ON tradeshow_targets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tradeshow_targets_update" ON tradeshow_targets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tradeshow_targets_delete" ON tradeshow_targets
  FOR DELETE USING (auth.uid() = user_id);

-- tradeshow_contacts
ALTER TABLE tradeshow_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tradeshow_contacts_select" ON tradeshow_contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tradeshow_contacts_insert" ON tradeshow_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tradeshow_contacts_update" ON tradeshow_contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tradeshow_contacts_delete" ON tradeshow_contacts
  FOR DELETE USING (auth.uid() = user_id);
