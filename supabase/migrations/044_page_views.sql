-- ============================================================================
-- RevSignal: Page Views (Feature Usage Tracking)
-- Tracks which dashboard features the user visits, enabling a usage report
-- in Settings to identify underused features.
-- ============================================================================

CREATE TABLE page_views (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key   text NOT NULL,
  page_label text NOT NULL,
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

-- Primary query: aggregate counts per user per page
CREATE INDEX idx_page_views_user_page
  ON page_views (user_id, page_key);

-- Cleanup: older entries by date
CREATE INDEX idx_page_views_viewed_at
  ON page_views (viewed_at);

-- RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own page views"
  ON page_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own page views"
  ON page_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);
