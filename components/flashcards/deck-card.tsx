"use client";

import Link from "next/link";
import type { FlashcardDeck } from "@/types/database";
import { DECK_COLORS } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

interface DeckCardProps {
  deck: FlashcardDeck;
}

export function DeckCard({ deck }: DeckCardProps) {
  const colorConfig = DECK_COLORS.find((c) => c.value === deck.color) ?? DECK_COLORS[0];

  return (
    <Link href={`/flashcards/${deck.deck_id}`}>
      <div
        className={`group rounded-lg border p-4 transition-colors hover:bg-surface-tertiary cursor-pointer ${colorConfig.className}`}
      >
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
            {deck.name}
          </h3>
          <span className="text-xs text-text-muted ml-2 shrink-0">
            {deck.card_count} {deck.card_count === 1 ? "card" : "cards"}
          </span>
        </div>

        {deck.description && (
          <p className="mt-1 text-sm text-text-secondary line-clamp-1">
            {deck.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          {/* Mastery progress bar */}
          <div className="flex-1">
            <div className="h-1.5 w-full rounded-full bg-surface-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-status-green transition-all"
                style={{ width: `${Math.min(deck.mastery_pct, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-xs font-medium text-text-muted">
            {Math.round(deck.mastery_pct)}%
          </span>
        </div>

        <p className="mt-2 text-[11px] text-text-muted">
          {deck.last_studied_at
            ? `Studied ${formatDistanceToNow(new Date(deck.last_studied_at), { addSuffix: true })}`
            : "Never studied"}
        </p>
      </div>
    </Link>
  );
}
