"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { upsertComparison, deleteComparison } from "@/app/(dashboard)/compete/actions";
import type { CompetitorComparison } from "@/types/database";

interface ComparisonTableProps {
  comparisons: CompetitorComparison[];
}

type EditingCell = {
  id: string;
  field: "competitor" | "pricing" | "revenue" | "valuation" | "weakness";
};

const COLUMNS = [
  { key: "competitor" as const, label: "Company" },
  { key: "pricing" as const, label: "Pricing" },
  { key: "revenue" as const, label: "Revenue" },
  { key: "valuation" as const, label: "Valuation" },
  { key: "weakness" as const, label: "Weakness" },
];

export function ComparisonTable({ comparisons: initial }: ComparisonTableProps) {
  const [rows, setRows] = useState<CompetitorComparison[]>(initial);
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const startEdit = useCallback(
    (row: CompetitorComparison, field: EditingCell["field"]) => {
      setEditing({ id: row.id, field });
      setEditValue(row[field] ?? "");
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    []
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setEditValue("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setSaving(true);

    const row = rows.find((r) => r.id === editing.id);
    if (!row) {
      setSaving(false);
      cancelEdit();
      return;
    }

    const trimmed = editValue.trim();

    // If competitor name is empty, don't save
    if (editing.field === "competitor" && !trimmed) {
      setSaving(false);
      cancelEdit();
      return;
    }

    // No change, just close
    if ((row[editing.field] ?? "") === trimmed) {
      setSaving(false);
      cancelEdit();
      return;
    }

    const updated = { ...row, [editing.field]: trimmed || null };
    const result = await upsertComparison({
      id: row.id,
      competitor: updated.competitor,
      pricing: updated.pricing ?? undefined,
      revenue: updated.revenue ?? undefined,
      valuation: updated.valuation ?? undefined,
      weakness: updated.weakness ?? undefined,
    });

    if ("comparison" in result) {
      setRows((prev) =>
        prev.map((r) => (r.id === editing.id ? result.comparison : r))
      );
    }

    setSaving(false);
    cancelEdit();
  }, [editing, editValue, rows, cancelEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        saveEdit();
      }
      if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  const addRow = useCallback(async () => {
    setAdding(true);
    const result = await upsertComparison({ competitor: "New Competitor" });
    if ("comparison" in result) {
      setRows((prev) => [...prev, result.comparison]);
      // Immediately start editing the competitor name
      setTimeout(() => {
        startEdit(result.comparison, "competitor");
        setEditValue("");
      }, 0);
    }
    setAdding(false);
  }, [startEdit]);

  const removeRow = useCallback(async (id: string) => {
    const result = await deleteComparison(id);
    if ("success" in result) {
      setRows((prev) => prev.filter((r) => r.id !== id));
    }
  }, []);

  const renderCell = (
    row: CompetitorComparison,
    field: EditingCell["field"]
  ) => {
    const isEditing = editing?.id === row.id && editing?.field === field;
    const value = row[field];
    const isCompetitor = field === "competitor";
    const isPharosIQ = row.competitor.toLowerCase().includes("pharosiq");

    if (isEditing) {
      const isWeakness = field === "weakness";
      const Component = isWeakness ? "textarea" : "input";
      return (
        <Component
          ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          disabled={saving}
          rows={isWeakness ? 2 : undefined}
          className="w-full rounded border border-accent-primary bg-surface-primary px-2 py-1 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent-primary resize-none"
        />
      );
    }

    return (
      <button
        onClick={() => startEdit(row, field)}
        className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors hover:bg-surface-tertiary cursor-text ${
          isCompetitor
            ? `font-medium ${isPharosIQ ? "text-accent-primary" : "text-text-primary"}`
            : "text-text-secondary"
        } ${!value ? "italic text-text-muted" : ""}`}
      >
        {value || (isCompetitor ? "Click to name" : "Click to add")}
      </button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Competitive Comparison</CardTitle>
        <Button
          variant="secondary"
          size="sm"
          onClick={addRow}
          disabled={adding}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Company
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            No competitors added yet. Add companies to compare pricing, revenue,
            valuation, and weaknesses side by side.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary">
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2 px-2 text-left text-xs font-semibold uppercase tracking-wider text-text-muted ${
                        col.key === "competitor" ? "w-[160px]" : ""
                      } ${col.key === "weakness" ? "min-w-[200px]" : ""}`}
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-border-primary/50 last:border-0 ${
                      row.competitor.toLowerCase().includes("pharosiq")
                        ? "bg-accent-primary/5"
                        : ""
                    }`}
                  >
                    {COLUMNS.map((col) => (
                      <td key={col.key} className="py-1 align-top">
                        {renderCell(row, col.key)}
                      </td>
                    ))}
                    <td className="py-1 align-top">
                      <button
                        onClick={() => removeRow(row.id)}
                        className="p-1 text-text-muted hover:text-status-red transition-colors"
                        title="Remove"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M4 4l8 8M12 4l-8 8" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
