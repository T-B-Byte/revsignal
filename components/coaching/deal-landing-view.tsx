"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { CoachingThreadWithDeal, Deal, Project } from "@/types/database";
import { DEAL_STAGES } from "@/types/database";
import { LandingBrief } from "./landing-brief";

// --- Types ---

interface DealLandingViewProps {
  threads: CoachingThreadWithDeal[];
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
  projects: Pick<Project, "project_id" | "name" | "status" | "category">[];
  onNewConversation: (prefillDealId?: string, prefillCompany?: string) => void;
}

interface DealGroup {
  type: "deal";
  id: string;
  label: string;
  stage: string;
  stageColor: string;
  threads: CoachingThreadWithDeal[];
  people: { name: string; role?: string }[];
  lastActivity: string;
  totalFollowUps: number;
  hasOverdue: boolean;
}

interface ProjectGroup {
  type: "project";
  id: string;
  label: string;
  status: string;
  category: string | null;
  threads: CoachingThreadWithDeal[];
  people: { name: string; role?: string }[];
  lastActivity: string;
  totalFollowUps: number;
  hasOverdue: boolean;
}

type EntityGroup = DealGroup | ProjectGroup;

// --- Helpers ---

const STAGE_COLOR_MAP = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s.color])
);
const STAGE_LABEL_MAP = Object.fromEntries(
  DEAL_STAGES.map((s) => [s.value, s.label])
);

const PROJECT_STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

function collectPeople(threads: CoachingThreadWithDeal[]): { name: string; role?: string }[] {
  const seen = new Set<string>();
  const people: { name: string; role?: string }[] = [];
  for (const t of threads) {
    if (t.participants) {
      for (const p of t.participants) {
        if (!seen.has(p.name)) {
          seen.add(p.name);
          people.push({ name: p.name, role: p.role });
        }
      }
    }
    if (t.contact_name && !seen.has(t.contact_name)) {
      seen.add(t.contact_name);
      people.push({ name: t.contact_name, role: t.contact_role ?? undefined });
    }
    if (t.contacts && !seen.has(t.contacts.name)) {
      seen.add(t.contacts.name);
      people.push({ name: t.contacts.name, role: t.contacts.role ?? undefined });
    }
  }
  return people;
}

function latestActivity(threads: CoachingThreadWithDeal[]): string {
  let latest = "";
  for (const t of threads) {
    if (t.last_message_at > latest) latest = t.last_message_at;
  }
  return latest;
}

function aggregateFollowUps(threads: CoachingThreadWithDeal[]): { total: number; hasOverdue: boolean } {
  let total = 0;
  let hasOverdue = false;
  for (const t of threads) {
    total += t.open_follow_up_count ?? 0;
    if (t.has_overdue) hasOverdue = true;
  }
  return { total, hasOverdue };
}

// --- Main Component ---

