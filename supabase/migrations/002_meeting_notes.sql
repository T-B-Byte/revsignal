-- ============================================================================
-- RevSignal: Meeting Notes Migration
-- Internal meeting notes for strategy, team, and cross-functional discussions.
-- ============================================================================

-- Enum for meeting types
CREATE TYPE meeting_type AS ENUM (
  'one_on_one',
  'team',
  'strategy',
  'cross_functional',
  'board',
  'standup',
  'other'
);

-- meeting_notes table
CREATE TABLE meeting_notes (
  note_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  meeting_date    timestamptz NOT NULL DEFAULT now(),
  meeting_type    meeting_type DEFAULT 'other',
  attendees       jsonb DEFAULT '[]',       -- [{name: string, role?: string}]
  content         text NOT NULL,
  ai_summary      text,
  action_items    jsonb DEFAULT '[]',       -- [{description, owner, due_date?}]
  tags            text[] DEFAULT '{}',
  deal_id         uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  search_vector   tsvector,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_meeting_notes_user_id ON meeting_notes(user_id);
CREATE INDEX idx_meeting_notes_user_id_date ON meeting_notes(user_id, meeting_date DESC);
CREATE INDEX idx_meeting_notes_user_id_type ON meeting_notes(user_id, meeting_type);
CREATE INDEX idx_meeting_notes_user_id_deal ON meeting_notes(user_id, deal_id);
CREATE INDEX idx_meeting_notes_search_vector ON meeting_notes USING gin(search_vector);
CREATE INDEX idx_meeting_notes_tags ON meeting_notes USING gin(tags);

-- updated_at trigger (reuses existing function from 001)
CREATE TRIGGER trg_meeting_notes_updated_at
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Search vector trigger
CREATE OR REPLACE FUNCTION update_meeting_notes_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.ai_summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_meeting_notes_search_vector
  BEFORE INSERT OR UPDATE OF title, ai_summary, content ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION update_meeting_notes_search_vector();

-- RLS
ALTER TABLE meeting_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meeting_notes_select" ON meeting_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meeting_notes_insert" ON meeting_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meeting_notes_update" ON meeting_notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meeting_notes_delete" ON meeting_notes
  FOR DELETE USING (auth.uid() = user_id);
