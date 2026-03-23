-- ============================================================================
-- RevSignal: Link meeting_notes to Outlook calendar events
-- Adds external_event_id to enable calendar sync deduplication.
-- ============================================================================

ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS external_event_id text;

-- Partial unique index: one Outlook event per user, but allow NULLs (manual meetings)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_notes_external_event
  ON meeting_notes(user_id, external_event_id)
  WHERE external_event_id IS NOT NULL;
