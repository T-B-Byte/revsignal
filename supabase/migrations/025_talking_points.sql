-- Talking points: per-contact running list of things to discuss.
-- Linked optionally to a StrategyGPT thread for project context.
-- Source tracks whether user or Strategist created the item.

CREATE TABLE IF NOT EXISTS talking_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
  thread_id uuid REFERENCES coaching_threads(thread_id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(content) <= 500),
  priority integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'strategist')),
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup: all open talking points for a contact
CREATE INDEX idx_talking_points_contact
  ON talking_points (user_id, contact_id, is_completed, priority);

-- RLS
ALTER TABLE talking_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own talking points"
  ON talking_points
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
