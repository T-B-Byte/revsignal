"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DeckCard } from "./deck-card";
import { CreateDeckDialog } from "./create-deck-dialog";
import type { FlashcardDeck, QuizSession } from "@/types/database";

interface FlashcardsViewProps {
  decks: FlashcardDeck[];
  recentSessions: QuizSession[];
}

export function FlashcardsView({ decks, recentSessions }: FlashcardsViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Flashcards</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Deck
        </Button>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          <p className="text-sm text-text-muted">
            No flashcard decks yet. Create your first deck to start studying.
          </p>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="mt-3 text-sm font-medium text-accent-primary hover:underline"
          >
            Create your first deck
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard key={deck.deck_id} deck={deck} />
          ))}
        </div>
      )}

      {/* Recent quiz activity */}
      {recentSessions.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
            Recent Quizzes
          </h2>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div
                key={session.session_id}
                className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-secondary px-4 py-2"
              >
                <div className="text-sm text-text-secondary">
                  {session.first_pass_correct}/{session.total_cards} first pass
                  {session.final_correct !== session.first_pass_correct && (
                    <span className="ml-2 text-status-green">
                      {session.final_correct}/{session.total_cards} final
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {session.completed_at
                    ? new Date(session.completed_at).toLocaleDateString()
                    : "In progress"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateDeckDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
