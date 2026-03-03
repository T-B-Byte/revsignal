"use client";

import { useState } from "react";
import { CompetitorCard } from "./competitor-card";
import { AddIntelDialog } from "./add-intel-dialog";
import { Button } from "@/components/ui/button";
import type { CompetitiveIntel } from "@/types/database";

interface CompeteViewProps {
  competitors: [string, CompetitiveIntel[]][];
  competitorNames: string[];
  hasAiAccess: boolean;
}

export function CompeteView({
  competitors,
  competitorNames,
  hasAiAccess,
}: CompeteViewProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          Competitive Intelligence
        </h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Intel
        </Button>
      </div>

      {competitors.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          <p className="text-sm text-text-muted">
            No competitive intel yet. Start tracking what your competitors are
            doing.
          </p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="mt-3 text-sm font-medium text-accent-primary hover:underline"
          >
            Add your first competitor
          </button>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {competitors.map(([competitor, items]) => (
            <CompetitorCard
              key={competitor}
              competitor={competitor}
              items={items}
              hasAiAccess={hasAiAccess}
            />
          ))}
        </div>
      )}

      <AddIntelDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        existingCompetitors={competitorNames}
      />
    </div>
  );
}
