-- ============================================================================
-- RevSignal: Raise deal-room data test domain limit from 100 to 500
-- ============================================================================

ALTER TABLE deal_room_data_tests
  DROP CONSTRAINT IF EXISTS data_test_max_domains;

ALTER TABLE deal_room_data_tests
  ADD CONSTRAINT data_test_max_domains CHECK (domain_count <= 500);
