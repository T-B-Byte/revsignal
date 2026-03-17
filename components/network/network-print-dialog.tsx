"use client";

import { useState } from "react";
import type { ProjectWithMembers } from "@/types/database";

interface NetworkPrintDialogProps {
  projects: ProjectWithMembers[];
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  paused: "Paused",
  completed: "Completed",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  paused: "#eab308",
  completed: "#6b7280",
};

function generatePrintHTML(projects: ProjectWithMembers[]): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const projectBlocks = projects
    .map((p) => {
      const members = p.project_members ?? [];
      const membersHTML =
        members.length > 0
          ? `<ul class="members-list">${members
              .map(
                (m) =>
                  `<li><span class="member-name">${m.name}</span>${
                    m.role ? `<span class="member-role">${m.role}</span>` : ""
                  }</li>`
              )
              .join("")}</ul>`
          : `<p class="no-members">No team members listed</p>`;

      return `
        <div class="project-card" style="border-left-color: ${p.color};">
          <div class="project-header">
            <div class="project-title-row">
              <h2 class="project-name">${p.name}</h2>
              <span class="status-badge" style="background-color: ${STATUS_COLORS[p.status] ?? "#6b7280"}20; color: ${STATUS_COLORS[p.status] ?? "#6b7280"}; border-color: ${STATUS_COLORS[p.status] ?? "#6b7280"}40;">
                ${STATUS_LABELS[p.status] ?? p.status}
              </span>
            </div>
            ${p.description ? `<p class="project-description">${p.description}</p>` : ""}
          </div>
          <div class="project-team">
            <span class="team-label">Team</span>
            ${membersHTML}
          </div>
        </div>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Network Projects — RevSignal</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #111;
      background: #fff;
      padding: 36px 48px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-bottom: 16px;
      border-bottom: 2px solid #111;
      margin-bottom: 28px;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #111;
    }

    .page-subtitle {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
    }

    .page-meta {
      text-align: right;
      font-size: 11px;
      color: #888;
    }

    .projects-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .project-card {
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      background: #fafafa;
      border-radius: 0 6px 6px 0;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .project-header {
      margin-bottom: 10px;
    }

    .project-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .project-name {
      font-size: 14px;
      font-weight: 700;
      color: #111;
      letter-spacing: -0.01em;
    }

    .status-badge {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 2px 7px;
      border-radius: 20px;
      border: 1px solid transparent;
    }

    .project-description {
      font-size: 11px;
      color: #555;
      line-height: 1.5;
    }

    .project-team {
      padding-top: 8px;
      border-top: 1px solid #e5e5e5;
    }

    .team-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #999;
      display: block;
      margin-bottom: 6px;
    }

    .members-list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 4px 16px;
    }

    .members-list li {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .member-name {
      font-size: 11px;
      font-weight: 600;
      color: #222;
    }

    .member-role {
      font-size: 10px;
      color: #888;
    }

    .no-members {
      font-size: 11px;
      color: #bbb;
      font-style: italic;
    }

    .page-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #bbb;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 0.75in; }
    }
  </style>
</head>
<body>
  <div class="page-header">
    <div>
      <div class="page-title">Network Projects</div>
      <div class="page-subtitle">pharosIQ DaaS Partnerships &amp; Initiatives</div>
    </div>
    <div class="page-meta">
      <div>RevSignal</div>
      <div>${today}</div>
      <div>${projects.length} project${projects.length !== 1 ? "s" : ""}</div>
    </div>
  </div>

  <div class="projects-grid">
    ${projectBlocks}
  </div>

  <div class="page-footer">
    <span>RevSignal — Where signals become revenue</span>
    <span>Confidential</span>
  </div>
</body>
</html>`;
}

export function NetworkPrintDialog({ projects, onClose }: NetworkPrintDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(projects.map((p) => p.project_id))
  );

  function toggleProject(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePrint() {
    const selectedProjects = projects.filter((p) => selected.has(p.project_id));
    if (selectedProjects.length === 0) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(generatePrintHTML(selectedProjects));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  const selectedCount = selected.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl border border-border-primary bg-surface-primary p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Print Projects</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-text-muted mb-4">
          Select which projects to include in the printout.
        </p>

        {/* Select all / none */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setSelected(new Set(projects.map((p) => p.project_id)))}
            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            Select all
          </button>
          <span className="text-text-muted text-xs">·</span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Clear
          </button>
          <span className="ml-auto text-xs text-text-muted">
            {selectedCount} of {projects.length} selected
          </span>
        </div>

        {/* Project list */}
        <div className="space-y-1 max-h-72 overflow-y-auto rounded-lg border border-border-primary p-2">
          {projects.map((p) => {
            const isChecked = selected.has(p.project_id);
            return (
              <label
                key={p.project_id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  isChecked ? "bg-surface-secondary" : "hover:bg-surface-secondary/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleProject(p.project_id)}
                  className="h-3.5 w-3.5 rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                />
                {/* Color swatch */}
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <span className="flex-1 text-sm text-text-primary">{p.name}</span>
                <span className="text-xs text-text-muted">
                  {p.project_members?.length ?? 0} member{(p.project_members?.length ?? 0) !== 1 ? "s" : ""}
                </span>
              </label>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-primary px-4 py-2 text-sm text-text-secondary hover:bg-surface-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
