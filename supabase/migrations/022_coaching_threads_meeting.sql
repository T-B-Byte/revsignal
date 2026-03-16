-- Link coaching threads to meetings for Strategist conversations during meeting prep
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS meeting_note_id uuid REFERENCES meeting_notes(note_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coaching_threads_meeting
  ON coaching_threads(user_id, meeting_note_id) WHERE meeting_note_id IS NOT NULL;
