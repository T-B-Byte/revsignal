"use client";

import { useState, useEffect } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";

interface ThreadCatchupProps {
  threadId: string;
  messageCount: number;
}

export function ThreadCatchup({ threadId, messageCount }: ThreadCatchupProps) {
  const [catchup, setCatchup] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Reset state when thread changes
  useEffect(() => {
    setDismissed(false);
    setCatchup(null);
  }, [threadId]);

  useEffect(() => {
    // Only fetch catchup for threads with existing history
    if (messageCount < 2) return;

    setLoading(true);
    fetch(`/api/coaching/threads/${threadId}/catchup`)
      .then((res) => res.json())
      .then((data) => {
        if (data.catchup) {
          setCatchup(data.catchup);
        }
      })
      .catch(() => {
        // Silent fail on catchup
      })
      .finally(() => setLoading(false));
  }, [threadId, messageCount]);

  if (dismissed || (!loading && !catchup)) return null;

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
            catchup && (
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
            )
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
