-- ============================================================================
-- RevSignal: Initial Database Schema Migration
-- Where signals become revenue.
--
-- Creates all enum types, tables, indexes, triggers, and RLS policies
-- for the RevSignal DaaS sales command center.
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE deal_stage AS ENUM (
  'lead',
  'qualified',
  'discovery',
  'poc_trial',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost'
);

CREATE TYPE channel_type AS ENUM (
  'teams',
  'email',
  'call',
  'linkedin',
  'in_person',
  'manual'
);

CREATE TYPE action_owner AS ENUM ('me', 'them');

CREATE TYPE action_status AS ENUM (
  'pending',
  'completed',
  'overdue',
  'cancelled'
);

CREATE TYPE escalation_level AS ENUM ('green', 'yellow', 'red');

CREATE TYPE subscription_tier AS ENUM ('free', 'starter', 'power');

CREATE TYPE subscription_status AS ENUM (
  'active',
  'past_due',
  'cancelled',
  'trialing'
);

CREATE TYPE playbook_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'blocked',
  'deprecated'
);

CREATE TYPE deployment_method AS ENUM (
  'api',
  'flat_file',
  'cloud_delivery',
  'platform_integration',
  'embedded_oem'
);

CREATE TYPE product_tier AS ENUM (
  'signals',
  'intelligence',
  'embedded'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. user_profiles
CREATE TABLE user_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    text,
  email           text,
  voice_profile_path text,
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. deals
CREATE TABLE deals (
  deal_id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company               text NOT NULL,
  contacts              jsonb DEFAULT '[]',
  stage                 deal_stage DEFAULT 'lead',
  acv                   numeric(12,2),
  deployment_method     deployment_method,
  product_tier          product_tier,
  contract_length_months int,
  win_probability       int DEFAULT 0 CHECK (win_probability >= 0 AND win_probability <= 100),
  close_date            date,
  notes                 text,
  sfdc_opportunity_id   text,
  created_date          timestamptz DEFAULT now(),
  last_activity_date    timestamptz DEFAULT now(),
  closed_date           timestamptz,
  lost_reason           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 3. contacts
CREATE TABLE contacts (
  contact_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company         text NOT NULL,
  name            text NOT NULL,
  role            text,
  email           text,
  phone           text,
  linkedin        text,
  icp_category    text,
  is_internal     boolean DEFAULT false,
  sfdc_contact_id text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. conversations
CREATE TABLE conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id      uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  deal_id         uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  date            timestamptz NOT NULL DEFAULT now(),
  channel         channel_type NOT NULL,
  subject         text,
  raw_text        text,
  ai_summary      text,
  action_items    jsonb DEFAULT '[]',
  follow_up_date  date,
  external_id     text,
  search_vector   tsvector,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 5. action_items
CREATE TABLE action_items (
  item_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id                 uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  contact_id              uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  description             text NOT NULL,
  owner                   action_owner DEFAULT 'me',
  due_date                date,
  status                  action_status DEFAULT 'pending',
  source_conversation_id  uuid REFERENCES conversations(conversation_id) ON DELETE SET NULL,
  escalation_level        escalation_level DEFAULT 'green',
  completed_at            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 6. prospects
CREATE TABLE prospects (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company               text NOT NULL,
  icp_category          text,
  contacts              jsonb DEFAULT '[]',
  estimated_acv         numeric(12,2),
  research_notes        text,
  last_researched_date  timestamptz,
  source                text,
  website               text,
  why_they_buy          text,
  search_vector         tsvector,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- 7. deal_briefs
CREATE TABLE deal_briefs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id               uuid UNIQUE NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brief_text            text NOT NULL,
  source_conversations  jsonb DEFAULT '[]',
  last_updated          timestamptz DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- 8. weekly_digests
CREATE TABLE weekly_digests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start      date NOT NULL,
  digest_text     text NOT NULL,
  deals_advanced  jsonb DEFAULT '[]',
  deals_stalled   jsonb DEFAULT '[]',
  revenue_closed  numeric(12,2) DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 9. competitive_intel
CREATE TABLE competitive_intel (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor      text NOT NULL,
  category        text NOT NULL,
  data_point      text NOT NULL,
  source          text,
  captured_date   timestamptz DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 10. playbook_items
CREATE TABLE playbook_items (
  item_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workstream    text NOT NULL,
  description   text NOT NULL,
  status        playbook_status DEFAULT 'not_started',
  last_touched  timestamptz,
  notes         text,
  sort_order    int DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 11. ingested_messages
CREATE TABLE ingested_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source              text NOT NULL,
  external_id         text,
  raw_content         text,
  processed           boolean DEFAULT false,
  matched_contact_id  uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  matched_deal_id     uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  processed_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- 12. agent_logs
CREATE TABLE agent_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name      text NOT NULL,
  action          text NOT NULL,
  input_context   jsonb,
  output          text,
  sources_cited   jsonb DEFAULT '[]',
  tokens_used     int,
  duration_ms     int,
  timestamp       timestamptz DEFAULT now()
);

-- 13. subscriptions
CREATE TABLE subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id      text UNIQUE,
  stripe_subscription_id  text UNIQUE,
  tier                    subscription_tier DEFAULT 'free',
  status                  subscription_status DEFAULT 'active',
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- user_profiles
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);

-- deals
CREATE INDEX idx_deals_user_id ON deals(user_id);
CREATE INDEX idx_deals_user_id_stage ON deals(user_id, stage);
CREATE INDEX idx_deals_user_id_last_activity ON deals(user_id, last_activity_date DESC);

-- contacts
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_user_id_company ON contacts(user_id, company);

-- conversations
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_user_id_deal_id ON conversations(user_id, deal_id);
CREATE INDEX idx_conversations_user_id_contact_id ON conversations(user_id, contact_id);
CREATE INDEX idx_conversations_user_id_date ON conversations(user_id, date DESC);
CREATE INDEX idx_conversations_search_vector ON conversations USING gin(search_vector);

-- action_items
CREATE INDEX idx_action_items_user_id ON action_items(user_id);
CREATE INDEX idx_action_items_user_id_status ON action_items(user_id, status);
CREATE INDEX idx_action_items_user_id_due_date ON action_items(user_id, due_date);
CREATE INDEX idx_action_items_user_id_escalation ON action_items(user_id, escalation_level);

-- prospects
CREATE INDEX idx_prospects_user_id ON prospects(user_id);
CREATE INDEX idx_prospects_user_id_icp ON prospects(user_id, icp_category);
CREATE INDEX idx_prospects_search_vector ON prospects USING gin(search_vector);

-- deal_briefs
CREATE INDEX idx_deal_briefs_user_id ON deal_briefs(user_id);
CREATE INDEX idx_deal_briefs_deal_id ON deal_briefs(deal_id);

-- weekly_digests
CREATE INDEX idx_weekly_digests_user_id ON weekly_digests(user_id);

-- competitive_intel
CREATE INDEX idx_competitive_intel_user_id ON competitive_intel(user_id);
CREATE INDEX idx_competitive_intel_competitor ON competitive_intel(user_id, competitor);

-- playbook_items
CREATE INDEX idx_playbook_items_user_id ON playbook_items(user_id);
CREATE INDEX idx_playbook_items_user_id_workstream ON playbook_items(user_id, workstream);

-- ingested_messages
CREATE INDEX idx_ingested_messages_user_id ON ingested_messages(user_id);
CREATE INDEX idx_ingested_messages_user_id_processed ON ingested_messages(user_id, processed);
CREATE INDEX idx_ingested_messages_source_external_id ON ingested_messages(source, external_id);

-- agent_logs
CREATE INDEX idx_agent_logs_user_id ON agent_logs(user_id);
CREATE INDEX idx_agent_logs_user_id_agent_name ON agent_logs(user_id, agent_name);
CREATE INDEX idx_agent_logs_user_id_timestamp ON agent_logs(user_id, timestamp DESC);

-- subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- 1. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Auto-update conversation search_vector from raw_text, ai_summary, subject
CREATE OR REPLACE FUNCTION update_conversation_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.subject, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.raw_text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-update prospect search_vector from company, research_notes, why_they_buy
CREATE OR REPLACE FUNCTION update_prospect_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.company, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.why_they_buy, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.research_notes, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Handle new user signup: create user_profiles row + free-tier subscription
--    Uses SECURITY DEFINER to bypass RLS when inserting into user-owned tables
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at triggers for all tables that have an updated_at column
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_prospects_updated_at
  BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_competitive_intel_updated_at
  BEFORE UPDATE ON competitive_intel
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_playbook_items_updated_at
  BEFORE UPDATE ON playbook_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- search_vector triggers
CREATE TRIGGER trg_conversations_search_vector
  BEFORE INSERT OR UPDATE OF raw_text, ai_summary, subject ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_conversation_search_vector();

CREATE TRIGGER trg_prospects_search_vector
  BEFORE INSERT OR UPDATE OF company, research_notes, why_they_buy ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_prospect_search_vector();

-- New user handler trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_intel ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingested_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- deals policies
CREATE POLICY "deals_select" ON deals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deals_insert" ON deals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deals_update" ON deals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deals_delete" ON deals
  FOR DELETE USING (auth.uid() = user_id);

-- contacts policies
CREATE POLICY "contacts_select" ON contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contacts_insert" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_update" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- conversations policies
CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- action_items policies
CREATE POLICY "action_items_select" ON action_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "action_items_insert" ON action_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "action_items_update" ON action_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "action_items_delete" ON action_items
  FOR DELETE USING (auth.uid() = user_id);

-- prospects policies
CREATE POLICY "prospects_select" ON prospects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prospects_insert" ON prospects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prospects_update" ON prospects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prospects_delete" ON prospects
  FOR DELETE USING (auth.uid() = user_id);

-- deal_briefs policies
CREATE POLICY "deal_briefs_select" ON deal_briefs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "deal_briefs_insert" ON deal_briefs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "deal_briefs_update" ON deal_briefs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "deal_briefs_delete" ON deal_briefs
  FOR DELETE USING (auth.uid() = user_id);

-- weekly_digests policies
CREATE POLICY "weekly_digests_select" ON weekly_digests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_digests_insert" ON weekly_digests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_digests_update" ON weekly_digests
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weekly_digests_delete" ON weekly_digests
  FOR DELETE USING (auth.uid() = user_id);

-- competitive_intel policies
CREATE POLICY "competitive_intel_select" ON competitive_intel
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "competitive_intel_insert" ON competitive_intel
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "competitive_intel_update" ON competitive_intel
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "competitive_intel_delete" ON competitive_intel
  FOR DELETE USING (auth.uid() = user_id);

-- playbook_items policies
CREATE POLICY "playbook_items_select" ON playbook_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "playbook_items_insert" ON playbook_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "playbook_items_update" ON playbook_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "playbook_items_delete" ON playbook_items
  FOR DELETE USING (auth.uid() = user_id);

-- ingested_messages policies
CREATE POLICY "ingested_messages_select" ON ingested_messages
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ingested_messages_insert" ON ingested_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ingested_messages_update" ON ingested_messages
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ingested_messages_delete" ON ingested_messages
  FOR DELETE USING (auth.uid() = user_id);

-- agent_logs policies
CREATE POLICY "agent_logs_select" ON agent_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_logs_insert" ON agent_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_logs_update" ON agent_logs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_logs_delete" ON agent_logs
  FOR DELETE USING (auth.uid() = user_id);

-- subscriptions policies
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_delete" ON subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- UNIQUE CONSTRAINTS (for seed script upsert operations)
-- ============================================================

ALTER TABLE prospects ADD CONSTRAINT prospects_company_user_id_key UNIQUE (company, user_id);
ALTER TABLE competitive_intel ADD CONSTRAINT competitive_intel_comp_cat_user_key UNIQUE (competitor, category, user_id);
ALTER TABLE playbook_items ADD CONSTRAINT playbook_items_ws_desc_user_key UNIQUE (workstream, description, user_id);
