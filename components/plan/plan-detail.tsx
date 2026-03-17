"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { PlanMilestoneWithThread, PlanPhase } from "@/types/database";

const PHASES: { key: PlanPhase; label: string; dayRange: string }[] = [
  { key: "day_30", label: "First 30 Days", dayRange: "Days 1–30" },
  { key: "day_60", label: "Days 31–60", dayRange: "Days 31–60" },
  { key: "day_90", label: "Days 61–90", dayRange: "Days 61–90" },
];

interface PlanDetailProps {
  planId: string;
  initialMilestones: PlanMilestoneWithThread[];
  phaseDeadlines: Record<string, string>;
  daysIn: number;
}

export function PlanDetail({
  planId,
  initialMilestones,
  phaseDeadlines,
  daysIn,
}: PlanDetailProps) {
  const [milestones, setMilestones] =
    useState<PlanMilestoneWithThread[]>(initialMilestones);

  const getPhaseStatus = useCallback(
    (phase: PlanPhase) => {
      const items = milestones.filter((m) => m.phase === phase);
      const completed = items.filter((m) => m.is_completed).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Determine if this phase's deadline has passed
      let phaseEndDay = 30;
      if (phase === "day_60") phaseEndDay = 60;
      if (phase === "day_90") phaseEndDay = 90;

      const isPast = daysIn > phaseEndDay;
      const isCurrent =
        daysIn <= phaseEndDay && daysIn > phaseEndDay - 30;
      const isComplete = total > 0 && completed === total;

      let color = "text-text-muted";
      if (isComplete) color = "text-emerald-400";
      else if (isPast && !isComplete) color = "text-status-red";
      else if (isCurrent) color = "text-accent-primary";

      return { items, completed, total, pct, isPast, isCurrent, isComplete, color };
    },
    [milestones, daysIn]
  );

  const toggleMilestone = useCallback(
    async (milestone: PlanMilestoneWithThread) => {
      const newCompleted = !milestone.is_completed;

      setMilestones((prev) =>
        prev.map((m) =>
          m.milestone_id === milestone.milestone_id
            ? {
                ...m,
                is_completed: newCompleted,
                completed_at: newCompleted ? new Date().toISOString() : null,
              }
            : m
        )
      );

      try {
        const res = await fetch(
          `/api/plans/${planId}/milestones/${milestone.milestone_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: newCompleted }),
          }
        );

        if (res.ok) {
          const updated = await res.json();
          setMilestones((prev) =>
            prev.map((m) =>
              m.milestone_id === milestone.milestone_id ? updated : m
            )
          );
        } else {
          setMilestones((prev) =>
            prev.map((m) =>
              m.milestone_id === milestone.milestone_id
                ? { ...m, is_completed: !newCompleted, completed_at: milestone.completed_at }
                : m
            )
          );
        }
      } catch {
        setMilestones((prev) =>
          prev.map((m) =>
            m.milestone_id === milestone.milestone_id
              ? { ...m, is_completed: !newCompleted, completed_at: milestone.completed_at }
              : m
          )
        );
      }
    },
    [planId]
  );

  const deleteMilestone = useCallback(
    async (milestoneId: string) => {
      const removed = milestones.find((m) => m.milestone_id === milestoneId);
      setMilestones((prev) => prev.filter((m) => m.milestone_id !== milestoneId));

      try {
        const res = await fetch(
          `/api/plans/${planId}/milestones/${milestoneId}`,
          { method: "DELETE" }
        );
        if (!res.ok && removed) {
          setMilestones((prev) => [...prev, removed]);
        }
      } catch {
        if (removed) {
          setMilestones((prev) => [...prev, removed]);
        }
      }
    },
    [planId, milestones]
  );

  const addMilestone = useCallback(
    async (phase: PlanPhase, title: string) => {
      const phaseItems = milestones.filter((m) => m.phase === phase);
      const tempId = `temp-${Date.now()}`;
      const temp: PlanMilestoneWithThread = {
        milestone_id: tempId,
        plan_id: planId,
        user_id: "",
        phase,
        title,
        description: null,
        sort_order: phaseItems.length,
        is_completed: false,
        completed_at: null,
        thread_id: null,
        created_at: new Date().toISOString(),
      };
      setMilestones((prev) => [...prev, temp]);

      try {
        const res = await fetch(`/api/plans/${planId}/milestones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phase,
            title,
            sort_order: phaseItems.length,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          setMilestones((prev) =>
            prev.map((m) => (m.milestone_id === tempId ? created : m))
          );
        } else {
          setMilestones((prev) => prev.filter((m) => m.milestone_id !== tempId));
        }
      } catch {
        setMilestones((prev) => prev.filter((m) => m.milestone_id !== tempId));
      }
    },
    [planId, milestones]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {PHASES.map((phase) => (
        <PhaseColumn
          key={phase.key}
          phase={phase}
          deadline={phaseDeadlines[phase.key]}
          status={getPhaseStatus(phase.key)}
          onToggle={toggleMilestone}
          onDelete={deleteMilestone}
          onAdd={(title) => addMilestone(phase.key, title)}
        />
      ))}
    </div>
  );
}

