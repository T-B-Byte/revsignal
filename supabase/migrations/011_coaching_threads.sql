-- ============================================================================
-- RevSignal: Coaching Threads Migration
-- Transforms the single-stream coaching chat into a threaded architecture.
-- Each thread has its own message history, optional deal association,
-- progressive summarization (thread_brief), and follow-up tracking.
-- ============================================================================

-- ============================================================================
-- NEW TABLE: coaching_threads
-- ============================================================================

CREATE TABLE coaching_threads (
  thread_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id          uuid REFERENCES deals(deal_id) ON DELETE SET NULL,
  title            text NOT NULL,
  thread_brief     text,                        -- Progressive summary for anti-hallucination
  brief_updated_at timestamptz,                 -- When thread_brief was last regenerated
  last_message_at  timestamptz DEFAULT now(),   -- For sorting threads by recency
  message_count    int NOT NULL DEFAULT 0,      -- Tracks when to trigger re-summarization
  is_archived      boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- MODIFY: coaching_conversations — add thread_id
-- Existing rows keep thread_id NULL (legacy). New messages require a thread.
-- ============================================================================

ALTER TABLE coaching_conversations
  ADD COLUMN thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE CASCADE;

-- ============================================================================
-- NEW TABLE: thread_follow_ups
-- Follow-up reminders extracted by the Strategist from thread conversations.
-- ============================================================================

CREATE TYPE thread_follow_up_status AS ENUM ('open', 'completed', 'dismissed');

CREATE TABLE thread_follow_ups (
  follow_up_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id         uuid NOT NULL REFERENCES coaching_threads(thread_id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description       text NOT NULL,
  due_date          date,                         -- Explicit follow-up date if user specified one
  status            thread_follow_up_status NOT NULL DEFAULT 'open',
  source_message_id uuid REFERENCES coaching_conversations(conversation_id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- coaching_threads
CREATE INDEX idx_coaching_threads_user_recent
  ON coaching_threads(user_id, last_message_at DESC)
  WHERE NOT is_archived;

CREATE INDEX idx_coaching_threads_user_deal
  ON coaching_threads(user_id, deal_id)
  WHERE deal_id IS NOT NULL;

-- coaching_conversations by thread (message loading)
CREATE INDEX idx_coaching_conversations_thread
  ON coaching_conversations(thread_id, created_at ASC)
  WHERE thread_id IS NOT NULL;

-- thread_follow_ups
CREATE INDEX idx_thread_follow_ups_thread_status
  ON thread_follow_ups(thread_id, status)
  WHERE status = 'open';

CREATE INDEX idx_thread_follow_ups_user_overdue
  ON thread_follow_ups(user_id, status, due_date)
  WHERE status = 'open';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at on coaching_threads (reuses update_updated_at from 001)
CREATE TRIGGER trg_coaching_threads_updated_at
  BEFORE UPDATE ON coaching_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment message_count and update last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_thread_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE coaching_threads
    SET message_count = message_count + 1,
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE thread_id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_coaching_message_thread_update
  AFTER INSERT ON coaching_conversations
  FOR EACH ROW EXECUTE FUNCTION update_thread_on_message();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- coaching_threads
ALTER TABLE coaching_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coaching_threads_select" ON coaching_threads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coaching_threads_insert" ON coaching_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coaching_threads_update" ON coaching_threads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coaching_threads_delete" ON coaching_threads
  FOR DELETE USING (auth.uid() = user_id);

-- thread_follow_ups
ALTER TABLE thread_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "thread_follow_ups_select" ON thread_follow_ups
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "thread_follow_ups_insert" ON thread_follow_ups
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "thread_follow_ups_update" ON thread_follow_ups
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "thread_follow_ups_delete" ON thread_follow_ups
  FOR DELETE USING (auth.uid() = user_id);
