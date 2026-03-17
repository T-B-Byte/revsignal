import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "thread-attachments";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword", // .doc
]);
const ALLOWED_TYPES = new Set([...IMAGE_TYPES, ...DOCUMENT_TYPES]);

type RouteContext = { params: Promise<{ threadId: string }> };

/**
 * Extract text from a PDF or Word document buffer.
 * Returns the extracted text, or null if extraction fails.
 */
async function extractDocumentText(buffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    if (mimeType === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await parser.getText();
      await parser.destroy();
      return result.text?.trim() || null;
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || null;
    }

    return null;
  } catch (err) {
    console.error("[attachments] Text extraction failed:", err);
    return null;
  }
}

/**
 * POST /api/coaching/threads/[threadId]/attachments
 * Upload an image or document attachment. Returns the public URL.
 * For documents (PDF/Word), also extracts and returns the text content.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { threadId } = await context.params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify thread ownership
  const { data: thread } = await supabase
    .from("coaching_threads")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use images (JPEG, PNG, WebP, GIF) or documents (PDF, Word)." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 10MB." },
      { status: 400 }
    );
  }

  // Read buffer once — used for both text extraction and upload
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const isDocument = DOCUMENT_TYPES.has(file.type);
  let extractedText: string | null = null;
  if (isDocument) {
    extractedText = await extractDocumentText(fileBuffer, file.type);
  }

  const ext = file.name.split(".").pop() || "bin";
  const filename = `${user.id}/${threadId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filename, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error("[api/coaching/attachments] Upload error:", uploadErr.message);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filename);

  return NextResponse.json({
    url: urlData.publicUrl,
    filename: file.name,
    type: isDocument ? "document" : "image",
    extracted_text: extractedText,
  });
}
