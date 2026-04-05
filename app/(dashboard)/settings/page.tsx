import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { PLANS } from "@/lib/stripe/config";
import type { Subscription, SubscriptionTier, SubscriptionStatus } from "@/types/database";

/** All trackable features with their labels */
const ALL_FEATURES: { key: string; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "deals", label: "Deals" },
  { key: "network", label: "Projects" },
  { key: "coach", label: "StrategyGPT" },
  { key: "deal-rooms", label: "Deal Rooms" },
  { key: "tasks", label: "Tasks" },
  { key: "prospects", label: "Prospects" },
  { key: "meetings", label: "Meetings" },
  { key: "tradeshows", label: "Tradeshows" },
  { key: "flashcards", label: "Flashcards" },
  { key: "plan", label: "90-Day Plan" },
  { key: "playbook", label: "Playbook" },
  { key: "compete", label: "Competition" },
  { key: "ma", label: "M&A" },
  { key: "contracts", label: "Contracts" },
  { key: "marketing", label: "Marketing" },
  { key: "studio", label: "Studio" },
  { key: "board-report", label: "Board Report" },
  { key: "docs", label: "Docs" },
  { key: "contacts", label: "Contacts" },
];

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
    description: "Read-only access to 360M+ contacts and intent data",
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

  // --- Report Usage data ---

  // Page views: count per page_key
  const { data: pageViewRows } = await supabase
    .from("page_views")
    .select("page_key")
    .eq("user_id", user.id);

  const pageViewCounts = new Map<string, number>();
  for (const row of pageViewRows ?? []) {
    pageViewCounts.set(row.page_key, (pageViewCounts.get(row.page_key) ?? 0) + 1);
  }

  // Agent usage: count per agent_name
  const { data: agentLogRows } = await supabase
    .from("agent_logs")
    .select("agent_name")
    .eq("user_id", user.id);

  const agentCounts = new Map<string, number>();
  for (const row of agentLogRows ?? []) {
    agentCounts.set(row.agent_name, (agentCounts.get(row.agent_name) ?? 0) + 1);
  }

  // Build sorted feature usage list (highest first)
  const featureUsage = ALL_FEATURES.map((f) => ({
    ...f,
    count: pageViewCounts.get(f.key) ?? 0,
  })).sort((a, b) => b.count - a.count);

  const totalPageViews = featureUsage.reduce((sum, f) => sum + f.count, 0);

  // Build sorted agent usage list
  const AGENT_LABELS: Record<string, string> = {
    strategist: "Strategist",
    "prospect-scout": "Prospect Scout",
    "follow-up-enforcer": "Follow-Up Enforcer",
    "call-analyst": "Call Analyst",
    "competitive-watcher": "Competitive Watcher",
    "email-composer": "Email Composer",
    "message-composer": "Message Composer",
    "sfdc-sync": "SFDC Sync",
    summarizer: "Summarizer",
    "tradeshow-scout": "Tradeshow Scout",
  };

  const agentUsage = Array.from(agentCounts.entries())
    .map(([name, count]) => ({
      key: name,
      label: AGENT_LABELS[name] ?? name,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  const totalAgentCalls = agentUsage.reduce((sum, a) => sum + a.count, 0);

  const maxFeatureCount = featureUsage[0]?.count ?? 1;
  const maxAgentCount = agentUsage[0]?.count ?? 1;

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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Report Usage</CardTitle>
              <span className="text-xs text-text-muted">
                {totalPageViews} total page views
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Feature / Page Usage */}
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                Feature visits
              </p>
              <div className="space-y-2">
                {featureUsage.map((f) => (
                  <div key={f.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 text-sm text-text-secondary truncate">
                      {f.label}
                    </span>
                    <div className="flex-1 h-5 rounded bg-surface-tertiary overflow-hidden">
                      {f.count > 0 && (
                        <div
                          className="h-full rounded bg-accent-primary/70 transition-all"
                          style={{
                            width: `${Math.max((f.count / maxFeatureCount) * 100, 2)}%`,
                          }}
                        />
                      )}
                    </div>
                    <span className={`w-10 text-right text-sm font-mono ${f.count === 0 ? "text-status-red" : "text-text-secondary"}`}>
                      {f.count}
                    </span>
                  </div>
                ))}
              </div>

              {featureUsage.some((f) => f.count === 0) && (
                <div className="mt-4 rounded-md border border-status-red/20 bg-status-red/5 px-3 py-2">
                  <p className="text-xs text-status-red">
                    <span className="font-medium">Never visited:</span>{" "}
                    {featureUsage
                      .filter((f) => f.count === 0)
                      .map((f) => f.label)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>

            {/* Agent Usage */}
            {agentUsage.length > 0 && (
              <div className="border-t border-border-primary pt-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    AI Agent calls
                  </p>
                  <span className="text-xs text-text-muted">
                    {totalAgentCalls} total
                  </span>
                </div>
                <div className="space-y-2">
                  {agentUsage.map((a) => (
                    <div key={a.key} className="flex items-center gap-3">
                      <span className="w-28 shrink-0 text-sm text-text-secondary truncate">
                        {a.label}
                      </span>
                      <div className="flex-1 h-5 rounded bg-surface-tertiary overflow-hidden">
                        <div
                          className="h-full rounded bg-green-500/70 transition-all"
                          style={{
                            width: `${Math.max((a.count / maxAgentCount) * 100, 2)}%`,
                          }}
                        />
                      </div>
                      <span className="w-10 text-right text-sm font-mono text-text-secondary">
                        {a.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agentUsage.length === 0 && totalPageViews === 0 && (
              <p className="text-sm text-text-muted text-center py-4">
                No usage data yet. Navigate around the app and data will start appearing here.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
