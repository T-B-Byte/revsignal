-- ============================================================================
-- RevSignal: Meeting Prep & Contact Agenda Items
-- Extends meeting_notes for pre-meeting prep workflow.
-- Adds contact_agenda_items for "next time I talk to X" running lists.
-- ============================================================================

-- Meeting status enum
CREATE TYPE meeting_status AS ENUM ('upcoming', 'completed', 'cancelled');

-- Extend meeting_notes with prep workflow fields
ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS status       meeting_status DEFAULT 'upcoming',
  ADD COLUMN IF NOT EXISTS prep_brief   text,
  ADD COLUMN IF NOT EXISTS agenda       jsonb DEFAULT '[]',   -- [{text: string, covered: boolean}]
  ADD COLUMN IF NOT EXISTS contact_ids  uuid[] DEFAULT '{}',  -- FK refs to contacts.contact_id
  ADD COLUMN IF NOT EXISTS location     text;

-- Index for upcoming meetings queries
CREATE INDEX idx_meeting_notes_status ON meeting_notes(user_id, status, meeting_date)
  WHERE status = 'upcoming';

-- contact_agenda_items — "next time I talk to X, ask about..."
CREATE TABLE contact_agenda_items (
  item_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
  description   text NOT NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'covered', 'carried')),
  source        text DEFAULT 'manual' CHECK (source IN ('manual', 'strategist', 'action_item')),
  covered_in_meeting uuid REFERENCES meeting_notes(note_id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_agenda_user_contact ON contact_agenda_items(user_id, contact_id)
  WHERE status = 'open';
CREATE INDEX idx_contact_agenda_user_status ON contact_agenda_items(user_id, status);

-- updated_at trigger
CREATE TRIGGER trg_contact_agenda_items_updated_at
  BEFORE UPDATE ON contact_agenda_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE contact_agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_agenda_items_select" ON contact_agenda_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contact_agenda_items_insert" ON contact_agenda_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contact_agenda_items_update" ON contact_agenda_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "contact_agenda_items_delete" ON contact_agenda_items
  FOR DELETE USING (auth.uid() = user_id);
