'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StrategistBriefingProps {
  hasAiAccess: boolean;
}

// ── Types ────────────────────────────────────────────────────────────

interface BriefingSection {
  title: string;
  items: BriefingItem[];
}

interface BriefingItem {
  /** Key for persisting annotations: "SectionTitle:index" */
  key: string;
  text: string;
}

interface ItemAnnotation {
  status?: 'done' | 'pushed';
  note?: string;
  pushed_to?: string;
}

type Annotations = Record<string, ItemAnnotation>;

// ── Parsing ──────────────────────────────────────────────────────────

function parseBriefing(text: string): BriefingSection[] {
  const lines = text.split('\n');
  const sections: BriefingSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  function flush() {
    if (!currentTitle && currentLines.length === 0) return;
    const items = extractItems(currentTitle, currentLines);
    sections.push({ title: currentTitle, items });
  }

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.+)/);
    if (headerMatch) {
      flush();
      currentTitle = headerMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  flush();

  // Fallback: no ## headers found
  if (sections.length === 0 && text.trim()) {
    sections.push({
      title: '',
      items: [{ key: '__full:0', text: text.trim() }],
    });
  }

  return sections;
}

/** Turn lines within a section into interactive items.
 *  Bullet lines (- or * or 1.) become individual items.
 *  Non-bullet text is grouped into context blocks. */
function extractItems(sectionTitle: string, lines: string[]): BriefingItem[] {
  const items: BriefingItem[] = [];
  let contextBuf: string[] = [];
  let idx = 0;

  function flushContext() {
    const text = contextBuf.join('\n').trim();
    if (text) {
      items.push({ key: `${sectionTitle}:ctx${idx}`, text });
      idx++;
    }
    contextBuf = [];
  }

  for (const line of lines) {
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+[.)]\s/.test(line)) {
      flushContext();
      items.push({ key: `${sectionTitle}:${idx}`, text: line.replace(/^\s*[-*]\s*/, '').replace(/^\s*\d+[.)]\s*/, '').trim() });
      idx++;
    } else {
      contextBuf.push(line);
    }
  }
  flushContext();
  return items;
}

/** Is this item a bullet item (actionable) vs a context block? */
function isActionable(key: string): boolean {
  return !key.includes(':ctx');
}

// ── Main Component ───────────────────────────────────────────────────

