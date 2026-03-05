import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DeckDetailView } from "@/components/flashcards/deck-detail-view";
import type { FlashcardDeck, Flashcard, QuizSession } from "@/types/database";

export default async function DeckPage({
  params,
}: {
  params: Promise<{ deckId: string }>;
}) {
  const { deckId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [deckResult, cardsResult, sessionsResult] = await Promise.all([
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
    supabase
      .from("quiz_sessions")
      .select("*")
      .eq("deck_id", deckId)
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(10),
  ]);

  if (!deckResult.data) notFound();

  return (
    <DeckDetailView
      deck={deckResult.data as FlashcardDeck}
      cards={(cardsResult.data as Flashcard[]) ?? []}
      quizHistory={(sessionsResult.data as QuizSession[]) ?? []}
    />
  );
}
