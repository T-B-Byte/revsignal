import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "ma-documents";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = { params: Promise<{ entityId: string }> };

/**
 * POST /api/ma/[entityId]/documents
 * Upload a document (PDF, image) to an M&A entity.
 * Bucket is private — files accessed via signed URLs only.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { entityId } = await context.params;

  if (!UUID_REGEX.test(entityId)) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify entity ownership
  const { data: entity } = await supabase
    .from("ma_entities")
    .select("entity_id")
    .eq("entity_id", entityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!entity) {
    return NextResponse.json({ error: "Entity not found" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "File type not allowed. Use PDF, JPEG, PNG, or WebP." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "File is empty." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 20MB." },
      { status: 400 }
    );
  }

  // Sanitize filename for storage (truncate, use allowlisted extension)
  const sanitizedFilename = file.name.slice(0, 500).replace(/[^\w.\-() ]/g, "_");
  const storagePath = `${user.id}/${entityId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[api/ma/documents] Upload error:", uploadErr.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  // Create document record (no file_url — bucket is private, use signed URLs)
  const { data: doc, error: insertErr } = await supabase
    .from("ma_documents")
    .insert({
      entity_id: entityId,
      user_id: user.id,
      filename: sanitizedFilename,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      analysis_status: "pending",
    })
    .select("document_id, filename, storage_path, file_size, mime_type, analysis_status, created_at")
    .single();

  if (insertErr) {
    console.error("[api/ma/documents] Insert error:", insertErr.message);
    // Clean up uploaded file
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return NextResponse.json(
      { error: "Failed to save document record" },
      { status: 500 }
    );
  }

  return NextResponse.json(doc);
}
