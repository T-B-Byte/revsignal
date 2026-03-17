-- ============================================================================
-- RevSignal: Project Hierarchy (parent/sub-project relationships)
-- Adds parent_project_id to support master projects and sub-projects.
-- Max depth: 2 levels (master → sub). Sub-projects cannot have children.
-- ============================================================================

ALTER TABLE projects
  ADD COLUMN parent_project_id uuid REFERENCES projects(project_id) ON DELETE SET NULL;

CREATE INDEX idx_projects_parent ON projects(parent_project_id);
