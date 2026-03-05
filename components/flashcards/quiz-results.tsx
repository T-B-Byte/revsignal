"use client";

import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types/database";

interface QuizResultsProps {
  totalCards: number;
  firstPassCorrect: number;
  finalCorrect: number;
  strugglingCards: Flashcard[];
  onQuizAgain: () => void;
  onLearnMode: () => void;
  onBackToDeck: () => void;
}

export function QuizResults({
  totalCards,
  firstPassCorrect,
  finalCorrect,
  strugglingCards,
  onQuizAgain,
  onLearnMode,
  onBackToDeck,
}: QuizResultsProps) {
  const firstPassPct = totalCards > 0 ? Math.round((firstPassCorrect / totalCards) * 100) : 0;
  const finalPct = totalCards > 0 ? Math.round((finalCorrect / totalCards) * 100) : 0;
  const perfect = finalCorrect === totalCards;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary">
          {perfect ? "Perfect Score!" : "Quiz Complete"}
        </h2>
      </div>

      {/* Score cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-4 text-center">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            First Pass
          </p>
          <p className="text-3xl font-bold text-text-primary">
            {firstPassCorrect}/{totalCards}
          </p>
          <p className="text-sm text-text-secondary">{firstPassPct}%</p>
        </div>
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-4 text-center">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Final Score
          </p>
          <p className="text-3xl font-bold text-status-green">
            {finalCorrect}/{totalCards}
          </p>
          <p className="text-sm text-text-secondary">{finalPct}%</p>
        </div>
      </div>

      {/* Struggling cards */}
      {strugglingCards.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-2">
            Cards to Review
          </h3>
          <div className="space-y-2">
            {strugglingCards.map((card) => (
              <div
                key={card.card_id}
                className="rounded-lg border border-status-red/20 bg-status-red/5 p-3"
              >
                <p className="text-sm text-text-primary">{card.front_content}</p>
                <p className="text-xs text-text-muted mt-1">{card.back_content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Button onClick={onQuizAgain}>Quiz Again</Button>
        <Button variant="secondary" onClick={onLearnMode}>
          Learn Mode
        </Button>
        <Button variant="ghost" onClick={onBackToDeck}>
          Back to Deck
        </Button>
      </div>
    </div>
  );
}
