-- ============================================================================
-- RevSignal: M&A Documents Migration
-- Upload slide decks, pitch materials, and other files for AI-powered
-- strategic assessment on M&A entities.
-- ============================================================================

-- ============================================================================
-- TABLES
-- ============================================================================

CREATE TABLE ma_documents (
  document_id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid NOT NULL REFERENCES ma_entities(entity_id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename            text NOT NULL CHECK (length(filename) <= 500),
  storage_path        text NOT NULL,
  file_size           int NOT NULL CHECK (file_size > 0),
  mime_type           text NOT NULL,
  analysis_status     text NOT NULL DEFAULT 'pending'
                      CHECK (analysis_status IN ('pending', 'analyzing', 'complete', 'failed')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_ma_documents_entity_id ON ma_documents(entity_id);
CREATE INDEX idx_ma_documents_user_id ON ma_documents(user_id);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ma-documents',
  'ma-documents',
  false,  -- Private bucket: M&A docs are sensitive
  20971520, -- 20MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE ma_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ma_documents_select" ON ma_documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ma_documents_insert" ON ma_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ma_documents_update" ON ma_documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "ma_documents_delete" ON ma_documents
  FOR DELETE USING (auth.uid() = user_id);

-- Storage RLS: Users can upload/manage files in their own folder
CREATE POLICY "ma_documents_storage_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ma-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "ma_documents_storage_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ma-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "ma_documents_storage_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'ma-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Private bucket: only authenticated owners can read their own files
CREATE POLICY "ma_documents_storage_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'ma-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
