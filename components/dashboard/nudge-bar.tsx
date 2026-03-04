"use client";

import { useState, useEffect } from "react";
import type { Nudge } from "@/types/database";

interface NudgeBarProps {
  hasAiAccess: boolean;
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-l-status-red bg-status-red/5",
  high: "border-l-status-yellow bg-status-yellow/5",
  medium: "border-l-accent-primary bg-accent-primary/5",
  low: "border-l-text-muted bg-surface-tertiary",
};

export function NudgeBar({ hasAiAccess }: NudgeBarProps) {
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!hasAiAccess) return;

    const controller = new AbortController();

    async function fetchNudges() {
      try {
        const res = await fetch("/api/nudges?status=pending&limit=3", {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setNudges(data.nudges ?? []);

          // Mark as shown (fire-and-forget)
          for (const nudge of data.nudges ?? []) {
            if (nudge.status === "pending") {
              fetch(`/api/nudges/${nudge.nudge_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "shown" }),
                signal: controller.signal,
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("[NudgeBar] Failed to fetch nudges:", err);
      } finally {
        setLoaded(true);
      }
    }

    fetchNudges();
    return () => controller.abort();
  }, [hasAiAccess]);

  async function handleDismiss(nudgeId: string) {
    const prev = nudges;
    setNudges((p) => p.filter((n) => n.nudge_id !== nudgeId));
    try {
      const res = await fetch(`/api/nudges/${nudgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "dismissed" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setNudges(prev); // Roll back on failure
    }
  }

  async function handleAct(nudge: Nudge) {
    // Remove from UI first (navigation may follow)
    setNudges((prev) => prev.filter((n) => n.nudge_id !== nudge.nudge_id));
    try {
      await fetch(`/api/nudges/${nudge.nudge_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "acted_on" }),
      });
    } catch {
      // Best-effort — navigation is about to happen
    }
    // Only allow same-origin relative path navigation
    if (nudge.action_url && nudge.action_url.startsWith("/")) {
      window.location.href = nudge.action_url;
    }
  }

  // Don't render anything if no nudges or not loaded or no access
  if (!hasAiAccess || !loaded || nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      {nudges.map((nudge) => (
        <div
          key={nudge.nudge_id}
          className={`flex items-start justify-between rounded-lg border-l-4 px-4 py-3 ${PRIORITY_STYLES[nudge.priority] ?? PRIORITY_STYLES.medium}`}
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              {nudge.title}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">
              {nudge.message}
            </p>
          </div>
          <div className="ml-3 flex shrink-0 gap-1">
            {nudge.action_url && (
              <button
                onClick={() => handleAct(nudge)}
                aria-label={`Act on: ${nudge.title}`}
                className="rounded px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10"
              >
                Act
              </button>
            )}
            <button
              onClick={() => handleDismiss(nudge.nudge_id)}
              className="rounded px-2 py-1 text-xs text-text-muted hover:bg-surface-tertiary"
              aria-label="Dismiss nudge"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
