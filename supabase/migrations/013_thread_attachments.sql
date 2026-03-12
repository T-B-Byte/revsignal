-- Migration 013: Thread Attachments
-- Adds image/file attachment support to coaching conversations.

-- Add attachments column (array of image URLs) to coaching_conversations
ALTER TABLE coaching_conversations
  ADD COLUMN IF NOT EXISTS attachments text[] NOT NULL DEFAULT '{}';

-- Create storage bucket for thread attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thread-attachments',
  'thread-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Users can upload to their own folder
CREATE POLICY "thread_attachments_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'thread-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can update their own files
CREATE POLICY "thread_attachments_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'thread-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Users can delete their own files
CREATE POLICY "thread_attachments_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'thread-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read (public bucket for rendering in chat)
CREATE POLICY "thread_attachments_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thread-attachments');
