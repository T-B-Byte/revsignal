"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TimelineEntry {
  id: string;
  type: "coaching" | "conversation" | "task_completed";
  date: string;
  thread_id?: string;
  thread_title?: string;
  role?: string;
  content: string;
  channel?: string;
  interaction_type?: string;
}

interface DealTimelineProps {
  dealId: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function typeIcon(type: string) {
  switch (type) {
    case "coaching":
      return (
        <svg className="h-4 w-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      );
    case "conversation":
      return (
        <svg className="h-4 w-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      );
    case "task_completed":
      return (
        <svg className="h-4 w-4 text-status-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
}

function typeLabel(entry: TimelineEntry): string {
  if (entry.type === "coaching") {
    if (entry.role === "user") return "You";
    return "Strategist";
  }
  if (entry.type === "conversation") {
    return entry.channel ? entry.channel.replace(/_/g, " ") : "Conversation";
  }
  return "Task completed";
}

export function DealTimeline({ dealId }: DealTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/deals/${dealId}/timeline`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.entries ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [dealId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-surface-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-8 text-center">
        <p className="text-sm text-text-muted">No activity yet for this deal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className="group flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-white/5 transition-colors"
        >
          <div className="mt-0.5 shrink-0">{typeIcon(entry.type)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-text-secondary capitalize">
                {typeLabel(entry)}
              </span>
              {entry.thread_title && entry.thread_id && (
                <Link
                  href={`/coach/${entry.thread_id}`}
                  className="text-xs text-brand-500 hover:underline truncate max-w-48"
                >
                  {entry.thread_title}
                </Link>
              )}
              <span className="text-xs text-text-muted ml-auto shrink-0">
                {formatDate(entry.date)}
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              {entry.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
