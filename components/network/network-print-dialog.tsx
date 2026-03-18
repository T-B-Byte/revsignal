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

/**
 * Generates a self-contained interactive HTML page.
 * Edit mode: inline-editable title/subtitle, named sections, drag-and-drop cards.
 * Print mode: hides all edit controls, produces clean output.
 */
export function generatePrintHTML(projects: ProjectWithMembers[], title: string, subtitle: string): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Serialize project data as JSON for the embedded JS
  const projectsJSON = JSON.stringify(
    projects.map((p) => ({
      id: p.project_id,
      name: p.name,
      description: p.description,
      status: p.status,
      color: p.color,
      members: (p.project_members ?? []).map((m) => ({
        name: m.name,
        role: m.role,
      })),
    }))
  );

  const statusLabelsJSON = JSON.stringify(STATUS_LABELS);
  const statusColorsJSON = JSON.stringify(STATUS_COLORS);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #111;
      background: #f5f5f5;
      padding: 0;
    }

    /* ---- Toolbar (hidden on print) ---- */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 48px;
      background: #1a1a2e;
      color: #fff;
      font-size: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .toolbar-label {
      font-weight: 600;
      opacity: 0.6;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-right: 4px;
    }
    .toolbar button {
      padding: 6px 14px;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.08);
      color: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 11px;
      font-weight: 500;
      transition: background 0.15s;
    }
    .toolbar button:hover { background: rgba(255,255,255,0.18); }
    .toolbar .btn-print {
      margin-left: auto;
      background: #3b82f6;
      border-color: #3b82f6;
      font-weight: 600;
    }
    .toolbar .btn-print:hover { background: #2563eb; }

    /* ---- Page container ---- */
    .page {
      max-width: 900px;
      margin: 24px auto;
      background: #fff;
      padding: 36px 48px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      border-radius: 4px;
    }

    /* ---- Header ---- */
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
      outline: none;
      min-width: 60px;
    }
    .page-subtitle {
      font-size: 12px;
      color: #666;
      margin-top: 2px;
      outline: none;
      min-width: 40px;
    }
    [contenteditable]:hover { background: #fffde7; }
    [contenteditable]:focus { background: #fffde7; border-radius: 2px; }
    .page-meta {
      text-align: right;
      font-size: 11px;
      color: #888;
      flex-shrink: 0;
    }

    /* ---- Sections ---- */
    .section {
      margin-bottom: 28px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #ddd;
    }
    .section-name {
      font-size: 14px;
      font-weight: 700;
      color: #333;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      outline: none;
      min-width: 60px;
    }
    .section-count {
      font-size: 10px;
      color: #999;
      font-weight: 500;
    }
    .section-delete {
      margin-left: auto;
      background: none;
      border: none;
      color: #ccc;
      cursor: pointer;
      font-size: 16px;
      padding: 2px 6px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .section-delete:hover { color: #e53e3e; background: #fff5f5; }

    /* ---- Drop zone ---- */
    .drop-zone {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      min-height: 60px;
      padding: 8px;
      border: 2px dashed transparent;
      border-radius: 8px;
      transition: border-color 0.15s, background 0.15s;
    }
    .drop-zone.drag-over {
      border-color: #3b82f6;
      background: #eff6ff;
    }
    .drop-zone-empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 16px;
      color: #ccc;
      font-size: 11px;
      font-style: italic;
    }

    /* ---- Project cards ---- */
    .project-card {
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      background: #fafafa;
      border-radius: 0 6px 6px 0;
      break-inside: avoid;
      page-break-inside: avoid;
      cursor: grab;
      transition: box-shadow 0.15s, opacity 0.15s;
      position: relative;
    }
    .project-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .project-card.dragging { opacity: 0.4; }
    .drag-handle {
      position: absolute;
      top: 8px;
      right: 8px;
      color: #ccc;
      font-size: 14px;
      cursor: grab;
      user-select: none;
    }

    .project-header { margin-bottom: 10px; }
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

    /* ---- Footer ---- */
    .page-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #bbb;
    }

    /* ---- Print styles ---- */
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page { box-shadow: none; margin: 0; padding: 0; max-width: none; }
      .drag-handle { display: none !important; }
      .section-delete { display: none !important; }
      .drop-zone { border: none !important; background: none !important; padding: 0; }
      .drop-zone-empty { display: none !important; }
      .project-card { cursor: default; box-shadow: none !important; }
      [contenteditable] { background: none !important; }
      [contenteditable]:empty { display: none; }
      @page { margin: 0.75in; }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <span class="toolbar-label">Editor</span>
    <button onclick="addSection()">+ Add Section</button>
    <button onclick="toggleAll(true)">Show All</button>
    <button onclick="toggleAll(false)">Hide All</button>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page">
    <div class="page-header">
      <div>
        <div class="page-title" contenteditable="true" spellcheck="false">${escapeHtml(title)}</div>
        <div class="page-subtitle" contenteditable="true" spellcheck="false">${escapeHtml(subtitle)}</div>
      </div>
      <div class="page-meta">
        <div>Tina Bean</div>
        <div>${today}</div>
        <div class="project-count-display"></div>
      </div>
    </div>

    <div id="sections-container"></div>

    <div class="page-footer">
      <span>Confidential</span>
      <span>${today}</span>
    </div>
  </div>

<script>
(function() {
  var PROJECTS = ${projectsJSON};
  var STATUS_LABELS = ${statusLabelsJSON};
  var STATUS_COLORS = ${statusColorsJSON};

  // State: array of { id, name, projectIds }
  var sections = [
    { id: 'default', name: 'All Projects', projectIds: PROJECTS.map(function(p) { return p.id; }) }
  ];

  var draggedProjectId = null;
  var draggedFromSection = null;

  function projectById(id) {
    for (var i = 0; i < PROJECTS.length; i++) {
      if (PROJECTS[i].id === id) return PROJECTS[i];
    }
    return null;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCard(p) {
    var sc = STATUS_COLORS[p.status] || '#6b7280';
    var sl = STATUS_LABELS[p.status] || p.status;
    var membersHTML = '';
    if (p.members.length > 0) {
      membersHTML = '<ul class="members-list">' + p.members.map(function(m) {
        return '<li><span class="member-name">' + escapeHtml(m.name) + '</span>' +
          (m.role ? '<span class="member-role">' + escapeHtml(m.role) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    } else {
      membersHTML = '<p class="no-members">No team members listed</p>';
    }

    return '<div class="project-card" draggable="true" data-project-id="' + p.id + '" ' +
      'style="border-left-color: ' + p.color + ';">' +
      '<span class="drag-handle">&#x2630;</span>' +
      '<div class="project-header">' +
        '<div class="project-title-row">' +
          '<h2 class="project-name">' + escapeHtml(p.name) + '</h2>' +
          '<span class="status-badge" style="background-color: ' + sc + '20; color: ' + sc + '; border-color: ' + sc + '40;">' + sl + '</span>' +
        '</div>' +
        (p.description ? '<p class="project-description">' + escapeHtml(p.description) + '</p>' : '') +
      '</div>' +
      '<div class="project-team">' +
        '<span class="team-label">Team</span>' +
        membersHTML +
      '</div>' +
    '</div>';
  }

  function render() {
    var container = document.getElementById('sections-container');
    var html = '';
    var totalCount = 0;

    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      totalCount += sec.projectIds.length;

      html += '<div class="section" data-section-id="' + sec.id + '">';
      if (sections.length > 1 || sec.name !== 'All Projects') {
        html += '<div class="section-header">' +
          '<span class="section-name" contenteditable="true" spellcheck="false" data-section-id="' + sec.id + '">' + escapeHtml(sec.name) + '</span>' +
          '<span class="section-count">' + sec.projectIds.length + ' project' + (sec.projectIds.length !== 1 ? 's' : '') + '</span>' +
          '<button class="section-delete" onclick="deleteSection(\'' + sec.id + '\')" title="Remove section">&times;</button>' +
        '</div>';
      }
      html += '<div class="drop-zone" data-section-id="' + sec.id + '">';
      if (sec.projectIds.length === 0) {
        html += '<div class="drop-zone-empty">Drag projects here</div>';
      } else {
        for (var pi = 0; pi < sec.projectIds.length; pi++) {
          var p = projectById(sec.projectIds[pi]);
          if (p) html += renderCard(p);
        }
      }
      html += '</div></div>';
    }

    container.innerHTML = html;

    // Update count
    var countEl = document.querySelector('.project-count-display');
    if (countEl) countEl.textContent = totalCount + ' project' + (totalCount !== 1 ? 's' : '');

    // Attach drag events
    attachDragEvents();
  }

  function attachDragEvents() {
    // Cards
    var cards = document.querySelectorAll('.project-card[draggable]');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('dragstart', onDragStart);
      cards[i].addEventListener('dragend', onDragEnd);
    }
    // Drop zones
    var zones = document.querySelectorAll('.drop-zone');
    for (var j = 0; j < zones.length; j++) {
      zones[j].addEventListener('dragover', onDragOver);
      zones[j].addEventListener('dragleave', onDragLeave);
      zones[j].addEventListener('drop', onDrop);
    }
    // Section name editing
    var names = document.querySelectorAll('.section-name[contenteditable]');
    for (var k = 0; k < names.length; k++) {
      names[k].addEventListener('blur', onSectionNameBlur);
      names[k].addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
      });
    }
  }

  function onDragStart(e) {
    var card = e.target.closest('.project-card');
    if (!card) return;
    draggedProjectId = card.getAttribute('data-project-id');
    var zone = card.closest('.drop-zone');
    draggedFromSection = zone ? zone.getAttribute('data-section-id') : null;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedProjectId);
  }

  function onDragEnd(e) {
    var card = e.target.closest('.project-card');
    if (card) card.classList.remove('dragging');
    draggedProjectId = null;
    draggedFromSection = null;
    var zones = document.querySelectorAll('.drop-zone');
    for (var i = 0; i < zones.length; i++) zones[i].classList.remove('drag-over');
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  }

  function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');

    var targetSectionId = e.currentTarget.getAttribute('data-section-id');
    if (!draggedProjectId) return;

    // Find insert position based on mouse Y relative to cards in the drop zone
    var insertIndex = -1;
    var cards = e.currentTarget.querySelectorAll('.project-card');
    for (var i = 0; i < cards.length; i++) {
      var rect = cards[i].getBoundingClientRect();
      var midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        insertIndex = i;
        break;
      }
    }

    // Remove from source section
    for (var s = 0; s < sections.length; s++) {
      var idx = sections[s].projectIds.indexOf(draggedProjectId);
      if (idx !== -1) {
        sections[s].projectIds.splice(idx, 1);
        break;
      }
    }

    // Add to target section
    for (var t = 0; t < sections.length; t++) {
      if (sections[t].id === targetSectionId) {
        if (insertIndex === -1 || insertIndex >= sections[t].projectIds.length) {
          sections[t].projectIds.push(draggedProjectId);
        } else {
          sections[t].projectIds.splice(insertIndex, 0, draggedProjectId);
        }
        break;
      }
    }

    render();
  }

  function onSectionNameBlur(e) {
    var sectionId = e.target.getAttribute('data-section-id');
    var newName = e.target.textContent.trim();
    if (!newName) newName = 'Untitled Section';
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === sectionId) {
        sections[i].name = newName;
        break;
      }
    }
  }

  // Global functions called from HTML
  window.addSection = function() {
    var id = 'section-' + Date.now();
    sections.push({ id: id, name: 'New Section', projectIds: [] });
    render();
    // Focus the new section name for editing
    setTimeout(function() {
      var el = document.querySelector('.section-name[data-section-id="' + id + '"]');
      if (el) {
        el.focus();
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 50);
  };

  window.deleteSection = function(sectionId) {
    // Move projects back to the first section
    var removed = [];
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === sectionId) {
        removed = sections[i].projectIds;
        sections.splice(i, 1);
        break;
      }
    }
    if (sections.length === 0) {
      sections.push({ id: 'default', name: 'All Projects', projectIds: removed });
    } else {
      sections[0].projectIds = sections[0].projectIds.concat(removed);
    }
    render();
  };

  window.toggleAll = function(show) {
    // Show all = put all projects in their sections; Hide all = clear all sections
    // Actually: show = expand all projects back, hide = not useful.
    // Let's make "Show All" = one flat section, "Hide All" = just a noop
    // Better: these are meaningless without hidden projects. Let's repurpose:
    // "Show All" = reset to single section with all projects
    if (show) {
      sections = [{ id: 'default', name: 'All Projects', projectIds: PROJECTS.map(function(p) { return p.id; }) }];
      render();
    }
  };

  // Initial render
  render();
})();
</script>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function NetworkPrintDialog({ projects, onClose }: NetworkPrintDialogProps) {
  const [title, setTitle] = useState("Projects");
  const [subtitle, setSubtitle] = useState("pharosIQ DaaS Partnerships & Initiatives");
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

  function handleOpenEditor() {
    const selectedProjects = projects.filter((p) => selected.has(p.project_id));
    if (selectedProjects.length === 0) return;

    const editorWindow = window.open("", "_blank");
    if (!editorWindow) return;

    editorWindow.document.write(
      generatePrintHTML(selectedProjects, title.trim() || "Projects", subtitle.trim())
    );
    editorWindow.document.close();
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

        {/* Document title & subtitle */}
        <div className="space-y-2 mb-4">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Network Projects"
              className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
              Subtitle (optional)
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g., pharosIQ DaaS Partnerships"
              className="w-full rounded-lg border border-border-primary bg-surface-secondary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
          </div>
        </div>

        <p className="text-xs text-text-muted mb-4">
          Select which projects to include, then open the editor to arrange them.
        </p>

        {/* Select all / none */}
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setSelected(new Set(projects.map((p) => p.project_id)))}
            className="text-xs text-accent-primary hover:text-accent-primary/80 transition-colors"
          >
            Select all
          </button>
          <span className="text-text-muted text-xs">&middot;</span>
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
            onClick={handleOpenEditor}
            disabled={selectedCount === 0}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Open Editor
          </button>
        </div>
      </div>
    </div>
  );
}
