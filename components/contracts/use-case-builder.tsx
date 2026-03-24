"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldSelector } from "@/components/contracts/field-selector";
import { WorkflowBuilder } from "@/components/contracts/workflow-builder";
import { createUseCase, updateUseCase } from "@/app/(dashboard)/contracts/actions";
import type {
  DaasUseCase,
  DeliveryMethodUC,
  AccessTier,
  OverageModel,
  WorkflowStep,
  Deal,
} from "@/types/database";
import {
  DELIVERY_METHOD_UC_OPTIONS,
  ACCESS_TIER_OPTIONS,
  OVERAGE_MODEL_OPTIONS,
} from "@/types/database";

interface UseCaseBuilderProps {
  useCase?: DaasUseCase;
  deals: Pick<Deal, "deal_id" | "company" | "stage" | "acv">[];
}

export function UseCaseBuilder({ useCase, deals }: UseCaseBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerName, setCustomerName] = useState(useCase?.customer_name ?? "");
  const [dealId, setDealId] = useState<string | null>(useCase?.deal_id ?? null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodUC | null>(
    useCase?.delivery_method ?? null
  );
  const [accessTier, setAccessTier] = useState<AccessTier | null>(
    useCase?.access_tier ?? null
  );
  const [licensedFields, setLicensedFields] = useState<string[]>(
    useCase?.licensed_fields ?? []
  );
  const [workflows, setWorkflows] = useState<WorkflowStep[]>(
    useCase?.permitted_workflows ?? []
  );
  const [cachingPermitted, setCachingPermitted] = useState(
    useCase?.caching_permitted ?? false
  );
  const [cacheTtlDays, setCacheTtlDays] = useState<string>(
    useCase?.cache_ttl_days?.toString() ?? ""
  );
  const [endUserAccess, setEndUserAccess] = useState(
    useCase?.end_user_access ?? false
  );
  const [endUserCanExport, setEndUserCanExport] = useState(
    useCase?.end_user_can_export ?? false
  );
  const [antiCompetitive, setAntiCompetitive] = useState(
    useCase?.anti_competitive_clause ?? true
  );
  const [customRestrictions, setCustomRestrictions] = useState(
    useCase?.custom_restrictions ?? ""
  );
  const [annualMinimum, setAnnualMinimum] = useState<string>(
    useCase?.volume_annual_minimum?.toString() ?? ""
  );
  const [monthlyQueries, setMonthlyQueries] = useState<string>(
    useCase?.volume_monthly_queries?.toString() ?? ""
  );
  const [overageModel, setOverageModel] = useState<OverageModel | null>(
    useCase?.overage_model ?? null
  );
  const [notes, setNotes] = useState(useCase?.notes ?? "");

  function handleSubmit() {
    setError(null);

    const data = {
      customer_name: customerName,
      deal_id: dealId || null,
      delivery_method: deliveryMethod,
      access_tier: accessTier,
      licensed_fields: licensedFields,
      permitted_workflows: workflows,
      caching_permitted: cachingPermitted,
      cache_ttl_days: cachingPermitted && cacheTtlDays ? parseInt(cacheTtlDays, 10) || null : null,
      end_user_access: endUserAccess,
      end_user_can_export: endUserAccess ? endUserCanExport : false,
      anti_competitive_clause: antiCompetitive,
      custom_restrictions: customRestrictions || null,
      volume_annual_minimum: annualMinimum ? parseInt(annualMinimum, 10) || null : null,
      volume_monthly_queries: monthlyQueries ? parseInt(monthlyQueries, 10) || null : null,
      overage_model: overageModel,
      notes: notes || null,
    };

    startTransition(async () => {
      let result;
      if (useCase) {
        result = await updateUseCase(useCase.use_case_id, data);
      } else {
        result = await createUseCase(data);
      }

      if ("error" in result) {
        setError(result.error);
        return;
      }

      if ("use_case_id" in result) {
        router.push(`/contracts/${result.use_case_id}`);
      } else {
        router.push("/contracts");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {error && (
        <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
          {error}
        </div>
      )}

      {/* Section 1: Customer & Deal */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Customer & Deal
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Who is this intended use exhibit for? Link it to an existing deal if one exists.
          </p>
        </div>

        <Input
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="e.g., 6sense, HubSpot, Demandbase"
          required
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-secondary">
            Link to Deal (optional)
          </label>
          <select
            value={dealId ?? ""}
            onChange={(e) => setDealId(e.target.value || null)}
            className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
          >
            <option value="">No linked deal</option>
            {deals.map((deal) => (
              <option key={deal.deal_id} value={deal.deal_id}>
                {deal.company} ({deal.stage}
                {deal.acv ? ` / $${deal.acv.toLocaleString()}` : ""})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Section 2: Licensed Data Fields */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Licensed Data Fields
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Select exactly which fields from the pharosIQ company database are included in this license.
            This becomes the Data Schema Exhibit attached to the MSA. Fields not checked are not licensed,
            which lets you differentiate tiers and restrict sensitive fields (like revenue) to higher-value deals.
          </p>
        </div>

        <FieldSelector selected={licensedFields} onChange={setLicensedFields} />
      </section>

      {/* Section 3: Delivery Method */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Delivery Method
          </h2>
          <p className="text-sm text-text-muted mt-1">
            How does the customer receive the data? This determines query volume mechanics, refresh cadence,
            and the pricing exhibit structure.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {DELIVERY_METHOD_UC_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDeliveryMethod(option.value)}
              className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                deliveryMethod === option.value
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-border-primary bg-surface-secondary hover:border-border-primary/60"
              }`}
            >
              <p className="text-sm font-medium text-text-primary">
                {option.label}
              </p>
              <p className="text-xs text-text-muted mt-1">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Section 4: Access Tier */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Access Tier
          </h2>
          <p className="text-sm text-text-muted mt-1">
            What can the customer's end users do with the data? This is the single most important
            licensing decision. Display Only is lowest risk, Bulk Export is highest. Price accordingly.
          </p>
        </div>

        <div className="space-y-3">
          {ACCESS_TIER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setAccessTier(option.value)}
              className={`w-full rounded-lg border px-4 py-4 text-left transition-colors ${
                accessTier === option.value
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-border-primary bg-surface-secondary hover:border-border-primary/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    accessTier === option.value
                      ? "border-accent-primary"
                      : "border-border-primary"
                  }`}
                >
                  {accessTier === option.value && (
                    <div className="h-2.5 w-2.5 rounded-full bg-accent-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {option.label}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Section 5: Intended Use Workflow */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Intended Use Workflow
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Define the step-by-step workflow for how this customer will use the data.
            This is not vague "internal business purposes." Each step is a numbered, specific action
            that makes the contract enforceable. Start from a template or build from scratch.
          </p>
        </div>

        <WorkflowBuilder steps={workflows} onChange={setWorkflows} />
      </section>

      {/* Section 6: Caching Terms */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Caching Terms
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Will the customer store pharosIQ data locally? If yes, you need a TTL (time to live)
            after which they must refresh or destroy the cached records. Without this, stale data
            accumulates indefinitely with no audit recourse.
          </p>
        </div>

        <Toggle
          label="Caching permitted"
          description="Customer may store licensed data locally subject to TTL and destruction terms."
          checked={cachingPermitted}
          onChange={setCachingPermitted}
        />

        {cachingPermitted && (
          <Input
            label="Cache TTL (days)"
            type="number"
            value={cacheTtlDays}
            onChange={(e) => setCacheTtlDays(e.target.value)}
            placeholder="e.g., 90"
            helperText="Number of days before cached records must be refreshed or destroyed."
            min={1}
          />
        )}
      </section>

      {/* Section 7: End-User Provisions */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            End-User Provisions
          </h2>
          <p className="text-sm text-text-muted mt-1">
            When the customer embeds pharosIQ data in their product, their customers (end users) touch the data.
            These toggles control what those downstream users can do.
          </p>
        </div>

        <Toggle
          label="End users access licensed data"
          description="Customer's end users can view or interact with pharosIQ data within the customer's product."
          checked={endUserAccess}
          onChange={setEndUserAccess}
        />

        {endUserAccess && (
          <Toggle
            label="End users can export records"
            description="End users may push records into their own CRM or download individual records. Subject to caching terms and passthrough restrictions."
            checked={endUserCanExport}
            onChange={setEndUserCanExport}
          />
        )}

        {endUserAccess && (
          <div className="rounded-md bg-status-yellow/10 border border-status-yellow/20 px-4 py-3">
            <p className="text-sm text-status-yellow font-medium">Passthrough requirement</p>
            <p className="text-xs text-text-muted mt-1">
              When end users touch the data, the MSA must require the customer to contractually bind
              end users to the same restrictions, and make the customer liable for end-user breaches.
            </p>
          </div>
        )}
      </section>

      {/* Section 8: Restrictions */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Restrictions
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Protective clauses that survive termination. The anti-competitive clause is the
            &ldquo;you can&apos;t build pharosIQ with pharosIQ data&rdquo; provision.
          </p>
        </div>

        <Toggle
          label="Anti-competitive use clause"
          description="Prohibits using licensed data to build a product that competes with pharosIQ. Survives termination."
          checked={antiCompetitive}
          onChange={setAntiCompetitive}
        />

        {!antiCompetitive && (
          <div className="rounded-md bg-status-red/10 border border-status-red/20 px-4 py-3">
            <p className="text-sm text-status-red font-medium">Warning</p>
            <p className="text-xs text-text-muted mt-1">
              Removing the anti-competitive clause means this customer could use pharosIQ data
              to build a competing intent data product. Only disable this for strategic partners
              with explicit executive approval.
            </p>
          </div>
        )}

        <Textarea
          label="Custom restrictions (optional)"
          value={customRestrictions}
          onChange={(e) => setCustomRestrictions(e.target.value)}
          rows={3}
          placeholder="Any deal-specific restrictions not covered above..."
          helperText="e.g., geographic restrictions, specific use case limitations, competitor acquisition termination rights"
        />
      </section>

      {/* Section 9: Volume & Pricing Framework */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Volume & Pricing Framework
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Define the volume economics for the pricing exhibit. Annual minimum is non-refundable
            and due at the start of each term. No rollover of unused queries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Annual Minimum ($)"
            type="number"
            value={annualMinimum}
            onChange={(e) => setAnnualMinimum(e.target.value)}
            placeholder="e.g., 100000"
            min={0}
          />
          <Input
            label="Monthly Query Threshold"
            type="number"
            value={monthlyQueries}
            onChange={(e) => setMonthlyQueries(e.target.value)}
            placeholder="e.g., 50000"
            helperText="Queries per month before overage kicks in."
            min={0}
          />
        </div>

        {(deliveryMethod === "api" || monthlyQueries) && (
          <div>
            <label className="mb-2 block text-sm font-medium text-text-secondary">
              Overage Model
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {OVERAGE_MODEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setOverageModel(option.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    overageModel === option.value
                      ? "border-accent-primary bg-accent-primary/10"
                      : "border-border-primary bg-surface-secondary hover:border-border-primary/60"
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">
                    {option.label}
                  </p>
                  <p className="text-xs text-text-muted mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 10: Notes */}
      <section className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Notes</h2>
          <p className="text-sm text-text-muted mt-1">
            Internal notes about this use case. Not included in the contract exhibit.
          </p>
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes, deal context, negotiation considerations..."
        />
      </section>

      {/* Submit */}
      <div className="flex items-center justify-between rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-6">
        <div>
          <p className="text-sm text-text-muted">
            {licensedFields.length} fields selected, {workflows.length} workflow steps defined
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/contracts")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            loading={isPending}
            disabled={!customerName.trim()}
          >
            {useCase ? "Save Changes" : "Create Use Case"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- Toggle Component ---

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 text-left"
    >
      <div
        className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent-primary" : "bg-surface-tertiary"
        }`}
      >
        <div
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5">{description}</p>
      </div>
    </button>
  );
}
