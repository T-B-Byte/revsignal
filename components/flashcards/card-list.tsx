"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MasteryBadge } from "./mastery-badge";
import { CardTypeBadge } from "./card-type-badge";
import { AddCardForm } from "./add-card-form";
import { ImageUpload } from "./image-upload";
import type { Flashcard } from "@/types/database";

interface CardListProps {
  deckId: string;
  cards: Flashcard[];
}

export function CardList({ deckId, cards }: CardListProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  function startEdit(card: Flashcard) {
    setEditingCardId(card.card_id);
    setEditFront(card.front_content);
    setEditBack(card.back_content);
    setEditDetail(card.back_detail ?? "");
  }

  async function saveEdit(card: Flashcard) {
    setSaving(true);
    try {
      const res = await fetch(`/api/flashcards/${deckId}/cards/${card.card_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          front_content: editFront.trim(),
          back_content: editBack.trim(),
          back_detail: editDetail.trim() || null,
        }),
      });
      if (res.ok) {
        setEditingCardId(null);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteCard(cardId: string) {
    setDeletingCardId(cardId);
    try {
      const res = await fetch(`/api/flashcards/${deckId}/cards/${cardId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setDeletingCardId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          Cards
          <span className="ml-2 text-xs font-normal text-text-muted">
            ({cards.length})
          </span>
        </h2>
        <Button size="sm" onClick={() => setShowAddForm(true)}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Card
        </Button>
      </div>

      {showAddForm && (
        <AddCardForm deckId={deckId} onClose={() => setShowAddForm(false)} />
      )}

      {cards.length === 0 && !showAddForm ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          <p className="text-sm text-text-muted">
            No cards yet. Add your first card to start studying.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 text-sm font-medium text-accent-primary hover:underline"
          >
            Add your first card
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => (
            <div
              key={card.card_id}
              className="rounded-lg border border-border-primary bg-surface-secondary p-3"
            >
              {editingCardId === card.card_id ? (
                <div className="space-y-2">
                  {card.card_type === "image" && (
                    <ImageUpload
                      cardId={card.card_id}
                      currentUrl={card.image_url}
                      size="sm"
                    />
                  )}
                  <textarea
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                  />
                  <textarea
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    rows={2}
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none resize-none"
                  />
                  <textarea
                    value={editDetail}
                    onChange={(e) => setEditDetail(e.target.value)}
                    rows={2}
                    placeholder="Detail (optional)"
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingCardId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => saveEdit(card)}
                      loading={saving}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer"
                  onClick={() => startEdit(card)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {card.card_type === "image" && card.image_url && (
                        <img
                          src={card.image_url}
                          alt=""
                          className="h-8 w-8 rounded-full object-cover shrink-0 border border-border-primary"
                        />
                      )}
                      <p className="text-sm text-text-primary line-clamp-2 flex-1">
                        {card.front_content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CardTypeBadge type={card.card_type} />
                      <MasteryBadge mastery={card.mastery} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteCard(card.card_id);
                        }}
                        disabled={deletingCardId === card.card_id}
                        className="ml-1 text-text-muted hover:text-status-red transition-colors p-0.5"
                        title="Delete card"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-text-muted line-clamp-1">
                    {card.back_content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
