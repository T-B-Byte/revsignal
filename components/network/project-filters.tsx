"use client";

import type { ProjectStatus } from "@/types/database";
import { PROJECT_STATUSES } from "@/types/database";

interface ProjectFiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ProjectStatus[];
  onStatusFilterChange: (statuses: ProjectStatus[]) => void;
  personFilter: string;
  onPersonFilterChange: (person: string) => void;
  allPeople: string[];
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onAddProject: () => void;
  onPrint: () => void;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

export function ProjectFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  personFilter,
  onPersonFilterChange,
  allPeople,
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onAddProject,
  onPrint,
}: ProjectFiltersBarProps) {
  function toggleStatus(status: ProjectStatus) {
    const next = statusFilter.includes(status)
      ? statusFilter.filter((s) => s !== status)
      : [...statusFilter, status];
    onStatusFilterChange(next);
  }

  const hasFilters = statusFilter.length > 0 || personFilter || search;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-surface-secondary px-4 py-3">
      {/* Status filters */}
      <div className="flex items-center gap-1.5">
        <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Status
        </span>
        {PROJECT_STATUSES.map((s) => {
          const active =
            statusFilter.length === 0 || statusFilter.includes(s.value);
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

      {/* Person filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          Person
        </span>
        <select
          value={personFilter}
          onChange={(e) => onPersonFilterChange(e.target.value)}
          className="rounded-lg border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">All people</option>
          {allPeople.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border-primary" />

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search projects or people..."
        className="w-48 rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Selection controls */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {selectedCount > 0 ? (
          <>
            <span>{selectedCount} selected</span>
            <button
              onClick={onDeselectAll}
              className="text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            onClick={onSelectAll}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            Select all ({totalCount})
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border-primary" />

      {/* Print button */}
      <button
        onClick={onPrint}
        className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
        </svg>
        Print
      </button>

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
      {hasFilters && (
        <button
          onClick={() => {
            onStatusFilterChange([]);
            onPersonFilterChange("");
            onSearchChange("");
          }}
          className="text-xs text-text-muted hover:text-text-primary transition-colors"
        >
          Reset
        </button>
      )}
    </div>
  );
}
