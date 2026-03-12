-- Migration 012: StrategyGPT Consolidation
-- Adds person/account fields to coaching_threads and interaction_type to coaching_conversations.
-- Supports the consolidation of Strategy, Meetings, and Compose into a single StrategyGPT section.

-- Add person/account columns to coaching_threads
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_role text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(contact_id) ON DELETE SET NULL;

-- Add interaction_type to coaching_conversations
ALTER TABLE coaching_conversations
  ADD COLUMN IF NOT EXISTS interaction_type text NOT NULL DEFAULT 'coaching'
    CHECK (interaction_type IN ('email', 'conversation', 'call_transcript', 'web_meeting', 'in_person_meeting', 'coaching'));

-- Index for grouping threads by company
CREATE INDEX IF NOT EXISTS idx_coaching_threads_company ON coaching_threads(user_id, company);

-- Index for filtering by contact
CREATE INDEX IF NOT EXISTS idx_coaching_threads_contact ON coaching_threads(user_id, contact_id);

-- Atomic message_count increment function
CREATE OR REPLACE FUNCTION increment_thread_message_count(
  p_thread_id uuid,
  p_last_message_at timestamptz
) RETURNS void AS $$
BEGIN
  UPDATE coaching_threads
  SET message_count = message_count + 1,
      last_message_at = p_last_message_at
  WHERE thread_id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
