-- ============================================================================
-- RevSignal: Briefing Section Notes
-- Adds a JSONB column to daily_briefings for per-section inline notes.
-- Keys are section headers (e.g. "Top 3 Priorities Today"), values are note text.
-- ============================================================================

ALTER TABLE daily_briefings
  ADD COLUMN IF NOT EXISTS section_notes jsonb NOT NULL DEFAULT '{}';
