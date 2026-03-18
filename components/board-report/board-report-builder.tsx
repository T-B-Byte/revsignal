"use client";

import { useState, useCallback } from "react";
import type { BoardReportSection } from "@/lib/agents/strategist";

interface BoardReportBuilderProps {
  initialWeekNumber?: number;
}

interface ReportState {
  sections: BoardReportSection[];
  weekNumber: number;
  generatedAt: string;
}

export function BoardReportBuilder({ initialWeekNumber }: BoardReportBuilderProps) {
  const [report, setReport] = useState<ReportState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("DaaS Revenue Initiative");
  const [subtitle, setSubtitle] = useState("");

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/agents/board-report", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate report");
      }
      const data = await res.json();
      setReport({
        sections: data.sections,
        weekNumber: data.weekNumber,
        generatedAt: data.generatedAt,
      });
      setSubtitle(`Week ${data.weekNumber} Update`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, enabled: !s.enabled } : s
        ),
      };
    });
  }, []);

  const updateSectionContent = useCallback((sectionId: string, content: string) => {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, content } : s
        ),
      };
    });
  }, []);

  const updateSectionTitle = useCallback((sectionId: string, newTitle: string) => {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, title: newTitle } : s
        ),
      };
    });
  }, []);

  const openPrintEditor = useCallback(() => {
    if (!report) return;
    const enabledSections = report.sections.filter((s) => s.enabled);
    if (enabledSections.length === 0) return;

    const html = generateBoardReportHTML(
      enabledSections,
      title,
      subtitle,
      report.weekNumber
    );
    const editorWindow = window.open("", "_blank");
    if (!editorWindow) return;
    editorWindow.document.write(html);
    editorWindow.document.close();
  }, [report, title, subtitle]);

  const enabledCount = report?.sections.filter((s) => s.enabled).length ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border-primary pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Board Report</h1>
          <p className="text-sm text-text-muted">
            Generate a board meeting one-pager from your pipeline data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {report && (
            <button
              onClick={openPrintEditor}
              disabled={enabledCount === 0}
              className="flex items-center gap-2 rounded-lg border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PrintIcon className="h-4 w-4" />
              Open Editor
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : report ? (
              <>
                <RefreshIcon className="h-4 w-4" />
                Regenerate
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate Report
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-status-red/20 bg-status-red-bg px-4 py-3 text-sm text-status-red">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!report && !loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-md">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-secondary">
              <DocumentIcon className="h-8 w-8 text-text-muted" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              Board Meeting One-Pager
            </h2>
            <p className="text-sm text-text-muted mb-6">
              The Strategist will pull your pipeline data, deal briefs, and playbook
              progress to generate a board-ready report. You can toggle sections on/off,
              edit content, and print to PDF.
            </p>
            <button
              onClick={generateReport}
              className="inline-flex items-center gap-2 rounded-lg bg-accent-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <SpinnerIcon className="mx-auto mb-4 h-8 w-8 animate-spin text-accent-primary" />
            <p className="text-sm text-text-muted">
              The Strategist is analyzing your pipeline and generating the report...
            </p>
          </div>
        </div>
      )}

      {/* Report builder */}
      {report && !loading && (
        <div className="flex flex-1 gap-6 min-h-0">
          {/* Sidebar: section toggles */}
          <div className="w-72 shrink-0 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Sections
              </span>
              <span className="text-xs text-text-muted">
                {enabledCount} of {report.sections.length} enabled
              </span>
            </div>

            {/* Document title/subtitle controls */}
            <div className="rounded-xl border border-border-primary bg-surface-secondary p-3 mb-4">
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-2.5 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1 mt-2">
                Subtitle
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full rounded-lg border border-border-primary bg-surface-primary px-2.5 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
            </div>

            {report.sections.map((section) => (
              <label
                key={section.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  section.enabled
                    ? "border-accent-primary/30 bg-accent-glow"
                    : "border-border-primary bg-surface-secondary hover:bg-surface-tertiary"
                }`}
              >
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={() => toggleSection(section.id)}
                  className="h-3.5 w-3.5 rounded border-border-primary text-accent-primary focus:ring-accent-primary"
                />
                <span
                  className={`text-sm ${
                    section.enabled ? "text-text-primary font-medium" : "text-text-muted"
                  }`}
                >
                  {section.title}
                </span>
              </label>
            ))}

            <div className="pt-3 border-t border-border-primary mt-4">
              <p className="text-[10px] text-text-muted">
                Generated {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Main: section preview/edit */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-6">
            {report.sections
              .filter((s) => s.enabled)
              .map((section) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  onContentChange={(content) =>
                    updateSectionContent(section.id, content)
                  }
                  onTitleChange={(t) =>
                    updateSectionTitle(section.id, t)
                  }
                  onToggle={() => toggleSection(section.id)}
                />
              ))}
            {enabledCount === 0 && (
              <div className="flex items-center justify-center h-48 rounded-xl border border-dashed border-border-primary">
                <p className="text-sm text-text-muted">
                  Enable at least one section to preview the report
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Section Editor ────────────────────────────────────────────────────

function SectionEditor({
  section,
  onContentChange,
  onTitleChange,
  onToggle,
}: {
  section: BoardReportSection;
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onToggle: () => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-xl border border-border-primary bg-surface-secondary overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-primary bg-surface-tertiary/50">
        {editing ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
            autoFocus
            className="bg-transparent text-sm font-bold text-text-primary border-b border-accent-primary focus:outline-none"
          />
        ) : (
          <h3
            className="text-sm font-bold text-text-primary cursor-pointer hover:text-accent-primary transition-colors"
            onClick={() => setEditing(true)}
            title="Click to edit title"
          >
            {section.title}
          </h3>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="text-text-muted hover:text-text-primary transition-colors p-1"
            title="Edit title"
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="text-text-muted hover:text-status-red transition-colors p-1"
            title="Hide section"
          >
            <EyeOffIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <textarea
          value={section.content}
          onChange={(e) => onContentChange(e.target.value)}
          className="w-full min-h-[120px] resize-y rounded-lg border border-border-primary bg-surface-primary p-3 text-sm text-text-primary leading-relaxed focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary font-sans"
          rows={Math.max(4, section.content.split("\n").length + 1)}
        />
      </div>
    </div>
  );
}

// ── Print HTML Generator ──────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderMarkdownContent(content: string): string {
  // Handle tables
  if (content.includes("|") && content.includes("---")) {
    return renderTable(content);
  }

  // Handle bullet lists and bold text
  const lines = content.split("\n");
  const rendered: string[] = [];
  let listType: "ul" | "ol" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ")) {
      if (listType !== "ul") {
        if (listType) rendered.push(`</${listType}>`);
        rendered.push("<ul>");
        listType = "ul";
      }
      rendered.push(`<li>${renderInline(escapeHtml(trimmed.slice(2)))}</li>`);
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (listType !== "ol") {
        if (listType) rendered.push(`</${listType}>`);
        rendered.push("<ol>");
        listType = "ol";
      }
      const text = trimmed.replace(/^\d+\.\s/, "");
      rendered.push(`<li>${renderInline(escapeHtml(text))}</li>`);
    } else {
      if (listType) {
        rendered.push(`</${listType}>`);
        listType = null;
      }
      if (trimmed) {
        rendered.push(`<p>${renderInline(escapeHtml(trimmed))}</p>`);
      }
    }
  }

  if (listType) {
    rendered.push(`</${listType}>`);
  }

  return rendered.join("\n");
}

function renderInline(text: string): string {
  // Bold: **text**
  return text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderTable(content: string): string {
  const lines = content.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return `<p>${escapeHtml(content)}</p>`;

  const parseRow = (line: string): string[] =>
    line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell && !cell.match(/^-+$/));

  const headerCells = parseRow(lines[0]);
  // Skip separator line (line 1)
  const bodyLines = lines.slice(2);

  let html = '<table><thead><tr>';
  for (const cell of headerCells) {
    html += `<th>${escapeHtml(cell)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const line of bodyLines) {
    const cells = parseRow(line);
    if (cells.length === 0) continue;
    html += '<tr>';
    for (const cell of cells) {
      html += `<td>${escapeHtml(cell)}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

function generateBoardReportHTML(
  sections: BoardReportSection[],
  docTitle: string,
  docSubtitle: string,
  weekNumber: number
): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sectionsHTML = sections
    .map(
      (s) => `
    <div class="section">
      <h2 class="section-title" contenteditable="true" spellcheck="false">${escapeHtml(s.title)}</h2>
      <div class="section-content" contenteditable="true" spellcheck="false">${renderMarkdownContent(s.content)}</div>
    </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(docTitle)}: ${escapeHtml(docSubtitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      font-size: 12px;
      color: #111;
      background: #f5f5f5;
      padding: 0;
      line-height: 1.6;
    }

    /* Toolbar */
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

    /* Page */
    .page {
      max-width: 850px;
      margin: 24px auto;
      background: #fff;
      padding: 48px 56px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.08);
      border-radius: 4px;
    }

    /* Header */
    .page-title {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #111;
      outline: none;
      margin-bottom: 4px;
    }
    .page-subtitle {
      font-size: 13px;
      color: #666;
      outline: none;
      margin-bottom: 36px;
    }

    [contenteditable]:hover { background: #fffde7; }
    [contenteditable]:focus { background: #fffde7; border-radius: 2px; outline: none; }

    /* Sections */
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: #111;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
      outline: none;
    }
    .section-content {
      outline: none;
    }
    .section-content p {
      margin-bottom: 10px;
      line-height: 1.65;
      font-size: 12px;
    }
    .section-content strong {
      font-weight: 700;
    }

    /* Lists */
    .section-content ul,
    .section-content ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    .section-content li {
      margin-bottom: 6px;
      line-height: 1.55;
      font-size: 12px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 11.5px;
    }
    th {
      text-align: left;
      padding: 8px 12px;
      background: #f8f8f8;
      border-bottom: 2px solid #ddd;
      font-weight: 700;
      font-size: 11px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
      vertical-align: top;
      line-height: 1.5;
    }
    tr:last-child td {
      border-bottom: none;
    }

    /* Callout for Year 1 target type content */
    .callout {
      background: #f8f8f8;
      border-left: 3px solid #111;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 12px;
    }

    /* Footer */
    .page-footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e5e5e5;
      font-size: 10px;
      color: #bbb;
      font-style: italic;
    }

    /* Print */
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .page { box-shadow: none; margin: 0; padding: 0; max-width: none; }
      [contenteditable] { background: none !important; }
      @page { margin: 0.75in; }
    }
  </style>
</head>
<body>

  <div class="toolbar">
    <span class="toolbar-label">Board Report Editor</span>
    <span style="font-size: 11px; opacity: 0.7;">Click any text to edit inline</span>
    <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <div class="page">
    <div class="page-title" contenteditable="true" spellcheck="false">${escapeHtml(docTitle)}: ${escapeHtml(docSubtitle)}</div>
    <div class="page-subtitle" contenteditable="true" spellcheck="false">For Board Reference, ${today}</div>

    ${sectionsHTML}

    <div class="page-footer">
      Prepared by Tina Bean, SVP Data Products &amp; Partnerships
    </div>
  </div>

</body>
</html>`;
}

// ── Icons ─────────────────────────────────────────────────────────────

function PrintIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.25 7.034V3.375" />
    </svg>
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}
