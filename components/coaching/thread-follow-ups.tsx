"use client";

import { useState, useEffect, useCallback } from "react";
import type { ThreadFollowUp } from "@/types/database";

interface ThreadFollowUpsProps {
  threadId: string;
}

export function ThreadFollowUps({ threadId }: ThreadFollowUpsProps) {
  const [followUps, setFollowUps] = useState<ThreadFollowUp[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await fetch(`/api/coaching/threads/${threadId}/follow-ups`);
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data);
      }
    } catch {
      // Silent fail
    }
  }, [threadId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  async function handleToggle(followUpId: string, status: "completed" | "dismissed") {
    try {
      const res = await fetch(
        `/api/coaching/threads/${threadId}/follow-ups/${followUpId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        setFollowUps((prev) => prev.filter((fu) => fu.follow_up_id !== followUpId));
      }
    } catch {
      // Silent fail
    }
  }

  if (followUps.length === 0) return null;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="mx-4 mb-3 rounded-lg border border-border-primary bg-surface-tertiary">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-3 py-2"
      >
        <span className="text-xs font-semibold text-text-secondary">
          Open Follow-ups ({followUps.length})
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={`text-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
        >
          <path d="M3 4.5l3 3 3-3" />
        </svg>
      </button>

      {!collapsed && (
        <div className="space-y-1 px-3 pb-2">
          {followUps.map((fu) => {
            const isOverdue = fu.due_date && fu.due_date < today;

            return (
              <div
                key={fu.follow_up_id}
                className="flex items-start gap-2 rounded-md px-1 py-1"
              >
                <button
                  onClick={() => handleToggle(fu.follow_up_id, "completed")}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border border-border-primary transition-colors hover:border-accent-primary hover:bg-accent-primary/10"
                  title="Mark complete"
                  aria-label={`Complete: ${fu.description}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-text-secondary">{fu.description}</p>
                  {fu.due_date && (
                    <p
                      className={`text-[10px] ${
                        isOverdue ? "font-medium text-status-red" : "text-text-muted"
                      }`}
                    >
                      {isOverdue ? "Overdue: " : "Due: "}
                      {fu.due_date}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(fu.follow_up_id, "dismissed")}
                  className="shrink-0 text-text-muted transition-colors hover:text-text-secondary"
                  title="Dismiss"
                  aria-label={`Dismiss: ${fu.description}`}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M2 2l6 6M8 2L2 8" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