export function StrategistBriefing({ hasAiAccess }: StrategistBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isEdited, setIsEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Item annotations (done, pushed, notes)
  const [annotations, setAnnotations] = useState<Annotations>({});
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [pushDate, setPushDate] = useState('');
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  // Full edit mode
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const didAutoGenerate = useRef(false);

  const loadBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/briefing');
      if (!res.ok) return null;
      const data = await res.json();
      if (data.briefing) {
        setBriefing(data.briefing);
        setOriginalContent(data.originalContent);
        setGeneratedAt(data.generatedAt);
        setIsEdited(data.isEdited ?? false);
        setAnnotations(data.sectionNotes ?? {});
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const autoGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/agents/briefing', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate briefing.');
        return;
      }
      const data = await res.json();
      setBriefing(data.briefing);
      setOriginalContent(data.originalContent);
      setGeneratedAt(data.generatedAt);
      setIsEdited(false);
      setAnnotations({});
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasAiAccess) {
      setInitialLoading(false);
      return;
    }

    let cancelled = false;

    async function init() {
      const existing = await loadBriefing();
      if (cancelled) return;

      if (existing) {
        setInitialLoading(false);
      } else if (!didAutoGenerate.current) {
        didAutoGenerate.current = true;
        setInitialLoading(false);
        await autoGenerate();
      } else {
        setInitialLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [hasAiAccess, loadBriefing, autoGenerate]);

  // ── Annotation persistence ─────────────────────────────────────────

  async function persistAnnotations(updated: Annotations) {
    setSavingAnnotation(true);
    try {
      const res = await fetch('/api/agents/briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_notes: updated }),
      });
      if (res.ok) {
        setAnnotations(updated);
      } else {
        setError('Failed to save.');
      }
    } catch {
      setError('Network error.');
    } finally {
      setSavingAnnotation(false);
    }
  }

  function toggleDone(itemKey: string) {
    const current = annotations[itemKey];
    const updated = { ...annotations };
    if (current?.status === 'done') {
      // Undo done — keep note if any
      const { status, ...rest } = current;
      if (rest.note || rest.pushed_to) {
        updated[itemKey] = rest;
      } else {
        delete updated[itemKey];
      }
    } else {
      updated[itemKey] = { ...current, status: 'done', pushed_to: undefined };
    }
    persistAnnotations(updated);
  }

  function openItemPanel(itemKey: string) {
    const existing = annotations[itemKey];
    setActiveItem(itemKey);
    setNoteText(existing?.note ?? '');
    setPushDate(existing?.pushed_to ?? '');
  }

  function closeItemPanel() {
    setActiveItem(null);
    setNoteText('');
    setPushDate('');
  }

  async function saveItemAnnotation() {
    if (!activeItem) return;
    const updated = { ...annotations };
    const trimmedNote = noteText.trim();
    const trimmedDate = pushDate.trim();
    const annotation: ItemAnnotation = {};

    if (trimmedNote) annotation.note = trimmedNote;
    if (trimmedDate) {
      annotation.status = 'pushed';
      annotation.pushed_to = trimmedDate;
    }
    // Preserve done status unless being pushed
    const existing = annotations[activeItem];
    if (existing?.status === 'done' && !trimmedDate) {
      annotation.status = 'done';
    }

    if (Object.keys(annotation).length > 0) {
      updated[activeItem] = annotation;
    } else {
      delete updated[activeItem];
    }

    await persistAnnotations(updated);
    closeItemPanel();
  }

  async function clearAnnotation(itemKey: string) {
    const updated = { ...annotations };
    delete updated[itemKey];
    await persistAnnotations(updated);
    if (activeItem === itemKey) closeItemPanel();
  }

  // ── Full-briefing edit handlers ────────────────────────────────────

  async function handleRefresh() {
    setEditing(false);
    setActiveItem(null);
    await autoGenerate();
  }

  function handleStartEdit() {
    setEditText(briefing ?? '');
    setEditing(true);
    setActiveItem(null);
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch('/api/agents/briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_content: editText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save edits.');
        return;
      }
      setBriefing(editText);
      setIsEdited(true);
      setEditing(false);
    } catch {
      setError('Network error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleRevertToOriginal() {
    if (!originalContent) return;
    setSaving(true);
    try {
      const res = await fetch('/api/agents/briefing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited_content: originalContent }),
      });
      if (res.ok) {
        setBriefing(originalContent);
        setIsEdited(false);
        setEditing(false);
      }
    } catch {
      setError('Failed to revert.');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (!hasAiAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>The Strategist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              AI briefings are available on the Power plan.
            </p>
            <a
              href="/settings"
              className="mt-2 inline-block text-sm font-medium text-accent-primary hover:underline"
            >
              Upgrade your plan
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sections = briefing ? parseBriefing(briefing) : [];
  const doneCount = Object.values(annotations).filter((a) => a.status === 'done').length;
  const pushedCount = Object.values(annotations).filter((a) => a.status === 'pushed').length;
  const noteCount = Object.values(annotations).filter((a) => a.note).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>The Strategist</CardTitle>
          {isEdited && (
            <span className="rounded bg-accent-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-primary">
              Edited
            </span>
          )}
          {doneCount > 0 && (
            <span className="rounded bg-status-green/10 px-1.5 py-0.5 text-[10px] font-medium text-status-green">
              {doneCount} done
            </span>
          )}
          {pushedCount > 0 && (
            <span className="rounded bg-status-yellow/10 px-1.5 py-0.5 text-[10px] font-medium text-status-yellow">
              {pushedCount} pushed
            </span>
          )}
          {noteCount > 0 && (
            <span className="rounded bg-status-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-status-blue">
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {briefing && !editing && (
            <button
              onClick={handleStartEdit}
              className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
            >
              Edit
            </button>
          )}
          {isEdited && !editing && (
            <button
              onClick={handleRevertToOriginal}
              disabled={saving}
              className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-tertiary disabled:opacity-50"
            >
              Revert
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Refresh'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {initialLoading ? (
          <div className="rounded-lg bg-surface-tertiary p-6 text-center">
            <p className="text-sm text-text-secondary">Loading briefing...</p>
          </div>
        ) : loading && !briefing ? (
          <div className="rounded-lg bg-surface-tertiary p-6 text-center">
            <p className="text-sm text-text-secondary">
              The Strategist is preparing your morning briefing...
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Analyzing pipeline, action items, and deal activity.
            </p>
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full rounded-md border border-border-primary bg-surface-secondary p-3 font-mono text-xs leading-relaxed text-accent-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              rows={20}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Edits'}
              </button>
              <button
                onClick={() => { setEditing(false); setEditText(''); }}
                className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : briefing && sections.length > 0 ? (
          <div className="space-y-4">
            {sections.map((section, si) => (
              <div key={si}>
                {section.title && (
                  <h3 className="mb-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider px-1">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const ann = annotations[item.key];
                    const isDone = ann?.status === 'done';
                    const isPushed = ann?.status === 'pushed';
                    const hasNote = !!ann?.note;
                    const actionable = isActionable(item.key);

                    return (
                      <div key={item.key}>
                        <div
                          className={`group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors ${
                            activeItem === item.key
                              ? 'bg-accent-primary/5 border border-accent-primary/20'
                              : 'hover:bg-surface-tertiary border border-transparent'
                          } ${isDone ? 'opacity-60' : ''}`}
                        >
                          {/* Checkbox for actionable items */}
                          {actionable ? (
                            <button
                              onClick={() => toggleDone(item.key)}
                              className={`mt-0.5 shrink-0 h-4 w-4 rounded border transition-colors flex items-center justify-center ${
                                isDone
                                  ? 'bg-status-green border-status-green'
                                  : 'border-border-primary hover:border-accent-primary'
                              }`}
                            >
                              {isDone && (
                                <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M2 6l3 3 5-5" />
                                </svg>
                              )}
                            </button>
                          ) : (
                            <span className="shrink-0 w-4" />
                          )}

                          {/* Item text */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs leading-relaxed font-mono ${
                              isDone
                                ? 'line-through text-text-muted'
                                : 'text-accent-primary'
                            }`}>
                              {item.text}
                            </p>

                            {/* Inline badges */}
                            <div className="flex items-center gap-1.5 mt-0.5 empty:mt-0">
                              {isPushed && ann?.pushed_to && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-status-yellow/10 px-1.5 py-0.5 text-[10px] font-medium text-status-yellow">
                                  <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="6" cy="6" r="5" />
                                    <path d="M6 3v3l2 1" />
                                  </svg>
                                  {ann.pushed_to}
                                </span>
                              )}
                              {hasNote && (
                                <span className="inline-flex items-center gap-0.5 rounded bg-status-blue/10 px-1.5 py-0.5 text-[10px] text-status-blue max-w-[300px] truncate">
                                  {ann!.note}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action buttons (visible on hover) */}
                          {actionable && (
                            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openItemPanel(item.key)}
                                className="rounded p-1 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                                title="Add note or push date"
                              >
                                <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <path d="M2 11.5V14h2.5l7.4-7.4-2.5-2.5L2 11.5z" />
                                  <path d="M11.9 1.6l2.5 2.5-1.3 1.3-2.5-2.5 1.3-1.3z" />
                                </svg>
                              </button>
                              {(ann?.note || ann?.pushed_to) && (
                                <button
                                  onClick={() => clearAnnotation(item.key)}
                                  className="rounded p-1 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                                  title="Clear annotation"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M4 4l8 8M12 4l-8 8" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded annotation panel */}
                        {activeItem === item.key && (
                          <AnnotationPanel
                            noteText={noteText}
                            pushDate={pushDate}
                            saving={savingAnnotation}
                            onNoteChange={setNoteText}
                            onDateChange={setPushDate}
                            onSave={saveItemAnnotation}
                            onCancel={closeItemPanel}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {generatedAt && (
              <p className="border-t border-border-primary pt-2 text-xs text-text-muted">
                Generated{' '}
                {new Date(generatedAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-surface-tertiary p-6 text-center">
            <p className="text-sm text-text-secondary">
              No briefing available.
            </p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm font-medium text-accent-primary hover:underline"
            >
              Generate now
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Annotation Panel ─────────────────────────────────────────────────

interface AnnotationPanelProps {
  noteText: string;
  pushDate: string;
  saving: boolean;
  onNoteChange: (text: string) => void;
  onDateChange: (date: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function AnnotationPanel({
  noteText,
  pushDate,
  saving,
  onNoteChange,
  onDateChange,
  onSave,
  onCancel,
}: AnnotationPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <div className="ml-6 mr-2 mt-1 mb-2 rounded-md border border-accent-primary/20 bg-surface-secondary p-3 space-y-2.5">
      {/* Note */}
      <div>
        <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Note
        </label>
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Update, context, or comment..."
          rows={2}
          className="w-full rounded border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
          maxLength={5000}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              onSave();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              onCancel();
            }
          }}
        />
      </div>

      {/* Push to date */}
      <div>
        <label className="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">
          Push to date
        </label>
        <input
          type="date"
          value={pushDate}
          onChange={(e) => onDateChange(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="rounded border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
        />
        {pushDate && (
          <button
            onClick={() => onDateChange('')}
            className="ml-2 text-[10px] text-text-muted hover:text-status-red"
          >
            clear
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-[10px] text-text-muted">
          {isMac ? 'Cmd' : 'Ctrl'}+Enter to save
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onCancel}
            className="rounded px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:bg-surface-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded bg-accent-primary px-2.5 py-1 text-[11px] font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
