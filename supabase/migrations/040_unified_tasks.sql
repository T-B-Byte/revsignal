-- ============================================================================
-- RevSignal: Unified Task System
-- Evolve user_tasks into the single source of truth for all action items.
-- Adds deal/thread/contact provenance, ownership, source tracking,
-- and escalation levels (previously only in action_items).
-- ============================================================================

-- New columns for provenance and classification
ALTER TABLE user_tasks
  ADD COLUMN IF NOT EXISTS deal_id uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS owner text NOT NULL DEFAULT 'me' CHECK (owner IN ('me', 'them')),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'strategist', 'action_item')),
  ADD COLUMN IF NOT EXISTS escalation_level text NOT NULL DEFAULT 'green' CHECK (escalation_level IN ('green', 'yellow', 'red'));

-- Indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_user_tasks_deal ON user_tasks(deal_id) WHERE deal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_tasks_thread ON user_tasks(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_tasks_open_due ON user_tasks(user_id, status, due_date) WHERE status = 'open';

COMMENT ON TABLE user_tasks IS 'Unified task system. All action items (manual, Strategist-extracted, migrated action_items) live here.';
