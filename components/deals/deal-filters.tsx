"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEAL_STAGES, type DealStage } from "@/types/database";

export type ViewMode = "kanban" | "table";

export interface DealFilterState {
  stages: DealStage[];
  icpCategory: string | null;
  acvMin: number | null;
  acvMax: number | null;
}

interface DealFiltersProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  filters: DealFilterState;
  onFiltersChange: (filters: DealFilterState) => void;
  icpCategories: string[];
}

export function DealFilters({
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  icpCategories,
}: DealFiltersProps) {
  const [showAcvRange, setShowAcvRange] = useState(false);

  const toggleStage = useCallback(
    (stage: DealStage) => {
      const current = filters.stages;
      const next = current.includes(stage)
        ? current.filter((s) => s !== stage)
        : [...current, stage];
      onFiltersChange({ ...filters, stages: next });
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({
      stages: [],
      icpCategory: null,
      acvMin: null,
      acvMax: null,
    });
    setShowAcvRange(false);
  }, [onFiltersChange]);

  const hasActiveFilters =
    filters.stages.length > 0 ||
    filters.icpCategory !== null ||
    filters.acvMin !== null ||
    filters.acvMax !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        {/* View toggle */}
        <div className="flex items-center bg-surface-secondary border border-border-primary rounded-md p-0.5">
          <button
            onClick={() => onViewModeChange("kanban")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === "kanban"
                ? "bg-accent-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <rect x="1" y="1" width="4" height="14" rx="1" />
                <rect x="6" y="1" width="4" height="10" rx="1" />
                <rect x="11" y="1" width="4" height="12" rx="1" />
              </svg>
              Board
            </span>
          </button>
          <button
            onClick={() => onViewModeChange("table")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-accent-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <rect x="1" y="1" width="14" height="3" rx="0.5" />
                <rect x="1" y="6" width="14" height="3" rx="0.5" />
                <rect x="1" y="11" width="14" height="3" rx="0.5" />
              </svg>
              Table
            </span>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          {/* ICP Category */}
          {icpCategories.length > 0 && (
            <select
              value={filters.icpCategory ?? ""}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  icpCategory: e.target.value || null,
                })
              }
              className="text-xs bg-surface-secondary border border-border-primary rounded-md px-2 py-1.5 text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-primary/40"
            >
              <option value="">All ICPs</option>
              {icpCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}

          {/* ACV Range Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAcvRange((v) => !v)}
            className={showAcvRange ? "text-accent-primary" : ""}
          >
            ACV Range
          </Button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-text-muted mr-1">Stages:</span>
        {DEAL_STAGES.map((stage) => {
          const isActive =
            filters.stages.length === 0 || filters.stages.includes(stage.value);
          return (
            <button
              key={stage.value}
              onClick={() => toggleStage(stage.value)}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                isActive
                  ? "bg-accent-primary/10 text-accent-primary border-accent-primary/30"
                  : "bg-surface-tertiary text-text-muted border-border-primary opacity-50 hover:opacity-75"
              }`}
            >
              {stage.label}
            </button>
          );
        })}
      </div>

      {/* ACV Range inputs */}
      {showAcvRange && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">ACV:</span>
          <input
            type="number"
            placeholder="Min"
            value={filters.acvMin ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                acvMin: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-24 px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/40"
          />
          <span className="text-xs text-text-muted">to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.acvMax ?? ""}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                acvMax: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-24 px-2 py-1 text-xs bg-surface-secondary border border-border-primary rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary/40"
          />
        </div>
      )}

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Active:</span>
          {filters.stages.length > 0 && (
            <Badge variant="blue">
              {filters.stages.length} stage{filters.stages.length > 1 ? "s" : ""}
            </Badge>
          )}
          {filters.icpCategory && (
            <Badge variant="blue">{filters.icpCategory}</Badge>
          )}
          {(filters.acvMin !== null || filters.acvMax !== null) && (
            <Badge variant="blue">
              ACV: {filters.acvMin ? `$${filters.acvMin.toLocaleString()}` : "any"} -{" "}
              {filters.acvMax ? `$${filters.acvMax.toLocaleString()}` : "any"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
