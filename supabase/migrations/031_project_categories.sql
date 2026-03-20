-- ============================================================================
-- RevSignal: Project Categories
-- Adds a free-form category column to projects for grouping.
-- Categories are user-defined text (e.g., "Partnerships", "Platform Integrations").
-- ============================================================================

ALTER TABLE projects ADD COLUMN category text;

-- Index for filtering by category
CREATE INDEX idx_projects_user_category ON projects(user_id, category);
