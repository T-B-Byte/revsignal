'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatAgentHtml } from '@/lib/format-agent-html';

interface ProspectResearchFormProps {
  hasResearchAccess: boolean;
  icpCategories: string[];
}

interface ResearchResult {
  company: string;
  researchNotes: string;
  icpCategory: string | null;
  nextAction: string;
  generatedAt: string;
}

export function ProspectResearchForm({
  hasResearchAccess,
  icpCategories,
}: ProspectResearchFormProps) {
  const router = useRouter();
  const [company, setCompany] = useState('');
  const [icpCategory, setIcpCategory] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResearch() {
    if (!company.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/prospect-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: company.trim(),
          icpCategory: icpCategory || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to research prospect.');
        return;
      }

      const data = await res.json();
      setResult({
        company: data.company,
        researchNotes: data.researchNotes,
        icpCategory: data.icpCategory,
        nextAction: data.nextAction,
        generatedAt: data.generatedAt,
      });

      // Refresh server data so the new prospect appears in the list
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!hasResearchAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Research a Company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              Prospect research requires the Starter plan or higher.
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
      <CardHeader>
        <CardTitle>Research a Company</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Company Name
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g., Demandbase"
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && company.trim()) handleResearch();
              }}
            />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              ICP Category
            </label>
            <select
              value={icpCategory}
              onChange={(e) => setIcpCategory(e.target.value)}
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Any</option>
              {icpCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleResearch}
            disabled={loading || !company.trim()}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {loading ? 'Researching...' : 'Research'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-4 space-y-3 rounded-lg border border-border-primary bg-surface-tertiary p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                {result.company}
              </h3>
              {result.icpCategory && (
                <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                  {result.icpCategory}
                </span>
              )}
            </div>

            <div
              className="prose prose-sm max-w-none text-text-secondary
                prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                prose-li:text-text-secondary prose-li:text-sm
                prose-strong:text-text-primary prose-strong:font-medium
                prose-ul:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(result.researchNotes) }}
            />

            {result.nextAction && (
              <div className="rounded-md bg-accent-primary/5 px-3 py-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Next Action
                </p>
                <p className="text-sm text-text-primary">{result.nextAction}</p>
              </div>
            )}

            <p className="text-xs text-text-muted">
              Researched{' '}
              {new Date(result.generatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>

            {/* Reset for another research */}
            <button
              onClick={() => {
                setResult(null);
                setCompany('');
                setIcpCategory('');
              }}
              className="text-xs text-accent-primary hover:underline"
            >
              Research another company
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
