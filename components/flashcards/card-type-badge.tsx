"use client";

import type { CardType } from "@/types/database";

const TYPE_CONFIG: Record<CardType, { label: string; className: string }> = {
  standard: {
    label: "Q&A",
    className: "border-border-primary text-text-muted",
  },
  fill_blank: {
    label: "Fill-in-Blank",
    className: "border-accent-primary/40 bg-accent-primary/10 text-accent-primary",
  },
  image: {
    label: "Image",
    className: "border-purple-500/40 bg-purple-500/10 text-purple-400",
  },
};

export function CardTypeBadge({ type }: { type: CardType }) {
  const config = TYPE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
