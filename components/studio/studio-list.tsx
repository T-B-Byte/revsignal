"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const PROJECT_TYPES = [
  { value: "battlecard", label: "Battlecard", description: "Competitive positioning for sales teams", icon: "⚔️" },
  { value: "one_pager", label: "One-Pager", description: "Single-page product or deal summary", icon: "📄" },
  { value: "proposal", label: "Proposal", description: "Full deal or partnership proposal", icon: "📋" },
  { value: "competitive_analysis", label: "Competitive Analysis", description: "Deep-dive competitor comparison", icon: "🔍" },
  { value: "contract_analysis", label: "Contract Analysis", description: "MSA / agreement gap analysis", icon: "⚖️" },
  { value: "freeform", label: "Freeform", description: "Open-ended project or document", icon: "✨" },
] as const;

type ProjectType = typeof PROJECT_TYPES[number]["value"];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-surface-tertiary text-text-muted",
  in_progress: "bg-accent-primary/15 text-accent-primary",
  complete: "bg-emerald-500/15 text-emerald-400",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  complete: "Complete",
};

const TYPE_ICONS: Record<string, string> = {
  battlecard: "⚔️",
  one_pager: "📄",
  proposal: "📋",
  competitive_analysis: "🔍",
  contract_analysis: "⚖️",
  freeform: "✨",
};

const TYPE_LABELS: Record<string, string> = {
  battlecard: "Battlecard",
  one_pager: "One-Pager",
  proposal: "Proposal",
  competitive_analysis: "Competitive Analysis",
  contract_analysis: "Contract Analysis",
  freeform: "Freeform",
};

interface StudioProject {
  project_id: string;
  title: string;
  type: ProjectType;
  status: string;
  description: string | null;
  output_json: unknown[];
  updated_at: string;
}

interface ContextMenuState {
  x: number;
  y: number;
  projectId?: string;
}

interface StudioListProps {
  initialProjects: StudioProject[];
}

