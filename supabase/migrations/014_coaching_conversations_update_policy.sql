-- Add missing UPDATE RLS policy on coaching_conversations
-- Required for editing user messages in StrategyGPT threads
CREATE POLICY "coaching_conversations_update"
  ON coaching_conversations
  FOR UPDATE
  USING (user_id = auth.uid());
