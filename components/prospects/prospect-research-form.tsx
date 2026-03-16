'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatAgentHtml } from '@/lib/format-agent-html';
import type { FitScore, SuggestedContact } from '@/types/database';

interface ProspectResearchFormProps {
  hasResearchAccess: boolean;
  icpCategories: string[];
}

interface ResearchResult {
  company: string;
  researchNotes: string;
  icpCategory: string | null;
  nextAction: string;
  fitScore: FitScore | null;
  whyTheyBuy: string | null;
  suggestedContacts: SuggestedContact[];
  estimatedAcv: number | null;
  generatedAt: string;
}

const FIT_BADGE_STYLES: Record<FitScore, string> = {
  strong: "bg-status-green/15 text-status-green border-status-green/30",
  moderate: "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  weak: "bg-status-red/15 text-status-red border-status-red/30",
  not_a_fit: "bg-text-muted/15 text-text-muted border-text-muted/30",
};

const FIT_LABELS: Record<FitScore, string> = {
  strong: "Strong Fit",
  moderate: "Moderate Fit",
  weak: "Weak Fit",
  not_a_fit: "Not a Fit",
};

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ProspectResearchForm({
  hasResearchAccess,
  icpCategories,
}: ProspectResearchFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'company' | 'url'>('url');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [icpCategory, setIcpCategory] = useState('');
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResearch() {
    if (mode === 'company' && !company.trim()) return;
    if (mode === 'url' && !url.trim()) return;

    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (mode === 'url') {
        res = await fetch('/api/agents/company-url-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        });
      } else {
        res = await fetch('/api/agents/prospect-research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company: company.trim(),
            icpCategory: icpCategory || undefined,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Analysis failed.');
        return;
      }

      const data = await res.json();
      setResult({
        company: data.company,
        researchNotes: data.researchNotes,
        icpCategory: data.icpCategory,
        nextAction: data.nextAction,
        fitScore: data.fitScore ?? null,
        whyTheyBuy: data.whyTheyBuy ?? null,
        suggestedContacts: data.suggestedContacts ?? [],
        estimatedAcv: data.estimatedAcv ?? null,
        generatedAt: data.generatedAt,
      });

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
          <CardTitle>Analyze a Company</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              Company analysis requires the Starter plan or higher.
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
        <CardTitle>Analyze a Company</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {/* Mode toggle */}
        <div className="mb-3 flex gap-1 rounded-lg bg-surface-tertiary p-1">
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'url'
                ? 'bg-surface-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Paste a URL
          </button>
          <button
            type="button"
            onClick={() => setMode('company')}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'company'
                ? 'bg-surface-primary text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            Company Name
          </button>
        </div>

        {/* Input form */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {mode === 'url' ? (
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Company URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://company.com"
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) handleResearch();
                }}
              />
            </div>
          ) : (
            <>
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
            </>
          )}
          <button
            onClick={handleResearch}
            disabled={loading || (mode === 'url' ? !url.trim() : !company.trim())}
            className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {loading
              ? mode === 'url'
                ? 'Analyzing site...'
                : 'Researching...'
              : 'Analyze'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-4 space-y-3 rounded-lg border border-border-primary bg-surface-tertiary p-4">
            {/* Header with fit badge */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                {result.company}
              </h3>
              <div className="flex items-center gap-2">
                {result.fitScore && (
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${FIT_BADGE_STYLES[result.fitScore]}`}>
                    {FIT_LABELS[result.fitScore]}
                  </span>
                )}
                {result.icpCategory && (
                  <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                    {result.icpCategory}
                  </span>
                )}
              </div>
            </div>

            {/* Why they'd buy */}
            {result.whyTheyBuy && (
              <div className="rounded-md bg-accent-primary/5 px-3 py-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Why They&apos;d Buy
                </p>
                <p className="text-sm text-text-primary">{result.whyTheyBuy}</p>
              </div>
            )}

            {/* Estimated ACV */}
            {result.estimatedAcv != null && (
              <p className="text-xs text-text-muted">
                Estimated ACV: <span className="font-data font-medium text-text-secondary">{acvFormatter.format(result.estimatedAcv)}</span>
              </p>
            )}

            {/* Research notes */}
            <div
              className="prose prose-sm max-w-none text-text-secondary
                prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                prose-li:text-text-secondary prose-li:text-sm
                prose-strong:text-text-primary prose-strong:font-medium
                prose-ul:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(result.researchNotes) }}
            />

            {/* Next action */}
            {result.nextAction && (
              <div className="rounded-md bg-accent-primary/5 px-3 py-2">
                <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Next Action
                </p>
                <p className="text-sm text-text-primary">{result.nextAction}</p>
              </div>
            )}

            <p className="text-xs text-text-muted">
              Analyzed{' '}
              {new Date(result.generatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              {' \u00b7 Saved to prospects'}
            </p>

            <button
              onClick={() => {
                setResult(null);
                setCompany('');
                setUrl('');
                setIcpCategory('');
              }}
              className="text-xs text-accent-primary hover:underline"
            >
              Analyze another company
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
