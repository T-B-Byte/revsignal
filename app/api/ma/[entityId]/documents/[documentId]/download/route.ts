import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ entityId: string; documentId: string }>;
};

/**
 * GET /api/ma/[entityId]/documents/[documentId]/download
 * Returns a short-lived signed URL for downloading the document.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const supabase = await createClient();
  const { entityId, documentId } = await context.params;

  if (!UUID_REGEX.test(entityId) || !UUID_REGEX.test(documentId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc } = await supabase
    .from("ma_documents")
    .select("storage_path, filename")
    .eq("document_id", documentId)
    .eq("entity_id", entityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const { data: signedUrl, error } = await supabase.storage
    .from("ma-documents")
    .createSignedUrl(doc.storage_path, 300); // 5 minutes

  if (error || !signedUrl) {
    console.error("[api/ma/download] Signed URL error:", error?.message);
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: signedUrl.signedUrl, filename: doc.filename });
}
