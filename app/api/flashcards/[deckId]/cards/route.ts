import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import type { Flashcard } from "@/types/database";

interface RouteContext {
  params: Promise<{ deckId: string }>;
}

const createCardSchema = z.object({
  card_type: z.enum(["standard", "fill_blank", "image"] as const),
  front_content: z.string().min(1).max(1000),
  back_content: z.string().min(1).max(2000),
  back_detail: z.string().max(2000).optional(),
  image_url: z.string().url().optional(),
  source_attribution: z.string().max(500).optional(),
});

/**
 * GET /api/flashcards/:deckId/cards
 * List all cards in a deck.
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

  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .order("sort_order")
    .order("created_at");

  if (error) {
    console.error("[api/flashcards/:deckId/cards] GET failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }

  return NextResponse.json({ cards: (data as Flashcard[]) ?? [] });
}

/**
 * POST /api/flashcards/:deckId/cards
 * Create a new card in a deck.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { deckId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify deck ownership
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("deck_id")
    .eq("deck_id", deckId)
    .eq("user_id", user.id)
    .single();

  if (!deck) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createCardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Get max sort_order for this deck
  const { data: lastCard } = await supabase
    .from("flashcards")
    .select("sort_order")
    .eq("deck_id", deckId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSort = (lastCard?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("flashcards")
    .insert({
      deck_id: deckId,
      user_id: user.id,
      card_type: parsed.data.card_type,
      front_content: parsed.data.front_content,
      back_content: parsed.data.back_content,
      back_detail: parsed.data.back_detail ?? null,
      image_url: parsed.data.image_url ?? null,
      source_attribution: parsed.data.source_attribution ?? null,
      sort_order: nextSort,
    })
    .select()
    .single();

  if (error) {
    console.error("[api/flashcards/:deckId/cards] POST failed:", error.message);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }

  return NextResponse.json({ card: data }, { status: 201 });
}
