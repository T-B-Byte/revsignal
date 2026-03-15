"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ProjectWithMembers } from "@/types/database";
import { PROJECT_COLORS, PHAROSIQ_TEAM } from "@/types/database";
import { useNetworkGraph, DEFAULT_FILTERS, type NetworkFilters } from "./use-network-graph";
import type { ProjectNodeData } from "./use-network-graph";
import { nodeTypes } from "./network-nodes";
import { edgeTypes } from "./network-edges";
import { NetworkFiltersBar } from "./network-filters";

interface NetworkViewProps {
  initialProjects: ProjectWithMembers[];
}

interface MemberInput {
  name: string;
  role: string;
}

export function NetworkView({ initialProjects }: NetworkViewProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [filters, setFilters] = useState<NetworkFilters>(DEFAULT_FILTERS);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithMembers | null>(null);

  // Compute graph
  const { nodes: graphNodes, edges: graphEdges } = useNetworkGraph(
    projects,
    filters
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Keep nodes/edges in sync when the computed graph changes
  const prevNodesRef = useRef(graphNodes);
  const prevEdgesRef = useRef(graphEdges);
  useEffect(() => {
    if (prevNodesRef.current !== graphNodes) {
      prevNodesRef.current = graphNodes;
      setNodes(graphNodes);
    }
    if (prevEdgesRef.current !== graphEdges) {
      prevEdgesRef.current = graphEdges;
      setEdges(graphEdges);
    }
  }, [graphNodes, graphEdges, setNodes, setEdges]);

  // Click handler — open edit dialog on project node click
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "projectNode") {
        const data = node.data as unknown as ProjectNodeData;
        const project = projects.find((p) => p.project_id === data.projectId);
        if (project) {
          setEditingProject(project);
          setShowDialog(true);
        }
      }
    },
    [projects]
  );

  function handleAddProject() {
    setEditingProject(null);
    setShowDialog(true);
  }

  async function handleSave(
    name: string,
    description: string,
    color: string,
    members: MemberInput[]
  ) {
    const memberPayload = members
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name.trim(), role: m.role.trim() || undefined }));

    if (editingProject) {
      // Update
      const res = await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: editingProject.project_id,
          name,
          description: description || null,
          color,
          members: memberPayload,
        }),
      });
      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.project_id === project.project_id ? project : p))
        );
      }
    } else {
      // Create
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          color,
          members: memberPayload,
        }),
      });
      if (res.ok) {
        const { project } = await res.json();
        setProjects((prev) => [project, ...prev]);
      }
    }
    setShowDialog(false);
    setEditingProject(null);
  }

  async function handleDelete(projectId: string) {
    const res = await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setShowDialog(false);
      setEditingProject(null);
    }
  }

  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function handleSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/projects/seed", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.projectsCreated > 0) {
        // Refetch projects
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
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" />
        </svg>
        <p className="text-sm">No projects yet. Build your network map.</p>
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
      <NetworkFiltersBar
        filters={filters}
        onChange={setFilters}
        onAddProject={handleAddProject}
      />

      <div className="relative flex-1 rounded-xl border border-border-primary overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="var(--color-border-primary, #333)"
          />
          <Controls
            className="!bg-surface-secondary !border-border-primary !shadow-lg [&>button]:!bg-surface-secondary [&>button]:!border-border-primary [&>button]:!text-text-secondary [&>button:hover]:!bg-surface-tertiary"
          />
          <MiniMap
            className="!bg-surface-secondary !border-border-primary"
            nodeColor={(node) => {
              if (node.type === "userNode") return "var(--color-accent-primary, #3b82f6)";
              if (node.type === "projectNode") {
                const data = node.data as unknown as ProjectNodeData;
                return data.color;
              }
              return "var(--color-text-muted, #6b7280)";
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>

      {showDialog && (
        <ProjectDialog
          project={editingProject}
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

// --- Project Dialog ---

interface ProjectDialogProps {
  project: ProjectWithMembers | null;
  onSave: (name: string, description: string, color: string, members: MemberInput[]) => void;
  onDelete?: () => void;
  onClose: () => void;
}

function ProjectDialog({ project, onSave, onDelete, onClose }: ProjectDialogProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
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
    await onSave(name.trim(), description.trim(), color, members);
    setSaving(false);
  }

  // Filter suggestions based on current input
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
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SAP, Leadscale, Leadpredict"
              className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              autoFocus
            />
          </div>

          {/* Description */}
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

          {/* Color */}
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

          {/* Members */}
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

          {/* Actions */}
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
