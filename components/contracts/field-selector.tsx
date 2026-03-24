"use client";

import { DAAS_LICENSED_FIELDS, DAAS_FIELD_GROUPS } from "@/types/database";

interface FieldSelectorProps {
  selected: string[];
  onChange: (fields: string[]) => void;
}

export function FieldSelector({ selected, onChange }: FieldSelectorProps) {
  function toggleField(key: string) {
    if (selected.includes(key)) {
      onChange(selected.filter((f) => f !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  function toggleGroup(group: string) {
    const groupFields = DAAS_LICENSED_FIELDS.filter((f) => f.group === group).map((f) => f.key as string);
    const allSelected = groupFields.every((k) => selected.includes(k));

    if (allSelected) {
      onChange(selected.filter((f) => !groupFields.includes(f)));
    } else {
      const newSelected = new Set([...selected, ...groupFields]);
      onChange(Array.from(newSelected));
    }
  }

  function selectAll() {
    onChange(DAAS_LICENSED_FIELDS.map((f) => f.key));
  }

  function clearAll() {
    onChange([]);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {selected.length} of {DAAS_LICENSED_FIELDS.length} fields selected
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            Select all
          </button>
          <span className="text-text-muted">|</span>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>

      {DAAS_FIELD_GROUPS.map((group) => {
        const groupFields = DAAS_LICENSED_FIELDS.filter((f) => f.group === group);
        const selectedCount = groupFields.filter((f) => selected.includes(f.key)).length;
        const allSelected = selectedCount === groupFields.length;

        return (
          <div
            key={group}
            className="rounded-lg border border-border-primary bg-surface-secondary/50 p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                  allSelected
                    ? "border-accent-primary bg-accent-primary"
                    : selectedCount > 0
                    ? "border-accent-primary bg-accent-primary/30"
                    : "border-border-primary bg-surface-secondary"
                }`}
              >
                {allSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {!allSelected && selectedCount > 0 && (
                  <div className="h-1.5 w-1.5 rounded-sm bg-accent-primary" />
                )}
              </button>
              <span className="text-sm font-semibold text-text-primary">{group}</span>
              <span className="text-xs text-text-muted">
                {selectedCount}/{groupFields.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-7">
              {groupFields.map((field) => {
                const isSelected = selected.includes(field.key);
                return (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => toggleField(field.key)}
                    className={`flex items-start gap-2.5 rounded-md px-3 py-2 text-left transition-colors ${
                      isSelected
                        ? "bg-accent-primary/10 border border-accent-primary/30"
                        : "border border-transparent hover:bg-surface-tertiary"
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary"
                          : "border-border-primary bg-surface-secondary"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {field.label}
                      </p>
                      <p className="text-xs text-text-muted truncate">
                        {field.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
