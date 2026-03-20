"use client";

import { useState, useEffect, useTransition } from "react";
import {
  createSidebarFolder,
  renameSidebarFolder,
  deleteSidebarFolder,
  moveItemToFolder,
  reorderFolders,
  getSidebarOrganization,
} from "@/app/(dashboard)/settings/sidebar-actions";

interface FolderData {
  folder_id: string;
  name: string;
  sort_order: number;
  is_open: boolean;
}

interface AssignmentData {
  nav_key: string;
  folder_id: string;
  sort_order: number;
}

// Nav items that can be organized (Dashboard and Settings are pinned)
const ORGANIZABLE_ITEMS = [
  { key: "deals", label: "Deals" },
  { key: "coach", label: "StrategyGPT" },
  { key: "prospects", label: "Prospects" },
  { key: "tradeshows", label: "Tradeshows" },
  { key: "flashcards", label: "Flashcards" },
  { key: "playbook", label: "Playbook" },
  { key: "compete", label: "Competition" },
  { key: "ma", label: "M&A" },
  { key: "marketing", label: "Marketing" },
];

interface OrganizeSidebarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function OrganizeSidebarDialog({
  open,
  onOpenChange,
  onSaved,
}: OrganizeSidebarDialogProps) {
  const [folders, setFolders] = useState<FolderData[]>([]);
  const [assignments, setAssignments] = useState<AssignmentData[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Load data when dialog opens
  useEffect(() => {
    if (!open) return;
    loadData();
  }, [open]);

  async function loadData() {
    const result = await getSidebarOrganization();
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setFolders(result.folders);
    setAssignments(result.assignments);
  }

  function getItemFolder(navKey: string): string | null {
    return assignments.find((a) => a.nav_key === navKey)?.folder_id ?? null;
  }

  function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    startTransition(async () => {
      const result = await createSidebarFolder(newFolderName.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setNewFolderName("");
      await loadData();
    });
  }

  function handleRenameFolder(folderId: string) {
    if (!editName.trim()) return;
    startTransition(async () => {
      const result = await renameSidebarFolder(folderId, editName.trim());
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setEditingFolder(null);
      await loadData();
    });
  }

  function handleDeleteFolder(folderId: string) {
    startTransition(async () => {
      const result = await deleteSidebarFolder(folderId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await loadData();
    });
  }

  function handleMoveItem(navKey: string, folderId: string | null) {
    startTransition(async () => {
      const result = await moveItemToFolder(navKey, folderId);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      await loadData();
      onSaved?.();
    });
  }

  function handleMoveFolder(folderId: string, direction: "up" | "down") {
    const idx = folders.findIndex((f) => f.folder_id === folderId);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === folders.length - 1) return;

    const newFolders = [...folders];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newFolders[idx], newFolders[swapIdx]] = [newFolders[swapIdx], newFolders[idx]];
    setFolders(newFolders);

    startTransition(async () => {
      await reorderFolders(newFolders.map((f) => f.folder_id));
      onSaved?.();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-border-primary bg-surface-primary shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
          <h2 className="text-base font-semibold text-text-primary">
            Organize Sidebar
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-6">
          {error && (
            <p className="text-xs text-status-red">{error}</p>
          )}

          {/* Create folder */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              New Folder
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="Folder name..."
                maxLength={50}
                className="flex-1 rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isPending}
                className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          {/* Folders with items */}
          {folders.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                Folders
              </label>
              {folders.map((folder, idx) => (
                <div
                  key={folder.folder_id}
                  className="rounded-lg border border-border-primary bg-surface-secondary p-3"
                >
                  {/* Folder header */}
                  <div className="flex items-center justify-between">
                    {editingFolder === folder.folder_id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFolder(folder.folder_id);
                          if (e.key === "Escape") setEditingFolder(null);
                        }}
                        onBlur={() => handleRenameFolder(folder.folder_id)}
                        autoFocus
                        maxLength={50}
                        className="flex-1 rounded border border-accent-primary bg-surface-primary px-2 py-0.5 text-sm text-text-primary focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-medium text-text-primary">
                        {folder.name}
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveFolder(folder.folder_id, "up")}
                        disabled={idx === 0}
                        className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                        title="Move up"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleMoveFolder(folder.folder_id, "down")}
                        disabled={idx === folders.length - 1}
                        className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors"
                        title="Move down"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditingFolder(folder.folder_id);
                          setEditName(folder.name);
                        }}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors"
                        title="Rename"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(folder.folder_id)}
                        className="p-1 text-text-muted hover:text-status-red transition-colors"
                        title="Delete folder"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Items in this folder */}
                  <div className="mt-2 space-y-1">
                    {ORGANIZABLE_ITEMS.filter(
                      (item) => getItemFolder(item.key) === folder.folder_id
                    ).map((item) => (
                      <div
                        key={item.key}
                        className="flex items-center justify-between rounded px-2 py-1 text-xs text-text-secondary"
                      >
                        <span>{item.label}</span>
                        <button
                          onClick={() => handleMoveItem(item.key, null)}
                          className="text-text-muted hover:text-text-primary transition-colors"
                          title="Remove from folder"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {ORGANIZABLE_ITEMS.filter(
                      (item) => getItemFolder(item.key) === folder.folder_id
                    ).length === 0 && (
                      <p className="text-[10px] text-text-muted px-2 py-1">
                        No items in this folder
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Unassigned items */}
          <div>
            <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Items
            </label>
            <p className="text-[10px] text-text-muted mt-0.5 mb-2">
              Assign items to folders. Dashboard and Settings are always pinned.
            </p>
            <div className="space-y-1">
              {ORGANIZABLE_ITEMS.map((item) => {
                const currentFolder = getItemFolder(item.key);
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-md border border-border-primary bg-surface-secondary px-3 py-2"
                  >
                    <span className="text-sm text-text-primary">{item.label}</span>
                    <select
                      value={currentFolder ?? ""}
                      onChange={(e) =>
                        handleMoveItem(item.key, e.target.value || null)
                      }
                      className="rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-secondary focus:border-accent-primary focus:outline-none"
                    >
                      <option value="">Root</option>
                      {folders.map((f) => (
                        <option key={f.folder_id} value={f.folder_id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border-primary px-6 py-3">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
