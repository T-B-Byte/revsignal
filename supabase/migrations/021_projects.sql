-- ============================================================================
-- RevSignal: Projects & Project Members
-- Projects are internal workstreams/initiatives (SAP, Leadscale, etc.)
-- with team members. Powers the Network mindmap.
-- ============================================================================

CREATE TYPE project_status AS ENUM ('active', 'paused', 'completed');

CREATE TABLE projects (
  project_id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  status        project_status NOT NULL DEFAULT 'active',
  color         text DEFAULT '#3b82f6',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user_status ON projects(user_id, status);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Project members — people working on each project
-- Can optionally link to contacts table, or just store name/role directly
CREATE TABLE project_members (
  member_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id    uuid REFERENCES contacts(contact_id) ON DELETE SET NULL,
  name          text NOT NULL,
  role          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);

-- RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_members_select" ON project_members
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "project_members_update" ON project_members
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE USING (auth.uid() = user_id);
