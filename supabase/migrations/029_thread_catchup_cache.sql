-- Cache the generated "where we left off" catchup so it loads instantly on re-entry.
-- catchup_generated_at lets us detect staleness (catchup older than last_message_at).
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS catchup_text text,
  ADD COLUMN IF NOT EXISTS catchup_generated_at timestamptz;
