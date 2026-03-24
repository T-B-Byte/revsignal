import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { USE_CASE_STATUSES } from "@/types/database";
import type { DaasUseCase } from "@/types/database";

export default async function ContractsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: useCases } = await supabase
    .from("daas_use_cases")
    .select("*, deals(deal_id, company, stage, acv)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const items = (useCases ?? []) as (DaasUseCase & {
    deals?: { deal_id: string; company: string; stage: string; acv: number | null } | null;
  })[];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            DaaS Use Cases
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Intended use exhibits for data licensing deals. Each use case defines exactly which fields,
            workflows, and restrictions apply to a customer&apos;s license.
          </p>
        </div>
        <Link
          href="/contracts/new"
          className="inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Use Case
        </Link>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-text-muted/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="mt-4 text-sm text-text-secondary">No use cases yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Create your first intended use exhibit to scope a DaaS deal.
          </p>
          <Link
            href="/contracts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
          >
            Create Use Case
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((uc) => {
            const statusConfig = USE_CASE_STATUSES.find(
              (s) => s.value === uc.status
            );

            return (
              <Link
                key={uc.use_case_id}
                href={`/contracts/${uc.use_case_id}`}
                className="block rounded-lg border border-border-primary bg-surface-card backdrop-blur-xl p-5 hover:border-accent-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-text-primary truncate">
                        {uc.customer_name}
                      </h3>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border"
                        style={{
                          color: statusConfig?.color,
                          borderColor: `${statusConfig?.color}40`,
                          backgroundColor: `${statusConfig?.color}15`,
                        }}
                      >
                        {statusConfig?.label}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                      {uc.deals && (
                        <span>
                          Deal: {uc.deals.company}
                          {uc.deals.acv
                            ? ` ($${uc.deals.acv.toLocaleString()})`
                            : ""}
                        </span>
                      )}
                      {uc.delivery_method && (
                        <span>
                          Delivery:{" "}
                          {uc.delivery_method === "flat_file"
                            ? "Flat File"
                            : uc.delivery_method === "cloud_delivery"
                            ? "Cloud"
                            : uc.delivery_method.toUpperCase()}
                        </span>
                      )}
                      {uc.access_tier && (
                        <span>
                          Tier:{" "}
                          {uc.access_tier === "display_only"
                            ? "Display Only"
                            : uc.access_tier === "crm_append"
                            ? "CRM Append"
                            : "Bulk Export"}
                        </span>
                      )}
                      <span>
                        {(uc.licensed_fields as string[]).length} fields
                      </span>
                      <span>
                        {(uc.permitted_workflows as unknown[]).length} workflow steps
                      </span>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-text-muted">
                    {new Date(uc.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
