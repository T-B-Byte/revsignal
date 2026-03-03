'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatAgentHtml } from '@/lib/format-agent-html';

interface DealStrategyProps {
  dealId: string;
  hasAiAccess: boolean;
}

export function DealStrategy({ dealId, hasAiAccess }: DealStrategyProps) {
  const [strategy, setStrategy] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/deal-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate strategy.');
        return;
      }

      const data = await res.json();
      setStrategy(data.strategy);
      setGeneratedAt(data.generatedAt);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!hasAiAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              Deal strategy requires the Power plan.
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
        <CardTitle>Deal Strategy</CardTitle>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {loading ? 'Generating...' : strategy ? 'Refresh' : 'Generate Strategy'}
        </button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {strategy ? (
          <div className="space-y-4">
            <div
              className="prose prose-sm max-w-none text-text-primary
                prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                prose-li:text-text-secondary prose-li:text-sm
                prose-strong:text-text-primary prose-strong:font-medium
                prose-ul:my-1 prose-ol:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(strategy) }}
            />
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
              Get AI-powered strategy advice for this deal.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              The Strategist will analyze conversations, action items, and deal context.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
