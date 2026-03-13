-- ============================================================================
-- RevSignal: Sidebar Folders Migration
-- User-created folders for organizing sidebar navigation items.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. sidebar_folders (user-created organizational folders)
CREATE TABLE sidebar_folders (
  folder_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,
  sort_order          int NOT NULL DEFAULT 0,
  is_open             boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 2. sidebar_item_assignments (which nav items are in which folders)
CREATE TABLE sidebar_item_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nav_key             text NOT NULL,
  folder_id           uuid NOT NULL REFERENCES sidebar_folders(folder_id) ON DELETE CASCADE,
  sort_order          int NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, nav_key)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_sidebar_folders_user_id ON sidebar_folders(user_id);
CREATE INDEX idx_sidebar_folders_user_sort ON sidebar_folders(user_id, sort_order);

CREATE INDEX idx_sidebar_item_assignments_user_id ON sidebar_item_assignments(user_id);
CREATE INDEX idx_sidebar_item_assignments_folder_id ON sidebar_item_assignments(folder_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER trg_sidebar_folders_updated_at
  BEFORE UPDATE ON sidebar_folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- sidebar_folders
ALTER TABLE sidebar_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sidebar_folders_select" ON sidebar_folders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sidebar_folders_insert" ON sidebar_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sidebar_folders_update" ON sidebar_folders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sidebar_folders_delete" ON sidebar_folders
  FOR DELETE USING (auth.uid() = user_id);

-- sidebar_item_assignments
ALTER TABLE sidebar_item_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sidebar_item_assignments_select" ON sidebar_item_assignments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sidebar_item_assignments_insert" ON sidebar_item_assignments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sidebar_item_assignments_update" ON sidebar_item_assignments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sidebar_item_assignments_delete" ON sidebar_item_assignments
  FOR DELETE USING (auth.uid() = user_id);
