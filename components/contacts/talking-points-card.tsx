"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { TalkingPointWithThread } from "@/types/database";

interface TalkingPointsCardProps {
  contactId: string;
  initialPoints: TalkingPointWithThread[];
}

export function TalkingPointsCard({
  contactId,
  initialPoints,
}: TalkingPointsCardProps) {
  const [points, setPoints] = useState<TalkingPointWithThread[]>(initialPoints);
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openPoints = points.filter((p) => !p.is_completed);
  const completedPoints = points.filter((p) => p.is_completed);

  const addPoint = useCallback(async () => {
    const content = newContent.trim();
    if (!content) return;

    setAdding(true);
    setNewContent("");

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const tempPoint: TalkingPointWithThread = {
      id: tempId,
      user_id: "",
      contact_id: contactId,
      thread_id: null,
      content,
      priority: openPoints.length,
      source: "manual",
      is_completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    setPoints((prev) => [...prev, tempPoint]);

    try {
      const res = await fetch(`/api/contacts/${contactId}/talking-points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, priority: openPoints.length }),
      });

      if (res.ok) {
        const created = await res.json();
        setPoints((prev) =>
          prev.map((p) => (p.id === tempId ? created : p))
        );
      } else {
        // Remove optimistic
        setPoints((prev) => prev.filter((p) => p.id !== tempId));
      }
    } catch {
      setPoints((prev) => prev.filter((p) => p.id !== tempId));
    } finally {
      setAdding(false);
      inputRef.current?.focus();
    }
  }, [newContent, contactId, openPoints.length]);

  const toggleComplete = useCallback(
    async (point: TalkingPointWithThread) => {
      const newCompleted = !point.is_completed;

      // Optimistic
      setPoints((prev) =>
        prev.map((p) =>
          p.id === point.id
            ? {
                ...p,
                is_completed: newCompleted,
                completed_at: newCompleted
                  ? new Date().toISOString()
                  : null,
              }
            : p
        )
      );

      try {
        const res = await fetch(
          `/api/contacts/${contactId}/talking-points/${point.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_completed: newCompleted }),
          }
        );

        if (res.ok) {
          const updated = await res.json();
          setPoints((prev) =>
            prev.map((p) => (p.id === point.id ? updated : p))
          );
        } else {
          // Revert
          setPoints((prev) =>
            prev.map((p) =>
              p.id === point.id
                ? { ...p, is_completed: !newCompleted, completed_at: point.completed_at }
                : p
            )
          );
        }
      } catch {
        setPoints((prev) =>
          prev.map((p) =>
            p.id === point.id
              ? { ...p, is_completed: !newCompleted, completed_at: point.completed_at }
              : p
          )
        );
      }
    },
    [contactId]
  );

  const deletePoint = useCallback(
    async (pointId: string) => {
      const removed = points.find((p) => p.id === pointId);
      setPoints((prev) => prev.filter((p) => p.id !== pointId));

      try {
        const res = await fetch(
          `/api/contacts/${contactId}/talking-points/${pointId}`,
          { method: "DELETE" }
        );

        if (!res.ok && removed) {
          setPoints((prev) => [...prev, removed]);
        }
      } catch {
        if (removed) {
          setPoints((prev) => [...prev, removed]);
        }
      }
    },
    [contactId, points]
  );

  const movePriority = useCallback(
    async (pointId: string, direction: "up" | "down") => {
      const idx = openPoints.findIndex((p) => p.id === pointId);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= openPoints.length) return;

      const a = openPoints[idx];
      const b = openPoints[swapIdx];

      // Optimistic reorder
      setPoints((prev) =>
        prev.map((p) => {
          if (p.id === a.id) return { ...p, priority: b.priority };
          if (p.id === b.id) return { ...p, priority: a.priority };
          return p;
        })
      );

      // Persist both priority changes
      await Promise.all([
        fetch(`/api/contacts/${contactId}/talking-points/${a.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: b.priority }),
        }),
        fetch(`/api/contacts/${contactId}/talking-points/${b.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: a.priority }),
        }),
      ]);
    },
    [contactId, openPoints]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Talk About
          {openPoints.length > 0 && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              ({openPoints.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Open talking points */}
        {openPoints.length === 0 && (
          <p className="text-sm text-text-muted py-2 text-center">
            No talking points yet.
          </p>
        )}
        <ul className="space-y-1">
          {openPoints
            .sort((a, b) => a.priority - b.priority)
            .map((point, idx) => (
              <li
                key={point.id}
                className="group flex items-start gap-2 rounded-md px-1 py-1.5 -mx-1 hover:bg-surface-tertiary transition-colors"
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleComplete(point)}
                  className="mt-0.5 flex-shrink-0 h-4 w-4 rounded border border-border-primary hover:border-accent-primary transition-colors"
                  title="Mark as discussed"
                />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary leading-snug">
                    {point.content}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {point.source === "strategist" && (
                      <span className="text-[10px] font-medium text-purple-400">
                        Strategist
                      </span>
                    )}
                    {point.coaching_threads && (
                      <Link
                        href={`/coach/${point.coaching_threads.thread_id}`}
                        className="text-[10px] text-accent-primary hover:underline truncate max-w-[140px]"
                        title={point.coaching_threads.title}
                      >
                        {point.coaching_threads.title}
                      </Link>
                    )}
                  </div>
                </div>

                {/* Priority arrows + delete */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      onClick={() => movePriority(point.id, "up")}
                      className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                      title="Move up"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 15l-6-6-6 6" />
                      </svg>
                    </button>
                  )}
                  {idx < openPoints.length - 1 && (
                    <button
                      onClick={() => movePriority(point.id, "down")}
                      className="p-0.5 text-text-muted hover:text-text-primary transition-colors"
                      title="Move down"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => deletePoint(point.id)}
                    className="p-0.5 text-text-muted hover:text-status-red transition-colors"
                    title="Remove"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
        </ul>

        {/* Inline add */}
        <div className="flex items-center gap-2 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPoint();
              }
            }}
            placeholder="Add talking point…"
            maxLength={500}
            disabled={adding}
            className="flex-1 rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>

        {/* Completed items */}
        {completedPoints.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
            >
              {showCompleted ? "Hide" : "Show"} completed ({completedPoints.length})
            </button>
            {showCompleted && (
              <ul className="mt-1 space-y-1">
                {completedPoints.map((point) => (
                  <li
                    key={point.id}
                    className="group flex items-start gap-2 rounded-md px-1 py-1 -mx-1"
                  >
                    <button
                      onClick={() => toggleComplete(point)}
                      className="mt-0.5 flex-shrink-0 h-4 w-4 rounded border border-border-primary bg-accent-primary/20 flex items-center justify-center transition-colors"
                      title="Mark as not discussed"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </button>
                    <p className="text-sm text-text-muted line-through">
                      {point.content}
                    </p>
                    <button
                      onClick={() => deletePoint(point.id)}
                      className="ml-auto p-0.5 text-text-muted hover:text-status-red opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
