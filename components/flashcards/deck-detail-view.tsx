"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MasteryBadge } from "./mastery-badge";
import { CardList } from "./card-list";
import { LearnMode } from "./learn-mode";
import { QuizMode } from "./quiz-mode";
import { PomodoroTimer } from "./pomodoro-timer";
import { deleteDeckAction } from "@/app/(dashboard)/flashcards/actions";
import type { FlashcardDeck, Flashcard, QuizSession, MasteryLevel } from "@/types/database";

interface DeckDetailViewProps {
  deck: FlashcardDeck;
  cards: Flashcard[];
  quizHistory: QuizSession[];
}

type ViewMode = "detail" | "learn" | "quiz";

const MASTERY_LEVELS: MasteryLevel[] = ["new", "learning", "reviewing", "mastered"];

export function DeckDetailView({ deck, cards, quizHistory }: DeckDetailViewProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("detail");
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(deck.name);
  const [editDescription, setEditDescription] = useState(deck.description ?? "");
  const [saving, setSaving] = useState(false);

  async function handleDelete() {
    if (!confirm("Delete this deck and all its cards? This cannot be undone.")) return;
    setDeleting(true);
    const result = await deleteDeckAction(deck.deck_id);
    if ("success" in result) {
      router.push("/flashcards");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/flashcards/${deck.deck_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  // Learn mode
  if (viewMode === "learn") {
    return (
      <LearnMode
        cards={cards}
        onExit={() => setViewMode("detail")}
      />
    );
  }

  // Quiz mode
  if (viewMode === "quiz") {
    return (
      <QuizMode
        deckId={deck.deck_id}
        cards={cards}
        onExit={() => {
          setViewMode("detail");
          router.refresh();
        }}
        onLearnMode={() => setViewMode("learn")}
      />
    );
  }

  // Mastery breakdown
  const masteryBreakdown = MASTERY_LEVELS.map((level) => ({
    level,
    count: cards.filter((c) => c.mastery === level).length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/flashcards")}
          className="text-sm text-text-muted hover:text-text-primary transition-colors mb-3 inline-flex items-center gap-1"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
          All Decks
        </button>

        <div className="flex items-start justify-between">
          {editing ? (
            <div className="flex-1 space-y-2 mr-4">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-lg font-semibold text-text-primary focus:border-accent-primary focus:outline-none"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
                placeholder="Description"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} loading={saving}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setEditName(deck.name);
                    setEditDescription(deck.description ?? "");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-semibold text-text-primary">
                {deck.name}
              </h1>
              {deck.description && (
                <p className="mt-1 text-sm text-text-secondary">
                  {deck.description}
                </p>
              )}
            </div>
          )}

          {!editing && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={deleting}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-3 text-center">
          <p className="text-2xl font-bold text-text-primary">{cards.length}</p>
          <p className="text-xs text-text-muted">Cards</p>
        </div>
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-3 text-center">
          <p className="text-2xl font-bold text-status-green">
            {Math.round(deck.mastery_pct)}%
          </p>
          <p className="text-xs text-text-muted">Mastered</p>
        </div>
        {masteryBreakdown.map(({ level, count }) => (
          <div
            key={level}
            className="rounded-lg border border-border-primary bg-surface-secondary p-3 text-center"
          >
            <p className="text-lg font-bold text-text-primary">{count}</p>
            <MasteryBadge mastery={level} />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      {cards.length > 0 && (
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => setViewMode("learn")}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            Learn
          </Button>
          <Button onClick={() => setViewMode("quiz")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            Quiz
          </Button>
        </div>
      )}

      {/* Pomodoro timer */}
      <PomodoroTimer compact />

      {/* Card list */}
      <CardList deckId={deck.deck_id} cards={cards} />

      {/* Quiz history */}
      {quizHistory.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-3">
            Quiz History
          </h2>
          <div className="space-y-2">
            {quizHistory.map((session) => {
              const pct =
                session.total_cards > 0
                  ? Math.round(
                      (session.first_pass_correct / session.total_cards) * 100
                    )
                  : 0;
              return (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-secondary px-4 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-text-primary">
                      {session.first_pass_correct}/{session.total_cards}
                    </span>
                    <span className="text-xs text-text-muted">
                      {pct}% first pass
                    </span>
                    {session.final_correct !== session.first_pass_correct && (
                      <span className="text-xs text-status-green">
                        {session.final_correct}/{session.total_cards} final
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {session.completed_at
                      ? new Date(session.completed_at).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
