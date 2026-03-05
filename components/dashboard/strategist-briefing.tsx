'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StrategistBriefingProps {
  hasAiAccess: boolean;
}

export function StrategistBriefing({ hasAiAccess }: StrategistBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [originalContent, setOriginalContent] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [isEdited, setIsEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);

  const didAutoGenerate = useRef(false);

  // Load today's briefing from DB on mount
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
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Auto-generate if no briefing for today
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

  async function handleRefresh() {
    setEditing(false);
    await autoGenerate();
  }

  function handleStartEdit() {
    setEditText(briefing ?? '');
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditText('');
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
      setError('Network error. Please try again.');
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
                onClick={handleCancelEdit}
                className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : briefing ? (
          <div className="space-y-4">
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-accent-primary">
              {briefing}
            </pre>
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
