-- ============================================================================
-- RevSignal: Integration Tokens
-- Stores OAuth tokens for external integrations (Microsoft, Salesforce, etc.)
-- Tokens are scoped per-user per-provider with automatic refresh support.
-- ============================================================================

CREATE TABLE IF NOT EXISTS integration_tokens (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider      text NOT NULL,            -- 'microsoft', 'salesforce', 'plaud'
  access_token  text NOT NULL,
  refresh_token text NOT NULL,
  expires_at    timestamptz NOT NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

-- RLS: users can only see/manage their own tokens
ALTER TABLE integration_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tokens"
  ON integration_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON integration_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON integration_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON integration_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for cron jobs that iterate by provider
CREATE INDEX IF NOT EXISTS idx_integration_tokens_provider
  ON integration_tokens(provider);