function PhaseColumn({
  phase,
  deadline,
  status,
  onToggle,
  onDelete,
  onAdd,
}: {
  phase: { key: PlanPhase; label: string; dayRange: string };
  deadline: string;
  status: ReturnType<(phase: PlanPhase) => {
    items: PlanMilestoneWithThread[];
    completed: number;
    total: number;
    pct: number;
    isPast: boolean;
    isCurrent: boolean;
    isComplete: boolean;
    color: string;
  }>;
  onToggle: (m: PlanMilestoneWithThread) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleAdd() {
    const t = newTitle.trim();
    if (!t) return;
    onAdd(t);
    setNewTitle("");
    inputRef.current?.focus();
  }

  const sortedItems = [...status.items].sort((a, b) => {
    // Incomplete first, then by sort_order
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  return (
    <Card
      className={
        status.isCurrent
          ? "border-accent-primary/40"
          : status.isComplete
            ? "border-emerald-400/30"
            : ""
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={status.color}>{phase.label}</CardTitle>
          <span className="text-[10px] text-text-muted">by {deadline}</span>
        </div>
        {/* Phase progress */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">{phase.dayRange}</span>
            <span className={`text-[10px] font-medium ${status.color}`}>
              {status.completed}/{status.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                status.isComplete
                  ? "bg-emerald-400"
                  : status.isPast && !status.isComplete
                    ? "bg-status-red"
                    : status.isCurrent
                      ? "bg-accent-primary"
                      : "bg-text-muted/40"
              }`}
              style={{ width: `${status.pct}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        {sortedItems.length === 0 && (
          <p className="text-xs text-text-muted py-3 text-center">
            No milestones yet
          </p>
        )}

        {sortedItems.map((m) => (
          <div
            key={m.milestone_id}
            className="group flex items-start gap-2 rounded-md px-1 py-1.5 -mx-1 hover:bg-surface-tertiary transition-colors"
          >
            <button
              onClick={() => onToggle(m)}
              className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-colors flex items-center justify-center ${
                m.is_completed
                  ? "border-emerald-400 bg-emerald-400/20"
                  : "border-border-primary hover:border-accent-primary"
              }`}
              title={m.is_completed ? "Mark incomplete" : "Mark complete"}
            >
              {m.is_completed && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-400"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm leading-snug ${
                  m.is_completed
                    ? "text-text-muted line-through"
                    : "text-text-primary"
                }`}
              >
                {m.title}
              </p>
              {m.coaching_threads && (
                <Link
                  href={`/coach/${m.coaching_threads.thread_id}`}
                  className="text-[10px] text-accent-primary hover:underline"
                >
                  {m.coaching_threads.title}
                </Link>
              )}
            </div>

            <button
              onClick={() => onDelete(m.milestone_id)}
              className="p-0.5 text-text-muted hover:text-status-red opacity-0 group-hover:opacity-100 transition-all"
              title="Remove"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}

        {/* Inline add */}
        <div className="flex items-center gap-1.5 pt-2">
          <input
            ref={inputRef}
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add milestone…"
            maxLength={300}
            className="flex-1 rounded-md border border-border-primary bg-surface-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
