"use client";

import { MA_STAGES, type MaStage } from "@/types/database";

interface MaStageBadgeProps {
  stage: MaStage;
}

export function MaStageBadge({ stage }: MaStageBadgeProps) {
  const config = MA_STAGES.find((s) => s.value === stage);
  const label = config?.label ?? stage;
  const color = config?.color ?? "#6b7280";

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-primary bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-secondary">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
