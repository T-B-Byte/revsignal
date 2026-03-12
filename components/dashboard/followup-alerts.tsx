'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { formatAgentHtml } from '@/lib/format-agent-html';
import { format } from 'date-fns';
import type { EscalationLevel } from '@/types/database';

export interface FollowUpGroup {
  level: EscalationLevel;
  items: {
    item_id: string;
    description: string;
    due_date: string | null;
    owner: string;
    deal_company: string | null;
  }[];
}

interface FollowUpAlertsProps {
  groups: FollowUpGroup[];
  hasAiAccess: boolean;
}

const LEVEL_CONFIG: Record<
  EscalationLevel,
  { label: string; variant: BadgeVariant; sort: number }
> = {
  red: { label: 'Overdue', variant: 'red', sort: 0 },
  yellow: { label: 'Due Soon', variant: 'yellow', sort: 1 },
  green: { label: 'On Track', variant: 'green', sort: 2 },
};

export function FollowUpAlerts({ groups, hasAiAccess }: FollowUpAlertsProps) {
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Track which item is showing the reschedule picker
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  // Track rescheduled dates for optimistic UI
  const [rescheduledDates, setRescheduledDates] = useState<Record<string, string>>({});

  async function handleComplete(itemId: string) {
    setSavingIds((prev) => new Set(prev).add(itemId));

    try {
      const res = await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: [itemId], status: 'completed' }),
      });

      if (res.ok) {
        setCompletedIds((prev) => new Set(prev).add(itemId));
      }
    } catch {
      // silently fail — item stays unchecked
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function handleReschedule(itemId: string, newDate: string) {
    setSavingIds((prev) => new Set(prev).add(itemId));
    setReschedulingId(null);

    try {
      const res = await fetch('/api/action-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_ids: [itemId],
          due_date: newDate,
          // If rescheduling an overdue item, reset to pending + yellow
          status: 'pending',
          escalation_level: 'yellow',
        }),
      });

      if (res.ok) {
        setRescheduledDates((prev) => ({ ...prev, [itemId]: newDate }));
      }
    } catch {
      // silently fail
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  }

  async function handleRunScan() {
    setScanLoading(true);
    setScanError(null);

    try {
      const res = await fetch('/api/agents/follow-up-scan', { method: 'POST' });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setScanError(data.error || 'Failed to run scan.');
        return;
      }

      const data = await res.json();
      setScanSummary(data.summary);
    } catch {
      setScanError('Network error. Please try again.');
    } finally {
      setScanLoading(false);
    }
  }

  // Sort: red first, then yellow, then green
  const sorted = [...groups].sort(
    (a, b) => LEVEL_CONFIG[a.level].sort - LEVEL_CONFIG[b.level].sort
  );

  const totalItems = groups.reduce(
    (sum, g) => sum + g.items.filter((i) => !completedIds.has(i.item_id)).length,
    0
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Follow-Up Alerts</CardTitle>
        <div className="flex items-center gap-2">
          <span className="font-data text-xs text-text-muted">{totalItems} active</span>
          {hasAiAccess && (
            <button
              onClick={handleRunScan}
              disabled={scanLoading}
              className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {scanLoading ? 'Scanning...' : 'AI Scan'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {scanError && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {scanError}
          </div>
        )}

        {scanSummary && (
          <div className="mb-4 rounded-lg border border-accent-primary/20 bg-accent-primary/5 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-primary">
              AI Scan Results
            </p>
            <div
              className="prose prose-sm max-w-none text-text-secondary prose-p:my-1 prose-p:text-sm prose-li:text-sm prose-strong:text-text-primary prose-strong:font-medium prose-ul:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(scanSummary) }}
            />
          </div>
        )}

        {totalItems === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No pending follow-ups. You are all caught up.
          </p>
        ) : (
          <div className="space-y-4">
            {sorted.map((group) => {
              const visibleItems = group.items.filter((i) => !completedIds.has(i.item_id));
              if (visibleItems.length === 0) return null;
              const config = LEVEL_CONFIG[group.level];
              return (
                <div key={group.level}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <span className="font-data text-xs text-text-muted">
                      {visibleItems.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {visibleItems.map((item) => {
                      const displayDate = rescheduledDates[item.item_id] || item.due_date;
                      const isRescheduled = !!rescheduledDates[item.item_id];

                      return (
                        <li
                          key={item.item_id}
                          className="flex items-start gap-3 rounded-md bg-surface-tertiary px-3 py-2 text-sm"
                        >
                          <button
                            onClick={() => handleComplete(item.item_id)}
                            disabled={savingIds.has(item.item_id)}
                            className="mt-0.5 shrink-0 flex h-4 w-4 items-center justify-center rounded border border-border-primary text-transparent transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50"
                            title="Mark complete"
                            aria-label={`Mark complete: ${item.description}`}
                          >
                            {savingIds.has(item.item_id) ? (
                              <span className="h-2 w-2 animate-pulse rounded-full bg-text-muted" />
                            ) : (
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-text-primary">{item.description}</p>
                            <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                              {item.deal_company && <span>{item.deal_company}</span>}
                              {displayDate && (
                                <span className={`font-data ${isRescheduled ? 'text-accent-primary' : ''}`}>
                                  {format(new Date(displayDate + 'T00:00:00'), 'MMM d, yyyy')}
                                  {isRescheduled && ' (moved)'}
                                </span>
                              )}
                              <span className="capitalize">{item.owner}</span>
                            </div>

                            {/* Reschedule picker */}
                            {reschedulingId === item.item_id && (
                              <div className="mt-2 flex items-center gap-2">
                                <DatePicker
                                  defaultValue={displayDate || new Date().toISOString().slice(0, 10)}
                                  onChange={(v) => {
                                    if (v) handleReschedule(item.item_id, v);
                                  }}
                                  min={new Date().toISOString().slice(0, 10)}
                                  size="sm"
                                  placeholder="Pick date"
                                />
                                <button
                                  onClick={() => setReschedulingId(null)}
                                  className="text-xs text-text-muted hover:text-text-primary"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Push to... button */}
                          {reschedulingId !== item.item_id && (
                            <button
                              onClick={() => setReschedulingId(item.item_id)}
                              className="shrink-0 rounded px-2 py-1 text-xs text-text-muted transition-colors hover:bg-surface-secondary hover:text-text-primary"
                              title="Reschedule"
                            >
                              Push to...
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
