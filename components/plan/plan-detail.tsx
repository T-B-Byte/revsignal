"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { PlanMilestoneWithThread, PlanPhase } from "@/types/database";

const PHASES: { key: PlanPhase; label: string; dayRange: string }[] = [
  { key: "day_30", label: "First 30 Days", dayRange: "Days 1-30" },
  { key: "day_60", label: "Days 31-60", dayRange: "Days 31-60" },
  { key: "day_90", label: "Days 61-90", dayRange: "Days 61-90" },
];

interface PlanDetailProps {
  planId: string;
  initialMilestones: PlanMilestoneWithThread[];
  phaseDeadlines: Record<string, string>;
  daysIn: number;
}

interface MilestoneContextMenu {
  x: number;
  y: number;
  milestone: PlanMilestoneWithThread;
}

export function PlanDetail({
  planId,
  initialMilestones,
  phaseDeadlines,
  daysIn,
}: PlanDetailProps) {
  const [milestones, setMilestones] =
    useState<PlanMilestoneWithThread[]>(initialMilestones);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<PlanPhase | null>(null);
  const [contextMenu, setContextMenu] = useState<MilestoneContextMenu | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const getPhaseStatus = useCallback(
    (phase: PlanPhase) => {
      const items = milestones.filter((m) => m.phase === phase);
      const completed = items.filter((m) => m.is_completed).length;
      const total = items.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

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

  const moveMilestone = useCallback(
    async (milestoneId: string, newPhase: PlanPhase) => {
      const milestone = milestones.find((m) => m.milestone_id === milestoneId);
      if (!milestone || milestone.phase === newPhase) return;

      const targetPhaseItems = milestones.filter((m) => m.phase === newPhase);
      const newSortOrder = targetPhaseItems.length;

      // Optimistic update
      setMilestones((prev) =>
        prev.map((m) =>
          m.milestone_id === milestoneId
            ? { ...m, phase: newPhase, sort_order: newSortOrder }
            : m
        )
      );

      try {
        const res = await fetch(
          `/api/plans/${planId}/milestones/${milestoneId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phase: newPhase, sort_order: newSortOrder }),
          }
        );

        if (res.ok) {
          const updated = await res.json();
          setMilestones((prev) =>
            prev.map((m) => (m.milestone_id === milestoneId ? updated : m))
          );
        } else {
          // Rollback
          setMilestones((prev) =>
            prev.map((m) =>
              m.milestone_id === milestoneId
                ? { ...m, phase: milestone.phase, sort_order: milestone.sort_order }
                : m
            )
          );
        }
      } catch {
        setMilestones((prev) =>
          prev.map((m) =>
            m.milestone_id === milestoneId
              ? { ...m, phase: milestone.phase, sort_order: milestone.sort_order }
              : m
          )
        );
      }
    },
    [planId, milestones]
  );

  // --- Drag handlers ---

  function handleDragStart(e: React.DragEvent, milestoneId: string) {
    setDraggedId(milestoneId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", milestoneId);
  }

  function handleDragEnd() {
    setDraggedId(null);
    setDropTarget(null);
  }

  function handleDragOver(e: React.DragEvent, phase: PlanPhase) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(phase);
  }

  function handleDragLeave(e: React.DragEvent, phase: PlanPhase) {
    // Only clear if actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    const currentTarget = e.currentTarget as HTMLElement;
    if (relatedTarget && currentTarget.contains(relatedTarget)) return;
    if (dropTarget === phase) setDropTarget(null);
  }

  function handleDrop(e: React.DragEvent, phase: PlanPhase) {
    e.preventDefault();
    setDropTarget(null);
    const milestoneId = e.dataTransfer.getData("text/plain");
    if (milestoneId) {
      moveMilestone(milestoneId, phase);
    }
  }

  // --- Context menu ---

  function handleMilestoneContextMenu(e: React.MouseEvent, milestone: PlanMilestoneWithThread) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, milestone });
  }

  // --- Print ---

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print button */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg border border-border-primary bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-tertiary hover:text-text-primary transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print / PDF
        </button>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        onMouseDown={(e) => {
          // Close context menu on click outside
          if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
            closeContextMenu();
          }
        }}
      >
        {PHASES.map((phase) => (
          <PhaseColumn
            key={phase.key}
            phase={phase}
            deadline={phaseDeadlines[phase.key]}
            status={getPhaseStatus(phase.key)}
            isDropTarget={dropTarget === phase.key}
            isDragging={!!draggedId}
            draggedMilestonePhase={draggedId ? milestones.find((m) => m.milestone_id === draggedId)?.phase : undefined}
            onToggle={toggleMilestone}
            onDelete={deleteMilestone}
            onAdd={(title) => addMilestone(phase.key, title)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, phase.key)}
            onDragLeave={(e) => handleDragLeave(e, phase.key)}
            onDrop={(e) => handleDrop(e, phase.key)}
            onMilestoneContextMenu={handleMilestoneContextMenu}
          />
        ))}
      </div>

      {/* Right-click context menu for milestones */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[200px] rounded-xl border border-border-primary bg-surface-primary shadow-xl py-1 overflow-hidden print:hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="px-3 py-2 border-b border-border-primary">
            <p className="text-[11px] font-semibold text-text-muted truncate max-w-[180px]">
              {contextMenu.milestone.title}
            </p>
          </div>

          {/* Move to phase options */}
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Move to
          </p>
          {PHASES.filter((p) => p.key !== contextMenu.milestone.phase).map((p) => (
            <button
              key={p.key}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                moveMilestone(contextMenu.milestone.milestone_id, p.key);
                closeContextMenu();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              {p.label}
            </button>
          ))}

          <div className="my-1 mx-2 border-t border-border-primary" />

          {/* Toggle completion */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              toggleMilestone(contextMenu.milestone);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {contextMenu.milestone.is_completed ? "Mark incomplete" : "Mark complete"}
          </button>

          {/* Delete */}
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              deleteMilestone(contextMenu.milestone.milestone_id);
              closeContextMenu();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-status-red hover:bg-status-red/10 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </>
  );
}

function PhaseColumn({
  phase,
  deadline,
  status,
  isDropTarget,
  isDragging,
  draggedMilestonePhase,
  onToggle,
  onDelete,
  onAdd,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onMilestoneContextMenu,
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
  isDropTarget: boolean;
  isDragging: boolean;
  draggedMilestonePhase?: PlanPhase;
  onToggle: (m: PlanMilestoneWithThread) => void;
  onDelete: (id: string) => void;
  onAdd: (title: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onMilestoneContextMenu: (e: React.MouseEvent, m: PlanMilestoneWithThread) => void;
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
    if (a.is_completed !== b.is_completed) return a.is_completed ? 1 : -1;
    return a.sort_order - b.sort_order;
  });

  // Show drop highlight only when dragging from a different column
  const showDropHighlight = isDropTarget && isDragging && draggedMilestonePhase !== phase.key;

  return (
    <Card
      className={`transition-all ${
        showDropHighlight
          ? "border-accent-primary ring-1 ring-accent-primary/30 bg-accent-primary/5"
          : status.isCurrent
            ? "border-accent-primary/40"
            : status.isComplete
              ? "border-emerald-400/30"
              : ""
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={status.color}>{phase.label}</CardTitle>
          <span className="text-[10px] text-text-muted print:text-gray-500">by {deadline}</span>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted print:text-gray-500">{phase.dayRange}</span>
            <span className={`text-[10px] font-medium ${status.color}`}>
              {status.completed}/{status.total}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-tertiary overflow-hidden print:bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                status.isComplete
                  ? "bg-emerald-400"
                  : status.isPast && !status.isComplete
                    ? "bg-status-red"
                    : status.isCurrent
                      ? "bg-accent-primary"
                      : "bg-text-muted/40"
              } print:bg-gray-600`}
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
            draggable
            onDragStart={(e) => onDragStart(e, m.milestone_id)}
            onDragEnd={onDragEnd}
            onContextMenu={(e) => onMilestoneContextMenu(e, m)}
            className={`group flex items-start gap-2 rounded-md px-1 py-1.5 -mx-1 hover:bg-surface-tertiary transition-colors cursor-grab active:cursor-grabbing ${
              isDragging ? "select-none" : ""
            }`}
          >
            <button
              onClick={() => onToggle(m)}
              className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-colors flex items-center justify-center print:border-gray-400 ${
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
                  className="text-emerald-400 print:text-gray-700"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <p
                className={`text-sm leading-snug ${
                  m.is_completed
                    ? "text-text-muted line-through print:text-gray-400"
                    : "text-text-primary print:text-gray-900"
                }`}
              >
                {m.title}
              </p>
              {m.description && (
                <p className="text-[11px] text-text-muted mt-0.5 print:text-gray-500">
                  {m.description}
                </p>
              )}
              {m.coaching_threads && (
                <Link
                  href={`/coach/${m.coaching_threads.thread_id}`}
                  className="text-[10px] text-accent-primary hover:underline print:hidden"
                >
                  {m.coaching_threads.title}
                </Link>
              )}
            </div>

            {/* Drag handle hint */}
            <div className="p-0.5 text-text-muted/30 opacity-0 group-hover:opacity-100 transition-opacity print:hidden mt-0.5">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="5" cy="3" r="1.5" />
                <circle cx="11" cy="3" r="1.5" />
                <circle cx="5" cy="8" r="1.5" />
                <circle cx="11" cy="8" r="1.5" />
                <circle cx="5" cy="13" r="1.5" />
                <circle cx="11" cy="13" r="1.5" />
              </svg>
            </div>

            <button
              onClick={() => onDelete(m.milestone_id)}
              className="p-0.5 text-text-muted hover:text-status-red opacity-0 group-hover:opacity-100 transition-all print:hidden"
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

        {/* Inline add (hidden in print) */}
        <div className="flex items-center gap-1.5 pt-2 print:hidden">
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
            placeholder="Add milestone..."
            maxLength={300}
            className="flex-1 rounded-md border border-border-primary bg-surface-primary px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}
