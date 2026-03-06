import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "flashcard-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/flashcards/upload
 * Upload an image for a flashcard. Returns the public URL.
 * Body: FormData with `file` (image) and `cardId` (uuid).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const cardId = formData.get("cardId") as string | null;

  if (!file || !cardId) {
    return NextResponse.json(
      { error: "Missing file or cardId" },
      { status: 400 }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPEG, PNG, WebP, or GIF." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum 5MB." },
      { status: 400 }
    );
  }

  // Verify the card belongs to this user
  const { data: card, error: cardError } = await supabase
    .from("flashcards")
    .select("card_id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  // Build storage path: userId/cardId.ext
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${cardId}.${ext}`;

  // Upload (upsert to replace existing)
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("[api/flashcards/upload] Upload failed:", uploadError.message);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  const imageUrl = urlData.publicUrl;

  // Update the card's image_url
  const { error: updateError } = await supabase
    .from("flashcards")
    .update({ image_url: imageUrl })
    .eq("card_id", cardId)
    .eq("user_id", user.id);

  if (updateError) {
    console.error("[api/flashcards/upload] Card update failed:", updateError.message);
    return NextResponse.json(
      { error: "Image uploaded but card update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ image_url: imageUrl });
}
