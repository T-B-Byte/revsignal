-- RevSignal: Add prospect_use_case to coaching_threads
-- Stores a persistent, human-readable summary of the prospect's intended use case,
-- typically extrapolated from call transcripts or Strategist conversations.

ALTER TABLE coaching_threads
  ADD COLUMN prospect_use_case text;
