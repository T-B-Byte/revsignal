"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { Deal, DealStage } from "@/types/database";
import { DEAL_STAGES } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

interface DealCardProps {
  deal: Deal;
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function getStageBadgeVariant(stage: DealStage): BadgeVariant {
  switch (stage) {
    case "closed_won":
      return "green";
    case "closed_lost":
      return "red";
    case "negotiation":
    case "proposal":
      return "yellow";
    case "discovery":
    case "poc_trial":
      return "blue";
    default:
      return "gray";
  }
}

function getDaysSinceContact(lastActivityDate: string | null): {
  days: number;
  variant: BadgeVariant;
  label: string;
} {
  if (!lastActivityDate) {
    return { days: 999, variant: "red", label: "No activity" };
  }

  const now = new Date();
  const lastActivity = new Date(lastActivityDate);

  if (isNaN(lastActivity.getTime())) {
    return { days: 999, variant: "red", label: "No activity" };
  }

  const diffMs = now.getTime() - lastActivity.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let variant: BadgeVariant = "green";
  if (days > 14) {
    variant = "red";
  } else if (days > 7) {
    variant = "yellow";
  }

  const label =
    days === 0
      ? "Today"
      : formatDistanceToNow(lastActivity, { addSuffix: true });

  return { days, variant, label };
}

export function DealCard({ deal }: DealCardProps) {
  const router = useRouter();
  const stageConfig = DEAL_STAGES.find((s) => s.value === deal.stage);
  const daysSince = getDaysSinceContact(deal.last_activity_date);
  const isDraggingRef = useRef(false);

  function handleClick() {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    router.push(`/deals/${deal.deal_id}`);
  }

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    isDraggingRef.current = true;
    e.dataTransfer.setData("text/plain", deal.deal_id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    // Reset after a short delay so click handler can check it
    setTimeout(() => { isDraggingRef.current = false; }, 0);
  }

  return (
    <Card
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className="p-3 cursor-pointer hover:border-accent-primary/40 transition-colors duration-150 group"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent-primary transition-colors">
          {deal.company}
        </h4>
        <Badge variant={getStageBadgeVariant(deal.stage)}>
          {stageConfig?.label ?? deal.stage}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary font-medium">
          {deal.acv ? acvFormatter.format(deal.acv) : "No ACV"}
        </span>
        <Badge variant={daysSince.variant} className="text-[10px]">
          {daysSince.label}
        </Badge>
      </div>

      {deal.win_probability > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-text-muted mb-1">
            <span>Win probability</span>
            <span>{deal.win_probability}%</span>
          </div>
          <div className="h-1 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full transition-all duration-300"
              style={{ width: `${deal.win_probability}%` }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
