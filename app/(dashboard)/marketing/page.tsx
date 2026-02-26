import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MarketingPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Marketing Command
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Skill Triggers & Campaign Tracker</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Marketing automation skills integration coming in Phase 7. Trigger
            positioning, brand voice, email sequences, lead magnets, and content
            atomization from here.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { skill: "/positioning-angles", status: "Not started" },
              { skill: "/brand-voice", status: "Not started" },
              { skill: "/direct-response-copy", status: "Not started" },
              { skill: "/email-sequences", status: "Not started" },
              { skill: "/lead-magnet", status: "Not started" },
              { skill: "/content-atomizer", status: "Not started" },
            ].map((item) => (
              <div
                key={item.skill}
                className="rounded-md border border-border-primary bg-surface-tertiary px-3 py-2"
              >
                <code className="text-xs text-accent-primary">
                  {item.skill}
                </code>
                <p className="mt-0.5 text-xs text-text-muted">{item.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
