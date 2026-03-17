-- 90-day plans with three phases (30/60/90) and trackable milestones.
-- Each plan has a start date; phase deadlines are computed from it.
-- Milestones link optionally to a StrategyGPT thread for context.

CREATE TABLE IF NOT EXISTS plans (
  plan_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) <= 200),
  description text CHECK (char_length(description) <= 2000),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE SET NULL,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plans_user ON plans (user_id, is_archived);

CREATE TABLE IF NOT EXISTS plan_milestones (
  milestone_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(plan_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phase text NOT NULL CHECK (phase IN ('day_30', 'day_60', 'day_90')),
  title text NOT NULL CHECK (char_length(title) <= 300),
  description text CHECK (char_length(description) <= 2000),
  sort_order integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_milestones_plan
  ON plan_milestones (plan_id, phase, sort_order);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own plans"
  ON plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own plan milestones"
  ON plan_milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
