"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { format, isToday, isYesterday, isThisYear } from "date-fns";
import type { CoachingThreadWithDeal } from "@/types/database";

interface ThreadSidebarProps {
  threads: CoachingThreadWithDeal[];
  onNewThread: () => void;
  onArchive?: (threadId: string, archive: boolean) => void;
  onDelete?: (threadId: string) => void;
}

export function ThreadSidebar({ threads, onNewThread, onArchive, onDelete }: ThreadSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Debounced content search
  const searchContent = useCallback(async (query: string) => {
    // Cancel any in-flight request
    searchAbortRef.current?.abort();

    if (!query || query.length < 2) {
      setContentMatchIds(new Set());
      setContentSnippets({});
      setIsSearching(false);
      return;
    }

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
      setContentMatchIds(new Set(data.thread_ids));
      setContentSnippets(data.snippets);
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setContentMatchIds(new Set());
      setContentSnippets({});
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  // Debounce: fire content search 300ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => searchContent(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchContent]);

  // Filter threads: metadata match OR content match
  const filteredThreads = threads.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
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
  });

  const activeThreads = filteredThreads.filter((t) => !t.is_archived);
  const archivedThreads = filteredThreads.filter((t) => t.is_archived);

  // Extract threadId from pathname like /coach/[threadId]
  const currentThreadId = pathname.split("/coach/")[1] ?? null;

  // Group active threads by company
  const grouped = groupByCompany(activeThreads);

  // Close context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  // Close confirm delete after 3 seconds if no action
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
    // Require confirmation
    setConfirmDelete(contextMenu.thread.thread_id);
    setContextMenu(null);
  }

  function handleConfirmDelete(threadId: string) {
    onDelete?.(threadId);
    setConfirmDelete(null);
  }

  return (
    <div className="flex h-full flex-col border-r border-border-primary bg-surface-primary">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">StrategyGPT</h2>
        <button
          onClick={onNewThread}
          className="rounded-md bg-accent-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
        >
          + New
        </button>
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
            placeholder="Search threads & messages…"
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

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {activeThreads.length === 0 && (
          <div className="px-4 py-8 text-center">
            {searchQuery ? (
              <p className="text-xs text-text-muted">
                {isSearching ? "Searching messages…" : "No matching threads or messages."}
              </p>
            ) : (
              <>
                <p className="text-xs text-text-muted">No threads yet.</p>
                <button
                  onClick={onNewThread}
                  className="mt-2 text-xs font-medium text-accent-primary hover:underline"
                >
                  Start your first thread
                </button>
              </>
            )}
          </div>
        )}

        {grouped.map(({ company, threads: companyThreads }) => (
          <div key={company}>
            {/* Company group header */}
            <div className="sticky top-0 z-10 bg-surface-secondary/95 backdrop-blur-sm px-4 py-1.5 border-b border-border-primary">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {company}
              </p>
            </div>
            {companyThreads.map((thread) => (
              <ThreadItem
                key={thread.thread_id}
                thread={thread}
                isActive={currentThreadId === thread.thread_id}
                isConfirmingDelete={confirmDelete === thread.thread_id}
                contentSnippet={searchQuery.length >= 2 ? contentSnippets[thread.thread_id] : undefined}
                onClick={() => router.push(`/coach/${thread.thread_id}`)}
                onContextMenu={(e) => handleContextMenu(e, thread)}
                onConfirmDelete={() => handleConfirmDelete(thread.thread_id)}
                onCancelDelete={() => setConfirmDelete(null)}
              />
            ))}
          </div>
        ))}

        {/* Archived section */}
        {archivedThreads.length > 0 && (
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
                  isActive={currentThreadId === thread.thread_id}
                  isConfirmingDelete={confirmDelete === thread.thread_id}
                  contentSnippet={searchQuery.length >= 2 ? contentSnippets[thread.thread_id] : undefined}
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

function ThreadItem({
  thread,
  isActive,
  isConfirmingDelete,
  contentSnippet,
  onClick,
  onContextMenu,
  onConfirmDelete,
  onCancelDelete,
}: {
  thread: CoachingThreadWithDeal;
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
          {thread.participants && thread.participants.length > 0 ? (
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {thread.participants.map((p) => p.name).join(", ")}
            </p>
          ) : thread.contact_name ? (
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {thread.contact_name}{thread.contact_role ? ` · ${thread.contact_role}` : ""}
            </p>
          ) : null}
          {thread.deals && (
            <p className="mt-0.5 truncate text-xs text-accent-primary">
              {thread.deals.company}
              <span className="ml-1 text-text-muted">
                ({thread.deals.stage.replace(/_/g, " ")})
              </span>
            </p>
          )}
          {thread.ma_entities && (
            <p className="mt-0.5 truncate text-xs text-purple-400">
              {thread.ma_entities.company}
              <span className="ml-1 text-text-muted">
                ({thread.ma_entities.entity_type} &middot; {thread.ma_entities.stage})
              </span>
            </p>
          )}
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

/** Group threads by company, with ungrouped ("General") at the bottom */
function groupByCompany(
  threads: CoachingThreadWithDeal[]
): { company: string; threads: CoachingThreadWithDeal[] }[] {
  const map = new Map<string, CoachingThreadWithDeal[]>();
  for (const t of threads) {
    const key = t.company || "General";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }

  // Sort: named companies first (alphabetically), "General" last
  const groups = Array.from(map.entries())
    .sort(([a], [b]) => {
      if (a === "General") return 1;
      if (b === "General") return -1;
      return a.localeCompare(b);
    })
    .map(([company, threads]) => ({ company, threads }));

  return groups;
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
