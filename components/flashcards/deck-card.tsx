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
      <div className="group relative cursor-pointer" style={{ perspective: "800px" }}>
        {/* Stacked card shadows behind */}
        <div
          className="absolute inset-0 rounded-xl border border-border-primary bg-surface-tertiary"
          style={{ transform: "rotate(3deg) translate(4px, 2px)" }}
        />
        <div
          className="absolute inset-0 rounded-xl border border-border-primary bg-surface-tertiary"
          style={{ transform: "rotate(-1.5deg) translate(-2px, 1px)" }}
        />

        {/* Main card */}
        <div
          className={`relative rounded-xl border-2 bg-surface-secondary p-5 transition-all group-hover:shadow-lg group-hover:-translate-y-0.5 ${colorConfig.className}`}
        >
          {/* Top color stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-accent-primary to-blue-500 opacity-60" />

          <div className="flex items-start justify-between mt-1">
            <h3 className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors leading-tight">
              {deck.name}
            </h3>
            <span className="ml-2 shrink-0 rounded-full bg-surface-primary px-2 py-0.5 text-xs font-medium text-text-muted border border-border-primary">
              {deck.card_count}
            </span>
          </div>

          {deck.description && (
            <p className="mt-1.5 text-sm text-text-secondary line-clamp-1">
              {deck.description}
            </p>
          )}

          {/* Mastery progress */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-surface-primary overflow-hidden">
                <div
                  className="h-full rounded-full bg-status-green transition-all"
                  style={{ width: `${Math.min(deck.mastery_pct, 100)}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-semibold text-text-muted tabular-nums">
              {Math.round(deck.mastery_pct)}%
            </span>
          </div>

          <p className="mt-2 text-[11px] text-text-muted">
            {deck.last_studied_at
              ? `Studied ${formatDistanceToNow(new Date(deck.last_studied_at), { addSuffix: true })}`
              : "Never studied"}
          </p>
        </div>
      </div>
    </Link>
  );
}
