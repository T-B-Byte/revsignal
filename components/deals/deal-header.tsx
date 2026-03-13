"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { updateDeal } from "@/app/(dashboard)/deals/actions";
import { DEAL_STAGES, type Deal, type DealStage } from "@/types/database";
import { format } from "date-fns";

interface DealHeaderProps {
  deal: Deal;
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

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

const stageOptions = DEAL_STAGES.map((s) => ({
  value: s.value,
  label: s.label,
}));

const deploymentOptions = [
  { value: "", label: "None" },
  { value: "api", label: "API" },
  { value: "flat_file", label: "Flat File" },
  { value: "cloud_delivery", label: "Cloud Delivery" },
  { value: "platform_integration", label: "Platform Integration" },
  { value: "embedded_oem", label: "Embedded / OEM" },
];

const deploymentLabels: Record<string, string> = {
  api: "API",
  flat_file: "Flat File",
  cloud_delivery: "Cloud Delivery",
  platform_integration: "Platform Integration",
  embedded_oem: "Embedded / OEM",
};

export function DealHeader({ deal }: DealHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const stageConfig = DEAL_STAGES.find((s) => s.value === deal.stage);

  function handleSave(formData: FormData) {
    setError(null);

    const updates: Record<string, unknown> = {};

    const company = formData.get("company") as string;
    if (company && company !== deal.company) updates.company = company;

    const acv = formData.get("acv") as string;
    if (acv !== String(deal.acv ?? "")) {
      updates.acv = acv ? Number(acv) : null;
    }

    const stage = formData.get("stage") as string;
    if (stage && stage !== deal.stage) updates.stage = stage;

    const winProbability = formData.get("win_probability") as string;
    if (winProbability && Number(winProbability) !== deal.win_probability) {
      updates.win_probability = Number(winProbability);
    }

    const closeDate = formData.get("close_date") as string;
    if (closeDate !== (deal.close_date ?? "")) {
      updates.close_date = closeDate || null;
    }

    const deploymentMethod = formData.get("deployment_method") as string;
    if (deploymentMethod !== (deal.deployment_method ?? "")) {
      updates.deployment_method = deploymentMethod || null;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateDeal(deal.deal_id, updates);
      if ("error" in result) {
        setError(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${deal.deal_id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete deal.");
        setDeleting(false);
        return;
      }
      router.push("/deals");
    } catch {
      setError("Network error.");
      setDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-4">
          <form action={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
                {error}
              </div>
            )}

            <Input
              name="company"
              label="Company"
              defaultValue={deal.company}
              required
            />

            <div className="grid grid-cols-3 gap-4">
              <Input
                name="acv"
                label="ACV ($)"
                type="number"
                defaultValue={deal.acv ?? ""}
                min={0}
              />
              <Select
                name="stage"
                label="Stage"
                options={stageOptions}
                defaultValue={deal.stage}
              />
              <Input
                name="win_probability"
                label="Win %"
                type="number"
                defaultValue={deal.win_probability}
                min={0}
                max={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePicker
                name="close_date"
                label="Close Date"
                defaultValue={
                  deal.close_date
                    ? format(new Date(deal.close_date), "yyyy-MM-dd")
                    : ""
                }
                placeholder="Pick date"
              />
              <Select
                name="deployment_method"
                label="Deployment"
                options={deploymentOptions}
                defaultValue={deal.deployment_method ?? ""}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        {error && (
          <div className="mb-3 p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
            {error}
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-text-primary mb-2">
              {deal.company}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge variant={getStageBadgeVariant(deal.stage)}>
                {stageConfig?.label ?? deal.stage}
              </Badge>

              {deal.acv !== null && (
                <span className="text-sm font-semibold text-text-primary">
                  {acvFormatter.format(deal.acv)}
                </span>
              )}

              <span className="text-xs text-text-muted">
                {deal.win_probability}% probability
              </span>

              {deal.close_date && (
                <span className="text-xs text-text-muted">
                  Close: {format(new Date(deal.close_date), "MMM d, yyyy")}
                </span>
              )}

              {deal.deployment_method && (
                <span className="text-xs text-text-muted">
                  {deploymentLabels[deal.deployment_method] ??
                    deal.deployment_method}
                </span>
              )}

              {deal.product_tier && (
                <Badge variant="blue" className="capitalize">
                  {deal.product_tier}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5Z" />
              </svg>
              Edit
            </Button>

            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-status-red">Delete this deal?</span>
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
                title="Delete deal"
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

        {deal.notes && (
          <p className="mt-3 text-sm text-text-secondary">{deal.notes}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted border-t border-border-primary pt-3">
          <span>
            Created: {format(new Date(deal.created_date), "MMM d, yyyy")}
          </span>
          <span>
            Last activity:{" "}
            {format(new Date(deal.last_activity_date), "MMM d, yyyy")}
          </span>
          {deal.closed_date && (
            <span>
              Closed: {format(new Date(deal.closed_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
