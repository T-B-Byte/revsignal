"use client";

import type { MasteryLevel } from "@/types/database";

const MASTERY_CONFIG: Record<
  MasteryLevel,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "border-border-primary text-text-muted",
  },
  learning: {
    label: "Learning",
    className: "border-status-yellow/40 bg-status-yellow/10 text-status-yellow",
  },
  reviewing: {
    label: "Reviewing",
    className: "border-accent-primary/40 bg-accent-primary/10 text-accent-primary",
  },
  mastered: {
    label: "Mastered",
    className: "border-status-green/40 bg-status-green/10 text-status-green",
  },
};

export function MasteryBadge({ mastery }: { mastery: MasteryLevel }) {
  const config = MASTERY_CONFIG[mastery];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
