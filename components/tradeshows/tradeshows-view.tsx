"use client";

import { useState } from "react";
import { TradeshowCard } from "./tradeshow-card";
import { AnalyzeTradeshowForm } from "./analyze-tradeshow-form";
import type { Tradeshow, TradeshowTarget } from "@/types/database";

interface TradeshowsViewProps {
  tradeshows: Tradeshow[];
  targetsByTradeshow: Record<string, TradeshowTarget[]>;
  hasAccess: boolean;
}

export function TradeshowsView({
  tradeshows,
  targetsByTradeshow,
  hasAccess,
}: TradeshowsViewProps) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-primary">Tradeshows</h1>
        {hasAccess && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90"
          >
            Analyze Tradeshow
          </button>
        )}
      </div>

      {!hasAccess && (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-4 text-center">
          <p className="text-sm text-text-muted">
            Tradeshow analysis requires the Power plan.
          </p>
        </div>
      )}

      {tradeshows.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          <p className="text-sm text-text-muted">
            No tradeshows analyzed yet. Click &quot;Analyze Tradeshow&quot; to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {tradeshows.map((tradeshow) => (
            <TradeshowCard
              key={tradeshow.tradeshow_id}
              tradeshow={tradeshow}
              targets={targetsByTradeshow[tradeshow.tradeshow_id] || []}
            />
          ))}
        </div>
      )}

      {showForm && <AnalyzeTradeshowForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
