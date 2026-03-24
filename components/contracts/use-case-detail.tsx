"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UseCaseBuilder } from "@/components/contracts/use-case-builder";
import {
  updateUseCase,
  deleteUseCase,
  duplicateUseCase,
} from "@/app/(dashboard)/contracts/actions";
import type {
  DaasUseCase,
  UseCaseStatus,
  WorkflowStep,
  Deal,
} from "@/types/database";
import {
  DAAS_LICENSED_FIELDS,
  USE_CASE_STATUSES,
  DELIVERY_METHOD_UC_OPTIONS,
  ACCESS_TIER_OPTIONS,
} from "@/types/database";

interface UseCaseDetailProps {
  useCase: DaasUseCase & {
    deals?: { deal_id: string; company: string; stage: string; acv: number | null } | null;
  };
  deals: Pick<Deal, "deal_id" | "company" | "stage" | "acv">[];
}

export function UseCaseDetail({ useCase, deals }: UseCaseDetailProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const statusConfig = USE_CASE_STATUSES.find((s) => s.value === useCase.status);
  const deliveryConfig = DELIVERY_METHOD_UC_OPTIONS.find(
    (d) => d.value === useCase.delivery_method
  );
  const accessConfig = ACCESS_TIER_OPTIONS.find(
    (a) => a.value === useCase.access_tier
  );

  const fields = useCase.licensed_fields as string[];
  const workflows = useCase.permitted_workflows as WorkflowStep[];

  function handleStatusChange(newStatus: UseCaseStatus) {
    setActionError(null);
    startTransition(async () => {
      const result = await updateUseCase(useCase.use_case_id, { status: newStatus });
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUseCase(useCase.use_case_id);
      if (!("error" in result)) {
        router.push("/contracts");
      }
    });
  }

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateUseCase(useCase.use_case_id);
      if ("use_case_id" in result) {
        router.push(`/contracts/${result.use_case_id}`);
      }
    });
  }

  if (isEditing) {
    return (
      <div>
        <div className="mx-auto max-w-4xl mb-8">
          <h1 className="text-2xl font-bold text-text-primary">
            Edit: {useCase.customer_name}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Editing intended use exhibit. Changes save when you click &ldquo;Save Changes.&rdquo;
          </p>
        </div>
        <UseCaseBuilder useCase={useCase} deals={deals} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-text-muted mb-2">
            <Link
              href="/contracts"
              className="hover:text-text-secondary transition-colors"
            >
              Use Cases
            </Link>
            <span>/</span>
            <span className="text-text-secondary">{useCase.customer_name}</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            {useCase.customer_name}
          </h1>
          {useCase.deals && (
            <p className="text-sm text-text-muted mt-1">
              Linked to deal:{" "}
              <Link
                href={`/deals/${useCase.deals.deal_id}`}
                className="text-accent-primary hover:underline"
              >
                {useCase.deals.company}
              </Link>
              {useCase.deals.acv
                ? ` ($${useCase.deals.acv.toLocaleString()})`
                : ""}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDuplicate}
            loading={isPending}
          >
            Duplicate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
          {actionError}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl px-5 py-3">
        <span className="text-sm text-text-secondary">Status:</span>
        <div className="flex gap-2">
          {USE_CASE_STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              disabled={isPending}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                useCase.status === s.value
                  ? ""
                  : "opacity-50 hover:opacity-80"
              }`}
              style={{
                color: s.color,
                borderColor: `${s.color}${useCase.status === s.value ? "60" : "30"}`,
                backgroundColor: `${s.color}${useCase.status === s.value ? "20" : "08"}`,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Delivery"
          value={deliveryConfig?.label ?? "Not set"}
        />
        <SummaryCard
          label="Access Tier"
          value={accessConfig?.label ?? "Not set"}
        />
        <SummaryCard
          label="Licensed Fields"
          value={`${fields.length} fields`}
        />
        <SummaryCard
          label="Workflow Steps"
          value={`${workflows.length} steps`}
        />
      </div>

      {/* Licensed Fields */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Licensed Data Fields
        </h2>
        {fields.length === 0 ? (
          <p className="text-sm text-text-muted">No fields selected.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fields.map((key) => {
              const field = DAAS_LICENSED_FIELDS.find((f) => f.key === key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center rounded-md bg-accent-primary/10 border border-accent-primary/20 px-2.5 py-1 text-xs font-medium text-accent-primary"
                >
                  {field?.label ?? key}
                </span>
              );
            })}
          </div>
        )}
      </section>

      {/* Intended Use Workflow */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6">
        <h2 className="text-base font-semibold text-text-primary mb-4">
          Intended Use Workflow
        </h2>
        {workflows.length === 0 ? (
          <p className="text-sm text-text-muted">No workflow steps defined.</p>
        ) : (
          <ol className="space-y-3">
            {workflows.map((step) => (
              <li key={step.step_number} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-xs font-semibold text-accent-primary">
                  {step.step_number}
                </span>
                <p className="text-sm text-text-primary pt-0.5">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Caching */}
        <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Caching Terms
          </h3>
          <div className="space-y-2 text-sm">
            <TermRow
              label="Caching permitted"
              value={useCase.caching_permitted ? "Yes" : "No"}
              positive={useCase.caching_permitted}
            />
            {useCase.caching_permitted && useCase.cache_ttl_days && (
              <TermRow
                label="TTL"
                value={`${useCase.cache_ttl_days} days`}
              />
            )}
          </div>
        </section>

        {/* End-User */}
        <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            End-User Provisions
          </h3>
          <div className="space-y-2 text-sm">
            <TermRow
              label="End-user access"
              value={useCase.end_user_access ? "Yes" : "No"}
              positive={useCase.end_user_access}
            />
            <TermRow
              label="End-user export"
              value={useCase.end_user_can_export ? "Yes" : "No"}
              positive={useCase.end_user_can_export}
            />
          </div>
        </section>

        {/* Restrictions */}
        <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Restrictions
          </h3>
          <div className="space-y-2 text-sm">
            <TermRow
              label="Anti-competitive clause"
              value={useCase.anti_competitive_clause ? "Enabled" : "DISABLED"}
              positive={useCase.anti_competitive_clause}
            />
            {useCase.custom_restrictions && (
              <p className="text-xs text-text-muted mt-2">
                {useCase.custom_restrictions}
              </p>
            )}
          </div>
        </section>

        {/* Volume */}
        <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-3">
            Volume & Pricing
          </h3>
          <div className="space-y-2 text-sm">
            {useCase.volume_annual_minimum ? (
              <TermRow
                label="Annual minimum"
                value={`$${useCase.volume_annual_minimum.toLocaleString()}`}
              />
            ) : (
              <TermRow label="Annual minimum" value="Not set" />
            )}
            {useCase.volume_monthly_queries ? (
              <TermRow
                label="Monthly queries"
                value={useCase.volume_monthly_queries.toLocaleString()}
              />
            ) : (
              <TermRow label="Monthly queries" value="Not set" />
            )}
            {useCase.overage_model && (
              <TermRow
                label="Overage model"
                value={
                  useCase.overage_model === "per_query"
                    ? "Cost Per Query"
                    : "Hard Shutoff"
                }
              />
            )}
          </div>
        </section>
      </div>

      {/* Notes */}
      {useCase.notes && (
        <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6">
          <h2 className="text-base font-semibold text-text-primary mb-2">
            Notes
          </h2>
          <p className="text-sm text-text-muted whitespace-pre-wrap">
            {useCase.notes}
          </p>
        </section>
      )}

      {/* Metadata & Danger Zone */}
      <div className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl px-6 py-4">
        <p className="text-xs text-text-muted">
          Created {new Date(useCase.created_at).toLocaleDateString()} | Last
          updated {new Date(useCase.updated_at).toLocaleDateString()}
        </p>
        <div>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-status-red">Delete this use case?</span>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                loading={isPending}
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-text-muted hover:text-status-red transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl px-4 py-3">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-semibold text-text-primary mt-0.5">{value}</p>
    </div>
  );
}

function TermRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-text-muted">{label}</span>
      <span
        className={`font-medium ${
          positive === true
            ? "text-status-green"
            : positive === false
            ? "text-status-red"
            : "text-text-primary"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
