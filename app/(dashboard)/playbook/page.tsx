import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlaybookItem } from "@/types/database";

export default async function PlaybookPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: items } = await supabase
    .from("playbook_items")
    .select("*")
    .eq("user_id", user.id)
    .order("workstream")
    .order("sort_order");

  const grouped = (items as PlaybookItem[] | null)?.reduce(
    (acc, item) => {
      if (!acc[item.workstream]) acc[item.workstream] = [];
      acc[item.workstream].push(item);
      return acc;
    },
    {} as Record<string, PlaybookItem[]>
  );

  const workstreams = grouped ? Object.entries(grouped) : [];

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">
        GTM Playbook
      </h1>

      {workstreams.length === 0 ? (
        <Card>
          <CardContent>
            <p className="py-8 text-center text-sm text-text-muted">
              No playbook items yet. Run{" "}
              <code className="font-mono text-accent-primary">
                npm run seed:playbook
              </code>{" "}
              to load the GTM playbook.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {workstreams.map(([workstream, items]) => {
            const completed = items.filter(
              (i) => i.status === "completed"
            ).length;
            const total = items.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card key={workstream}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{workstream}</CardTitle>
                    <span className="font-data text-xs text-text-muted">
                      {completed}/{total} ({pct}%)
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-surface-tertiary">
                    <div
                      className="h-1.5 rounded-full bg-accent-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {items.map((item) => (
                      <li
                        key={item.item_id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <span className="mt-0.5 shrink-0">
                          {item.status === "completed" ? (
                            <span className="text-status-green">&#10003;</span>
                          ) : item.status === "in_progress" ? (
                            <span className="text-status-yellow">&#9679;</span>
                          ) : (
                            <span className="text-text-muted">&#9675;</span>
                          )}
                        </span>
                        <span
                          className={
                            item.status === "completed"
                              ? "text-text-muted line-through"
                              : "text-text-primary"
                          }
                        >
                          {item.description}
                        </span>
                        <Badge
                          variant={
                            item.status === "completed"
                              ? "green"
                              : item.status === "in_progress"
                                ? "yellow"
                                : item.status === "blocked"
                                  ? "red"
                                  : "gray"
                          }
                        >
                          {item.status.replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
