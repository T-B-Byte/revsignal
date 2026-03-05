import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { FlashcardDeck, Flashcard } from "@/types/database";

interface RouteContext {
  params: Promise<{ deckId: string }>;
}

const updateDeckSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

/**
 * GET /api/flashcards/:deckId
 * Returns the deck with all its cards.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [deckResult, cardsResult] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("flashcards")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .order("sort_order")
      .order("created_at"),
  ]);

  if (deckResult.error || !deckResult.data) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  return NextResponse.json({
    deck: deckResult.data as FlashcardDeck,
    cards: (cardsResult.data as Flashcard[]) ?? [],
  });
}

/**
 * PATCH /api/flashcards/:deckId
 * Update a deck's metadata.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
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

  const parsed = updateDeckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("flashcard_decks")
    .update(parsed.data)
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    console.error("[api/flashcards/:deckId] PATCH failed:", error.message);
    return NextResponse.json({ error: "Failed to update deck" }, { status: 500 });
  }

  return NextResponse.json({ deck: data });
}

/**
 * DELETE /api/flashcards/:deckId
 * Delete a deck and all its cards (cascading).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/flashcards/:deckId] DELETE failed:", error.message);
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
