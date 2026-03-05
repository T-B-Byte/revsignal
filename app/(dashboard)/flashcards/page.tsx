import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FlashcardsView } from "@/components/flashcards/flashcards-view";
import type { FlashcardDeck, QuizSession } from "@/types/database";

export default async function FlashcardsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [decksResult, sessionsResult] = await Promise.all([
    supabase
      .from("flashcard_decks")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order")
      .order("created_at", { ascending: false }),
    supabase
      .from("quiz_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(5),
  ]);

  return (
    <FlashcardsView
      decks={(decksResult.data as FlashcardDeck[]) ?? []}
      recentSessions={(sessionsResult.data as QuizSession[]) ?? []}
    />
  );
}
