"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, isToday, isYesterday, isThisYear } from "date-fns";
import type { CoachingThreadWithDeal } from "@/types/database";

type ViewMode = "deals" | "projects" | "people";

interface ThreadSidebarProps {
  threads: CoachingThreadWithDeal[];
  onNewThread: () => void;
  onArchive?: (threadId: string, archive: boolean) => void;
  onDelete?: (threadId: string) => void;
  totalPipeline?: number;
}

export function ThreadSidebar({ threads, onNewThread, onArchive, onDelete, totalPipeline = 0 }: ThreadSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [viewMode, setViewMode] = useState<ViewMode>("deals");
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settledQuery, setSettledQuery] = useState("");
  const [contentMatchIds, setContentMatchIds] = useState<Set<string>>(new Set());
  const [contentSnippets, setContentSnippets] = useState<Record<string, string>>({});
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    thread: CoachingThreadWithDeal;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Debounced content search. Commits results via `settledQuery` so the
  // visible list only updates once the full search has resolved — prevents
  // mid-search layout shift that causes misclicks.
  const searchContent = useCallback(async (query: string) => {
    searchAbortRef.current?.abort();

    setIsSearching(true);
    const controller = new AbortController();
    searchAbortRef.current = controller;

    try {
      const res = await fetch(
        `/api/coaching/threads/search?q=${encodeURIComponent(query)}`,
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (controller.signal.aborted) return;
      setContentMatchIds(new Set(data.thread_ids));
      setContentSnippets(data.snippets);
      setSettledQuery(query);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setContentMatchIds(new Set());
      setContentSnippets({});
      setSettledQuery(query);
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    // Queries under 2 chars don't hit the server; commit immediately so
    // metadata filtering is instant (and clearing the field is instant).
    if (searchQuery.length < 2) {
      searchAbortRef.current?.abort();
      setContentMatchIds(new Set());
      setContentSnippets({});
      setIsSearching(false);
      setSettledQuery(searchQuery);
      return;
    }
    const timer = setTimeout(() => searchContent(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchContent]);

  // Filter threads: metadata match OR content match. Use settledQuery so
  // metadata and content matches commit together — avoids the list
  // reflowing twice per keystroke.
  const filteredThreads = useMemo(() => threads.filter((t) => {
    if (!settledQuery) return true;
    const q = settledQuery.toLowerCase();
    const metadataMatch =
      t.title?.toLowerCase().includes(q) ||
      t.contact_name?.toLowerCase().includes(q) ||
      t.contact_role?.toLowerCase().includes(q) ||
      t.company?.toLowerCase().includes(q) ||
      t.participants?.some(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.role?.toLowerCase().includes(q)
      );
    return metadataMatch || contentMatchIds.has(t.thread_id);
  }), [threads, settledQuery, contentMatchIds]);

  const isSearchPending = searchQuery.length >= 2 && searchQuery !== settledQuery;

  const activeThreads = useMemo(() => filteredThreads.filter((t) => !t.is_archived), [filteredThreads]);
  const archivedThreads = useMemo(() => filteredThreads.filter((t) => t.is_archived), [filteredThreads]);

  const currentThreadId = pathname.split("/coach/")[1] ?? null;

  // Group threads based on active view mode
  const grouped = useMemo(() => {
    switch (viewMode) {
      case "projects": return groupByProject(activeThreads);
      case "people": return groupByPerson(activeThreads);
      case "deals":
      default: return groupByDeal(activeThreads);
    }
  }, [viewMode, activeThreads]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  function handleContextMenu(e: React.MouseEvent, thread: CoachingThreadWithDeal) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, thread });
  }

  function handleArchiveClick() {
    if (!contextMenu || !onArchive) return;
    onArchive(contextMenu.thread.thread_id, !contextMenu.thread.is_archived);
    setContextMenu(null);
  }

  function handleDeleteClick() {
    if (!contextMenu) return;
    setConfirmDelete(contextMenu.thread.thread_id);
    setContextMenu(null);
  }

  function handleConfirmDelete(threadId: string) {
    onDelete?.(threadId);
    setConfirmDelete(null);
  }

  const VIEW_TABS: { key: ViewMode; label: string; icon: React.ReactNode }[] = [
    {
      key: "deals",
      label: "Deals",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      key: "projects",
      label: "Projects",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      key: "people",
      label: "People",
      icon: (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex h-full flex-col border-r border-border-primary bg-surface-primary">
      {/* Header */}
      <div className="border-b border-border-primary px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">StrategyGPT</h2>
          <button
            onClick={onNewThread}
            className="rounded-md bg-accent-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            + New
          </button>
        </div>
        {totalPipeline > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <span className="text-[10px] text-text-muted uppercase tracking-wider">Pipeline</span>
            <span className="text-[11px] font-semibold text-status-green">
              ${totalPipeline.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border-primary">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-secondary py-1.5 pl-8 pr-8 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
          {isSearching && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-3 w-3 animate-spin rounded-full border border-text-muted border-t-accent-primary" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex border-b border-border-primary">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              viewMode === tab.key
                ? "border-b-2 border-accent-primary text-accent-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden lg:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isSearchPending && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-text-muted">Searching…</p>
          </div>
        )}

        {!isSearchPending && activeThreads.length === 0 && (
          <div className="px-4 py-8 text-center">
            {settledQuery ? (
              <p className="text-xs text-text-muted">No matching conversations.</p>
            ) : (
              <>
                <p className="text-xs text-text-muted">No conversations yet.</p>
                <button
                  onClick={onNewThread}
                  className="mt-2 text-xs font-medium text-accent-primary hover:underline"
                >
                  Start your first conversation
                </button>
              </>
            )}
          </div>
        )}

        {!isSearchPending && grouped.map(({ label, sublabel, threads: groupThreads, color }) => (
          <div key={label}>
            {/* Group header */}
            <div className="sticky top-0 z-10 bg-surface-secondary/95 backdrop-blur-sm px-4 py-1.5 border-b border-border-primary">
              <div className="flex items-center gap-1.5">
                {color && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                )}
                <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted truncate">
                  {label}
                </p>
                {sublabel && (
                  <span className="text-[9px] text-text-muted/60 font-normal normal-case truncate">
                    {sublabel}
                  </span>
                )}
                <span className="ml-auto text-[9px] text-text-muted/50">
                  {groupThreads.length}
                </span>
              </div>
            </div>
            {groupThreads.map((thread) => (
              <ThreadItem
                key={thread.thread_id}
                thread={thread}
                viewMode={viewMode}
                isActive={currentThreadId === thread.thread_id}
                isConfirmingDelete={confirmDelete === thread.thread_id}
                contentSnippet={settledQuery.length >= 2 ? contentSnippets[thread.thread_id] : undefined}
                onClick={() => router.push(`/coach/${thread.thread_id}`)}
                onContextMenu={(e) => handleContextMenu(e, thread)}
                onConfirmDelete={() => handleConfirmDelete(thread.thread_id)}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        ))}

        {/* Archived section */}
        {!isSearchPending && archivedThreads.length > 0 && (
          <div className="border-t border-border-primary">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="w-full px-4 py-2 text-left text-xs text-text-muted hover:text-text-secondary"
            >
              {showArchived ? "Hide" : "Show"} archived ({archivedThreads.length})
            </button>
            {showArchived &&
              archivedThreads.map((thread) => (
                <ThreadItem
                  key={thread.thread_id}
                  thread={thread}
                  viewMode={viewMode}
                  isActive={currentThreadId === thread.thread_id}
                  isConfirmingDelete={confirmDelete === thread.thread_id}
                  contentSnippet={settledQuery.length >= 2 ? contentSnippets[thread.thread_id] : undefined}
                  onClick={() => router.push(`/coach/${thread.thread_id}`)}
                  onContextMenu={(e) => handleContextMenu(e, thread)}
                  onConfirmDelete={() => handleConfirmDelete(thread.thread_id)}
                  onCancelDelete={() => setConfirmDelete(null)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-md border border-border-primary bg-surface-primary shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {onArchive && (
            <button
              onClick={handleArchiveClick}
              className="w-full px-3 py-1.5 text-left text-xs text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              {contextMenu.thread.is_archived ? "Unarchive" : "Archive"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-surface-tertiary transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- ThreadItem component ---

function ThreadItem({
  thread,
  viewMode,
  isActive,
  isConfirmingDelete,
  contentSnippet,
  onClick,
  onContextMenu,
  onConfirmDelete,
  onCancelDelete,
}: {
  thread: CoachingThreadWithDeal;
  viewMode: ViewMode;
  isActive: boolean;
  isConfirmingDelete: boolean;
  contentSnippet?: string;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const isStale =
    thread.deal_id &&
    !thread.is_archived &&
    daysSince(thread.last_message_at) >= 7;

  if (isConfirmingDelete) {
    return (
      <div className="px-4 py-3 bg-red-500/5 border-y border-red-500/20">
        <p className="text-xs text-text-primary mb-2">
          Delete <span className="font-medium">{thread.title}</span>?
        </p>
        <p className="text-[10px] text-text-muted mb-2">
          This permanently removes the thread and all messages.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfirmDelete}
            className="rounded px-2 py-0.5 text-[10px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onCancelDelete}
            className="rounded px-2 py-0.5 text-[10px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Contextual subtitle changes based on view mode
  const subtitle = getThreadSubtitle(thread, viewMode);

  return (
    <button
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`w-full px-4 py-3 text-left transition-colors hover:bg-surface-tertiary ${
        isActive ? "bg-surface-tertiary" : ""
      } ${thread.is_archived ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">
            {thread.title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {subtitle}
            </p>
          )}
          {/* Show linked entities as small chips */}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {viewMode !== "deals" && thread.company && (
              <span className="text-[9px] text-text-muted bg-surface-tertiary rounded px-1 py-0.5">
                {thread.company}
              </span>
            )}
            {viewMode !== "projects" && thread.projects && (
              <span className="text-[9px] text-violet-400 bg-violet-500/10 rounded px-1 py-0.5">
                {thread.projects.name}
              </span>
            )}
            {thread.deals && (
              <span className="text-[9px] text-accent-primary bg-accent-primary/10 rounded px-1 py-0.5">
                {thread.deals.company} ({thread.deals.stage.replace(/_/g, " ")})
              </span>
            )}
            {thread.contacts && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 rounded px-1 py-0.5">
                {thread.contacts.name}
              </span>
            )}
            {thread.ma_entities && (
              <span className="text-[9px] text-amber-400 bg-amber-500/10 rounded px-1 py-0.5">
                {thread.ma_entities.company}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-text-muted">
            {formatThreadDate(thread.last_message_at)}
          </p>
          {contentSnippet && (
            <p className="mt-1 line-clamp-2 text-[10px] italic text-text-muted/70 leading-relaxed">
              &ldquo;{contentSnippet}&rdquo;
            </p>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          {thread.has_overdue && (
            <span
              className="h-2 w-2 rounded-full bg-status-red"
              title="Overdue follow-up"
            />
          )}
          {(thread.open_follow_up_count ?? 0) > 0 && !thread.has_overdue && (
            <span className="text-[10px] font-medium text-status-yellow">
              {thread.open_follow_up_count}
            </span>
          )}
          {(thread.open_task_count ?? 0) > 0 && (
            <span
              className="text-[10px] font-medium text-emerald-400"
              title={`${thread.open_task_count} open task${thread.open_task_count === 1 ? "" : "s"}`}
            >
              {thread.open_task_count}
            </span>
          )}
          {isStale && (
            <span className="text-[10px] font-medium text-status-red">
              Stale
            </span>
          )}
        </div>
      </div>
    </button>
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

/** Group threads by linked deal (default) */
function groupByDeal(threads: CoachingThreadWithDeal[]): ThreadGroup[] {
  const map = new Map<string, { threads: CoachingThreadWithDeal[]; stage?: string }>();

  for (const t of threads) {
    if (t.deal_id && t.deals) {
      const key = t.deals.company;
      if (!map.has(key)) map.set(key, { threads: [], stage: t.deals.stage });
      map.get(key)!.threads.push(t);
    } else {
      const key = t.company || "Standalone";
      if (!map.has(key)) map.set(key, { threads: [] });
      map.get(key)!.threads.push(t);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "Standalone") return 1;
      if (b === "Standalone") return -1;
      return a.localeCompare(b);
    })
    .map(([label, data]) => ({
      label,
      sublabel: data.stage ? data.stage.replace(/_/g, " ") : undefined,
      threads: data.threads,
    }));
}

/** Group threads by project */
function groupByProject(threads: CoachingThreadWithDeal[]): ThreadGroup[] {
  const map = new Map<string, { threads: CoachingThreadWithDeal[]; status?: string; category?: string | null }>();

  for (const t of threads) {
    const project = t.projects;
    const key = project ? project.name : "No Project";
    if (!map.has(key)) {
      map.set(key, {
        threads: [],
        status: project?.status,
        category: project?.category,
      });
    }
    map.get(key)!.threads.push(t);
  }

  return Array.from(map.entries())
    .sort(([a, aData], [b, bData]) => {
      if (a === "No Project") return 1;
      if (b === "No Project") return -1;
      // Active projects first
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

/** Group threads by person (participants or contact) */
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
        // Avoid duplicate thread entries
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

// --- Helpers ---

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

/** Get contextual subtitle for a thread based on active view mode */
function getThreadSubtitle(thread: CoachingThreadWithDeal, viewMode: ViewMode): string | null {
  switch (viewMode) {
    case "deals": {
      // Show participants/contact under deal view
      if (thread.participants && thread.participants.length > 0) {
        return thread.participants.map((p) => p.name).join(", ");
      }
      if (thread.contact_name) {
        return thread.contact_name + (thread.contact_role ? ` · ${thread.contact_role}` : "");
      }
      return null;
    }
    case "projects": {
      // Show company under project view
      return thread.company ?? null;
    }
    case "people": {
      // Show company and project under people view
      const parts: string[] = [];
      if (thread.company) parts.push(thread.company);
      if (thread.projects) parts.push(thread.projects.name);
      return parts.length > 0 ? parts.join(" · ") : null;
    }
    default:
      return null;
  }
}

function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return "Yesterday, " + format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d, h:mm a");
  return format(date, "MMM d, yyyy, h:mm a");
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
