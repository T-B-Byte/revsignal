-- Store the plaintext password so the admin can retrieve/share it.
-- Only accessible via RLS (user_id scoped) — never exposed to public endpoints.
ALTER TABLE deal_rooms ADD COLUMN password_plain text;
