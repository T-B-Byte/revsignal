-- ============================================================================
-- RevSignal: Deal Contradiction Detection
-- Stores contradictions detected across coaching threads within a deal.
-- Populated by the contradiction-scan cron job.
-- ============================================================================

CREATE TYPE contradiction_severity AS ENUM ('low', 'medium', 'high');

CREATE TABLE deal_contradictions (
  contradiction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id          uuid NOT NULL REFERENCES deals(deal_id) ON DELETE CASCADE,
  thread_a_id      uuid REFERENCES coaching_threads(thread_id) ON DELETE CASCADE,
  thread_b_id      uuid REFERENCES coaching_threads(thread_id) ON DELETE CASCADE,
  description      text NOT NULL,
  category         text NOT NULL DEFAULT 'general',
  severity         contradiction_severity NOT NULL DEFAULT 'medium',
  resolved         boolean NOT NULL DEFAULT false,
  resolved_at      timestamptz,
  detected_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Index for fetching contradictions by deal (most common query)
CREATE INDEX idx_deal_contradictions_user_deal
  ON deal_contradictions (user_id, deal_id)
  WHERE NOT resolved;

-- Index for cron job: find unresolved contradictions per user
CREATE INDEX idx_deal_contradictions_user_unresolved
  ON deal_contradictions (user_id)
  WHERE NOT resolved;

-- RLS
ALTER TABLE deal_contradictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contradictions"
  ON deal_contradictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own contradictions"
  ON deal_contradictions FOR UPDATE
  USING (auth.uid() = user_id);
