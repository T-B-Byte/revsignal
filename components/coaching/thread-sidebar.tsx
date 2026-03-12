"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
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
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    thread: CoachingThreadWithDeal;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const activeThreads = threads.filter((t) => !t.is_archived);
  const archivedThreads = threads.filter((t) => t.is_archived);

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

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {activeThreads.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-text-muted">No threads yet.</p>
            <button
              onClick={onNewThread}
              className="mt-2 text-xs font-medium text-accent-primary hover:underline"
            >
              Start your first thread
            </button>
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
  onClick,
  onContextMenu,
  onConfirmDelete,
  onCancelDelete,
}: {
  thread: CoachingThreadWithDeal;
  isActive: boolean;
  isConfirmingDelete: boolean;
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
          Delete <span className="font-medium">{thread.contact_name || thread.title}</span>?
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
            {thread.contact_name || thread.title}
          </p>
          {thread.contact_role && (
            <p className="mt-0.5 truncate text-xs text-text-secondary">
              {thread.contact_role}
            </p>
          )}
          {thread.deals && (
            <p className="mt-0.5 truncate text-xs text-accent-primary">
              {thread.deals.company}
              <span className="ml-1 text-text-muted">
                ({thread.deals.stage.replace(/_/g, " ")})
              </span>
            </p>
          )}
          <p className="mt-0.5 text-[10px] text-text-muted">
            {formatDistanceToNow(new Date(thread.last_message_at), {
              addSuffix: true,
            })}
          </p>
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

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
