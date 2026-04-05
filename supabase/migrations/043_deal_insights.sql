-- ============================================================================
-- RevSignal: Deal Insights (Karpathy Wiki Knowledge Pages)
-- Persists significant Strategist synthesis as referenceable deal knowledge.
-- Insights compound over time: future Strategist queries build on past analysis.
-- ============================================================================

CREATE TYPE insight_type AS ENUM (
  'analysis',
  'decision',
  'objection_handling',
  'timeline',
  'pricing',
  'competitive',
  'stakeholder_map',
  'risk_assessment'
);

CREATE TABLE deal_insights (
  insight_id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id          uuid REFERENCES deals(deal_id) ON DELETE CASCADE,
  thread_id        uuid REFERENCES coaching_threads(thread_id) ON DELETE SET NULL,
  source_message_id text,
  title            text NOT NULL,
  content          text NOT NULL,
  insight_type     insight_type NOT NULL DEFAULT 'analysis',
  superseded_by    uuid REFERENCES deal_insights(insight_id) ON DELETE SET NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Primary query: active insights for a deal
CREATE INDEX idx_deal_insights_user_deal_active
  ON deal_insights (user_id, deal_id)
  WHERE is_active;

-- Secondary: insights by type (for cross-deal pattern recognition)
CREATE INDEX idx_deal_insights_user_type
  ON deal_insights (user_id, insight_type);

-- RLS
ALTER TABLE deal_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
  ON deal_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights"
  ON deal_insights FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert insights"
  ON deal_insights FOR INSERT
  WITH CHECK (true);
