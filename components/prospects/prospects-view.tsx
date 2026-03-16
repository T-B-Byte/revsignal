'use client';

import { useState } from 'react';
import { ProspectResearchForm } from './prospect-research-form';
import { ProspectCard } from './prospect-card';
import { AddProspectDialog } from './add-prospect-dialog';
import { Button } from '@/components/ui/button';
import type { Prospect, CoachingThread, CoachingMessage, Deal } from '@/types/database';

interface ProspectsViewProps {
  prospects: Prospect[];
  icpCategories: string[];
  hasResearchAccess: boolean;
  threadsByProspect?: Record<string, CoachingThread>;
  messagesByThread?: Record<string, CoachingMessage[]>;
  activeDeals?: Pick<Deal, "deal_id" | "company" | "stage">[];
}

export function ProspectsView({
  prospects,
  icpCategories,
  hasResearchAccess,
  threadsByProspect = {},
  messagesByThread = {},
  activeDeals = [],
}: ProspectsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFit, setSelectedFit] = useState<string>('');
  const [showPassed, setShowPassed] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const passedCount = prospects.filter((p) => p.status === 'passed').length;

  let filtered = prospects;

  // Hide passed prospects by default
  if (!showPassed) {
    filtered = filtered.filter((p) => p.status !== 'passed');
  }

  if (selectedCategory) {
    filtered = filtered.filter((p) => p.icp_category === selectedCategory);
  }

  if (selectedFit) {
    filtered = filtered.filter((p) => p.fit_score === selectedFit);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">
          Prospect Engine
        </h1>
        <Button onClick={() => setShowAddDialog(true)}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Prospect
        </Button>
      </div>

      {/* AI Research Form */}
      <ProspectResearchForm
        hasResearchAccess={hasResearchAccess}
        icpCategories={icpCategories}
      />

      {/* Prospect List */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Prospects
            {filtered.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({filtered.length})
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {/* Show passed toggle */}
            {passedCount > 0 && (
              <button
                onClick={() => setShowPassed(!showPassed)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showPassed
                    ? 'border-accent-primary/30 bg-accent-primary/10 text-accent-primary'
                    : 'border-border-primary bg-surface-secondary text-text-muted hover:text-text-secondary'
                }`}
              >
                {showPassed ? `Hiding ${passedCount} passed` : `${passedCount} passed`}
              </button>
            )}

            {/* Fit score filter */}
            <select
              value={selectedFit}
              onChange={(e) => setSelectedFit(e.target.value)}
              className="rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">All Fit Scores</option>
              <option value="strong">Strong Fit</option>
              <option value="moderate">Moderate Fit</option>
              <option value="weak">Weak Fit</option>
              <option value="not_a_fit">Not a Fit</option>
            </select>

            {/* ICP category filter */}
            {icpCategories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-md border border-border-primary bg-surface-secondary px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">All Categories</option>
                {icpCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
            <p className="text-sm text-text-muted">
              {prospects.length === 0
                ? 'No prospects yet. Paste a company URL or name above to analyze fit.'
                : 'No prospects match the selected filters.'}
            </p>
            {prospects.length === 0 && (
              <button
                onClick={() => setShowAddDialog(true)}
                className="mt-3 text-sm font-medium text-accent-primary hover:underline"
              >
                Add your first prospect
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((prospect) => {
              const thread = threadsByProspect[prospect.id] ?? null;
              const messages = thread ? (messagesByThread[thread.thread_id] ?? []) : [];

              return (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  icpCategories={icpCategories}
                  thread={thread}
                  threadMessages={messages}
                  activeDeals={activeDeals}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add Prospect Dialog */}
      <AddProspectDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        icpCategories={icpCategories}
      />
    </div>
  );
}
