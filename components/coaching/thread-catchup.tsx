"use client";

import { useState, useEffect } from "react";
import type { UserTask } from "@/types/database";

interface ThreadCatchupProps {
  threadId: string;
}

export function ThreadCatchup({ threadId }: ThreadCatchupProps) {
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(false);
    setTasks([]);
  }, [threadId]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/tasks?thread_id=${threadId}&status=open`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.tasks) setTasks(data.tasks);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [threadId]);

  async function handleComplete(taskId: string) {
    setTogglingId(taskId);
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.task_id !== taskId));
    try {
      const res = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: taskId, status: "done" }),
      });
      if (!res.ok) {
        setTasks(previous);
      }
    } catch {
      setTasks(previous);
    } finally {
      setTogglingId(null);
    }
  }

  if (dismissed || tasks.length === 0) return null;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-primary">
            Open Tasks
          </p>
          <ul className="space-y-1">
            {tasks.map((task) => {
              const isOverdue = task.due_date ? new Date(task.due_date) < new Date() : false;
              return (
                <li key={task.task_id} className="flex items-start gap-2 text-xs text-text-secondary">
                  <button
                    type="button"
                    onClick={() => handleComplete(task.task_id)}
                    disabled={togglingId === task.task_id}
                    aria-label={`Mark complete: ${task.description}`}
                    title="Mark complete"
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-border-primary bg-surface-tertiary transition-colors hover:border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
                  />
                  <span className="flex-1">
                    {task.description}
                    {task.due_date && (
                      <span className={`ml-1.5 text-[10px] ${isOverdue ? "text-status-red" : "text-text-muted"}`}>
                        Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
          aria-label="Dismiss"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 3l8 8M11 3L3 11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
