import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProspectsPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Prospect Engine
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Find Me Buyers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            The prospect engine will actively find companies that would buy
            pharosIQ&apos;s intent data. ICP browser, research results, and
            weekly prospect sweeps coming in Phase 6.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
