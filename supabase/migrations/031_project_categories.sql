-- ============================================================================
-- RevSignal: Project Categories
-- Adds a free-form category column to projects for grouping.
-- Categories are user-defined text (e.g., "Partnerships", "Platform Integrations").
-- ============================================================================

-- Column already exists (added in prior migration/manual run), so only add index if missing.
CREATE INDEX IF NOT EXISTS idx_projects_user_category ON projects(user_id, category);