export function StudioList({ initialProjects }: StudioListProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<StudioProject[]>(initialProjects);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // New project form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectType>("freeform");
  const [description, setDescription] = useState("");

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  useEffect(() => {
    if (!contextMenu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("scroll", closeContextMenu, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("scroll", closeContextMenu, true);
    };
  }, [contextMenu, closeContextMenu]);

  function openNew(preselectedType?: ProjectType) {
    setTitle("");
    setType(preselectedType ?? "freeform");
    setDescription("");
    setError(null);
    setShowNew(true);
    closeContextMenu();
  }

  function handleContextMenu(e: React.MouseEvent, projectId?: string) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, projectId });
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), type, description: description.trim() || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create project");
      }

      const project = await res.json();
      router.push(`/studio/${project.project_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    closeContextMenu();
    const res = await fetch(`/api/studio/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
    }
  }

  function handleAskStrategist(projectId?: string) {
    closeContextMenu();
    if (projectId) {
      router.push(`/studio/${projectId}`);
    } else {
      router.push("/coach");
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  const contextProject = contextMenu?.projectId
    ? projects.find((p) => p.project_id === contextMenu.projectId)
    : undefined;

  return (
    <div
      className="mx-auto max-w-5xl space-y-6 p-6"
      onContextMenu={(e) => handleContextMenu(e)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Studio</h1>
          <p className="mt-0.5 text-sm text-text-muted">
            AI-assisted deliverables — battlecards, proposals, analyses. Export to PDF or PPT.
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
        >
          + New Project
        </button>
      </div>

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-primary py-20 text-center">
          <span className="text-4xl">✨</span>
          <p className="mt-3 text-base font-medium text-text-secondary">No projects yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Create a battlecard, proposal, or any deliverable — the Strategist will build it with you.
            Right-click anywhere to get started.
          </p>
          <button
            onClick={() => openNew()}
            className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90"
          >
            Start a Project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p.project_id}
              onClick={() => router.push(`/studio/${p.project_id}`)}
              onContextMenu={(e) => {
                e.stopPropagation();
                handleContextMenu(e, p.project_id);
              }}
              className="group rounded-xl border border-border-primary bg-surface-secondary p-5 text-left transition-all hover:border-accent-primary/50 hover:bg-surface-secondary/80"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-2xl">{TYPE_ICONS[p.type] ?? "✨"}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[p.status] ?? STATUS_COLORS.draft}`}>
                  {STATUS_LABELS[p.status] ?? p.status}
                </span>
              </div>
              <p className="mt-2 font-semibold text-text-primary group-hover:text-accent-primary line-clamp-2">
                {p.title}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{TYPE_LABELS[p.type] ?? p.type}</p>
              {p.description && (
                <p className="mt-2 text-xs text-text-muted line-clamp-2">{p.description}</p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                <span>{(p.output_json?.length ?? 0)} section{(p.output_json?.length ?? 0) !== 1 ? "s" : ""}</span>
                <span>{formatDate(p.updated_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 min-w-[210px] rounded-xl border border-border-primary bg-surface-primary shadow-xl py-1 overflow-hidden"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextProject ? (
            <>
              <div className="px-3 py-2 border-b border-border-primary">
                <p className="text-[11px] font-semibold text-text-muted truncate max-w-[190px]">
                  {TYPE_ICONS[contextProject.type]} {contextProject.title}
                </p>
              </div>
              <ContextMenuItem
                icon="↗"
                label="Open project"
                onClick={() => {
                  closeContextMenu();
                  router.push(`/studio/${contextProject.project_id}`);
                }}
              />
              <ContextMenuItem
                icon="✦"
                label="Ask the Strategist"
                onClick={() => handleAskStrategist(contextProject.project_id)}
              />
              <div className="my-1 mx-2 border-t border-border-primary" />
              <ContextMenuItem
                icon="🗑"
                label="Delete project"
                danger
                onClick={() => handleDeleteProject(contextProject.project_id)}
              />
            </>
          ) : (
            <>
              <ContextMenuItem
                icon="+"
                label="New project"
                onClick={() => openNew()}
              />
              <ContextMenuItem
                icon="🔍"
                label="Competitive analysis"
                onClick={() => openNew("competitive_analysis")}
              />
              <ContextMenuItem
                icon="⚔️"
                label="New battlecard"
                onClick={() => openNew("battlecard")}
              />
              <ContextMenuItem
                icon="📋"
                label="New proposal"
                onClick={() => openNew("proposal")}
              />
              <ContextMenuItem
                icon="✨"
                label="Freeform"
                onClick={() => openNew("freeform")}
              />
              <div className="my-1 mx-2 border-t border-border-primary" />
              <ContextMenuItem
                icon="✦"
                label="Ask the Strategist"
                onClick={() => handleAskStrategist()}
              />
            </>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => { setShowNew(false); setError(null); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border-primary bg-surface-secondary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-base font-semibold text-text-primary">New Project</h2>
              <button
                onClick={() => { setShowNew(false); setError(null); }}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-secondary"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 pb-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Project title
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. pharosIQ vs. Bombora Battlecard"
                  className="w-full rounded-lg border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  maxLength={200}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) handleCreate(); }}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Project type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROJECT_TYPES.map((pt) => (
                    <button
                      key={pt.value}
                      onClick={() => setType(pt.value)}
                      className={`flex items-start gap-2 rounded-lg border p-3 text-left transition-colors ${
                        type === pt.value
                          ? "border-accent-primary/60 bg-accent-primary/10"
                          : "border-border-primary hover:border-border-hover"
                      }`}
                    >
                      <span className="text-lg">{pt.icon}</span>
                      <div>
                        <p className="text-xs font-medium text-text-primary">{pt.label}</p>
                        <p className="text-[11px] text-text-muted">{pt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                  Brief context <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What's this for? Who's the audience? Any key context..."
                  rows={2}
                  maxLength={2000}
                  className="w-full resize-none rounded-lg border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-border-primary px-6 py-4">
              <button
                onClick={() => { setShowNew(false); setError(null); }}
                disabled={creating}
                className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Context menu item
// ---------------------------------------------------------------------------

function ContextMenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        danger
          ? "text-status-red hover:bg-status-red/10"
          : "text-text-primary hover:bg-surface-tertiary"
      }`}
    >
      <span className="w-4 shrink-0 text-center text-xs leading-none">{icon}</span>
      {label}
    </button>
  );
}