export function DealLandingView({ threads, activeDeals, projects, onNewConversation }: DealLandingViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const activeThreads = useMemo(
    () => threads.filter((t) => !t.is_archived),
    [threads]
  );

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return activeThreads;
    const q = search.toLowerCase();
    return activeThreads.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.company?.toLowerCase().includes(q) ||
        t.contact_name?.toLowerCase().includes(q) ||
        t.thread_brief?.toLowerCase().includes(q) ||
        t.participants?.some(
          (p) => p.name.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q)
        )
    );
  }, [activeThreads, search]);

  // Group into deal groups, project groups, and standalone
  const { dealGroups, projectGroups, standalone } = useMemo(() => {
    const dealMap = new Map<string, CoachingThreadWithDeal[]>();
    const projectMap = new Map<string, CoachingThreadWithDeal[]>();
    const standaloneList: CoachingThreadWithDeal[] = [];

    for (const t of filtered) {
      if (t.deal_id && t.deals) {
        const key = t.deal_id;
        if (!dealMap.has(key)) dealMap.set(key, []);
        dealMap.get(key)!.push(t);
      } else if (t.project_id && t.projects) {
        const key = t.project_id;
        if (!projectMap.has(key)) projectMap.set(key, []);
        projectMap.get(key)!.push(t);
      } else {
        standaloneList.push(t);
      }
    }

    // Build deal groups (include deals without threads if they match search)
    const dGroups: DealGroup[] = [];
    const dealsWithThreads = new Set(dealMap.keys());

    for (const deal of activeDeals) {
      const threads = dealMap.get(deal.deal_id) ?? [];
      // Show deal if it has threads or if no search is active
      if (threads.length === 0 && search) continue;
      const fu = aggregateFollowUps(threads);
      dGroups.push({
        type: "deal",
        id: deal.deal_id,
        label: deal.company,
        stage: deal.stage,
        stageColor: STAGE_COLOR_MAP[deal.stage] ?? "#6b7280",
        threads,
        people: collectPeople(threads),
        lastActivity: latestActivity(threads),
        totalFollowUps: fu.total,
        hasOverdue: fu.hasOverdue,
      });
    }

    // Add deal groups for threads whose deal isn't in activeDeals (closed deals with threads)
    for (const [dealId, threads] of dealMap) {
      if (!activeDeals.some((d) => d.deal_id === dealId)) {
        const dealInfo = threads[0]?.deals;
        if (dealInfo) {
          const fu = aggregateFollowUps(threads);
          dGroups.push({
            type: "deal",
            id: dealId,
            label: dealInfo.company,
            stage: dealInfo.stage,
            stageColor: STAGE_COLOR_MAP[dealInfo.stage] ?? "#6b7280",
            threads,
            people: collectPeople(threads),
            lastActivity: latestActivity(threads),
            totalFollowUps: fu.total,
            hasOverdue: fu.hasOverdue,
          });
        }
      }
    }

    // Sort deals: ones with threads first (by last activity), then empty deals alphabetically
    dGroups.sort((a, b) => {
      if (a.threads.length > 0 && b.threads.length === 0) return -1;
      if (a.threads.length === 0 && b.threads.length > 0) return 1;
      if (a.threads.length > 0 && b.threads.length > 0) {
        return b.lastActivity.localeCompare(a.lastActivity);
      }
      return a.label.localeCompare(b.label);
    });

    // Build project groups (only for projects that have threads)
    const pGroups: ProjectGroup[] = [];
    for (const [projectId, threads] of projectMap) {
      const projectInfo = threads[0]?.projects;
      if (projectInfo) {
        const fu = aggregateFollowUps(threads);
        pGroups.push({
          type: "project",
          id: projectId,
          label: projectInfo.name,
          status: projectInfo.status,
          category: projectInfo.category,
          threads,
          people: collectPeople(threads),
          lastActivity: latestActivity(threads),
          totalFollowUps: fu.total,
          hasOverdue: fu.hasOverdue,
        });
      }
    }

    // Also show projects without threads (when not searching)
    if (!search) {
      for (const p of projects) {
        if (!projectMap.has(p.project_id)) {
          pGroups.push({
            type: "project",
            id: p.project_id,
            label: p.name,
            status: p.status,
            category: p.category,
            threads: [],
            people: [],
            lastActivity: "",
            totalFollowUps: 0,
            hasOverdue: false,
          });
        }
      }
    }

    pGroups.sort((a, b) => {
      if (a.threads.length > 0 && b.threads.length === 0) return -1;
      if (a.threads.length === 0 && b.threads.length > 0) return 1;
      if (a.threads.length > 0 && b.threads.length > 0) {
        return b.lastActivity.localeCompare(a.lastActivity);
      }
      return a.label.localeCompare(b.label);
    });

    return { dealGroups: dGroups, projectGroups: pGroups, standalone: standaloneList };
  }, [filtered, activeDeals, projects, search]);

  // Attention needed: deals/projects with overdue follow-ups or stale threads
  const attentionGroups = useMemo(() => {
    const all: EntityGroup[] = [...dealGroups, ...projectGroups];
    return all.filter((g) => g.hasOverdue && g.threads.length > 0);
  }, [dealGroups, projectGroups]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasAnyContent = dealGroups.length > 0 || projectGroups.length > 0 || standalone.length > 0;
  const isEmpty = activeThreads.length === 0 && activeDeals.length === 0 && projects.length === 0;

  // --- Empty State ---
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/10">
            <svg className="h-7 w-7 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Your strategy hub</h2>
          <p className="text-sm text-text-muted mb-6">
            Start a conversation about any deal or project. StrategyGPT remembers context across sessions so you can pick up where you left off.
          </p>
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => onNewConversation()}
              className="rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
            >
              Start a conversation
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Landing Brief */}
      {!search && <LandingBrief />}

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals, projects, people..."
            className="w-full rounded-lg border border-border-primary bg-surface-secondary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={() => onNewConversation()}
          className="shrink-0 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
        >
          + New Conversation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!hasAnyContent && search && (
          <div className="py-12 text-center text-sm text-text-muted">
            No results for &ldquo;{search}&rdquo;.{" "}
            <button onClick={() => setSearch("")} className="text-accent-primary hover:underline">
              Clear search
            </button>
          </div>
        )}

        {/* Attention needed */}
        {attentionGroups.length > 0 && !search && (
          <AttentionStrip groups={attentionGroups} onNavigate={(id) => {
            setExpandedIds((prev) => new Set([...prev, id]));
            document.getElementById(`group-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }} />
        )}

        {/* Deals section */}
        {dealGroups.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">
              Deals ({dealGroups.length})
            </h3>
            <div className="space-y-1">
              {dealGroups.map((group) => (
                <DealRow
                  key={group.id}
                  group={group}
                  isExpanded={expandedIds.has(group.id)}
                  onToggle={() => toggleExpand(group.id)}
                  onOpenThread={(id) => router.push(`/coach/${id}`)}
                  onNewConversation={() => onNewConversation(group.id, group.label)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Projects section */}
        {projectGroups.length > 0 && (
          <section className="mb-6">
            <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-text-muted px-1">
              Projects ({projectGroups.length})
            </h3>
            <div className="space-y-1">
              {projectGroups.map((group) => (
                <ProjectRow
                  key={group.id}
                  group={group}
                  isExpanded={expandedIds.has(group.id)}
                  onToggle={() => toggleExpand(group.id)}
                  onOpenThread={(id) => router.push(`/coach/${id}`)}
                  onNewConversation={() => onNewConversation()}
                />
              ))}
            </div>
          </section>
        )}

        {/* Standalone conversations */}
        {standalone.length > 0 && (
          <StandaloneSection
            threads={standalone}
            onOpenThread={(id) => router.push(`/coach/${id}`)}
          />
        )}
      </div>
    </div>
  );
}

// --- Attention Strip ---

function AttentionStrip({ groups, onNavigate }: { groups: EntityGroup[]; onNavigate: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mb-4 rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-2.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-status-red" />
        <span className="text-xs font-semibold text-text-primary">
          {groups.length} {groups.length === 1 ? "deal needs" : "deals need"} attention
        </span>
        <svg
          className={`ml-auto h-3.5 w-3.5 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => onNavigate(g.id)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-text-secondary hover:bg-surface-tertiary transition-colors"
            >
              <span className="font-medium text-text-primary">{g.label}</span>
              <span className="text-status-red text-[10px] font-semibold">Overdue follow-ups</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Deal Row ---

function DealRow({
  group,
  isExpanded,
  onToggle,
  onOpenThread,
  onNewConversation,
}: {
  group: DealGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenThread: (threadId: string) => void;
  onNewConversation: () => void;
}) {
  const hasThreads = group.threads.length > 0;
  const lastDate = group.lastActivity ? new Date(group.lastActivity) : null;

  return (
    <div id={`group-${group.id}`} className="rounded-lg border border-border-primary bg-surface-secondary overflow-hidden">
      {/* Deal header */}
      <button
        onClick={hasThreads ? onToggle : onNewConversation}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary group"
      >
        {/* Expand chevron */}
        {hasThreads ? (
          <svg
            className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <div className="h-4 w-4 shrink-0" />
        )}

        {/* Company + stage */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">{group.label}</span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: group.stageColor }}
            >
              {STAGE_LABEL_MAP[group.stage] ?? group.stage}
            </span>
          </div>

          {/* People chips */}
          {group.people.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {group.people.slice(0, 4).map((p, i) => (
                <span key={p.name} className="text-[10px] text-text-muted">
                  {p.name}{p.role ? ` (${p.role})` : ""}
                  {i < Math.min(group.people.length, 4) - 1 ? "," : ""}
                </span>
              ))}
              {group.people.length > 4 && (
                <span className="text-[10px] text-text-muted">+{group.people.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 shrink-0">
          {group.hasOverdue && (
            <span className="h-2 w-2 rounded-full bg-status-red" title="Overdue follow-up" />
          )}
          {group.totalFollowUps > 0 && !group.hasOverdue && (
            <span className="rounded-full bg-status-yellow/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-yellow">
              {group.totalFollowUps}
            </span>
          )}
          {hasThreads && (
            <span className="text-[10px] text-text-muted">
              {group.threads.length} conversation{group.threads.length !== 1 ? "s" : ""}
            </span>
          )}
          {!hasThreads && (
            <span className="text-[10px] text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Start conversation
            </span>
          )}
          {lastDate && !isNaN(lastDate.getTime()) && (
            <span className="text-[10px] text-text-muted hidden sm:inline">
              {formatDistanceToNow(lastDate, { addSuffix: true })}
            </span>
          )}
        </div>
      </button>

      {/* Expanded: conversation rows */}
      {isExpanded && hasThreads && (
        <div className="border-t border-border-primary">
          {group.threads
            .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""))
            .map((thread) => (
              <ConversationRow key={thread.thread_id} thread={thread} onOpen={() => onOpenThread(thread.thread_id)} />
            ))}
          <button
            onClick={(e) => { e.stopPropagation(); onNewConversation(); }}
            className="w-full px-4 py-2 text-left text-xs text-accent-primary hover:bg-surface-tertiary transition-colors border-t border-border-primary"
          >
            + New conversation for {group.label}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Project Row ---

function ProjectRow({
  group,
  isExpanded,
  onToggle,
  onOpenThread,
  onNewConversation,
}: {
  group: ProjectGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onOpenThread: (threadId: string) => void;
  onNewConversation: () => void;
}) {
  const hasThreads = group.threads.length > 0;
  const lastDate = group.lastActivity ? new Date(group.lastActivity) : null;
  const statusColor = PROJECT_STATUS_COLORS[group.status] ?? "#6b7280";

  return (
    <div id={`group-${group.id}`} className="rounded-lg border border-border-primary bg-surface-secondary overflow-hidden">
      <button
        onClick={hasThreads ? onToggle : onNewConversation}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary group"
      >
        {hasThreads ? (
          <svg
            className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <div className="h-4 w-4 shrink-0" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">{group.label}</span>
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize text-white"
              style={{ backgroundColor: statusColor }}
            >
              {group.status}
            </span>
            {group.category && (
              <span className="text-[10px] text-text-muted">{group.category}</span>
            )}
          </div>
          {group.people.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {group.people.slice(0, 4).map((p, i) => (
                <span key={p.name} className="text-[10px] text-text-muted">
                  {p.name}{p.role ? ` (${p.role})` : ""}
                  {i < Math.min(group.people.length, 4) - 1 ? "," : ""}
                </span>
              ))}
              {group.people.length > 4 && (
                <span className="text-[10px] text-text-muted">+{group.people.length - 4} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {group.hasOverdue && (
            <span className="h-2 w-2 rounded-full bg-status-red" title="Overdue follow-up" />
          )}
          {group.totalFollowUps > 0 && !group.hasOverdue && (
            <span className="rounded-full bg-status-yellow/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-yellow">
              {group.totalFollowUps}
            </span>
          )}
          {hasThreads && (
            <span className="text-[10px] text-text-muted">
              {group.threads.length} conversation{group.threads.length !== 1 ? "s" : ""}
            </span>
          )}
          {!hasThreads && (
            <span className="text-[10px] text-accent-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Start conversation
            </span>
          )}
          {lastDate && !isNaN(lastDate.getTime()) && (
            <span className="text-[10px] text-text-muted hidden sm:inline">
              {formatDistanceToNow(lastDate, { addSuffix: true })}
            </span>
          )}
        </div>
      </button>

      {isExpanded && hasThreads && (
        <div className="border-t border-border-primary">
          {group.threads
            .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""))
            .map((thread) => (
              <ConversationRow key={thread.thread_id} thread={thread} onOpen={() => onOpenThread(thread.thread_id)} />
            ))}
          <button
            onClick={(e) => { e.stopPropagation(); onNewConversation(); }}
            className="w-full px-4 py-2 text-left text-xs text-accent-primary hover:bg-surface-tertiary transition-colors border-t border-border-primary"
          >
            + New conversation
          </button>
        </div>
      )}
    </div>
  );
}

// --- Conversation Row (nested under deal/project) ---

function ConversationRow({ thread, onOpen }: { thread: CoachingThreadWithDeal; onOpen: () => void }) {
  const followUpCount = thread.open_follow_up_count ?? 0;
  const lastDate = thread.last_message_at ? new Date(thread.last_message_at) : null;
  const daysSince = lastDate && !isNaN(lastDate.getTime())
    ? Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isStale = thread.deal_id && daysSince >= 7;

  return (
    <button
      onClick={onOpen}
      className="flex w-full items-start gap-3 px-4 py-3 pl-12 text-left transition-colors hover:bg-surface-tertiary border-t border-border-primary/50"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary truncate">{thread.title}</p>
        {(thread.catchup_text || thread.thread_brief) && (
          <p className="mt-0.5 text-xs text-text-muted line-clamp-2 leading-relaxed">
            {thread.catchup_text || thread.thread_brief}
          </p>
        )}
        {/* Show participants if any */}
        {thread.participants && thread.participants.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {thread.participants.slice(0, 3).map((p) => (
              <span key={p.name} className="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-1 py-0.5">
                {p.name}
              </span>
            ))}
            {thread.participants.length > 3 && (
              <span className="text-[10px] text-text-muted">+{thread.participants.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 pt-0.5">
        {thread.has_overdue && (
          <span className="h-2 w-2 rounded-full bg-status-red" title="Overdue" />
        )}
        {followUpCount > 0 && !thread.has_overdue && (
          <span className="rounded-full bg-status-yellow/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-yellow">
            {followUpCount}
          </span>
        )}
        {isStale && (
          <span className="text-[10px] font-semibold text-status-red">Stale</span>
        )}
        {lastDate && !isNaN(lastDate.getTime()) && (
          <span className="text-[10px] text-text-muted">
            {formatDistanceToNow(lastDate, { addSuffix: true })}
          </span>
        )}
        <span className="text-[10px] text-text-muted">
          {thread.message_count ?? 0} msg{(thread.message_count ?? 0) !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}

// --- Standalone Section ---

function StandaloneSection({
  threads,
  onOpenThread,
}: {
  threads: CoachingThreadWithDeal[];
  onOpenThread: (threadId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="mb-2 flex items-center gap-2 px-1"
      >
        <svg
          className={`h-3.5 w-3.5 text-text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Standalone Conversations ({threads.length})
        </h3>
      </button>
      {expanded && (
        <div className="rounded-lg border border-border-primary bg-surface-secondary overflow-hidden">
          {threads
            .sort((a, b) => (b.last_message_at ?? "").localeCompare(a.last_message_at ?? ""))
            .map((thread) => (
              <ConversationRow key={thread.thread_id} thread={thread} onOpen={() => onOpenThread(thread.thread_id)} />
            ))}
        </div>
      )}
    </section>
  );
}
