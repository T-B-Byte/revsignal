-- Add status to prospects so weak fits can be "passed" without deleting.
-- Keeps the URL in the DB to prevent re-analysis.
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'passed', 'converted'));

CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(user_id, status);
