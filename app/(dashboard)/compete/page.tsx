import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CompetitiveIntel } from "@/types/database";

export default async function CompetePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: intel } = await supabase
    .from("competitive_intel")
    .select("*")
    .eq("user_id", user.id)
    .order("competitor")
    .order("category");

  const grouped = (intel as CompetitiveIntel[] | null)?.reduce(
    (acc, item) => {
      if (!acc[item.competitor]) acc[item.competitor] = [];
      acc[item.competitor].push(item);
      return acc;
    },
    {} as Record<string, CompetitiveIntel[]>
  );

  const competitors = grouped ? Object.entries(grouped) : [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        Competitive Intelligence
      </h1>

      {competitors.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-text-muted">
              No competitive intel yet. Run{" "}
              <code className="font-mono text-accent-primary">
                npm run seed:competitors
              </code>{" "}
              to load competitor data.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {competitors.map(([competitor, items]) => (
            <Card key={competitor}>
              <CardHeader>
                <CardTitle>{competitor}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id}>
                      <dt className="flex items-center gap-2">
                        <Badge
                          variant={
                            item.category === "weakness"
                              ? "red"
                              : item.category === "pharosiq_advantage"
                                ? "green"
                                : item.category === "pricing"
                                  ? "yellow"
                                  : "blue"
                          }
                        >
                          {item.category.replace("_", " ")}
                        </Badge>
                      </dt>
                      <dd className="mt-1 text-sm text-text-secondary">
                        {item.data_point}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
