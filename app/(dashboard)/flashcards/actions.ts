"use server";

import { createClient } from "@/lib/supabase/server";
import { MASTERY_THRESHOLDS } from "@/types/database";
import type { MasteryLevel } from "@/types/database";

/**
 * Delete a deck and all its cards, quiz sessions, and responses (cascading).
 */
export async function deleteDeckAction(
  deckId: string
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[flashcards/actions] deleteDeck failed:", error.message);
    return { error: "Failed to delete deck" };
  }

  return { success: true };
}

/**
 * Reorder cards within a deck.
 */
export async function reorderCards(
  deckId: string,
  cardIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  if (cardIds.length > 500) return { error: "Too many cards" };

  // Update sort_order for each card
  const updates = cardIds.map((cardId, index) =>
    supabase
      .from("flashcards")
      .update({ sort_order: index })
      .eq("card_id", cardId)
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[flashcards/actions] reorderCards failed:", failed.error.message);
    return { error: "Failed to reorder cards" };
  }

  return { success: true };
}

/**
 * Recalculate and update mastery_pct on a deck.
 */
export async function updateDeckMastery(
  deckId: string
): Promise<{ mastery_pct: number } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: cards } = await supabase
    .from("flashcards")
    .select("card_id, times_seen, times_correct, mastery")
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  if (!cards || cards.length === 0) {
    await supabase
      .from("flashcard_decks")
      .update({ mastery_pct: 0 })
      .eq("deck_id", deckId)
      .eq("user_id", user.id);
    return { mastery_pct: 0 };
  }

  // Recalculate each card's mastery and update by card_id
  for (const card of cards) {
    const timesSeen = card.times_seen as number;
    const timesCorrect = card.times_correct as number;
    let newMastery: MasteryLevel = "new";
    if (timesSeen >= MASTERY_THRESHOLDS.minSeen) {
      const pct = timesCorrect / timesSeen;
      if (pct >= MASTERY_THRESHOLDS.mastered) newMastery = "mastered";
      else if (pct >= MASTERY_THRESHOLDS.reviewing) newMastery = "reviewing";
      else if (pct >= MASTERY_THRESHOLDS.learning) newMastery = "learning";
    } else if (timesSeen > 0) {
      newMastery = "learning";
    }
    if (newMastery !== card.mastery) {
      await supabase
        .from("flashcards")
        .update({ mastery: newMastery })
        .eq("card_id", card.card_id)
        .eq("user_id", user.id);
    }
  }

  // Recalculate deck mastery
  const { data: updatedCards } = await supabase
    .from("flashcards")
    .select("mastery")
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  const total = updatedCards?.length ?? 0;
  const mastered = updatedCards?.filter((c) => c.mastery === "mastered").length ?? 0;
  const mastery_pct = total > 0 ? Math.round((mastered / total) * 10000) / 100 : 0;

  await supabase
    .from("flashcard_decks")
    .update({ mastery_pct })
    .eq("deck_id", deckId)
    .eq("user_id", user.id);

  return { mastery_pct };
}
