"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { ProjectWithMembersAndThreads } from "@/types/database";
import { PROJECT_COLORS, PHAROSIQ_TEAM } from "@/types/database";
import type { ProjectStatus } from "@/types/database";
import { ProjectFiltersBar } from "./project-filters";
import { generatePrintHTML } from "./network-print-dialog";

interface ProjectCardsViewProps {
  initialProjects: ProjectWithMembersAndThreads[];
}

interface MemberInput {
  name: string;
  role: string;
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "ACTIVE",
  paused: "PAUSED",
  completed: "COMPLETED",
};

export function ProjectCardsView({ initialProjects }: ProjectCardsViewProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithMembersAndThreads | null>(null);
  // Direct print: opens editor in new tab with selected (or all) projects
  function handlePrint() {
    const printProjects =
      selectedIds.size > 0
        ? projects.filter((p) => selectedIds.has(p.project_id))
        : projects;
    if (printProjects.length === 0) return;

    const html = generatePrintHTML(printProjects, "Projects", "pharosIQ DaaS Partnerships & Initiatives");
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState("");

  // Collect all unique people across projects for the person filter dropdown
  const allPeople = useMemo(() => {
    const nameSet = new Set<string>();
    for (const p of projects) {
      for (const m of p.project_members ?? []) {
        nameSet.add(m.name);
      }
    }
    return [...nameSet].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  // Collect all unique categories
  const allCategories = useMemo(() => {
    const catSet = new Set<string>();
    for (const p of projects) {
      if (p.category) catSet.add(p.category);
    }
    return [...catSet].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // Status filter
      if (statusFilter.length > 0 && !statusFilter.includes(p.status)) return false;

      // Category filter
      if (categoryFilter) {
        if (categoryFilter === "__uncategorized__") {
          if (p.category) return false;
        } else if (p.category !== categoryFilter) {
          return false;
        }
      }

      // Person filter
      if (personFilter) {
        const hasPerson = (p.project_members ?? []).some(
          (m) => m.name.toLowerCase() === personFilter.toLowerCase()
        );
        if (!hasPerson) return false;
      }

      // Text search
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(q);
        const descMatch = p.description?.toLowerCase().includes(q);
        const catMatch = p.category?.toLowerCase().includes(q);
        const memberMatch = (p.project_members ?? []).some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.role?.toLowerCase().includes(q)
        );
        if (!nameMatch && !descMatch && !catMatch && !memberMatch) return false;
      }

      return true;
    });
  }, [projects, statusFilter, categoryFilter, personFilter, search]);

  // Group filtered projects by category
  const groupedProjects = useMemo(() => {
    const groups: { category: string | null; projects: ProjectWithMembersAndThreads[] }[] = [];
    const categoryMap = new Map<string | null, ProjectWithMembersAndThreads[]>();

    for (const p of filteredProjects) {
      const key = p.category || null;
      if (!categoryMap.has(key)) categoryMap.set(key, []);
      categoryMap.get(key)!.push(p);
    }

    // Named categories first (sorted), then uncategorized at the end
    const sortedKeys = [...categoryMap.keys()].sort((a, b) => {
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    });

    for (const key of sortedKeys) {
      groups.push({ category: key, projects: categoryMap.get(key)! });
    }

    return groups;
  }, [filteredProjects]);

  const hasMultipleGroups = groupedProjects.length > 1 || (groupedProjects.length === 1 && groupedProjects[0].category !== null);

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredProjects.map((p) => p.project_id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // CRUD handlers
  function handleAddProject() {
    setEditingProject(null);
    setShowDialog(true);
  }

  function handleEditProject(project: ProjectWithMembersAndThreads) {
    setEditingProject(project);
    setShowDialog(true);
  }

  async function handleSave(
    name: string,
    description: string,
    color: string,
    category: string,
    members: MemberInput[]
  ) {
    const memberPayload = members
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() || undefined }));

    try {
      if (editingProject) {
        const res = await fetch("/api/projects", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: editingProject.project_id,
            name,
            description: description || null,
            color,
            category: category.trim() || null,
            members: memberPayload,
          }),
        });
        if (!res.ok) return;
        const { project } = await res.json();
        setProjects((prev) =>
          prev.map((p) =>
            p.project_id === project.project_id
              ? { ...project, linked_threads: p.linked_threads }
              : p
          )
        );
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description || undefined,
            color,
            category: category.trim() || null,
            members: memberPayload,
          }),
        });
        if (!res.ok) return;
        const { project } = await res.json();
        setProjects((prev) => [project, ...prev]);
      }
      setShowDialog(false);
      setEditingProject(null);
    } catch {
      // Network error: dialog stays open so user can retry
    }
  }

  async function handleDelete(projectId: string) {
    try {
      const res = await fetch("/api/projects", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
      if (!res.ok) return;
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
      setShowDialog(false);
      setEditingProject(null);
    } catch {
      // Network error: dialog stays open
    }
  }

  async function handleSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/projects/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.projectsCreated > 0) {
        const listRes = await fetch("/api/projects");
        if (listRes.ok) {
          const listData = await listRes.json();
          setProjects(listData.projects ?? []);
        }
        setSeedResult(`Found ${data.projectsCreated} projects from your StrategyGPT conversations.`);
      } else if (res.ok) {
        setSeedResult("No projects found in your conversations. Try adding one manually.");
      } else {
        setSeedResult(data.error ?? "Something went wrong.");
      }
    } catch {
      setSeedResult("Failed to connect. Try again.");
    }
    setSeeding(false);
  }

  // Empty state
  if (projects.length === 0 && !showDialog) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-text-muted">
        <svg
          className="h-16 w-16 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <p className="text-sm">No projects yet. Start building your project map.</p>
        <div className="flex gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="rounded-lg border border-accent-primary px-4 py-2 text-sm font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors disabled:opacity-50"
          >
            {seeding ? "Scanning conversations..." : "Seed from StrategyGPT"}
          </button>
          <button
            onClick={handleAddProject}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
          >
            Add Manually
          </button>
        </div>
        {seedResult && (
          <p className="text-xs text-text-secondary">{seedResult}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <ProjectFiltersBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        allCategories={allCategories}
        personFilter={personFilter}
        onPersonFilterChange={setPersonFilter}
        allPeople={allPeople}
        selectedCount={selectedIds.size}
        totalCount={filteredProjects.length}
        onSelectAll={selectAll}
        onDeselectAll={deselectAll}
        onAddProject={handleAddProject}
        onPrint={handlePrint}
      />

      {/* Project cards grouped by category */}
      <div className="flex-1 overflow-y-auto">
        {hasMultipleGroups ? (
          <div className="space-y-6">
            {groupedProjects.map((group) => (
              <div key={group.category ?? "__uncategorized__"}>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
                  {group.category ?? "Uncategorized"}
                  <span className="ml-2 font-normal">({group.projects.length})</span>
                </h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {group.projects.map((project) => (
                    <ProjectCard
                      key={project.project_id}
                      project={project}
                      isSelected={selectedIds.has(project.project_id)}
                      onToggleSelect={() => toggleSelect(project.project_id)}
                      onEdit={() => handleEditProject(project)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                isSelected={selectedIds.has(project.project_id)}
                onToggleSelect={() => toggleSelect(project.project_id)}
                onEdit={() => handleEditProject(project)}
              />
            ))}
          </div>
        )}

        {filteredProjects.length === 0 && projects.length > 0 && (
          <div className="py-12 text-center text-sm text-text-muted">
            No projects match your filters.
          </div>
        )}
      </div>

      {showDialog && (
        <ProjectDialog
          project={editingProject}
          allCategories={allCategories}
          onSave={handleSave}
          onDelete={editingProject ? () => handleDelete(editingProject.project_id) : undefined}
          onClose={() => {
            setShowDialog(false);
            setEditingProject(null);
          }}
        />
      )}

    </div>
  );
}

// --- Project Card ---
// Matches the print view: thick left border, clean document-style layout

function ProjectCard({
  project,
  isSelected,
  onToggleSelect,
  onEdit,
}: {
  project: ProjectWithMembersAndThreads;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const members = project.project_members ?? [];
  const threads = project.linked_threads ?? [];
  const latestThread = threads[0] ?? null;

  return (
    <div
      className={`group relative cursor-pointer rounded-none border-l-4 bg-surface-secondary transition-shadow hover:shadow-md ${
        isSelected ? "ring-2 ring-accent-primary/40" : ""
      }`}
      style={{ borderLeftColor: project.color }}
      onClick={onEdit}
    >
      {/* Select checkbox (top-right) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded border transition-colors z-10 ${
          isSelected
            ? "border-accent-primary bg-accent-primary text-white"
            : "border-border-hover bg-surface-tertiary text-transparent opacity-0 group-hover:opacity-100 hover:border-text-muted"
        }`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </button>

      <div className="px-5 py-4">
        {/* Header row: project name + status badge */}
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-sm font-bold text-text-primary leading-tight tracking-tight">
            {project.name}
          </h3>
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: STATUS_COLORS[project.status] }}
          >
            {STATUS_LABELS[project.status]}
          </span>
        </div>

        {project.category && (
          <span className="mb-2 inline-block rounded bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-secondary">
            {project.category}
          </span>
        )}

        {project.description && (
          <p className="mb-3 text-[11px] text-text-secondary leading-relaxed">
            {project.description}
          </p>
        )}

        {/* StrategyGPT thread preview: where you left off */}
        {latestThread && (
          <div
            className="mb-3 rounded-lg bg-surface-tertiary/50 px-3 py-2.5 hover:bg-surface-tertiary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/coach/${latestThread.thread_id}`);
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-accent-primary">
                Where you left off
              </p>
              <span className="text-[10px] text-text-muted">
                {latestThread.last_message_at && !isNaN(new Date(latestThread.last_message_at).getTime())
                  ? formatDistanceToNow(new Date(latestThread.last_message_at), { addSuffix: true })
                  : ""}
              </span>
            </div>
            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
              {latestThread.catchup_text || latestThread.thread_brief || latestThread.title}
            </p>
            {threads.length > 1 && (
              <p className="mt-1 text-[10px] text-text-muted">
                +{threads.length - 1} more thread{threads.length > 2 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Team section */}
        <div className="border-t border-border-primary pt-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-text-muted mb-2">
            Team
          </p>
          {members.length > 0 ? (
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {members.map((m) => (
                <span key={m.member_id} className="inline-flex items-baseline gap-1.5">
                  <span className="text-[11px] font-bold text-text-primary">
                    {m.name}
                  </span>
                  {m.role && (
                    <span className="text-[10px] text-text-muted">
                      {m.role}
                    </span>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-text-muted italic">No team members listed</p>
          )}
        </div>
      </div>
    </div>
  );
}


// --- Project Dialog (same as before, extracted) ---

interface ProjectDialogProps {
  project: ProjectWithMembersAndThreads | null;
  allCategories: string[];
  onSave: (name: string, description: string, color: string, category: string, members: MemberInput[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function ProjectDialog({ project, allCategories, onSave, onDelete, onClose }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [category, setCategory] = useState(project?.category ?? "");
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [members, setMembers] = useState<MemberInput[]>(
    project?.project_members?.map((m) => ({ name: m.name, role: m.role ?? "" })) ?? [
      { name: "", role: "" },
    ]
  );
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  function addMember() {
    setMembers((prev) => [...prev, { name: "", role: "" }]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMember(index: number, field: "name" | "role", value: string) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  }

  function selectSuggestion(index: number, person: { name: string; role?: string }) {
    updateMember(index, "name", person.name);
    updateMember(index, "role", person.role ?? "");
    setShowSuggestions(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onSave(name.trim(), description.trim(), color, category.trim(), members);
    setSaving(false);
  }

  function getSuggestions(input: string) {
    if (!input.trim()) return PHAROSIQ_TEAM;
    const lower = input.toLowerCase();
    return PHAROSIQ_TEAM.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.role && p.role.toLowerCase().includes(lower))
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-2xl border border-border-primary bg-surface-primary p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-text-primary">
          {project ? "Edit Project" : "New Project"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SAP Data Feed via LiveRamp"
              className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this project"
              className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Category (optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setShowCategorySuggestions(true);
                }}
                onFocus={() => setShowCategorySuggestions(true)}
                onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                placeholder="e.g., Partnerships, Platform Integrations"
                className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              {showCategorySuggestions && allCategories.length > 0 && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-border-primary bg-surface-secondary shadow-lg">
                  {allCategories
                    .filter((c) => !category || c.toLowerCase().includes(category.toLowerCase()))
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onMouseDown={() => {
                          setCategory(c);
                          setShowCategorySuggestions(false);
                        }}
                        className="flex w-full items-center px-3 py-1.5 text-left text-xs hover:bg-surface-tertiary"
                      >
                        <span className="font-medium text-text-primary">{c}</span>
                      </button>
                    ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Color
            </label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-transform ${
                    color === c ? "ring-2 ring-offset-2 ring-offset-surface-primary scale-110" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              People on this project
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((member, i) => (
                <div key={i} className="flex gap-2 items-start relative">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => {
                        updateMember(i, "name", e.target.value);
                        setShowSuggestions(i);
                      }}
                      onFocus={() => setShowSuggestions(i)}
                      onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                      placeholder="Name"
                      className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                    />
                    {showSuggestions === i && (
                      <div className="absolute top-full left-0 z-10 mt-1 w-full max-h-32 overflow-y-auto rounded-lg border border-border-primary bg-surface-secondary shadow-lg">
                        {getSuggestions(member.name).map((person) => (
                          <button
                            key={person.name}
                            type="button"
                            onMouseDown={() => selectSuggestion(i, person)}
                            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface-tertiary"
                          >
                            <span className="font-medium text-text-primary">
                              {person.name}
                            </span>
                            {person.role && (
                              <span className="text-text-muted">{person.role}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => updateMember(i, "role", e.target.value)}
                    placeholder="Role"
                    className="w-32 rounded-lg border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  />
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="shrink-0 p-1.5 text-text-muted hover:text-status-red transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addMember}
              className="mt-2 flex items-center gap-1 text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add person
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-xs text-status-red hover:text-status-red/80 transition-colors"
                >
                  Delete project
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border-primary px-4 py-2 text-sm text-text-secondary hover:bg-surface-tertiary transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : project ? "Save" : "Create"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
