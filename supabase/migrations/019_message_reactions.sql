-- ============================================================================
-- RevSignal: Message Reactions
-- Quick emoji reactions on coaching messages (thumbs_up, ok, love).
-- ============================================================================

ALTER TABLE coaching_conversations
  ADD COLUMN IF NOT EXISTS reaction text
  CHECK (reaction IS NULL OR reaction IN ('thumbs_up', 'ok', 'love'));
