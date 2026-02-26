"use client";

import { useState, useMemo } from "react";
import { PipelineBoard } from "@/components/deals/pipeline-board";
import { DealTable } from "@/components/deals/deal-table";
import { DealFilters, type ViewMode, type DealFilterState } from "@/components/deals/deal-filters";
import { CreateDealDialog } from "@/components/deals/create-deal-dialog";
import { Button } from "@/components/ui/button";
import type { Deal } from "@/types/database";

interface DealsViewProps {
  deals: Deal[];
  icpCategories: string[];
}

export function DealsView({ deals, icpCategories }: DealsViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState<DealFilterState>({
    stages: [],
    icpCategory: null,
    acvMin: null,
    acvMax: null,
  });

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Stage filter
      if (filters.stages.length > 0 && !filters.stages.includes(deal.stage)) {
        return false;
      }

      // ACV range
      if (filters.acvMin !== null && (deal.acv ?? 0) < filters.acvMin) {
        return false;
      }
      if (filters.acvMax !== null && (deal.acv ?? 0) > filters.acvMax) {
        return false;
      }

      // ICP filter — matches against contacts' icp_category if available
      // Since deals don't directly have icp_category, we skip this unless
      // the deal's contacts have icp info. For now, filter is a placeholder.
      // In production, this would cross-reference with the contacts table.

      return true;
    });
  }, [deals, filters]);

  // Pipeline summary (based on filtered deals)
  const totalAcv = filteredDeals.reduce((sum, d) => sum + (d.acv ?? 0), 0);
  const weightedPipeline = filteredDeals.reduce(
    (sum, d) => sum + (d.acv ?? 0) * (d.win_probability / 100),
    0
  );

  const acvFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Pipeline</h1>
          <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
            <span>
              {filteredDeals.length} deal{filteredDeals.length !== 1 ? "s" : ""}
            </span>
            <span>Total: {acvFormatter.format(totalAcv)}</span>
            <span>Weighted: {acvFormatter.format(weightedPipeline)}</span>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Deal
        </Button>
      </div>

      {/* Filters */}
      <DealFilters
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        filters={filters}
        onFiltersChange={setFilters}
        icpCategories={icpCategories}
      />

      {/* Views */}
      {viewMode === "kanban" ? (
        <PipelineBoard deals={filteredDeals} />
      ) : (
        <DealTable deals={filteredDeals} />
      )}

      {/* Create deal dialog */}
      <CreateDealDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
      />
    </div>
  );
}
