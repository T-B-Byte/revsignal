"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CardType } from "@/types/database";

interface AddCardFormProps {
  deckId: string;
  onClose: () => void;
}

const CARD_TABS: { value: CardType; label: string }[] = [
  { value: "standard", label: "Standard" },
  { value: "fill_blank", label: "Fill-in-the-Blank" },
  { value: "image", label: "Image" },
];

export function AddCardForm({ deckId, onClose }: AddCardFormProps) {
  const router = useRouter();
  const [cardType, setCardType] = useState<CardType>("standard");
  const [frontContent, setFrontContent] = useState("");
  const [backContent, setBackContent] = useState("");
  const [backDetail, setBackDetail] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!frontContent.trim() || !backContent.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/flashcards/${deckId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_type: cardType,
          front_content: frontContent.trim(),
          back_content: backContent.trim(),
          back_detail: backDetail.trim() || undefined,
          image_url: imageUrl.trim() || undefined,
          source_attribution: sourceAttribution.trim() || undefined,
        }),
      });

      if (!res.ok) {
        console.error("Failed to create card");
        return;
      }

      // Reset form
      setFrontContent("");
      setBackContent("");
      setBackDetail("");
      setImageUrl("");
      setSourceAttribution("");
      onClose();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary">Add Card</h3>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Card type tabs */}
      <div className="flex gap-1 mb-4 rounded-lg bg-surface-primary p-1">
        {CARD_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setCardType(tab.value)}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              cardType === tab.value
                ? "bg-accent-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {cardType === "standard" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Question (Front)
              </label>
              <textarea
                value={frontContent}
                onChange={(e) => setFrontContent(e.target.value)}
                placeholder="What question should this card ask?"
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={1000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Answer (Back)
              </label>
              <textarea
                value={backContent}
                onChange={(e) => setBackContent(e.target.value)}
                placeholder="The answer"
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Detail (optional)
              </label>
              <textarea
                value={backDetail}
                onChange={(e) => setBackDetail(e.target.value)}
                placeholder="Additional context or explanation"
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={2000}
              />
            </div>
          </>
        )}

        {cardType === "fill_blank" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Phrase with blank (use _______ for the blank)
              </label>
              <textarea
                value={frontContent}
                onChange={(e) => setFrontContent(e.target.value)}
                placeholder={'"Data is AI\'s _______"'}
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={1000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Answer (the missing word(s))
              </label>
              <input
                type="text"
                value={backContent}
                onChange={(e) => setBackContent(e.target.value)}
                placeholder="input layer"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Full quote (optional)
              </label>
              <textarea
                value={backDetail}
                onChange={(e) => setBackDetail(e.target.value)}
                placeholder="The full quote with context"
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Source Attribution (optional)
              </label>
              <input
                type="text"
                value={sourceAttribution}
                onChange={(e) => setSourceAttribution(e.target.value)}
                placeholder="Erik Matlick, CEO, Bombora"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                maxLength={500}
              />
            </div>
          </>
        )}

        {cardType === "image" && (
          <>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Image URL (optional — placeholder used if empty)
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Question (Front)
              </label>
              <input
                type="text"
                value={frontContent}
                onChange={(e) => setFrontContent(e.target.value)}
                placeholder="Who is this person?"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                maxLength={1000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Name & Title (Back)
              </label>
              <input
                type="text"
                value={backContent}
                onChange={(e) => setBackContent(e.target.value)}
                placeholder="Jeff Rokuskie, CEO"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Additional Detail (optional)
              </label>
              <textarea
                value={backDetail}
                onChange={(e) => setBackDetail(e.target.value)}
                placeholder="Key facts, relationships, notes"
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
                maxLength={2000}
              />
            </div>
          </>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            size="sm"
            loading={saving}
            disabled={!frontContent.trim() || !backContent.trim()}
          >
            Add Card
          </Button>
        </div>
      </form>
    </div>
  );
}
