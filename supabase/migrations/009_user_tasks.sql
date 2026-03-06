-- ============================================================================
-- RevSignal: User Tasks
-- Personal action items created by the user (not AI-generated).
-- ============================================================================

CREATE TABLE user_tasks (
  task_id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  text NOT NULL,
  due_date     date,
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX idx_user_tasks_status ON user_tasks(user_id, status);

-- RLS
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_tasks_select" ON user_tasks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_tasks_insert" ON user_tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_tasks_update" ON user_tasks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "user_tasks_delete" ON user_tasks
  FOR DELETE USING (auth.uid() = user_id);
