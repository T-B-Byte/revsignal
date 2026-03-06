"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { FlashcardFlip } from "./flashcard-flip";
import type { Flashcard } from "@/types/database";

interface LearnModeProps {
  cards: Flashcard[];
  onExit: () => void;
}

export function LearnMode({ cards, onExit }: LearnModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [displayCards, setDisplayCards] = useState(cards);

  const card = displayCards[currentIndex];

  const toggleShuffle = useCallback(() => {
    if (shuffled) {
      setDisplayCards(cards);
      setShuffled(false);
    } else {
      setDisplayCards([...cards].sort(() => Math.random() - 0.5));
      setShuffled(true);
    }
    setCurrentIndex(0);
    setFlipped(false);
  }, [shuffled, cards]);

  const goNext = useCallback(() => {
    if (currentIndex < displayCards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [currentIndex, displayCards.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setFlipped(false);
    }
  }, [currentIndex]);

  if (!card) return null;

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to Deck
        </Button>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleShuffle}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              shuffled
                ? "bg-accent-primary/10 text-accent-primary"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Shuffle {shuffled ? "On" : "Off"}
          </button>
          <span className="text-sm text-text-muted tabular-nums">
            {currentIndex + 1} of {displayCards.length}
          </span>
        </div>
      </div>

      {/* The card */}
      <FlashcardFlip
        card={card}
        flipped={flipped}
        onFlip={() => setFlipped((f) => !f)}
      />

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={goPrev}
          disabled={currentIndex === 0}
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Previous
        </Button>
        <span className="text-sm font-medium text-text-muted tabular-nums">
          {currentIndex + 1} / {displayCards.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={goNext}
          disabled={currentIndex === displayCards.length - 1}
        >
          Next
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 3l5 5-5 5" />
          </svg>
        </Button>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1 flex-wrap max-w-sm mx-auto">
        {displayCards.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setCurrentIndex(i);
              setFlipped(false);
            }}
            className={`h-2 w-2 rounded-full transition-all ${
              i === currentIndex
                ? "bg-accent-primary scale-125"
                : "bg-border-primary hover:bg-text-muted"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
