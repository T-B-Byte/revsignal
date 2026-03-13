"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaCard } from "./ma-card";
import { CreateMaDialog } from "./create-ma-dialog";
import type { MaEntityWithCounts } from "@/types/database";

interface MaViewProps {
  entities: MaEntityWithCounts[];
}

type TabFilter = "all" | "acquirer" | "target";

const valuationFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function MaView({ entities }: MaViewProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const acquirers = entities.filter((e) => e.entity_type === "acquirer");
  const targets = entities.filter((e) => e.entity_type === "target");

  const filtered =
    activeTab === "all"
      ? entities
      : entities.filter((e) => e.entity_type === activeTab);

  const totalValuation = entities.reduce(
    (sum, e) => sum + (e.estimated_valuation ?? 0),
    0
  );

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: entities.length },
    { key: "acquirer", label: "Acquirers", count: acquirers.length },
    { key: "target", label: "Targets", count: targets.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">M&amp;A</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Entity
        </Button>
      </div>

      {/* Tab filter */}
      <div className="flex items-center gap-1 rounded-lg border border-border-primary bg-surface-secondary p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-surface-primary text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === tab.key
                  ? "bg-accent-primary/10 text-accent-primary"
                  : "bg-surface-tertiary text-text-muted"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Summary stats */}
      {entities.length > 0 && (
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-text-muted">Total entities: </span>
            <span className="font-medium text-text-primary">
              {entities.length}
            </span>
          </div>
          {totalValuation > 0 && (
            <div>
              <span className="text-text-muted">Total est. valuation: </span>
              <span className="font-medium text-text-primary">
                {valuationFormatter.format(totalValuation)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Entity grid */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          <p className="text-sm text-text-muted">
            {entities.length === 0
              ? "No M&A entities yet. Add an acquirer or target to get started."
              : "No entities match the selected filter."}
          </p>
          {entities.length === 0 && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="mt-3 text-sm font-medium text-accent-primary hover:underline"
            >
              Add your first entity
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entity) => (
            <MaCard key={entity.entity_id} entity={entity} />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateMaDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
