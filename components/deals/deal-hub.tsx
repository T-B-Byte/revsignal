"use client";

import { useState } from "react";
import { DealTimeline } from "./deal-timeline";
import { TasksView } from "@/components/tasks/tasks-view";
import type { UserTaskWithDeal, Deal, CoachingThread } from "@/types/database";

type Tab = "overview" | "timeline" | "threads" | "tasks";

interface DealHubProps {
  dealId: string;
  company: string;
  /** The original overview content (passed as children) */
  children: React.ReactNode;
  /** Threads linked to this deal */
  threads: Pick<CoachingThread, "thread_id" | "title" | "last_message_at" | "message_count" | "is_archived" | "thread_brief" | "participants">[];
  /** Tasks for this deal */
  tasks: UserTaskWithDeal[];
  /** Active deals for task creation */
  deals: Pick<Deal, "deal_id" | "company" | "stage">[];
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "threads", label: "Threads" },
  { key: "tasks", label: "Tasks" },
];

export function DealHub({ dealId, company, children, threads, tasks, deals }: DealHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const activeThreads = threads.filter((t) => !t.is_archived);
  const openTaskCount = tasks.filter((t) => t.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-primary">
        {TABS.map((tab) => {
          const count =
            tab.key === "threads" ? activeThreads.length :
            tab.key === "tasks" ? openTaskCount :
            null;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-brand-500 text-brand-500"
                  : "border-transparent text-text-muted hover:text-text-primary"
              }`}
            >
              {tab.label}
              {count !== null && count > 0 && (
                <span className="ml-1.5 text-xs text-text-muted">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && children}

      {activeTab === "timeline" && (
        <DealTimeline dealId={dealId} />
      )}

      {activeTab === "threads" && (
        <DealThreadsEnhanced
          threads={activeThreads}
          dealId={dealId}
          company={company}
        />
      )}

      {activeTab === "tasks" && (
        <TasksView tasks={tasks} deals={deals} />
      )}
    </div>
  );
}

// Enhanced thread cards with briefs and "Continue" CTA
function DealThreadsEnhanced({
  threads,
  dealId,
  company,
}: {
  threads: Pick<CoachingThread, "thread_id" | "title" | "last_message_at" | "message_count" | "thread_brief" | "participants">[];
  dealId: string;
  company: string;
}) {
  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-8 text-center">
        <p className="text-sm text-text-muted">No threads linked to this deal yet.</p>
        <a
          href={`/coach?new=1&deal_id=${dealId}&company=${encodeURIComponent(company)}`}
          className="mt-2 inline-block text-sm text-brand-500 hover:underline"
        >
          Start a conversation with the Strategist
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => {
        const briefExcerpt = thread.thread_brief
          ? thread.thread_brief.length > 200
            ? thread.thread_brief.slice(0, 200) + "..."
            : thread.thread_brief
          : null;

        const lastActive = thread.last_message_at
          ? new Date(thread.last_message_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : null;

        const participantNames = (thread.participants ?? [])
          .map((p) => p.name)
          .slice(0, 3)
          .join(", ");

        return (
          <div
            key={thread.thread_id}
            className="rounded-lg border border-border-primary bg-surface-secondary p-4 hover:border-brand-500/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary truncate">
                  {thread.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                  {participantNames && <span>{participantNames}</span>}
                  {lastActive && <span>Last active {lastActive}</span>}
                  <span>{thread.message_count} messages</span>
                </div>
              </div>
              <a
                href={`/coach/${thread.thread_id}`}
                className="shrink-0 rounded-md bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-500/20 transition-colors"
              >
                Continue
              </a>
            </div>
            {briefExcerpt && (
              <p className="mt-2 text-xs text-text-muted leading-relaxed">
                {briefExcerpt}
              </p>
            )}
          </div>
        );
      })}

      <a
        href={`/coach?new=1&deal_id=${dealId}&company=${encodeURIComponent(company)}`}
        className="block rounded-lg border border-dashed border-border-primary p-3 text-center text-xs text-text-muted hover:border-brand-500/30 hover:text-brand-500 transition-colors"
      >
        + New thread for {company}
      </a>
    </div>
  );
}
