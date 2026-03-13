"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { updateMaStage, deleteMaEntity } from "@/app/(dashboard)/ma/actions";
import {
  MA_STAGES,
  MA_ENTITY_TYPES,
  type MaEntity,
} from "@/types/database";

interface MaHeaderProps {
  entity: MaEntity;
}

const valuationFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function MaHeader({ entity }: MaHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const typeConfig = MA_ENTITY_TYPES.find(
    (t) => t.value === entity.entity_type
  );

  function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStage = e.target.value;
    setError(null);

    startTransition(async () => {
      const result = await updateMaStage(entity.entity_id, newStage);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteMaEntity(entity.entity_id);
    if ("error" in result) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.push("/ma");
    }
  }

  const currentStage = MA_STAGES.find((s) => s.value === entity.stage);

  return (
    <Card>
      <CardContent className="pt-4">
        {error && (
          <div className="mb-3 rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold text-text-primary">
                {entity.company}
              </h1>
              <span
                className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  color: typeConfig?.color ?? "#6b7280",
                  backgroundColor: `${typeConfig?.color ?? "#6b7280"}15`,
                }}
              >
                {typeConfig?.label ?? entity.entity_type}
              </span>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Stage selector */}
              <div className="relative">
                <select
                  value={entity.stage}
                  onChange={handleStageChange}
                  disabled={isPending}
                  className="appearance-none rounded-full border border-border-primary bg-surface-tertiary pl-6 pr-7 py-1 text-xs font-medium text-text-secondary focus:border-accent-primary focus:outline-none disabled:opacity-50 cursor-pointer"
                  style={{
                    paddingLeft: "1.75rem",
                  }}
                >
                  {MA_STAGES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full"
                  style={{
                    backgroundColor: currentStage?.color ?? "#6b7280",
                  }}
                />
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-text-muted"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              {entity.estimated_valuation != null && (
                <span className="text-sm font-semibold text-text-primary">
                  {valuationFormatter.format(entity.estimated_valuation)}
                </span>
              )}

              {entity.key_date && (
                <span className="text-xs text-text-muted">
                  {entity.key_date_label ?? "Key date"}:{" "}
                  {new Date(entity.key_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}

              {entity.website && (
                <a
                  href={entity.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-primary hover:underline"
                >
                  {entity.website.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-status-red">Delete?</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  No
                </Button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-md bg-status-red px-3 py-1.5 text-xs font-medium text-white hover:bg-status-red/90 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded-md p-1.5 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                title="Delete entity"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5L12.5 4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
