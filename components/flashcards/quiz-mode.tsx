"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { QuizResults } from "./quiz-results";
import type { Flashcard, QuizSession } from "@/types/database";

interface QuizModeProps {
  deckId: string;
  cards: Flashcard[];
  onExit: () => void;
  onLearnMode: () => void;
}

type Phase = "first_pass" | "review" | "final_review" | "results";

interface CardResponse {
  correct: boolean;
  attempts: number;
}

function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export function QuizMode({ deckId, cards, onExit, onLearnMode }: QuizModeProps) {
  const [phase, setPhase] = useState<Phase>("first_pass");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [responses, setResponses] = useState<Map<string, CardResponse>>(new Map());
  const [phaseCards, setPhaseCards] = useState<Flashcard[]>(
    () => [...cards].sort(() => Math.random() - 0.5)
  );
  const [firstPassCorrect, setFirstPassCorrect] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [showInterim, setShowInterim] = useState(false);

  const currentCard = phaseCards[currentIndex];
  const totalCards = cards.length;

  // Start quiz session
  const startQuiz = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flashcards/${deckId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });

      if (!res.ok) return;

      const data = await res.json();
      setSessionId(data.session.session_id);
      setPhaseCards(data.cards);
      setStarted(true);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  // Record a response
  const recordResponse = useCallback(
    async (isCorrect: boolean) => {
      if (!currentCard || !sessionId) return;

      const existing = responses.get(currentCard.card_id);
      const attemptNumber = (existing?.attempts ?? 0) + 1;

      // Update local state
      const newResponses = new Map(responses);
      newResponses.set(currentCard.card_id, {
        correct: isCorrect,
        attempts: attemptNumber,
      });
      setResponses(newResponses);

      if (phase === "first_pass" && isCorrect) {
        setFirstPassCorrect((n) => n + 1);
      }

      // Record to API (fire and forget)
      fetch(`/api/flashcards/${deckId}/quiz`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          cardId: currentCard.card_id,
          attemptNumber,
          isCorrect,
        }),
      });

      // Move to next card or end phase
      setRevealed(false);
      if (currentIndex < phaseCards.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        // End of phase
        endPhase(newResponses);
      }
    },
    [currentCard, sessionId, phase, currentIndex, phaseCards, responses, deckId]
  );

  function endPhase(latestResponses: Map<string, CardResponse>) {
    // Gather missed cards from this phase
    const missedCards = phaseCards.filter((c) => {
      const r = latestResponses.get(c.card_id);
      return r && !r.correct;
    });

    if (missedCards.length === 0 || phase === "final_review") {
      // Quiz is done
      completeQuiz(latestResponses);
      return;
    }

    // Show interim screen
    setShowInterim(true);
  }

  function continueToReview() {
    const missedCards = phaseCards.filter((c) => {
      const r = responses.get(c.card_id);
      return r && !r.correct;
    });

    const nextPhase: Phase = phase === "first_pass" ? "review" : "final_review";
    setPhase(nextPhase);
    setPhaseCards(missedCards.sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setRevealed(false);
    setShowInterim(false);
  }

  async function completeQuiz(latestResponses: Map<string, CardResponse>) {
    if (!sessionId) return;

    // Calculate final correct
    const finalCorrect = Array.from(latestResponses.values()).filter(
      (r) => r.correct
    ).length;

    await fetch(`/api/flashcards/${deckId}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", sessionId }),
    });

    setPhase("results");
  }

  // Not started yet
  if (!started) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Deck
          </Button>
        </div>
        <div className="mx-auto max-w-md text-center py-12">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Quiz Mode
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {totalCards} cards. Wrong answers will be repeated up to 3 times.
          </p>
          <Button onClick={startQuiz} loading={loading}>
            Start Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Results
  if (phase === "results") {
    const finalCorrect = Array.from(responses.values()).filter(
      (r) => r.correct
    ).length;
    const strugglingCards = cards.filter((c) => {
      const r = responses.get(c.card_id);
      return r && !r.correct;
    });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Deck
          </Button>
        </div>
        <QuizResults
          totalCards={totalCards}
          firstPassCorrect={firstPassCorrect}
          finalCorrect={finalCorrect}
          strugglingCards={strugglingCards}
          onQuizAgain={() => {
            setPhase("first_pass");
            setCurrentIndex(0);
            setRevealed(false);
            setResponses(new Map());
            setFirstPassCorrect(0);
            setStarted(false);
            setShowInterim(false);
          }}
          onLearnMode={onLearnMode}
          onBackToDeck={onExit}
        />
      </div>
    );
  }

  // Interim screen between phases
  if (showInterim) {
    const missedCount = phaseCards.filter((c) => {
      const r = responses.get(c.card_id);
      return r && !r.correct;
    }).length;

    const phaseLabel =
      phase === "first_pass" ? "First pass" : phase === "review" ? "Review" : "Final review";
    const correctThisPhase = phaseCards.length - missedCount;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back to Deck
          </Button>
        </div>
        <div className="mx-auto max-w-md text-center py-8">
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {phaseLabel}: {correctThisPhase}/{phaseCards.length} correct
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {missedCount} {missedCount === 1 ? "card" : "cards"} to review.
          </p>
          <Button onClick={continueToReview}>Continue</Button>
        </div>
      </div>
    );
  }

  // Card not available (safety)
  if (!currentCard) return null;

  const nameFromBack = currentCard.back_content.split(",")[0].trim();
  const initials = getInitials(nameFromBack);

  const phaseLabel =
    phase === "first_pass" ? "" : phase === "review" ? "Review" : "Final Review";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to Deck
        </Button>
        <div className="flex items-center gap-3">
          {phaseLabel && (
            <span className="rounded-full bg-status-yellow/10 px-2.5 py-0.5 text-xs font-medium text-status-yellow border border-status-yellow/30">
              {phaseLabel}
            </span>
          )}
          <span className="text-sm text-text-muted">
            {currentIndex + 1} of {phaseCards.length}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-border-primary bg-surface-secondary p-6 min-h-[300px] flex flex-col">
        {/* Front */}
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          {currentCard.card_type === "image" && (
            <div className="py-2">
              {currentCard.image_url ? (
                <img
                  src={currentCard.image_url}
                  alt=""
                  className="h-32 w-32 rounded-full object-cover border-2 border-border-primary mx-auto"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent-primary/10 border-2 border-accent-primary/30 mx-auto">
                  <span className="text-3xl font-bold text-accent-primary">
                    {initials}
                  </span>
                </div>
              )}
            </div>
          )}

          <p className="text-lg text-text-primary">
            {currentCard.card_type === "fill_blank"
              ? currentCard.front_content.replace(/_______/g, "\u00A0______\u00A0")
              : currentCard.front_content}
          </p>
        </div>

        {/* Reveal / Answer */}
        {!revealed ? (
          <div className="pt-4 text-center">
            <Button
              variant="secondary"
              onClick={() => setRevealed(true)}
            >
              Reveal Answer
            </Button>
          </div>
        ) : (
          <>
            <div className="my-4 border-t border-dashed border-border-primary" />

            <div className="space-y-2">
              {currentCard.card_type === "fill_blank" ? (
                <>
                  <p className="text-lg font-semibold text-status-green text-center">
                    {currentCard.back_content}
                  </p>
                  {currentCard.back_detail && (
                    <p className="text-sm text-text-secondary text-center">
                      {currentCard.back_detail}
                    </p>
                  )}
                  {currentCard.source_attribution && (
                    <p className="text-xs text-text-muted italic text-center">
                      — {currentCard.source_attribution}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-base font-medium text-text-primary text-center">
                    {currentCard.back_content}
                  </p>
                  {currentCard.back_detail && (
                    <p className="text-sm text-text-secondary text-center">
                      {currentCard.back_detail}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button
                onClick={() => recordResponse(true)}
                className="bg-status-green hover:bg-status-green/80 text-white border-0"
              >
                Got It
              </Button>
              <Button
                onClick={() => recordResponse(false)}
                variant="danger"
              >
                Missed It
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div className="mx-auto max-w-2xl">
        <div className="h-1 w-full rounded-full bg-surface-primary overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-primary transition-all"
            style={{
              width: `${((currentIndex + 1) / phaseCards.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
