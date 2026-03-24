import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe/config";
import type { Subscription, SubscriptionTier, SubscriptionStatus } from "@/types/database";

const INTEGRATIONS = [
  {
    name: "Microsoft Teams",
    description: "Chat ingestion, call transcripts, notifications",
    status: "not_configured" as const,
  },
  {
    name: "Microsoft Outlook",
    description: "Email read/send, calendar integration",
    status: "not_configured" as const,
  },
  {
    name: "Salesforce",
    description: "Bi-directional CRM sync",
    status: "not_configured" as const,
  },
  {
    name: "pharosIQ Contacts DB",
    description: "Read-only access to 270M+ contacts and intent data",
    status: "not_configured" as const,
  },
  {
    name: "OneDrive / SharePoint",
    description: "Sales collateral access",
    provider: null,
  },
];

function getTierBadgeVariant(tier: SubscriptionTier): BadgeVariant {
  switch (tier) {
    case "power":
      return "green";
    case "starter":
      return "blue";
    default:
      return "gray";
  }
}

function getStatusBadgeVariant(status: SubscriptionStatus): BadgeVariant {
  switch (status) {
    case "active":
      return "green";
    case "trialing":
      return "blue";
    case "past_due":
      return "red";
    default:
      return "gray";
  }
}

function formatLimit(value: number): string {
  return value === Infinity ? "Unlimited" : String(value);
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: subscriptionData } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const subscription = subscriptionData as Subscription | null;
  const tier: SubscriptionTier = subscription?.tier ?? 'power';
  const status: SubscriptionStatus = subscription?.status ?? "active";
  const plan = PLANS[tier];

  // Check which integrations are connected
  const { data: tokens } = await supabase
    .from("integration_tokens")
    .select("provider, updated_at")
    .eq("user_id", user.id);

  const connectedProviders = new Map(
    (tokens ?? []).map((t) => [t.provider, t.updated_at as string])
  );

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Settings
      </h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant={getTierBadgeVariant(tier)}>
                  {plan.name}
                </Badge>
                <span className="text-sm font-medium text-text-primary">
                  {plan.price === 0
                    ? "Free"
                    : `$${plan.price}/mo`}
                </span>
              </div>
              <Badge variant={getStatusBadgeVariant(status)}>
                {status}
              </Badge>
            </div>

            {subscription?.cancel_at_period_end && (
              <div className="rounded-md border border-status-red/20 bg-status-red/5 px-3 py-2">
                <p className="text-xs text-status-red">
                  Cancels at end of billing period
                  {subscription.current_period_end && (
                    <> ({new Date(subscription.current_period_end).toLocaleDateString()})</>
                  )}
                </p>
              </div>
            )}

            {subscription?.current_period_end && !subscription.cancel_at_period_end && tier !== "free" && (
              <p className="text-xs text-text-muted">
                Renews {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}

            <div className="border-t border-border-primary pt-3">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Plan includes
              </p>
              <ul className="space-y-1.5 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <span className="text-xs text-accent-primary">&#10003;</span>
                  {formatLimit(plan.limits.activeDeals)} active deals
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-xs text-accent-primary">&#10003;</span>
                  {plan.limits.prospectSearches === 0
                    ? "No prospect searches"
                    : `${formatLimit(plan.limits.prospectSearches)} prospect searches/mo`}
                </li>
                <li className="flex items-center gap-2">
                  <span className={`text-xs ${plan.limits.integrations ? "text-accent-primary" : "text-text-muted"}`}>
                    {plan.limits.integrations ? "\u2713" : "\u2717"}
                  </span>
                  <span className={plan.limits.integrations ? "" : "text-text-muted"}>
                    Microsoft + Salesforce integrations
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`text-xs ${plan.limits.aiBriefings ? "text-accent-primary" : "text-text-muted"}`}>
                    {plan.limits.aiBriefings ? "\u2713" : "\u2717"}
                  </span>
                  <span className={plan.limits.aiBriefings ? "" : "text-text-muted"}>
                    AI daily briefings + strategy memos
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`text-xs ${plan.limits.callTranscripts ? "text-accent-primary" : "text-text-muted"}`}>
                    {plan.limits.callTranscripts ? "\u2713" : "\u2717"}
                  </span>
                  <span className={plan.limits.callTranscripts ? "" : "text-text-muted"}>
                    Call transcript processing
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {INTEGRATIONS.map((integration) => (
                  <div
                    key={integration.name}
                    className="flex items-center justify-between rounded-md border border-border-primary bg-surface-tertiary px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {integration.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {integration.description}
                      </p>
                    </div>
                      <Badge variant="gray">Not configured</Badge>
                  </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Integration setup coming in Phase 5. All integrations will have
              manual fallback mode.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
