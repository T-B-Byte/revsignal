"use client";

import { useState, useEffect, useMemo } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type { UserTask } from "@/types/database";

/** Split catchup HTML into logical sections (one per <p> block). */
function splitIntoSections(html: string): string[] {
  // Split on <p> tags — each paragraph is a section
  const parts = html.split(/<\/?p[^>]*>/i).filter((s) => s.trim().length > 0);
  return parts;
}

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
  const [crossedOut, setCrossedOut] = useState<Set<number>>(new Set());

  // Reset state when thread changes
  useEffect(() => {
    setDismissed(false);
    setCatchup(initialCatchup ?? null);
    setTasks([]);
    setCrossedOut(new Set());
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

  const sections = useMemo(() => (catchup ? splitIntoSections(formatAgentHtml(catchup)) : []), [catchup]);

  const toggleSection = (index: number) => {
    setCrossedOut((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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
              {catchup && sections.length > 0 && (
                <div className="space-y-0.5">
                  {sections.map((sectionHtml, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSection(i)}
                      className={`group block w-full cursor-pointer rounded px-1.5 py-1 text-left transition-colors hover:bg-accent-primary/10
                        prose prose-sm max-w-none
                        prose-headings:text-text-primary prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-0 prose-headings:mb-0
                        prose-p:text-xs prose-p:my-0
                        prose-li:text-xs
                        prose-strong:font-medium
                        prose-ul:my-1 prose-ol:my-1
                        ${crossedOut.has(i)
                          ? "prose-p:text-text-muted prose-strong:text-text-muted prose-li:text-text-muted line-through opacity-50"
                          : "prose-p:text-text-secondary prose-strong:text-text-primary prose-li:text-text-secondary"
                        }`}
                      aria-label={crossedOut.has(i) ? "Mark as not done" : "Mark as done"}
                      dangerouslySetInnerHTML={{ __html: `<p>${sectionHtml}</p>` }}
                    />
                  ))}
                </div>
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
