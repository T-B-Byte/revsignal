'use client';

import { useState } from 'react';
import { ProspectResearchForm } from './prospect-research-form';
import { ProspectCard } from './prospect-card';
import { AddProspectDialog } from './add-prospect-dialog';
import { Button } from '@/components/ui/button';
import type { Prospect } from '@/types/database';

interface ProspectsViewProps {
  prospects: Prospect[];
  icpCategories: string[];
  hasResearchAccess: boolean;
}

export function ProspectsView({
  prospects,
  icpCategories,
  hasResearchAccess,
}: ProspectsViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const filtered = selectedCategory
    ? prospects.filter((p) => p.icp_category === selectedCategory)
    : prospects;

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Prospects
            {filtered.length > 0 && (
              <span className="ml-2 text-xs font-normal text-text-muted">
                ({filtered.length})
              </span>
            )}
          </h2>

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

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
            <p className="text-sm text-text-muted">
              {prospects.length === 0
                ? 'No prospects yet. Add a prospect manually or use AI research above.'
                : 'No prospects match the selected category.'}
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
            {filtered.map((prospect) => (
              <ProspectCard key={prospect.id} prospect={prospect} icpCategories={icpCategories} />
            ))}
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
