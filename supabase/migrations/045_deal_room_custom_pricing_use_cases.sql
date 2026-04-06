-- ============================================================================
-- RevSignal: Deal Room Custom Pricing & Use Cases
-- Allows per-room pricing (entered by Tina) and custom use cases
-- that display in the prospect's deal room portal.
-- ============================================================================

-- Custom pricing: JSON array of { label, price, unit, description }
ALTER TABLE deal_rooms
  ADD COLUMN custom_pricing jsonb DEFAULT '[]'::jsonb;

-- Custom use cases: JSON array of { title, description, persona? }
ALTER TABLE deal_rooms
  ADD COLUMN custom_use_cases jsonb DEFAULT '[]'::jsonb;
