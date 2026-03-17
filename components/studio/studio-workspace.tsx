"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ThreadChat } from "@/components/coaching/thread-chat";
import type { CoachingMessage, CoachingThread } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  battlecard: "Battlecard",
  one_pager: "One-Pager",
  proposal: "Proposal",
  competitive_analysis: "Competitive Analysis",
  contract_analysis: "Contract Analysis",
  freeform: "Freeform",
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

interface OutputSection {
  id: string;
  title: string;
  content: string;
  type: "text" | "bullets";
  bullets?: string[];
}

interface StudioProject {
  project_id: string;
  title: string;
  type: string;
  status: string;
  description: string | null;
  output_json: OutputSection[];
  thread_id: string | null;
}

interface StudioWorkspaceProps {
  project: StudioProject;
  thread: CoachingThread | null;
  initialMessages: CoachingMessage[];
}

export function StudioWorkspace({ project, thread, initialMessages }: StudioWorkspaceProps) {
  const router = useRouter();
  const [outputSections, setOutputSections] = useState<OutputSection[]>(
    Array.isArray(project.output_json) ? project.output_json : []
  );
  const [status, setStatus] = useState(project.status);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"pptx" | "pdf" | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionContent, setNewSectionContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Persist output_json to DB
  const persistOutput = useCallback(async (sections: OutputSection[]) => {
    setSaving(true);
    try {
      await fetch(`/api/studio/${project.project_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output_json: sections }),
      });
    } catch {
      // Non-blocking — silently fail, user still has local state
    } finally {
      setSaving(false);
    }
  }, [project.project_id]);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    await fetch(`/api/studio/${project.project_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  function addSection() {
    if (!newSectionTitle.trim()) return;
    const section: OutputSection = {
      id: crypto.randomUUID(),
      title: newSectionTitle.trim(),
      content: newSectionContent.trim(),
      type: "text",
    };
    const updated = [...outputSections, section];
    setOutputSections(updated);
    persistOutput(updated);
    setNewSectionTitle("");
    setNewSectionContent("");
    setShowAddSection(false);
  }

  function deleteSection(id: string) {
    const updated = outputSections.filter((s) => s.id !== id);
    setOutputSections(updated);
    persistOutput(updated);
  }

  function moveSection(id: string, direction: "up" | "down") {
    const idx = outputSections.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= outputSections.length) return;
    const updated = [...outputSections];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    setOutputSections(updated);
    persistOutput(updated);
  }

  function updateSection(id: string, title: string, content: string) {
    const updated = outputSections.map((s) =>
      s.id === id ? { ...s, title, content } : s
    );
    setOutputSections(updated);
    persistOutput(updated);
    setEditingId(null);
  }

  async function handleExportPPT() {
    setExporting("pptx");
    try {
      const res = await fetch(`/api/studio/${project.project_id}/export?format=pptx`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("PPT export failed. Try again.");
    } finally {
      setExporting(null);
    }
  }

  function handleExportPDF() {
    window.print();
  }

  const primeMessage = buildPrimeMessage(project);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-primary">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-primary bg-surface-secondary px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push("/studio")}
            className="text-text-muted hover:text-text-secondary shrink-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-semibold text-text-primary">{project.title}</h1>
              <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-tertiary text-text-muted">
                {TYPE_LABELS[project.type] ?? project.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {saving && <span className="text-xs text-text-muted">Saving…</span>}

          {/* Status selector */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-lg border border-border-primary bg-surface-secondary px-2 py-1.5 text-xs text-text-secondary focus:border-accent-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Export buttons */}
          <button
            onClick={handleExportPPT}
            disabled={exporting !== null || outputSections.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {exporting === "pptx" ? "Exporting…" : "↓ PPT"}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={outputSections.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-border-secondary hover:text-text-primary disabled:opacity-50"
          >
            ↓ PDF
          </button>
        </div>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Strategist chat */}
        <div className="flex w-1/2 flex-col border-r border-border-primary overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border-primary px-4 py-2">
            <svg className="h-4 w-4 text-accent-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            <span className="text-xs font-medium text-text-secondary">The Strategist</span>
          </div>
          {thread ? (
            <div className="flex-1 overflow-hidden">
              <ThreadChat
                thread={thread}
                initialMessages={initialMessages}
                primeMessage={initialMessages.length === 0 ? primeMessage : undefined}
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
              Chat unavailable — thread not linked.
            </div>
          )}
        </div>

        {/* Right: Output panel */}
        <div className="flex w-1/2 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-border-primary px-4 py-2">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-xs font-medium text-text-secondary">Output</span>
              <span className="text-xs text-text-muted">({outputSections.length} section{outputSections.length !== 1 ? "s" : ""})</span>
            </div>
            <button
              onClick={() => setShowAddSection(true)}
              className="rounded-lg bg-accent-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-accent-primary/90"
            >
              + Section
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 print:px-0">
            {/* Print header */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold">{project.title}</h1>
              {project.description && <p className="mt-1 text-sm text-gray-600">{project.description}</p>}
              <p className="mt-1 text-xs text-gray-400">Generated by RevSignal — The Strategist</p>
            </div>

            {outputSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-text-muted">No output sections yet.</p>
                <p className="mt-1 text-xs text-text-muted">
                  Ask the Strategist to build your {TYPE_LABELS[project.type] ?? "project"}, then add sections here.
                </p>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="mt-4 rounded-lg border border-dashed border-border-primary px-4 py-2 text-xs text-text-muted hover:border-accent-primary hover:text-accent-primary"
                >
                  + Add first section
                </button>
              </div>
            ) : (
              outputSections.map((section, idx) => (
                <OutputSectionCard
                  key={section.id}
                  section={section}
                  isEditing={editingId === section.id}
                  onEdit={() => setEditingId(section.id)}
                  onSave={(title, content) => updateSection(section.id, title, content)}
                  onCancel={() => setEditingId(null)}
                  onDelete={() => deleteSection(section.id)}
                  onMoveUp={idx > 0 ? () => moveSection(section.id, "up") : undefined}
                  onMoveDown={idx < outputSections.length - 1 ? () => moveSection(section.id, "down") : undefined}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Section Modal */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border-primary bg-surface-primary shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-primary px-6 py-4">
              <h2 className="text-sm font-semibold text-text-primary">Add Output Section</h2>
              <button onClick={() => setShowAddSection(false)} className="text-text-muted hover:text-text-secondary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Section title</label>
                <input
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Why We Win, Pricing, Objection Responses"
                  className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  maxLength={200}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text-secondary">Content</label>
                <textarea
                  value={newSectionContent}
                  onChange={(e) => setNewSectionContent(e.target.value)}
                  placeholder="Paste or type content from the Strategist chat…"
                  rows={6}
                  className="w-full resize-y rounded-lg border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-border-primary px-6 py-4">
              <button onClick={() => setShowAddSection(false)} className="rounded-lg px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button
                onClick={addSection}
                disabled={!newSectionTitle.trim()}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Output Section Card ────────────────────────────────────────────────────

interface OutputSectionCardProps {
  section: OutputSection;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function OutputSectionCard({
  section,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
}: OutputSectionCardProps) {
  const [editTitle, setEditTitle] = useState(section.title);
  const [editContent, setEditContent] = useState(section.content);

  if (isEditing) {
    return (
      <div className="rounded-xl border border-accent-primary/50 bg-surface-secondary p-4 space-y-3">
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full rounded-lg border border-border-primary bg-surface-primary px-3 py-1.5 text-sm font-semibold text-text-primary focus:border-accent-primary focus:outline-none"
        />
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={6}
          className="w-full resize-y rounded-lg border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1 text-xs text-text-muted hover:text-text-secondary">Cancel</button>
          <button
            onClick={() => onSave(editTitle, editContent)}
            className="rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border border-border-primary bg-surface-secondary p-4 print:border-0 print:border-b print:rounded-none print:pb-4 print:mb-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{section.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
          {onMoveUp && (
            <button onClick={onMoveUp} className="rounded p-1 text-text-muted hover:text-text-secondary" title="Move up">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="rounded p-1 text-text-muted hover:text-text-secondary" title="Move down">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          <button onClick={onEdit} className="rounded p-1 text-text-muted hover:text-text-secondary" title="Edit">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </button>
          <button onClick={onDelete} className="rounded p-1 text-text-muted hover:text-red-400" title="Delete">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {section.content && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-text-secondary leading-relaxed">
          {section.content}
        </p>
      )}
    </div>
  );
}

// ─── Prime message builder ──────────────────────────────────────────────────

function buildPrimeMessage(project: StudioProject): string {
  const typeDescriptions: Record<string, string> = {
    battlecard: "a competitive battlecard for my sales team",
    one_pager: "a one-pager overview",
    proposal: "a formal proposal",
    competitive_analysis: "a competitive analysis",
    contract_analysis: "a contract gap analysis",
    freeform: "a project deliverable",
  };
  const what = typeDescriptions[project.type] ?? "a deliverable";
  let msg = `I'm working on ${what}: **${project.title}**.`;
  if (project.description) {
    msg += `\n\nContext: ${project.description}`;
  }
  msg += `\n\nPlease start by proposing an outline — the key sections this ${TYPE_LABELS[project.type] ?? "deliverable"} should cover. Once I approve, we'll build each section together.`;
  return msg;
}
