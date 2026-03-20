-- ============================================================================
-- RevSignal: Board Report Archives
-- Stores weekly auto-generated board reports for retrieval and history.
-- One report per user per week, auto-generated every Monday.
-- ============================================================================

CREATE TABLE board_report_archives (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number   INT NOT NULL,
  title         TEXT NOT NULL DEFAULT 'DaaS Revenue Initiative',
  subtitle      TEXT NOT NULL DEFAULT '',
  sections      JSONB NOT NULL,
  tokens_used   INT NOT NULL DEFAULT 0,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One report per user per week
CREATE UNIQUE INDEX idx_board_report_archives_user_week
  ON board_report_archives(user_id, week_number);

-- Fast lookups by user sorted by recency
CREATE INDEX idx_board_report_archives_user_date
  ON board_report_archives(user_id, generated_at DESC);

-- Auto-update updated_at
CREATE TRIGGER set_board_report_archives_updated_at
  BEFORE UPDATE ON board_report_archives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE board_report_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own board report archives"
  ON board_report_archives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own board report archives"
  ON board_report_archives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own board report archives"
  ON board_report_archives FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own board report archives"
  ON board_report_archives FOR DELETE
  USING (auth.uid() = user_id);
