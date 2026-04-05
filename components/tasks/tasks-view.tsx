"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserTaskWithDeal, Deal } from "@/types/database";

type FilterMode = "all" | "mine" | "theirs" | "overdue";

interface TasksViewProps {
  tasks: UserTaskWithDeal[];
  deals: Pick<Deal, "deal_id" | "company" | "stage">[];
}

function isOverdue(task: UserTaskWithDeal): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date < new Date().toISOString().split("T")[0];
}

function isDueToday(task: UserTaskWithDeal): boolean {
  if (!task.due_date || task.status === "done") return false;
  return task.due_date === new Date().toISOString().split("T")[0];
}

function isDueThisWeek(task: UserTaskWithDeal): boolean {
  if (!task.due_date || task.status === "done") return false;
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const todayStr = today.toISOString().split("T")[0];
  const endStr = endOfWeek.toISOString().split("T")[0];
  return task.due_date > todayStr && task.due_date <= endStr;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function sourceBadge(source: string) {
  switch (source) {
    case "strategist":
      return <Badge variant="purple">Strategist</Badge>;
    case "action_item":
      return <Badge variant="blue">Action Item</Badge>;
    default:
      return null;
  }
}

function escalationDot(level: string) {
  if (level === "green") return null;
  const color = level === "red" ? "bg-status-red" : "bg-status-yellow";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} />;
}

export function TasksView({ tasks, deals }: TasksViewProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterMode>("all");
  const [dealFilter, setDealFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskDealId, setNewTaskDealId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (t.status === "done") return false;
      if (filter === "mine" && t.owner !== "me") return false;
      if (filter === "theirs" && t.owner !== "them") return false;
      if (filter === "overdue" && !isOverdue(t)) return false;
      if (dealFilter && t.deal_id !== dealFilter) return false;
      return true;
    });
  }, [tasks, filter, dealFilter]);

  const completed = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    return tasks.filter((t) => t.status === "done" && t.completed_at && t.completed_at > sevenDaysAgo);
  }, [tasks]);

  const overdue = filtered.filter(isOverdue);
  const dueToday = filtered.filter((t) => isDueToday(t));
  const dueThisWeek = filtered.filter((t) => isDueThisWeek(t));
  const later = filtered.filter(
    (t) => !isOverdue(t) && !isDueToday(t) && !isDueThisWeek(t)
  );

  const overdueCount = tasks.filter((t) => t.status === "open" && isOverdue(t)).length;
  const openCount = tasks.filter((t) => t.status === "open").length;

  const toggleTask = useCallback(async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "open" ? "done" : "open";
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task_id: taskId, status: newStatus }),
    });
    router.refresh();
  }, [router]);

  const addTask = useCallback(async () => {
    if (!newTaskText.trim()) return;
    setAdding(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: newTaskText.trim(),
        deal_id: newTaskDealId || undefined,
        owner: "me",
        source: "manual",
      }),
    });
    setNewTaskText("");
    setNewTaskDealId("");
    setAdding(false);
    router.refresh();
  }, [newTaskText, newTaskDealId, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Tasks</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {openCount} open{overdueCount > 0 ? `, ${overdueCount} overdue` : ""}
          </p>
        </div>
      </div>

      {/* Quick add */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1 rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
        />
        <select
          value={newTaskDealId}
          onChange={(e) => setNewTaskDealId(e.target.value)}
          className="rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-secondary"
        >
          <option value="">No deal</option>
          {deals.map((d) => (
            <option key={d.deal_id} value={d.deal_id}>{d.company}</option>
          ))}
        </select>
        <Button onClick={addTask} disabled={adding || !newTaskText.trim()}>
          Add
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "mine", "theirs", "overdue"] as FilterMode[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
                : "bg-surface-secondary text-text-muted hover:text-text-primary border border-transparent"
            }`}
          >
            {f === "all" ? "All" : f === "mine" ? "Mine" : f === "theirs" ? "Theirs" : "Overdue"}
          </button>
        ))}
        <select
          value={dealFilter ?? ""}
          onChange={(e) => setDealFilter(e.target.value || null)}
          className="rounded-full border border-border-primary bg-surface-secondary px-3 py-1 text-xs text-text-secondary"
        >
          <option value="">All deals</option>
          {deals.map((d) => (
            <option key={d.deal_id} value={d.deal_id}>{d.company}</option>
          ))}
        </select>
      </div>

      {/* Task groups */}
      {overdue.length > 0 && (
        <TaskGroup
          title="Overdue"
          tasks={overdue}
          titleClass="text-status-red"
          onToggle={toggleTask}
        />
      )}
      {dueToday.length > 0 && (
        <TaskGroup
          title="Due Today"
          tasks={dueToday}
          titleClass="text-status-yellow"
          onToggle={toggleTask}
        />
      )}
      {dueThisWeek.length > 0 && (
        <TaskGroup
          title="Due This Week"
          tasks={dueThisWeek}
          onToggle={toggleTask}
        />
      )}
      {later.length > 0 && (
        <TaskGroup
          title="Later / No Date"
          tasks={later}
          onToggle={toggleTask}
        />
      )}

      {filtered.length === 0 && (
        <div className="rounded-lg border border-border-primary bg-surface-secondary p-8 text-center">
          <p className="text-sm text-text-muted">No open tasks. Nice work.</p>
        </div>
      )}

      {/* Completed (collapsed) */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary"
          >
            <svg
              className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="mt-2 space-y-1">
              {completed.map((task) => (
                <TaskRow key={task.task_id} task={task} onToggle={toggleTask} completed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskGroup({
  title,
  tasks,
  titleClass = "text-text-muted",
  onToggle,
}: {
  title: string;
  tasks: UserTaskWithDeal[];
  titleClass?: string;
  onToggle: (id: string, status: string) => void;
}) {
  return (
    <section>
      <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${titleClass}`}>
        {title} ({tasks.length})
      </h2>
      <div className="space-y-1">
        {tasks.map((task) => (
          <TaskRow key={task.task_id} task={task} onToggle={onToggle} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({
  task,
  onToggle,
  completed = false,
}: {
  task: UserTaskWithDeal;
  onToggle: (id: string, status: string) => void;
  completed?: boolean;
}) {
  const overdue = isOverdue(task);
  const company = task.deals?.company;
  const threadTitle = task.coaching_threads?.title;

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/5 ${
        completed ? "opacity-50" : ""
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.task_id, task.status)}
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
          completed
            ? "border-brand-500 bg-brand-500/20 text-brand-500"
            : overdue
              ? "border-status-red hover:bg-status-red/10"
              : "border-border-primary hover:border-brand-500"
        }`}
      >
        {completed && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${completed ? "line-through text-text-muted" : "text-text-primary"}`}>
          {task.description}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {company && (
            <Link
              href={`/deals/${task.deal_id}`}
              className="text-xs text-brand-500 hover:underline"
            >
              {company}
            </Link>
          )}
          {threadTitle && (
            <Link
              href={`/coach/${task.thread_id}`}
              className="text-xs text-text-muted hover:text-text-secondary"
            >
              {threadTitle}
            </Link>
          )}
          {sourceBadge(task.source)}
          {escalationDot(task.escalation_level)}
          {task.owner === "them" && <Badge variant="gray">Them</Badge>}
        </div>
      </div>

      {/* Due date */}
      {task.due_date && (
        <span
          className={`shrink-0 text-xs ${
            overdue
              ? "text-status-red font-medium"
              : isDueToday(task)
                ? "text-status-yellow"
                : "text-text-muted"
          }`}
        >
          {formatDate(task.due_date)}
        </span>
      )}
    </div>
  );
}
