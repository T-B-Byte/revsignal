import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format, addDays, differenceInDays } from "date-fns";
import { PlanDetail } from "@/components/plan/plan-detail";
import type { PlanMilestoneWithThread } from "@/types/database";

interface PlanDetailPageProps {
  params: Promise<{ planId: string }>;
}

export async function generateMetadata({ params }: PlanDetailPageProps) {
  const { planId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { title: "Plan | RevSignal" };

  const { data: plan } = await supabase
    .from("plans")
    .select("title")
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    title: plan ? `${plan.title} | RevSignal` : "Plan | RevSignal",
  };
}

export default async function PlanDetailPage({ params }: PlanDetailPageProps) {
  const { planId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: plan, error } = await supabase
    .from("plans")
    .select(`
      *,
      coaching_threads:thread_id (thread_id, title),
      plan_milestones (
        *,
        coaching_threads:thread_id (thread_id, title)
      )
    `)
    .eq("plan_id", planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !plan) notFound();

  const milestones = (plan.plan_milestones as PlanMilestoneWithThread[]) || [];
  const startDate = new Date(plan.start_date);
  const daysIn = Math.max(0, differenceInDays(new Date(), startDate));
  const endDate = addDays(startDate, 90);

  // Compute per-phase deadlines
  const phaseDeadlines = {
    day_30: format(addDays(startDate, 30), "MMM d"),
    day_60: format(addDays(startDate, 60), "MMM d"),
    day_90: format(endDate, "MMM d, yyyy"),
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/plan" className="hover:text-text-primary transition-colors">
          Plans
        </Link>
        <span>/</span>
        <span className="text-text-primary">{plan.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{plan.title}</h1>
          {plan.description && (
            <p className="text-xs text-text-secondary mt-1 max-w-2xl">
              {plan.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-text-muted">
            <span>
              {format(startDate, "MMM d, yyyy")} – {format(endDate, "MMM d, yyyy")}
            </span>
            <span className="font-medium text-text-secondary">
              Day {Math.min(daysIn, 90)} of 90
            </span>
            {daysIn <= 90 && (
              <span>
                {90 - daysIn} days remaining
              </span>
            )}
            {plan.coaching_threads && (
              <Link
                href={`/coach/${plan.coaching_threads.thread_id}`}
                className="text-accent-primary hover:underline"
              >
                {plan.coaching_threads.title}
              </Link>
            )}
          </div>

          {/* Overall progress bar */}
          <div className="mt-3 w-80">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-text-muted">Overall progress</span>
              <span className="text-[10px] font-medium text-text-secondary">
                {milestones.filter((m) => m.is_completed).length}/{milestones.length}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-primary transition-all"
                style={{
                  width: `${
                    milestones.length > 0
                      ? (milestones.filter((m) => m.is_completed).length / milestones.length) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            {/* Time elapsed indicator */}
            <div className="relative mt-0.5">
              <div
                className="absolute h-2 border-l border-text-muted/40"
                style={{ left: `${Math.min(100, (daysIn / 90) * 100)}%` }}
                title={`Day ${daysIn}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Three-phase columns */}
      <PlanDetail
        planId={planId}
        initialMilestones={milestones}
        phaseDeadlines={phaseDeadlines}
        daysIn={daysIn}
      />
    </div>
  );
}
