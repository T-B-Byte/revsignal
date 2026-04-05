-- ============================================================================
-- RevSignal: Add "conversation" as the earliest deal pipeline stage.
-- Deals can now start as conversations before being qualified as leads.
-- ============================================================================

ALTER TYPE deal_stage ADD VALUE 'conversation' BEFORE 'lead';
