import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

interface RouteContext {
  params: Promise<{ deckId: string; cardId: string }>;
}

const updateCardSchema = z.object({
  front_content: z.string().min(1).max(1000).optional(),
  back_content: z.string().min(1).max(2000).optional(),
  back_detail: z.string().max(2000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  source_attribution: z.string().max(500).nullable().optional(),
});

/**
 * PATCH /api/flashcards/:deckId/cards/:cardId
 * Update a card's content.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { deckId, cardId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update(parsed.data)
    .eq("card_id", cardId)
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/flashcards/:deckId/cards/:cardId] PATCH failed:", error.message);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }

  return NextResponse.json({ card: data });
}

/**
 * DELETE /api/flashcards/:deckId/cards/:cardId
 * Delete a card.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { deckId, cardId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("card_id", cardId)
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/flashcards/:deckId/cards/:cardId] DELETE failed:", error.message);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
