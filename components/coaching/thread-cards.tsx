"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { CoachingThreadWithDeal } from "@/types/database";

interface ThreadCardsProps {
  threads: CoachingThreadWithDeal[];
}

export function ThreadCards({ threads }: ThreadCardsProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("");

  // Collect all unique participants across threads
  const allPeople = useMemo(() => {
    const nameSet = new Set<string>();
    for (const t of threads) {
      if (t.participants) {
        for (const p of t.participants) {
          nameSet.add(p.name);
        }
      }
      if (t.contact_name) nameSet.add(t.contact_name);
    }
    return [...nameSet].sort((a, b) => a.localeCompare(b));
  }, [threads]);

  // Group threads by company
  const groupedFiltered = useMemo(() => {
    const activeThreads = threads.filter((t) => !t.is_archived);

    const filtered = activeThreads.filter((t) => {
      // Person filter
      if (personFilter) {
        const hasPerson =
          t.contact_name?.toLowerCase() === personFilter.toLowerCase() ||
          t.participants?.some(
            (p) => p.name.toLowerCase() === personFilter.toLowerCase()
          );
        if (!hasPerson) return false;
      }

      // Text search
      if (search) {
        const q = search.toLowerCase();
        const match =
          t.title?.toLowerCase().includes(q) ||
          t.company?.toLowerCase().includes(q) ||
          t.contact_name?.toLowerCase().includes(q) ||
          t.thread_brief?.toLowerCase().includes(q) ||
          t.participants?.some(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.role?.toLowerCase().includes(q)
          );
        if (!match) return false;
      }

      return true;
    });

    // Group by company
    const map = new Map<string, CoachingThreadWithDeal[]>();
    for (const t of filtered) {
      const key = t.company || "General";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === "General") return 1;
        if (b === "General") return -1;
        return a.localeCompare(b);
      })
      .map(([company, threads]) => ({ company, threads }));
  }, [threads, search, personFilter]);

  const totalShown = groupedFiltered.reduce((sum, g) => sum + g.threads.length, 0);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-surface-secondary px-4 py-3">
        {/* Person filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Person
          </span>
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            className="rounded-lg border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">All people</option>
            {allPeople.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="h-6 w-px bg-border-primary" />

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search threads..."
          className="w-48 rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />

        <div className="flex-1" />

        <span className="text-xs text-text-muted">
          {totalShown} thread{totalShown !== 1 ? "s" : ""}
        </span>

        {(search || personFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setPersonFilter("");
            }}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Thread cards */}
      <div className="flex-1 overflow-y-auto">
        {groupedFiltered.length === 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            {search || personFilter
              ? "No threads match your filters."
              : "No active threads. Start a new conversation from the sidebar."}
          </div>
        )}

        {groupedFiltered.map(({ company, threads: companyThreads }) => (
          <div key={company} className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted px-1">
              {company}
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {companyThreads.map((thread) => (
                <ThreadCard
                  key={thread.thread_id}
                  thread={thread}
                  onOpen={() => router.push(`/coach/${thread.thread_id}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Project status colors matching the Projects section
const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

// Default left border color for threads not linked to a project
const DEFAULT_BORDER_COLOR = "#3b82f6";

function ThreadCard({
  thread,
  onOpen,
}: {
  thread: CoachingThreadWithDeal;
  onOpen: () => void;
}) {
  const hasOverdue = thread.has_overdue;
  const followUpCount = thread.open_follow_up_count ?? 0;
  const taskCount = thread.open_task_count ?? 0;
  const lastMessageDate = thread.last_message_at ? new Date(thread.last_message_at) : null;
  const daysSinceActivity = lastMessageDate && !isNaN(lastMessageDate.getTime())
    ? Math.floor((Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = thread.deal_id && daysSinceActivity >= 7;

  // Determine left border color: use project status color if linked, else default
  const project = thread.projects;
  const borderColor = project
    ? PROJECT_STATUS_COLORS[project.status] ?? DEFAULT_BORDER_COLOR
    : DEFAULT_BORDER_COLOR;

  return (
    <div
      className="group cursor-pointer rounded-none border-l-4 bg-surface-secondary transition-shadow hover:shadow-md"
      style={{ borderLeftColor: borderColor }}
      onClick={onOpen}
    >
      <div className="px-5 py-4">
        {/* Header row: title + status indicators */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-text-primary leading-tight truncate">
              {thread.title}
            </h4>
            {thread.deals && (
              <p className="mt-0.5 text-xs text-accent-primary truncate">
                {thread.deals.company}
                <span className="ml-1 text-text-muted">
                  ({thread.deals.stage.replace(/_/g, " ")})
                </span>
              </p>
            )}
            {thread.ma_entities && (
              <p className="mt-0.5 text-xs text-purple-400 truncate">
                {thread.ma_entities.company}
                <span className="ml-1 text-text-muted">
                  ({thread.ma_entities.entity_type} &middot; {thread.ma_entities.stage})
                </span>
              </p>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasOverdue && (
              <span className="h-2 w-2 rounded-full bg-status-red" title="Overdue follow-up" />
            )}
            {followUpCount > 0 && !hasOverdue && (
              <span
                className="rounded-full bg-status-yellow/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-yellow"
                title={`${followUpCount} open follow-up${followUpCount > 1 ? "s" : ""}`}
              >
                {followUpCount}
              </span>
            )}
            {taskCount > 0 && (
              <span
                className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                title={`${taskCount} open task${taskCount > 1 ? "s" : ""}`}
              >
                {taskCount}
              </span>
            )}
            {isStale && (
              <span className="rounded-full bg-status-red/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-red">
                Stale
              </span>
            )}
          </div>
        </div>

        {/* Project badge */}
        {project && (
          <div className="mb-3 flex items-center gap-2">
            <span
              className="shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
              style={{ backgroundColor: PROJECT_STATUS_COLORS[project.status] ?? "#6b7280" }}
            >
              {project.status.toUpperCase()}
            </span>
            <span className="text-[11px] font-medium text-text-secondary truncate">
              {project.name}
            </span>
            {project.category && (
              <span className="rounded bg-surface-tertiary px-1.5 py-0.5 text-[10px] text-text-muted">
                {project.category}
              </span>
            )}
          </div>
        )}

        {/* Where we left off (thread brief or catchup) */}
        {(thread.thread_brief || thread.catchup_text) && (
          <div className="mb-3 rounded-lg bg-surface-tertiary/50 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-accent-primary mb-1">
              Where you left off
            </p>
            <p className="text-xs text-text-secondary line-clamp-3 leading-relaxed">
              {thread.catchup_text || thread.thread_brief}
            </p>
          </div>
        )}

        {/* Team / participants */}
        {thread.participants && thread.participants.length > 0 && (
          <div className="border-t border-border-primary pt-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted mb-2">
              Team
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {thread.participants.map((p, i) => (
                <span key={i} className="inline-flex items-baseline gap-1.5">
                  <span className="text-[11px] font-bold text-text-primary">
                    {p.name}
                  </span>
                  {p.role && (
                    <span className="text-[10px] text-text-muted">{p.role}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer: last activity + message count */}
        <div className="mt-3 flex items-center justify-between text-[10px] text-text-muted">
          <span>
            {lastMessageDate && !isNaN(lastMessageDate.getTime())
              ? formatDistanceToNow(lastMessageDate, { addSuffix: true })
              : "unknown"}
          </span>
          <span>{thread.message_count ?? 0} message{(thread.message_count ?? 0) !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
