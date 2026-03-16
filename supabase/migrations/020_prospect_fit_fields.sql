-- Add pre-computed fit analysis fields to prospects
-- These are populated at research time (company name or URL analysis)
-- so the expanded card view reads stored data, not generated on the fly.

ALTER TABLE prospects
  ADD COLUMN fit_score          text CHECK (fit_score IN ('strong', 'moderate', 'weak', 'not_a_fit')),
  ADD COLUMN fit_analysis       text,
  ADD COLUMN suggested_contacts jsonb DEFAULT '[]',
  ADD COLUMN next_action        text;

-- Index for filtering/sorting by fit
CREATE INDEX idx_prospects_fit_score ON prospects(fit_score)
  WHERE fit_score IS NOT NULL;

-- Link coaching threads to prospects for Strategist conversations
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coaching_threads_prospect
  ON coaching_threads(user_id, prospect_id) WHERE prospect_id IS NOT NULL;
