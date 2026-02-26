"use client";

import { useState, useCallback, useTransition } from "react";
import { DealCard } from "@/components/deals/deal-card";
import { updateDealStage } from "@/app/(dashboard)/deals/actions";
import type { Deal, DealStage } from "@/types/database";
import { ACTIVE_STAGES, DEAL_STAGES } from "@/types/database";

interface PipelineBoardProps {
  deals: Deal[];
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function PipelineBoard({ deals }: PipelineBoardProps) {
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>, stage: DealStage) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverStage(stage);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Only clear if we're leaving the column (not entering a child)
      const relatedTarget = e.relatedTarget as HTMLElement | null;
      if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
        setDragOverStage(null);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetStage: DealStage) => {
      e.preventDefault();
      setDragOverStage(null);

      const dealId = e.dataTransfer.getData("text/plain");
      if (!dealId) return;

      // Find the deal — don't move if same stage
      const deal = deals.find((d) => d.deal_id === dealId);
      if (!deal || deal.stage === targetStage) return;

      startTransition(async () => {
        await updateDealStage(dealId, targetStage);
      });
    },
    [deals]
  );

  // Group deals by stage
  const dealsByStage = ACTIVE_STAGES.reduce<Record<DealStage, Deal[]>>(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    },
    {} as Record<DealStage, Deal[]>
  );

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <svg
          className="w-16 h-16 mb-4 opacity-30"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M3 3h7v7H3V3ZM14 3h7v7h-7V3ZM3 14h7v7H3v-7ZM14 14h7v7h-7v-7Z" />
        </svg>
        <p className="text-sm font-medium mb-1">Pipeline is empty</p>
        <p className="text-xs">
          Create your first deal to start building your pipeline.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 overflow-x-auto pb-4 ${isPending ? "opacity-70 pointer-events-none" : ""}`}
    >
      {ACTIVE_STAGES.map((stage) => {
        const stageConfig = DEAL_STAGES.find((s) => s.value === stage);
        const stageDeals = dealsByStage[stage] ?? [];
        const totalAcv = stageDeals.reduce((sum, d) => sum + (d.acv ?? 0), 0);
        const isOver = dragOverStage === stage;

        return (
          <div
            key={stage}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
            className={`flex-shrink-0 w-72 flex flex-col rounded-lg border transition-colors duration-150 ${
              isOver
                ? "border-accent-primary bg-accent-primary/5"
                : "border-border-primary bg-surface-secondary/30"
            }`}
          >
            {/* Column header */}
            <div className="px-3 py-3 border-b border-border-primary">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stageConfig?.color }}
                  />
                  <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                    {stageConfig?.label ?? stage}
                  </span>
                </div>
                <span className="text-xs text-text-muted font-medium">
                  {stageDeals.length}
                </span>
              </div>
              {totalAcv > 0 && (
                <p className="text-xs text-text-muted">
                  {acvFormatter.format(totalAcv)}
                </p>
              )}
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 min-h-[120px]">
              {stageDeals.map((deal) => (
                <DealCard key={deal.deal_id} deal={deal} />
              ))}
              {stageDeals.length === 0 && (
                <div className="flex items-center justify-center h-full min-h-[80px] text-text-muted text-xs border border-dashed border-border-primary rounded-md">
                  Drop deals here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
