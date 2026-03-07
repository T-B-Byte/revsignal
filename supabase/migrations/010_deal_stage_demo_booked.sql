-- ============================================================================
-- RevSignal: Add 'demo_booked' deal stage
-- Inserted between 'discovery' and 'poc_trial' in the pipeline.
-- ============================================================================

ALTER TYPE deal_stage ADD VALUE 'demo_booked' AFTER 'discovery';
