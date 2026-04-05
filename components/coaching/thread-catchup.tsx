"use client";

import { useState, useEffect } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type { UserTask } from "@/types/database";

interface ThreadCatchupProps {
  threadId: string;
  messageCount: number;
  /** Pre-loaded catchup from the server — shown immediately without a network round-trip. */
  initialCatchup?: string | null;
}

export function ThreadCatchup({ threadId, messageCount, initialCatchup }: ThreadCatchupProps) {
  const [catchup, setCatchup] = useState<string | null>(initialCatchup ?? null);
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reset state when thread changes
  useEffect(() => {
    setDismissed(false);
    setCatchup(initialCatchup ?? null);
    setTasks([]);
  }, [threadId, initialCatchup]);

  // Fetch catchup text
  useEffect(() => {
    if (initialCatchup) return;
    if (messageCount < 2) return;

    setLoading(true);
    fetch(`/api/coaching/threads/${threadId}/catchup`)
      .then((res) => res.json())
      .then((data) => {
        if (data.catchup) {
          setCatchup(data.catchup);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [threadId, messageCount, initialCatchup]);

  // Fetch open tasks for this thread
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

  const hasCatchup = !loading && catchup;
  const hasTasks = tasks.length > 0;

  if (dismissed || (!loading && !hasCatchup && !hasTasks)) return null;

  return (
    <div className="mx-4 mb-4 rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent-primary">
            Where we left off
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent-primary" />
              Loading catch-up...
            </div>
          ) : (
            <>
              {catchup && (
                <div
                  className="prose prose-sm max-w-none text-text-secondary
                    prose-headings:text-text-primary prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1
                    prose-p:text-text-secondary prose-p:text-xs prose-p:my-1
                    prose-li:text-text-secondary prose-li:text-xs
                    prose-strong:text-text-primary prose-strong:font-medium
                    prose-ul:my-1 prose-ol:my-1"
                  dangerouslySetInnerHTML={{
                    __html: formatAgentHtml(catchup),
                  }}
                />
              )}
              {hasTasks && (
                <div className={catchup ? "mt-3 pt-3 border-t border-accent-primary/15" : ""}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-primary/70">
                    Open Tasks
                  </p>
                  <ul className="space-y-1">
                    {tasks.map((task) => (
                      <li key={task.task_id} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="mt-0.5 shrink-0 h-3.5 w-3.5 rounded border border-border-primary bg-surface-tertiary" />
                        <span className="flex-1">
                          {task.description}
                          {task.due_date && (
                            <span className={`ml-1.5 text-[10px] ${
                              new Date(task.due_date) < new Date() ? "text-status-red" : "text-text-muted"
                            }`}>
                              Due {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-text-muted transition-colors hover:text-text-primary"
          aria-label="Dismiss catch-up"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 3l8 8M11 3L3 11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
