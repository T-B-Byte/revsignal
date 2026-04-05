"use client";

import { useState } from "react";
import { DealTimeline } from "./deal-timeline";
import { TasksView } from "@/components/tasks/tasks-view";
import { ContradictionAlert } from "@/components/coaching/contradiction-alert";
import { DealKnowledge } from "./deal-knowledge";
import type { UserTaskWithDeal, Deal, CoachingThread, DealInsightWithThread } from "@/types/database";

type Tab = "overview" | "timeline" | "threads" | "tasks" | "knowledge";

type EnrichedThread = Pick<CoachingThread, "thread_id" | "title" | "last_message_at" | "message_count" | "is_archived" | "thread_brief" | "participants"> & {
  open_follow_up_count: number;
  has_overdue: boolean;
  open_task_count: number;
};

interface DealHubProps {
  dealId: string;
  company: string;
  /** The original overview content (passed as children) */
  children: React.ReactNode;
  /** Threads linked to this deal, enriched with follow-up/task counts */
  threads: EnrichedThread[];
  /** Tasks for this deal */
  tasks: UserTaskWithDeal[];
  /** Active deals for task creation */
  deals: Pick<Deal, "deal_id" | "company" | "stage">[];
  /** Persistent insights from Strategist analysis */
  insights?: DealInsightWithThread[];
}

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "timeline", label: "Timeline" },
  { key: "threads", label: "Threads" },
  { key: "tasks", label: "Tasks" },
  { key: "knowledge", label: "Knowledge" },
];

export function DealHub({ dealId, company, children, threads, tasks, deals, insights = [] }: DealHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const activeThreads = threads.filter((t) => !t.is_archived);
  const openTaskCount = tasks.filter((t) => t.status === "open").length;
  const activeInsightCount = insights.filter((i) => i.is_active).length;

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border-primary">
        {TABS.map((tab) => {
          const count =
            tab.key === "threads" ? activeThreads.length :
            tab.key === "tasks" ? openTaskCount :
            tab.key === "knowledge" ? activeInsightCount :
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
      {activeTab === "overview" && (
        <div className="space-y-4">
          <ContradictionAlert dealId={dealId} />
          {children}
        </div>
      )}

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

      {activeTab === "knowledge" && (
        <DealKnowledge dealId={dealId} insights={insights} />
      )}
    </div>
  );
}

/**
 * Rank threads for the deal hub Threads tab:
 * 1. Has overdue follow-ups (top priority)
 * 2. Has open follow-ups (needs attention)
 * 3. Has open tasks
 * 4. Most recent activity
 */
function rankThreads(threads: EnrichedThread[]): EnrichedThread[] {
  return [...threads].sort((a, b) => {
    // Overdue follow-ups always surface first
    if (a.has_overdue !== b.has_overdue) return a.has_overdue ? -1 : 1;
    // Then threads with open follow-ups
    const aHasFollowUps = a.open_follow_up_count > 0;
    const bHasFollowUps = b.open_follow_up_count > 0;
    if (aHasFollowUps !== bHasFollowUps) return aHasFollowUps ? -1 : 1;
    // Then threads with open tasks
    const aHasTasks = a.open_task_count > 0;
    const bHasTasks = b.open_task_count > 0;
    if (aHasTasks !== bHasTasks) return aHasTasks ? -1 : 1;
    // Finally by most recent activity
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });
}

// Enhanced thread cards with ranking, briefs, and "Continue" CTA
function DealThreadsEnhanced({
  threads,
  dealId,
  company,
}: {
  threads: EnrichedThread[];
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

  const ranked = rankThreads(threads);

  return (
    <div className="space-y-3">
      {ranked.map((thread) => {
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

        const needsAttention = thread.has_overdue || thread.open_follow_up_count > 0;

        return (
          <div
            key={thread.thread_id}
            className={`rounded-lg border bg-surface-secondary p-4 transition-colors ${
              thread.has_overdue
                ? "border-status-red/40 hover:border-status-red/60"
                : needsAttention
                  ? "border-status-yellow/40 hover:border-status-yellow/60"
                  : "border-border-primary hover:border-brand-500/30"
            }`}
          >
            {/* Strategist suggests label for threads needing action */}
            {thread.has_overdue && (
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-status-red">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Strategist suggests: overdue follow-ups
              </div>
            )}
            {!thread.has_overdue && thread.open_follow_up_count > 0 && (
              <div className="flex items-center gap-1.5 mb-2 text-xs font-medium text-status-yellow">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {thread.open_follow_up_count} open follow-up{thread.open_follow_up_count !== 1 ? "s" : ""}
              </div>
            )}

            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-text-primary truncate">
                  {thread.title}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-text-muted flex-wrap">
                  {participantNames && <span>{participantNames}</span>}
                  {lastActive && <span>Last active {lastActive}</span>}
                  <span>{thread.message_count} messages</span>
                  {thread.open_task_count > 0 && (
                    <span className="text-status-green">{thread.open_task_count} open task{thread.open_task_count !== 1 ? "s" : ""}</span>
                  )}
                </div>
              </div>
              <a
                href={`/coach/${thread.thread_id}`}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  thread.has_overdue
                    ? "bg-status-red/10 text-status-red hover:bg-status-red/20"
                    : "bg-brand-500/10 text-brand-500 hover:bg-brand-500/20"
                }`}
              >
                {needsAttention ? "Continue this conversation" : "Continue"}
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
