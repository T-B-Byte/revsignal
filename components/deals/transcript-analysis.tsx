'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { formatAgentHtml } from '@/lib/format-agent-html';

interface TranscriptAnalysisProps {
  dealId: string;
  hasAiAccess: boolean;
  company: string;
}

interface AnalysisResult {
  summary: string;
  actionItems: Array<{
    description: string;
    owner: 'me' | 'them';
    dueDate: string | null;
  }>;
  objections: Array<{
    objection: string;
    context: string;
    suggestedResponse: string | null;
  }>;
  competitorMentions: Array<{
    competitor: string;
    context: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  pricingDiscussed: Array<{
    detail: string;
    who: string;
  }>;
  nextSteps: string;
  transcriptQuality: 'complete' | 'partial' | 'unclear';
  generatedAt: string;
}

export function TranscriptAnalysis({ dealId, hasAiAccess, company }: TranscriptAnalysisProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [date, setDate] = useState('');
  const [channel, setChannel] = useState<'call' | 'teams'>('call');
  const [contactName, setContactName] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (transcriptText.trim().length < 10 || !date) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/analyze-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcriptText: transcriptText.trim(),
          dealId,
          contactName: contactName.trim() || undefined,
          company,
          date,
          channel,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to analyze transcript.');
        return;
      }

      const data = await res.json();
      setResult({
        summary: data.summary,
        actionItems: data.actionItems ?? [],
        objections: data.objections ?? [],
        competitorMentions: data.competitorMentions ?? [],
        pricingDiscussed: data.pricingDiscussed ?? [],
        nextSteps: data.nextSteps ?? '',
        transcriptQuality: data.transcriptQuality ?? 'unclear',
        generatedAt: data.generatedAt,
      });
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
          <CardTitle>Transcript Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-surface-tertiary p-4 text-center">
            <p className="text-sm text-text-muted">
              Transcript analysis requires the Power plan.
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
        <CardTitle>Transcript Analysis</CardTitle>
        {!isOpen && !result && (
          <button
            onClick={() => setIsOpen(true)}
            className="rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            Analyze Transcript
          </button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
            {error}
          </div>
        )}

        {/* Form */}
        {isOpen && !result && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Transcript Text <span className="text-status-red">*</span>
              </label>
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                rows={8}
                maxLength={50000}
                placeholder="Paste the call or meeting transcript here..."
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-y"
              />
              <p className="mt-0.5 text-xs text-text-muted">
                {transcriptText.length.toLocaleString()} / 50,000 characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Call Date <span className="text-status-red">*</span>
                </label>
                <DatePicker
                  value={date}
                  onChange={(v) => setDate(v)}
                  placeholder="Select date"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as 'call' | 'teams')}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="call">Phone Call</option>
                  <option value="teams">Teams Meeting</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                Contact Name (optional)
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAnalyze}
                disabled={loading || transcriptText.trim().length < 10 || !date}
                className="rounded-md bg-accent-primary px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Analyze'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="rounded-md border border-border-primary px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            {/* Quality badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  result.transcriptQuality === 'complete'
                    ? 'green'
                    : result.transcriptQuality === 'partial'
                      ? 'yellow'
                      : 'red'
                }
              >
                {result.transcriptQuality} transcript
              </Badge>
              {result.generatedAt && (
                <span className="text-xs text-text-muted">
                  Analyzed{' '}
                  {new Date(result.generatedAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>

            {/* Summary */}
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                Summary
              </h4>
              <div
                className="prose prose-sm max-w-none text-text-secondary prose-p:my-1 prose-p:text-sm"
                dangerouslySetInnerHTML={{ __html: formatAgentHtml(result.summary) }}
              />
            </div>

            {/* Action Items */}
            {result.actionItems.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Action Items
                </h4>
                <ul className="space-y-1">
                  {result.actionItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Badge variant={item.owner === 'me' ? 'blue' : 'yellow'}>
                        {item.owner === 'me' ? 'You' : 'Them'}
                      </Badge>
                      <span>{item.description}</span>
                      {item.dueDate && (
                        <span className="shrink-0 text-xs text-text-muted">
                          by {item.dueDate}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Objections */}
            {result.objections.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Objections
                </h4>
                <ul className="space-y-2">
                  {result.objections.map((obj, i) => (
                    <li key={i} className="text-sm">
                      <p className="font-medium text-text-primary">{obj.objection}</p>
                      <p className="text-text-muted">{obj.context}</p>
                      {obj.suggestedResponse && (
                        <p className="mt-0.5 text-text-secondary italic">
                          Suggested: {obj.suggestedResponse}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitor Mentions */}
            {result.competitorMentions.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Competitor Mentions
                </h4>
                <ul className="space-y-1">
                  {result.competitorMentions.map((mention, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <Badge
                        variant={
                          mention.sentiment === 'positive'
                            ? 'green'
                            : mention.sentiment === 'negative'
                              ? 'red'
                              : 'blue'
                        }
                      >
                        {mention.competitor}
                      </Badge>
                      <span>{mention.context}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing */}
            {result.pricingDiscussed.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Pricing Discussed
                </h4>
                <ul className="space-y-1">
                  {result.pricingDiscussed.map((p, i) => (
                    <li key={i} className="text-sm text-text-secondary">
                      <span className="font-medium text-text-primary">{p.who}:</span>{' '}
                      {p.detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {result.nextSteps && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Next Steps
                </h4>
                <div
                  className="prose prose-sm max-w-none text-text-secondary prose-p:my-1 prose-p:text-sm"
                  dangerouslySetInnerHTML={{ __html: formatAgentHtml(result.nextSteps) }}
                />
              </div>
            )}

            {/* Analyze another */}
            <button
              onClick={() => {
                setResult(null);
                setTranscriptText('');
                setDate('');
                setContactName('');
                setIsOpen(true);
              }}
              className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
            >
              Analyze Another Transcript
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isOpen && !result && (
          <div className="rounded-lg bg-surface-tertiary p-6 text-center">
            <p className="text-sm text-text-secondary">
              Paste a call or meeting transcript for AI analysis.
            </p>
            <p className="mt-1 text-xs text-text-muted">
              Extracts summary, action items, objections, and competitor mentions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
