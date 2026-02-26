import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    status: "not_configured" as const,
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Settings
      </h1>

      <div className="space-y-6">
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
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="blue">Free</Badge>
              <span className="text-sm text-text-secondary">
                3 active deals, manual conversation logging
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
