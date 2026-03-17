-- Add source tracking columns to user_tasks
-- Persists which message text was highlighted to create a task,
-- so highlights survive page reloads and sessions.

ALTER TABLE user_tasks
  ADD COLUMN source_message_id uuid REFERENCES coaching_conversations(conversation_id) ON DELETE SET NULL,
  ADD COLUMN source_text       text;

CREATE INDEX idx_user_tasks_source_message ON user_tasks(source_message_id)
  WHERE source_message_id IS NOT NULL;
