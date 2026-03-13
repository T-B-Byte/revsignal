"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { MaStageBadge } from "./ma-stage-badge";
import { MA_ENTITY_TYPES, type MaEntityWithCounts } from "@/types/database";

interface MaCardProps {
  entity: MaEntityWithCounts;
}

const valuationFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function MaCard({ entity }: MaCardProps) {
  const typeConfig = MA_ENTITY_TYPES.find(
    (t) => t.value === entity.entity_type
  );

  return (
    <Link href={`/ma/${entity.entity_id}`}>
      <Card className="transition-colors hover:border-accent-primary/40 cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {entity.company}
                </h3>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    color: typeConfig?.color ?? "#6b7280",
                    backgroundColor: `${typeConfig?.color ?? "#6b7280"}15`,
                  }}
                >
                  {typeConfig?.label ?? entity.entity_type}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <MaStageBadge stage={entity.stage} />

                {entity.estimated_valuation != null && (
                  <span className="text-xs font-medium text-text-primary">
                    {valuationFormatter.format(entity.estimated_valuation)}
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                {entity.contact_count != null && (
                  <span>
                    {entity.contact_count}{" "}
                    {entity.contact_count === 1 ? "contact" : "contacts"}
                  </span>
                )}
                <span>
                  Updated{" "}
                  {formatDistanceToNow(new Date(entity.updated_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>

            <svg
              className="h-4 w-4 shrink-0 text-text-muted"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
