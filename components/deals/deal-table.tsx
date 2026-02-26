"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { Deal, DealStage } from "@/types/database";
import { DEAL_STAGES } from "@/types/database";
import { format, formatDistanceToNow } from "date-fns";

interface DealTableProps {
  deals: Deal[];
}

type SortField =
  | "company"
  | "stage"
  | "acv"
  | "win_probability"
  | "close_date"
  | "days_since_contact"
  | "last_activity_date";

type SortDirection = "asc" | "desc";

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const stageOrder: Record<DealStage, number> = {
  lead: 0,
  qualified: 1,
  discovery: 2,
  poc_trial: 3,
  proposal: 4,
  negotiation: 5,
  closed_won: 6,
  closed_lost: 7,
};

function getStageBadgeVariant(stage: DealStage): BadgeVariant {
  switch (stage) {
    case "closed_won":
      return "green";
    case "closed_lost":
      return "red";
    case "negotiation":
    case "proposal":
      return "yellow";
    case "discovery":
    case "poc_trial":
      return "blue";
    default:
      return "gray";
  }
}

function getDaysSinceContact(lastActivityDate: string): number {
  const now = new Date();
  const lastActivity = new Date(lastActivityDate);
  return Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function getDaysVariant(days: number): BadgeVariant {
  if (days > 14) return "red";
  if (days > 7) return "yellow";
  return "green";
}

function SortIcon({
  field,
  currentField,
  direction,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}) {
  if (field !== currentField) {
    return (
      <svg
        className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
        viewBox="0 0 12 12"
        fill="currentColor"
      >
        <path d="M6 1L9 5H3L6 1ZM6 11L3 7H9L6 11Z" />
      </svg>
    );
  }

  return (
    <svg className="w-3 h-3 text-accent-primary" viewBox="0 0 12 12" fill="currentColor">
      {direction === "asc" ? (
        <path d="M6 1L9 5H3L6 1Z" />
      ) : (
        <path d="M6 11L3 7H9L6 11Z" />
      )}
    </svg>
  );
}

export function DealTable({ deals }: DealTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>("last_activity_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "company" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    return [...deals].sort((a, b) => {
      let cmp = 0;

      switch (sortField) {
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "stage":
          cmp = stageOrder[a.stage] - stageOrder[b.stage];
          break;
        case "acv":
          cmp = (a.acv ?? 0) - (b.acv ?? 0);
          break;
        case "win_probability":
          cmp = a.win_probability - b.win_probability;
          break;
        case "close_date": {
          const da = a.close_date ? new Date(a.close_date).getTime() : 0;
          const db = b.close_date ? new Date(b.close_date).getTime() : 0;
          cmp = da - db;
          break;
        }
        case "days_since_contact":
          cmp =
            getDaysSinceContact(a.last_activity_date) -
            getDaysSinceContact(b.last_activity_date);
          break;
        case "last_activity_date":
          cmp =
            new Date(a.last_activity_date).getTime() -
            new Date(b.last_activity_date).getTime();
          break;
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });
  }, [deals, sortField, sortDirection]);

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <svg
          className="w-12 h-12 mb-4 opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-sm">No deals yet. Create your first deal to get started.</p>
      </div>
    );
  }

  const columns: { field: SortField; label: string; className?: string }[] = [
    { field: "company", label: "Company" },
    { field: "stage", label: "Stage" },
    { field: "acv", label: "ACV", className: "text-right" },
    { field: "win_probability", label: "Win %", className: "text-right" },
    { field: "close_date", label: "Close Date" },
    { field: "days_since_contact", label: "Days Since Contact", className: "text-right" },
    { field: "last_activity_date", label: "Last Activity" },
  ];

  return (
    <div className="overflow-x-auto border border-border-primary rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-secondary border-b border-border-primary">
            {columns.map((col) => (
              <th
                key={col.field}
                onClick={() => handleSort(col.field)}
                className={`px-4 py-3 text-xs font-medium text-text-secondary uppercase tracking-wider cursor-pointer hover:text-text-primary transition-colors group ${col.className ?? "text-left"}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <SortIcon
                    field={col.field}
                    currentField={sortField}
                    direction={sortDirection}
                  />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary">
          {sorted.map((deal) => {
            const stageConfig = DEAL_STAGES.find((s) => s.value === deal.stage);
            const daysSince = getDaysSinceContact(deal.last_activity_date);

            return (
              <tr
                key={deal.deal_id}
                onClick={() => router.push(`/deals/${deal.deal_id}`)}
                className="hover:bg-surface-secondary/50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 font-medium text-text-primary">
                  {deal.company}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStageBadgeVariant(deal.stage)}>
                    {stageConfig?.label ?? deal.stage}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {deal.acv ? acvFormatter.format(deal.acv) : "--"}
                </td>
                <td className="px-4 py-3 text-right text-text-secondary">
                  {deal.win_probability}%
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {deal.close_date
                    ? format(new Date(deal.close_date), "MMM d, yyyy")
                    : "--"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge variant={getDaysVariant(daysSince)}>
                    {daysSince === 0 ? "Today" : `${daysSince}d`}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">
                  {formatDistanceToNow(new Date(deal.last_activity_date), {
                    addSuffix: true,
                  })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
