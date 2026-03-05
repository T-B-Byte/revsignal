-- 004_daily_briefings.sql
-- Persist daily Strategist briefings so they survive page navigation.

CREATE TABLE daily_briefings (
  briefing_id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  briefing_date date NOT NULL DEFAULT CURRENT_DATE,
  content       text NOT NULL,
  edited_content text,
  sources_cited text[] NOT NULL DEFAULT '{}',
  tokens_used   int,
  generated_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, briefing_date)
);

-- Indexes
CREATE INDEX idx_daily_briefings_user_id ON daily_briefings(user_id);
CREATE INDEX idx_daily_briefings_date ON daily_briefings(briefing_date DESC);

-- RLS
ALTER TABLE daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_briefings_select" ON daily_briefings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_briefings_insert" ON daily_briefings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_briefings_update" ON daily_briefings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daily_briefings_delete" ON daily_briefings
  FOR DELETE USING (auth.uid() = user_id);
