-- Link coaching threads to projects so the Strategist can be scoped to a project card.
ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(project_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_coaching_threads_project
  ON coaching_threads(user_id, project_id) WHERE project_id IS NOT NULL;
