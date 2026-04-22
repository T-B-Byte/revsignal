-- ============================================================================
-- RevSignal: Deal Room Custom "Why Us" + Use Cases Intro
-- Allows per-room "Why Us" positive statements (positioning, no competitor
-- framing) and a lead-in caveat above the custom use cases list.
-- ============================================================================

-- Custom why-us: JSON array of { title, description }
ALTER TABLE deal_rooms
  ADD COLUMN custom_why_us jsonb DEFAULT '[]'::jsonb;

-- Optional lead-in text above the custom use cases section
ALTER TABLE deal_rooms
  ADD COLUMN custom_use_cases_intro text;
