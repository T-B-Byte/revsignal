"use client";

import type { ProjectStatus } from "@/types/database";
import { PROJECT_STATUSES } from "@/types/database";
import type { NetworkFilters } from "./use-network-graph";

interface NetworkFiltersBarProps {
  filters: NetworkFilters;
  onChange: (filters: NetworkFilters) => void;
  onAddProject: () => void;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

export function NetworkFiltersBar({
  filters,
  onChange,
  onAddProject,
}: NetworkFiltersBarProps) {
  function toggleStatus(status: ProjectStatus) {
    const current = filters.statuses;
    const next = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    onChange({ ...filters, statuses: next });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-surface-secondary px-4 py-3">
      {/* Status filters */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Status
        </span>
        {PROJECT_STATUSES.map((s) => {
          const active =
            filters.statuses.length === 0 || filters.statuses.includes(s.value);
          return (
            <button
              key={s.value}
              onClick={() => toggleStatus(s.value)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                active
                  ? "text-white shadow-sm"
                  : "bg-surface-tertiary text-text-muted opacity-50 hover:opacity-75"
              }`}
              style={active ? { backgroundColor: STATUS_COLORS[s.value] } : undefined}
            >
              {s.label}
            </button>
          );
        })}
      </div>

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
        placeholder="Search people or projects..."
        className="w-48 rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Add project button */}
      <button
        onClick={onAddProject}
        className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-primary/90 transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Add Project
      </button>

      {/* Reset */}
      {(filters.statuses.length > 0 ||
        !filters.showCrossConnections ||
        filters.search) && (
        <button
          onClick={() =>
            onChange({
              statuses: [],
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
