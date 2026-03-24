'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markOutreach } from '@/app/(dashboard)/prospects/actions';
import type { Prospect } from '@/types/database';

interface TargetAccountsTableProps {
  prospects: Prospect[];
}

const acvFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const TIER_ORDER: Record<string, number> = {
  'CRM/MAP Platforms': 1,
  'ABM Platforms': 2,
  'ABM / Demand Gen': 3,
  'Intent Data (Competitor)': 4,
  'Data Enrichment': 5,
  'Sales Intelligence': 6,
  'B2B Review Platforms': 7,
  'Demand Generation': 8,
  'Content Syndication': 9,
  'Conversation Intelligence': 10,
  'Revenue Intelligence': 11,
  'Recruiting/HR Tech': 12,
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function TargetAccountsTable({ prospects }: TargetAccountsTableProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const router = useRouter();

  // Filter to seed_data prospects and sort by ACV desc, then by tier order
  const targets = prospects
    .filter((p) => p.source === 'seed_data')
    .sort((a, b) => {
      const acvDiff = (b.estimated_acv ?? 0) - (a.estimated_acv ?? 0);
      if (acvDiff !== 0) return acvDiff;
      const tierA = TIER_ORDER[a.icp_category ?? ''] ?? 99;
      const tierB = TIER_ORDER[b.icp_category ?? ''] ?? 99;
      return tierA - tierB;
    });

  if (targets.length === 0) return null;

  const reachedOut = targets.filter((t) => t.outreach_date).length;

  function handleMarkOutreach(prospectId: string, currentDate: string | null) {
    setPendingId(prospectId);
    startTransition(async () => {
      const newDate = currentDate ? null : new Date().toISOString();
      await markOutreach(prospectId, newDate);
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Target Accounts
          </h2>
          <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
            {targets.length}
          </span>
          {reachedOut > 0 && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              {reachedOut} contacted
            </span>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-text-muted transition-transform ${collapsed ? '' : 'rotate-180'}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {/* Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border-primary text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                <th className="px-4 py-2 w-8">#</th>
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Est. ACV</th>
                <th className="px-4 py-2 text-center">Outreach</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((prospect, idx) => {
                const isReached = !!prospect.outreach_date;
                const isLoading = isPending && pendingId === prospect.id;
                const isBombora = prospect.company === 'Bombora';

                return (
                  <tr
                    key={prospect.id}
                    className="border-t border-border-primary/50 hover:bg-surface-tertiary/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-muted text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">
                          {prospect.company}
                        </span>
                        {isBombora && (
                          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                            Acct-level only
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">
                      {prospect.icp_category}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-text-secondary">
                      {prospect.estimated_acv
                        ? acvFormatter.format(prospect.estimated_acv)
                        : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleMarkOutreach(prospect.id, prospect.outreach_date)}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          isReached
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-surface-tertiary text-text-muted hover:bg-surface-tertiary/80 hover:text-text-secondary'
                        } ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                        title={
                          isReached
                            ? `Reached out ${formatDate(prospect.outreach_date!)}. Click to undo.`
                            : 'Click to mark as reached out'
                        }
                      >
                        {isReached ? (
                          <>
                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 8.5l3.5 3.5 6.5-7" />
                            </svg>
                            {formatDate(prospect.outreach_date!)}
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="8" cy="8" r="6" />
                            </svg>
                            Not yet
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer summary */}
          <div className="flex items-center justify-between border-t border-border-primary px-4 py-2.5 text-xs text-text-muted">
            <span>
              Total pipeline: {acvFormatter.format(
                targets.reduce((sum, t) => sum + (t.estimated_acv ?? 0), 0)
              )}
            </span>
            <span>
              {reachedOut} of {targets.length} contacted
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
