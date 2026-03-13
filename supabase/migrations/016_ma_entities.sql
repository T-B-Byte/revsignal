-- ============================================================================
-- RevSignal: M&A Entities Migration
-- Track potential acquirers (buyers interested in pharosIQ) and acquisition
-- targets (companies pharosIQ could acquire) with contacts and activity log.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE ma_entity_type AS ENUM (
  'acquirer',
  'target'
);

CREATE TYPE ma_stage AS ENUM (
  'identified',
  'researching',
  'outreach',
  'conversations',
  'diligence',
  'negotiation',
  'closed',
  'passed',
  'dead'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. ma_entities (parent record — one row per company being tracked)
CREATE TABLE ma_entities (
  entity_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company             text NOT NULL,
  entity_type         ma_entity_type NOT NULL,
  stage               ma_stage NOT NULL DEFAULT 'identified',
  strategic_rationale text,
  estimated_valuation numeric(14,2),
  key_date            date,
  key_date_label      text,
  website             text,
  notes               text,
  source              text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. ma_contacts (people involved in the M&A process)
CREATE TABLE ma_contacts (
  contact_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid NOT NULL REFERENCES ma_entities(entity_id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  title               text,
  email               text,
  phone               text,
  linkedin_url        text,
  role_in_process     text,
  notes               text,
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 3. ma_notes (timestamped activity log per entity)
CREATE TABLE ma_notes (
  note_id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid NOT NULL REFERENCES ma_entities(entity_id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content             text NOT NULL,
  note_type           text NOT NULL DEFAULT 'update'
                      CHECK (note_type IN ('update', 'meeting', 'research', 'document', 'decision')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- COACHING THREADS: Add M&A entity reference
-- ============================================================================

ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS ma_entity_id uuid REFERENCES ma_entities(entity_id) ON DELETE SET NULL;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- ma_entities
CREATE INDEX idx_ma_entities_user_id ON ma_entities(user_id);
CREATE INDEX idx_ma_entities_user_type ON ma_entities(user_id, entity_type);
CREATE INDEX idx_ma_entities_user_stage ON ma_entities(user_id, stage);
CREATE INDEX idx_ma_entities_user_updated ON ma_entities(user_id, updated_at DESC);

-- ma_contacts
CREATE INDEX idx_ma_contacts_user_id ON ma_contacts(user_id);
CREATE INDEX idx_ma_contacts_entity_id ON ma_contacts(entity_id);

-- ma_notes
CREATE INDEX idx_ma_notes_user_id ON ma_notes(user_id);
CREATE INDEX idx_ma_notes_entity_id ON ma_notes(entity_id);
CREATE INDEX idx_ma_notes_entity_created ON ma_notes(entity_id, created_at DESC);

-- coaching_threads M&A link
CREATE INDEX IF NOT EXISTS idx_coaching_threads_ma_entity
  ON coaching_threads(user_id, ma_entity_id) WHERE ma_entity_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_ma_entities_updated_at
  BEFORE UPDATE ON ma_entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ma_contacts_updated_at
  BEFORE UPDATE ON ma_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- ma_entities
ALTER TABLE ma_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_entities_select" ON ma_entities
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ma_entities_insert" ON ma_entities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ma_entities_update" ON ma_entities
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ma_entities_delete" ON ma_entities
  FOR DELETE USING (auth.uid() = user_id);

-- ma_contacts
ALTER TABLE ma_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_contacts_select" ON ma_contacts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ma_contacts_insert" ON ma_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ma_contacts_update" ON ma_contacts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ma_contacts_delete" ON ma_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- ma_notes
ALTER TABLE ma_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_notes_select" ON ma_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ma_notes_insert" ON ma_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ma_notes_update" ON ma_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ma_notes_delete" ON ma_notes
  FOR DELETE USING (auth.uid() = user_id);
