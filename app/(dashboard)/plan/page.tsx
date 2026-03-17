import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { NewPlanButton } from "@/components/plan/new-plan-button";
import { format, addDays, differenceInDays } from "date-fns";

export const metadata = {
  title: "90-Day Plans | RevSignal",
};

interface PlanSummary {
  plan_id: string;
  title: string;
  description: string | null;
  start_date: string;
  is_archived: boolean;
  coaching_threads?: { thread_id: string; title: string } | null;
  phase_summary: Record<string, { total: number; completed: number }>;
  total_milestones: number;
  completed_milestones: number;
}

function getPlanStatus(startDate: string): {
  currentPhase: string;
  daysIn: number;
  daysRemaining: number;
  percentElapsed: number;
} {
  const start = new Date(startDate);
  const now = new Date();
  const daysIn = Math.max(0, differenceInDays(now, start));
  const daysRemaining = Math.max(0, 90 - daysIn);
  const percentElapsed = Math.min(100, Math.round((daysIn / 90) * 100));

  let currentPhase = "day_30";
  if (daysIn > 60) currentPhase = "day_90";
  else if (daysIn > 30) currentPhase = "day_60";

  return { currentPhase, daysIn, daysRemaining, percentElapsed };
}

const PHASE_LABELS: Record<string, string> = {
  day_30: "First 30",
  day_60: "Days 31–60",
  day_90: "Days 61–90",
};

export default async function PlanListPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch plans with milestone counts (same shape as GET /api/plans)
  const { data: rawPlans } = await supabase
    .from("plans")
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title),
      plan_milestones (milestone_id, phase, is_completed)
    `)
    .eq("user_id", user.id)
    .order("is_archived", { ascending: true })
    .order("created_at", { ascending: false });

  const plans: PlanSummary[] = (rawPlans || []).map((plan) => {
    const milestones = (plan.plan_milestones as { milestone_id: string; phase: string; is_completed: boolean }[]) || [];
    const phases = ["day_30", "day_60", "day_90"];
    const phaseSummary = Object.fromEntries(
      phases.map((p) => {
        const items = milestones.filter((m) => m.phase === p);
        return [p, { total: items.length, completed: items.filter((m) => m.is_completed).length }];
      })
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { plan_milestones: _, ...rest } = plan;
    return {
      ...rest,
      phase_summary: phaseSummary,
      total_milestones: milestones.length,
      completed_milestones: milestones.filter((m) => m.is_completed).length,
    };
  });

  const activePlans = plans.filter((p) => !p.is_archived);
  const archivedPlans = plans.filter((p) => p.is_archived);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">90-Day Plans</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Track milestones across 30/60/90 day phases
          </p>
        </div>
        <NewPlanButton />
      </div>

      {activePlans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-text-muted">No plans yet.</p>
            <p className="text-xs text-text-muted mt-1">
              Create a 90-day plan to track your milestones and stay on cadence.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {activePlans.map((plan) => {
          const status = getPlanStatus(plan.start_date);
          const completionPercent =
            plan.total_milestones > 0
              ? Math.round((plan.completed_milestones / plan.total_milestones) * 100)
              : 0;
          const isOnTrack = completionPercent >= status.percentElapsed - 10;
          const endDate = addDays(new Date(plan.start_date), 90);

          return (
            <Link key={plan.plan_id} href={`/plan/${plan.plan_id}`}>
              <Card className="transition-colors hover:border-border-hover cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-text-primary">
                        {plan.title}
                      </h3>
                      {plan.description && (
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">
                          {plan.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                        <span>
                          {format(new Date(plan.start_date), "MMM d")} –{" "}
                          {format(endDate, "MMM d, yyyy")}
                        </span>
                        <span>Day {status.daysIn} of 90</span>
                        {plan.coaching_threads && (
                          <span className="text-accent-primary">
                            {plan.coaching_threads.title}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-semibold ${
                          isOnTrack ? "text-emerald-400" : "text-status-yellow"
                        }`}
                      >
                        {completionPercent}%
                      </span>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {plan.completed_milestones}/{plan.total_milestones}
                      </p>
                    </div>
                  </div>

                  {/* Phase progress bars */}
                  <div className="flex gap-1 mt-3">
                    {(["day_30", "day_60", "day_90"] as const).map((phase) => {
                      const ps = plan.phase_summary[phase];
                      const pct = ps.total > 0 ? (ps.completed / ps.total) * 100 : 0;
                      const isCurrent = status.currentPhase === phase;
                      return (
                        <div key={phase} className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span
                              className={`text-[9px] font-medium ${
                                isCurrent ? "text-accent-primary" : "text-text-muted"
                              }`}
                            >
                              {PHASE_LABELS[phase]}
                            </span>
                            <span className="text-[9px] text-text-muted">
                              {ps.completed}/{ps.total}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct === 100
                                  ? "bg-emerald-400"
                                  : isCurrent
                                    ? "bg-accent-primary"
                                    : "bg-text-muted/40"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {archivedPlans.length > 0 && (
        <div className="pt-4 border-t border-border-primary">
          <p className="text-xs text-text-muted mb-3">
            Archived ({archivedPlans.length})
          </p>
          <div className="grid gap-3 opacity-60">
            {archivedPlans.map((plan) => (
              <Link key={plan.plan_id} href={`/plan/${plan.plan_id}`}>
                <Card className="transition-colors hover:border-border-hover cursor-pointer">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm text-text-secondary">{plan.title}</h3>
                      <span className="text-[10px] text-text-muted">
                        {plan.completed_milestones}/{plan.total_milestones} complete
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
