-- Convert threads from person-centric to project-centric.
-- Add a participants jsonb array so threads can involve multiple people.
-- Migrate existing contact_name/contact_role data into participants.

ALTER TABLE coaching_threads
  ADD COLUMN IF NOT EXISTS participants jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Migrate existing single-contact data into participants array.
-- Only populate for threads that have a contact_name set.
UPDATE coaching_threads
SET participants = jsonb_build_array(
  jsonb_strip_nulls(jsonb_build_object(
    'name', contact_name,
    'role', contact_role,
    'company', company
  ))
)
WHERE contact_name IS NOT NULL
  AND participants = '[]'::jsonb;

-- For threads where title was set to contact_name (the old default),
-- keep it as-is — it still works as a project title.
