import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import type { Tradeshow, TradeshowTarget } from "@/types/database";

interface TradeshowCardProps {
  tradeshow: Tradeshow;
  targets: TradeshowTarget[];
}

export function TradeshowCard({ tradeshow, targets }: TradeshowCardProps) {
  const p1Count = targets.filter(
    (t) => t.priority === "priority_1_walk_up"
  ).length;
  const p2Count = targets.filter(
    (t) => t.priority === "priority_2_strong_conversation"
  ).length;
  const p3Count = targets.filter(
    (t) => t.priority === "priority_3_competitive_intel"
  ).length;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const statusConfig: Record<
    string,
    { label: string; className: string }
  > = {
    draft: {
      label: "Draft",
      className: "bg-surface-tertiary text-text-muted",
    },
    analyzing: {
      label: "Analyzing",
      className: "bg-yellow-500/20 text-yellow-400 animate-pulse",
    },
    partial: {
      label: "Processing",
      className: "bg-yellow-500/20 text-yellow-400 animate-pulse",
    },
    complete: {
      label: "Complete",
      className: "bg-green-500/20 text-green-400",
    },
    error: {
      label: "Error",
      className: "bg-red-500/20 text-red-400",
    },
  };

  const status = statusConfig[tradeshow.status] || statusConfig.draft;

  return (
    <Link href={`/tradeshows/${tradeshow.tradeshow_id}`}>
      <Card className="transition-colors hover:border-accent-primary/50">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {tradeshow.name}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-text-muted">
                {tradeshow.dates && <span>{tradeshow.dates}</span>}
                {tradeshow.dates && tradeshow.location && <span>·</span>}
                {tradeshow.location && <span>{tradeshow.location}</span>}
              </div>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          {tradeshow.status === "complete" && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-text-muted">Sponsors</p>
                <p className="text-sm font-semibold text-text-primary">
                  {tradeshow.total_sponsors}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">P1</p>
                <p className="text-sm font-semibold text-green-400">
                  {p1Count}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">P2</p>
                <p className="text-sm font-semibold text-blue-400">
                  {p2Count}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">P3</p>
                <p className="text-sm font-semibold text-text-muted">
                  {p3Count}
                </p>
              </div>
            </div>
          )}

          {tradeshow.status === "complete" &&
            tradeshow.total_estimated_pipeline > 0 && (
              <div className="mt-2 text-xs text-text-muted">
                Est. pipeline:{" "}
                <span className="font-medium text-text-primary">
                  {formatCurrency(tradeshow.total_estimated_pipeline)}
                </span>
              </div>
            )}

          {tradeshow.status === "error" && tradeshow.analysis_summary && (
            <p className="mt-2 text-xs text-red-400">
              {tradeshow.analysis_summary}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
