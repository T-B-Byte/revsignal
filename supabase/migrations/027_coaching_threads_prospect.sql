-- Link coaching threads to prospects so the Strategist can be scoped to a prospect.
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS prospect_id uuid REFERENCES prospects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coaching_threads_prospect
  ON coaching_threads(user_id, prospect_id) WHERE prospect_id IS NOT NULL;
