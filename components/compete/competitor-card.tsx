'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatAgentHtml } from '@/lib/format-agent-html';
import type { CompetitiveIntel } from '@/types/database';

interface CompetitorCardProps {
  competitor: string;
  items: CompetitiveIntel[];
  hasAiAccess: boolean;
}

function categoryVariant(category: string) {
  if (category === 'weakness') return 'red' as const;
  if (category === 'pharosiq_advantage') return 'green' as const;
  if (category === 'pricing') return 'yellow' as const;
  return 'blue' as const;
}

export function CompetitorCard({ competitor, items, hasAiAccess }: CompetitorCardProps) {
  const [battleCard, setBattleCard] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/battle-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate battle card.');
        return;
      }

      const data = await res.json();
      setBattleCard(data.battleCard);
      setGeneratedAt(data.generatedAt);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{competitor}</CardTitle>
        {hasAiAccess ? (
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {loading ? 'Generating...' : battleCard ? 'Refresh' : 'Battle Card'}
          </button>
        ) : (
          <a
            href="/settings"
            className="text-xs text-text-muted hover:text-accent-primary"
            title="Upgrade to Power plan for AI battle cards"
          >
            Upgrade for AI
          </a>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {/* Existing intel data points */}
        <dl className="space-y-3">
          {items.map((item) => (
            <div key={item.id}>
              <dt className="flex items-center gap-2">
                <Badge variant={categoryVariant(item.category)}>
                  {item.category.replace("_", " ")}
                </Badge>
              </dt>
              <dd className="mt-1 text-sm text-text-secondary">
                {item.data_point}
              </dd>
            </div>
          ))}
        </dl>

        {/* Battle Card */}
        {battleCard && (
          <div className="mt-4 border-t border-border-primary pt-4">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
              AI Battle Card
            </h4>
            <div
              className="prose prose-sm max-w-none text-text-primary
                prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                prose-li:text-text-secondary prose-li:text-sm
                prose-strong:text-text-primary prose-strong:font-medium
                prose-ul:my-1 prose-ol:my-1"
              dangerouslySetInnerHTML={{ __html: formatAgentHtml(battleCard) }}
            />
            {generatedAt && (
              <p className="mt-2 text-xs text-text-muted">
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
        )}
      </CardContent>
    </Card>
  );
}
