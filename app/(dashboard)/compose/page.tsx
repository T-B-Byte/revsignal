import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComposePage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Compose
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Email & Message Composer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            AI-powered email and message drafting coming in Phase 7. The
            composer will draft contextual follow-ups, cold outreach, proposals,
            and internal updates — all in your voice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
