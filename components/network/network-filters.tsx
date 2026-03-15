"use client";

import { DEAL_STAGES, ACTIVE_STAGES, type DealStage } from "@/types/database";
import type { NetworkFilters } from "./use-network-graph";

interface NetworkFiltersBarProps {
  filters: NetworkFilters;
  onChange: (filters: NetworkFilters) => void;
  companies: string[];
}

const ACTIVE_STAGE_CONFIGS = DEAL_STAGES.filter((s) =>
  ACTIVE_STAGES.includes(s.value)
);

export function NetworkFiltersBar({
  filters,
  onChange,
  companies,
}: NetworkFiltersBarProps) {
  function toggleStage(stage: DealStage) {
    const current = filters.stages;
    const next = current.includes(stage)
      ? current.filter((s) => s !== stage)
      : [...current, stage];
    onChange({ ...filters, stages: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-surface-secondary px-4 py-3">
      {/* Stage filters */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Stage
        </span>
        {ACTIVE_STAGE_CONFIGS.map((s) => {
          const active =
            filters.stages.length === 0 || filters.stages.includes(s.value);
          return (
            <button
              key={s.value}
              onClick={() => toggleStage(s.value)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                active
                  ? "text-white shadow-sm"
                  : "bg-surface-tertiary text-text-muted opacity-50 hover:opacity-75"
              }`}
              style={active ? { backgroundColor: s.color } : undefined}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border-primary" />

      {/* Company filter */}
      <select
        value={filters.company ?? ""}
        onChange={(e) =>
          onChange({ ...filters, company: e.target.value || null })
        }
        className="rounded-lg border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary"
      >
        <option value="">All Companies</option>
        {companies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {/* Divider */}
      <div className="h-6 w-px bg-border-primary" />

      {/* Cross-connections toggle */}
      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={filters.showCrossConnections}
          onChange={(e) =>
            onChange({ ...filters, showCrossConnections: e.target.checked })
          }
          className="h-3.5 w-3.5 rounded border-border-primary text-accent-primary focus:ring-accent-primary"
        />
        Cross-links
      </label>

      {/* Divider */}
      <div className="h-6 w-px bg-border-primary" />

      {/* Search */}
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search people or deals..."
        className="w-48 rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />

      {/* Reset */}
      {(filters.stages.length > 0 ||
        filters.company ||
        !filters.showCrossConnections ||
        filters.search) && (
        <button
          onClick={() =>
            onChange({
              stages: [],
              company: null,
              showCrossConnections: true,
              search: "",
            })
          }
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
