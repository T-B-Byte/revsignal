-- ============================================================================
-- RevSignal: Strategic Context Migration
-- Stakeholders, strategic notes, coaching conversations, and nudges
-- for The Strategist's coaching layer.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE note_category AS ENUM (
  'institutional_context',
  'stakeholder_insight',
  'decision_log',
  'political_dynamic',
  'meeting_debrief',
  'strategic_observation',
  'competitive_insight',
  'relationship_note'
);

CREATE TYPE stakeholder_relationship AS ENUM (
  'sponsor',
  'champion',
  'supporter',
  'neutral',
  'blocker',
  'unknown'
);

CREATE TYPE nudge_priority AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE nudge_status AS ENUM ('pending', 'shown', 'dismissed', 'acted_on');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. stakeholders (created first; strategic_notes references this)
CREATE TABLE stakeholders (
  stakeholder_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  role                text,
  organization        text DEFAULT 'pharosIQ',
  is_internal         boolean DEFAULT true,
  relationship        stakeholder_relationship DEFAULT 'unknown',
  communication_style text,
  sensitivities       text,
  motivations         text,
  influence_level     int CHECK (influence_level >= 1 AND influence_level <= 5),
  related_contact_id  uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  notes               text,
  last_interaction_date timestamptz,
  tags                text[] DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. strategic_notes
CREATE TABLE strategic_notes (
  note_id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category                note_category NOT NULL DEFAULT 'institutional_context',
  title                   text NOT NULL,
  content                 text NOT NULL,
  related_stakeholder_id  uuid REFERENCES stakeholders(stakeholder_id) ON DELETE SET NULL,
  related_deal_id         uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  source                  text,
  tags                    text[] DEFAULT '{}',
  search_vector           tsvector,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- 3. coaching_conversations
CREATE TABLE coaching_conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('user', 'assistant')),
  content         text NOT NULL,
  context_used    jsonb,
  sources_cited   text[] DEFAULT '{}',
  tokens_used     int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 4. nudges
CREATE TABLE nudges (
  nudge_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  priority        nudge_priority NOT NULL DEFAULT 'medium',
  status          nudge_status NOT NULL DEFAULT 'pending',
  title           text NOT NULL,
  message         text NOT NULL,
  action_url      text,
  source_agent    text DEFAULT 'strategist',
  context         jsonb,
  expires_at      timestamptz,
  shown_at        timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- stakeholders
CREATE INDEX idx_stakeholders_user_id ON stakeholders(user_id);
CREATE INDEX idx_stakeholders_user_id_org ON stakeholders(user_id, organization);
CREATE INDEX idx_stakeholders_user_id_internal ON stakeholders(user_id, is_internal);
CREATE INDEX idx_stakeholders_user_id_relationship ON stakeholders(user_id, relationship);
CREATE UNIQUE INDEX idx_stakeholders_unique_name ON stakeholders(user_id, name, organization);

-- strategic_notes
CREATE INDEX idx_strategic_notes_user_id ON strategic_notes(user_id);
CREATE INDEX idx_strategic_notes_user_id_category ON strategic_notes(user_id, category);
CREATE INDEX idx_strategic_notes_user_id_stakeholder ON strategic_notes(user_id, related_stakeholder_id);
CREATE INDEX idx_strategic_notes_user_id_deal ON strategic_notes(user_id, related_deal_id);
CREATE INDEX idx_strategic_notes_search_vector ON strategic_notes USING gin(search_vector);
CREATE INDEX idx_strategic_notes_tags ON strategic_notes USING gin(tags);

-- coaching_conversations
CREATE INDEX idx_coaching_conversations_user_id ON coaching_conversations(user_id);
CREATE INDEX idx_coaching_conversations_user_id_date ON coaching_conversations(user_id, created_at DESC);

-- nudges
CREATE INDEX idx_nudges_user_id ON nudges(user_id);
CREATE INDEX idx_nudges_user_id_status ON nudges(user_id, status);
CREATE INDEX idx_nudges_user_id_priority ON nudges(user_id, priority, created_at DESC);
CREATE INDEX idx_nudges_pending ON nudges(user_id, status) WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- updated_at triggers (reuse function from 001)
CREATE TRIGGER trg_stakeholders_updated_at
  BEFORE UPDATE ON stakeholders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_strategic_notes_updated_at
  BEFORE UPDATE ON strategic_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Search vector trigger for strategic_notes
CREATE OR REPLACE FUNCTION update_strategic_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_strategic_notes_search_vector
  BEFORE INSERT OR UPDATE OF title, content ON strategic_notes
  FOR EACH ROW EXECUTE FUNCTION update_strategic_notes_search_vector();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- stakeholders
ALTER TABLE stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stakeholders_select" ON stakeholders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "stakeholders_insert" ON stakeholders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stakeholders_update" ON stakeholders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "stakeholders_delete" ON stakeholders
  FOR DELETE USING (auth.uid() = user_id);

-- strategic_notes
ALTER TABLE strategic_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "strategic_notes_select" ON strategic_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "strategic_notes_insert" ON strategic_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "strategic_notes_update" ON strategic_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "strategic_notes_delete" ON strategic_notes
  FOR DELETE USING (auth.uid() = user_id);

-- coaching_conversations
ALTER TABLE coaching_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_conversations_select" ON coaching_conversations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_conversations_insert" ON coaching_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coaching_conversations_delete" ON coaching_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- nudges
ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nudges_select" ON nudges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "nudges_insert" ON nudges
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nudges_update" ON nudges
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "nudges_delete" ON nudges
  FOR DELETE USING (auth.uid() = user_id);
