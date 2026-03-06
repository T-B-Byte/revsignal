-- ============================================================================
-- RevSignal: Flashcard Images Storage Bucket
-- Creates a public storage bucket for flashcard person photos.
-- ============================================================================

-- Create the bucket (public so images can be rendered in <img> tags)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcard-images',
  'flashcard-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the bucket

-- Users can upload to their own folder (userId/*)
CREATE POLICY "flashcard_images_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can update/replace their own images
CREATE POLICY "flashcard_images_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own images
CREATE POLICY "flashcard_images_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Anyone can read (public bucket for rendering in flashcards)
CREATE POLICY "flashcard_images_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'flashcard-images');
