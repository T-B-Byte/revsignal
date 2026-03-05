"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { Flashcard } from "@/types/database";

interface LearnModeProps {
  cards: Flashcard[];
  onExit: () => void;
}

function getInitials(name: string): string {
  return name
    .split(/[\s,]+/)
    .filter((w) => w.length > 0 && w[0] === w[0].toUpperCase())
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export function LearnMode({ cards, onExit }: LearnModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
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
  }, [shuffled, cards]);

  if (!card) return null;

  // Extract initials from back_content for image cards without a URL
  const nameFromBack = card.back_content.split(",")[0].trim();
  const initials = getInitials(nameFromBack);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to Deck
        </Button>
        <div className="flex items-center gap-2">
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
          <span className="text-sm text-text-muted">
            {currentIndex + 1} of {displayCards.length}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl rounded-xl border border-border-primary bg-surface-secondary p-6">
        {/* Front */}
        <div className="space-y-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Front
          </span>

          {card.card_type === "image" && (
            <div className="flex justify-center py-4">
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt=""
                  className="h-32 w-32 rounded-full object-cover border-2 border-border-primary"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-accent-primary/10 border-2 border-accent-primary/30">
                  <span className="text-3xl font-bold text-accent-primary">
                    {initials}
                  </span>
                </div>
              )}
            </div>
          )}

          <p className="text-lg text-text-primary">
            {card.card_type === "fill_blank"
              ? card.front_content.replace(
                  /_______/g,
                  `\u00A0\u00A0______\u00A0\u00A0`
                )
              : card.front_content}
          </p>
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-dashed border-border-primary" />

        {/* Back */}
        <div className="space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Answer
          </span>

          {card.card_type === "fill_blank" ? (
            <>
              <p className="text-lg font-semibold text-status-green">
                {card.back_content}
              </p>
              {card.back_detail && (
                <p className="text-sm text-text-secondary mt-2">
                  {card.back_detail}
                </p>
              )}
              {card.source_attribution && (
                <p className="text-xs text-text-muted italic mt-1">
                  — {card.source_attribution}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-base text-text-primary font-medium">
                {card.back_content}
              </p>
              {card.back_detail && (
                <p className="text-sm text-text-secondary mt-2">
                  {card.back_detail}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>
        <span className="text-sm font-medium text-text-muted tabular-nums">
          {currentIndex + 1} / {displayCards.length}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setCurrentIndex((i) => Math.min(displayCards.length - 1, i + 1))
          }
          disabled={currentIndex === displayCards.length - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
