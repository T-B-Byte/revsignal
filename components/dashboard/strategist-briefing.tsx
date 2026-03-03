'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatAgentHtml } from '@/lib/format-agent-html';

interface StrategistBriefingProps {
  /** Whether the user's subscription allows AI briefings. */
  hasAiAccess: boolean;
}

export function StrategistBriefing({ hasAiAccess }: StrategistBriefingProps) {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
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
        <CardTitle>The Strategist</CardTitle>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
        >
          {loading ? 'Generating...' : briefing ? 'Refresh' : 'Generate Briefing'}
        </button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {briefing ? (
          <div className="space-y-4">
            <div
              className="prose prose-sm max-w-none text-text-primary
                prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2
                prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                prose-li:text-text-secondary prose-li:text-sm
                prose-strong:text-text-primary prose-strong:font-medium
                prose-ul:my-1 prose-ol:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(briefing) }}
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
              Your morning briefing is ready to generate.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              The Strategist will analyze your pipeline, action items, and deal activity.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

