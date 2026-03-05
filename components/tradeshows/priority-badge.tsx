import { TRADESHOW_PRIORITIES, type TradeshowPriority } from "@/types/database";

interface PriorityBadgeProps {
  priority: TradeshowPriority | null;
  short?: boolean;
}

export function PriorityBadge({ priority, short = false }: PriorityBadgeProps) {
  const config = TRADESHOW_PRIORITIES.find((p) => p.value === priority);

  if (!config) {
    return (
      <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-muted">
        Unclassified
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color,
      }}
    >
      {short ? config.shortLabel : config.label}
    </span>
  );
}
