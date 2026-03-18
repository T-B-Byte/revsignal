-- ============================================================================
-- RevSignal: Competitor Comparison Table
-- Structured side-by-side comparison of competitors on pricing, revenue,
-- valuation, and weakness. Includes pharosIQ for self-assessment.
-- ============================================================================

CREATE TABLE competitor_comparisons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor  TEXT NOT NULL,
  pricing     TEXT,
  revenue     TEXT,
  valuation   TEXT,
  weakness    TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user lookups
CREATE INDEX idx_competitor_comparisons_user
  ON competitor_comparisons(user_id, sort_order);

-- Unique constraint: one row per competitor per user
CREATE UNIQUE INDEX idx_competitor_comparisons_unique
  ON competitor_comparisons(user_id, competitor);

-- Auto-update updated_at
CREATE TRIGGER set_competitor_comparisons_updated_at
  BEFORE UPDATE ON competitor_comparisons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE competitor_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own competitor comparisons"
  ON competitor_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own competitor comparisons"
  ON competitor_comparisons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own competitor comparisons"
  ON competitor_comparisons FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own competitor comparisons"
  ON competitor_comparisons FOR DELETE
  USING (auth.uid() = user_id);
