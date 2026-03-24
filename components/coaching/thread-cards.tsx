"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { CoachingThreadWithDeal } from "@/types/database";

type ViewMode = "companies" | "projects" | "people";

interface ThreadCardsProps {
  threads: CoachingThreadWithDeal[];
}

export function ThreadCards({ threads }: ThreadCardsProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("companies");

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

  // Filter and group
  const groupedFiltered = useMemo(() => {
    const activeThreads = threads.filter((t) => !t.is_archived);

    const filtered = activeThreads.filter((t) => {
      if (personFilter) {
        const hasPerson =
          t.contact_name?.toLowerCase() === personFilter.toLowerCase() ||
          t.participants?.some(
            (p) => p.name.toLowerCase() === personFilter.toLowerCase()
          );
        if (!hasPerson) return false;
      }

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

    // Group based on view mode
    switch (viewMode) {
      case "projects":
        return groupByProject(filtered);
      case "people":
        return groupByPerson(filtered);
      case "companies":
      default:
        return groupByCompany(filtered);
    }
  }, [threads, search, personFilter, viewMode]);

  const totalShown = groupedFiltered.reduce((sum, g) => sum + g.threads.length, 0);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-primary bg-surface-secondary px-4 py-3">
        {/* View mode toggle */}
        <div className="flex rounded-lg border border-border-primary overflow-hidden">
          {(["companies", "projects", "people"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                viewMode === mode
                  ? "bg-accent-primary text-white"
                  : "bg-surface-primary text-text-muted hover:text-text-secondary"
              } ${mode !== "companies" ? "border-l border-border-primary" : ""}`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border-primary" />

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

        {groupedFiltered.map(({ label, sublabel, color, threads: groupThreads }) => (
          <div key={label} className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              {color && (
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                {label}
              </h3>
              {sublabel && (
                <span className="text-[10px] text-text-muted/60 font-normal normal-case">
                  {sublabel}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {groupThreads.map((thread) => (
                <ThreadCard
                  key={thread.thread_id}
                  thread={thread}
                  viewMode={viewMode}
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

// --- Grouping functions ---

interface ThreadGroup {
  label: string;
  sublabel?: string;
  color?: string;
  threads: CoachingThreadWithDeal[];
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

const DEFAULT_BORDER_COLOR = "#3b82f6";

function groupByCompany(threads: CoachingThreadWithDeal[]): ThreadGroup[] {
  const map = new Map<string, CoachingThreadWithDeal[]>();
  for (const t of threads) {
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
    .map(([company, threads]) => ({ label: company, threads }));
}

function groupByProject(threads: CoachingThreadWithDeal[]): ThreadGroup[] {
  const map = new Map<string, { threads: CoachingThreadWithDeal[]; status?: string; category?: string | null }>();

  for (const t of threads) {
    const project = t.projects;
    const key = project ? project.name : "No Project";
    if (!map.has(key)) {
      map.set(key, { threads: [], status: project?.status, category: project?.category });
    }
    map.get(key)!.threads.push(t);
  }

  return Array.from(map.entries())
    .sort(([a, aData], [b, bData]) => {
      if (a === "No Project") return 1;
      if (b === "No Project") return -1;
      const aActive = aData.status === "active" ? 0 : 1;
      const bActive = bData.status === "active" ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.localeCompare(b);
    })
    .map(([label, data]) => ({
      label,
      sublabel: data.category ?? undefined,
      color: data.status ? PROJECT_STATUS_COLORS[data.status] : undefined,
      threads: data.threads,
    }));
}

function groupByPerson(threads: CoachingThreadWithDeal[]): ThreadGroup[] {
  const map = new Map<string, { threads: CoachingThreadWithDeal[]; role?: string; company?: string }>();

  for (const t of threads) {
    const people = getPeopleFromThread(t);
    if (people.length === 0) {
      const key = "No Contact";
      if (!map.has(key)) map.set(key, { threads: [] });
      map.get(key)!.threads.push(t);
    } else {
      for (const person of people) {
        if (!map.has(person.name)) {
          map.set(person.name, { threads: [], role: person.role, company: person.company });
        }
        const group = map.get(person.name)!;
        if (!group.threads.some((existing) => existing.thread_id === t.thread_id)) {
          group.threads.push(t);
        }
      }
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "No Contact") return 1;
      if (b === "No Contact") return -1;
      return a.localeCompare(b);
    })
    .map(([name, data]) => ({
      label: name,
      sublabel: [data.role, data.company].filter(Boolean).join(" · ") || undefined,
      threads: data.threads,
    }));
}

function getPeopleFromThread(t: CoachingThreadWithDeal): { name: string; role?: string; company?: string }[] {
  if (t.participants && t.participants.length > 0) {
    return t.participants.map((p) => ({ name: p.name, role: p.role, company: p.company }));
  }
  if (t.contact_name) {
    return [{ name: t.contact_name, role: t.contact_role ?? undefined, company: t.company ?? undefined }];
  }
  if (t.contacts) {
    return [{ name: t.contacts.name, role: t.contacts.role ?? undefined, company: t.contacts.company ?? undefined }];
  }
  return [];
}

// --- Card component ---

function ThreadCard({
  thread,
  viewMode,
  onOpen,
}: {
  thread: CoachingThreadWithDeal;
  viewMode: ViewMode;
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
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-text-primary leading-tight truncate">
              {thread.title}
            </h4>
            {/* Entity chips based on view mode */}
            <div className="flex flex-wrap gap-1 mt-1">
              {thread.deals && (
                <span className="text-[10px] text-accent-primary bg-accent-primary/10 rounded px-1.5 py-0.5">
                  {thread.deals.company} ({thread.deals.stage.replace(/_/g, " ")})
                </span>
              )}
              {viewMode !== "companies" && thread.company && (
                <span className="text-[10px] text-text-muted bg-surface-tertiary rounded px-1.5 py-0.5">
                  {thread.company}
                </span>
              )}
              {thread.contacts && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5">
                  {thread.contacts.name}
                </span>
              )}
              {thread.ma_entities && (
                <span className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5">
                  {thread.ma_entities.company} ({thread.ma_entities.entity_type})
                </span>
              )}
            </div>
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
        {project && viewMode !== "projects" && (
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

        {/* Where we left off */}
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

        {/* Footer */}
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
