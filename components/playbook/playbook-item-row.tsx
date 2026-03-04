"use client";

import { useState } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { PlaybookStatus } from "@/types/database";

interface PlaybookItemRowProps {
  itemId: string;
  description: string;
  initialStatus: PlaybookStatus;
}

const STATUS_CYCLE: PlaybookStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
];

const STATUS_CONFIG: Record<
  PlaybookStatus,
  { icon: string; iconClass: string; textClass: string; badge: BadgeVariant; label: string }
> = {
  not_started: {
    icon: "\u25CB",
    iconClass: "text-text-muted",
    textClass: "text-text-primary",
    badge: "gray",
    label: "not started",
  },
  in_progress: {
    icon: "\u25CF",
    iconClass: "text-status-yellow",
    textClass: "text-text-primary",
    badge: "yellow",
    label: "in progress",
  },
  completed: {
    icon: "\u2713",
    iconClass: "text-status-green",
    textClass: "text-text-muted line-through",
    badge: "green",
    label: "completed",
  },
  blocked: {
    icon: "\u2717",
    iconClass: "text-status-red",
    textClass: "text-text-primary",
    badge: "red",
    label: "blocked",
  },
  deprecated: {
    icon: "\u2014",
    iconClass: "text-text-muted",
    textClass: "text-text-muted line-through",
    badge: "gray",
    label: "deprecated",
  },
};

export function PlaybookItemRow({
  itemId,
  description,
  initialStatus,
}: PlaybookItemRowProps) {
  const [status, setStatus] = useState<PlaybookStatus>(initialStatus);
  const [saving, setSaving] = useState(false);

  async function cycleStatus() {
    if (saving) return;
    // deprecated items stay put
    if (status === "deprecated") return;

    const currentIdx = STATUS_CYCLE.indexOf(status);
    const nextStatus = STATUS_CYCLE[(currentIdx + 1) % STATUS_CYCLE.length];

    const previousStatus = status;
    setStatus(nextStatus);
    setSaving(true);

    try {
      const res = await fetch(`/api/playbook-items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        setStatus(previousStatus);
      }
    } catch {
      setStatus(previousStatus);
    } finally {
      setSaving(false);
    }
  }

  const config = STATUS_CONFIG[status];

  return (
    <li className="flex items-start gap-3 text-sm">
      <button
        onClick={cycleStatus}
        disabled={saving || status === "deprecated"}
        className={`mt-0.5 shrink-0 cursor-pointer transition-opacity hover:opacity-70 disabled:cursor-default disabled:opacity-50 ${config.iconClass}`}
        title={`Click to change status (current: ${config.label})`}
        aria-label={`Toggle status for: ${description}`}
      >
        {config.icon}
      </button>
      <span className={config.textClass}>{description}</span>
      <Badge variant={config.badge}>{config.label}</Badge>
    </li>
  );
}
