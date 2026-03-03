'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { formatAgentHtml } from '@/lib/format-agent-html';

const EMAIL_TYPES = [
  { value: 'cold_outreach', label: 'Cold Outreach' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'check_in', label: 'Check In' },
  { value: 'intro_request', label: 'Intro Request' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'meeting_request', label: 'Meeting Request' },
] as const;

type EmailType = (typeof EMAIL_TYPES)[number]['value'];

interface DealOption {
  deal_id: string;
  company: string;
  stage: string;
}

interface ContactOption {
  contact_id: string;
  name: string;
  company: string;
  role: string | null;
}

interface EmailComposerProps {
  deals: DealOption[];
  contacts: ContactOption[];
  hasComposeAccess: boolean;
  initialDealId?: string;
  initialContactId?: string;
}

interface ComposeResult {
  subject: string;
  body: string;
  emailType: string;
  generatedAt: string;
}

export function EmailComposer({
  deals,
  contacts,
  hasComposeAccess,
  initialDealId,
  initialContactId,
}: EmailComposerProps) {
  const [emailType, setEmailType] = useState<EmailType>('follow_up');
  // Only accept initial values that match an available option
  const [dealId, setDealId] = useState(
    initialDealId && deals.some((d) => d.deal_id === initialDealId) ? initialDealId : ''
  );
  const [contactId, setContactId] = useState(
    initialContactId && contacts.some((c) => c.contact_id === initialContactId) ? initialContactId : ''
  );
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const hasContext = dealId || contactId || instructions.trim();

  const handleCompose = useCallback(async () => {
    if (!hasContext) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/agents/compose-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          dealId: dealId || undefined,
          contactId: contactId || undefined,
          instructions: instructions.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to compose email.');
        return;
      }

      const data = await res.json();
      setResult({
        subject: data.subject,
        body: data.body,
        emailType: data.emailType,
        generatedAt: data.generatedAt,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [emailType, dealId, contactId, instructions, hasContext]);

  async function handleCopy() {
    if (!result) return;
    const text = `Subject: ${result.subject}\n\n${result.body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard. Try selecting the text manually.');
    }
  }

  if (!hasComposeAccess) {
    return (
      <div>
        <h1 className="mb-6 text-xl font-semibold text-text-primary">Compose</h1>
        <Card>
          <CardHeader>
            <CardTitle>Email & Message Composer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-surface-tertiary p-4 text-center">
              <p className="text-sm text-text-muted">
                Email composing requires the Starter plan or higher.
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
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-text-primary">Compose</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Form */}
        <Card>
          <CardHeader>
            <CardTitle>Draft Email</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-status-red/10 p-3 text-sm text-status-red">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Email Type
                </label>
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value as EmailType)}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  {EMAIL_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Deal */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Deal (optional)
                </label>
                <select
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">No deal selected</option>
                  {deals.map((deal) => (
                    <option key={deal.deal_id} value={deal.deal_id}>
                      {deal.company} ({deal.stage.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Contact (optional)
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">No contact selected</option>
                  {contacts.map((contact) => (
                    <option key={contact.contact_id} value={contact.contact_id}>
                      {contact.name} — {contact.company}
                      {contact.role ? ` (${contact.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Instructions */}
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  Additional Context (optional)
                </label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={4}
                  maxLength={1000}
                  placeholder="Any specific points to cover, tone adjustments, or context the AI should know..."
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-y"
                />
                <p className="mt-0.5 text-xs text-text-muted">
                  {instructions.length} / 1,000 characters
                </p>
              </div>

              {/* Validation hint */}
              {!hasContext && (
                <p className="text-xs text-text-muted">
                  Select a deal, contact, or provide instructions to compose.
                </p>
              )}

              {/* Compose button */}
              <button
                onClick={handleCompose}
                disabled={loading || !hasContext}
                className="w-full rounded-md bg-accent-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
              >
                {loading ? 'Composing...' : result ? 'Recompose' : 'Compose Email'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Right: Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview</CardTitle>
            {result && (
              <button
                onClick={handleCopy}
                className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
              >
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            )}
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                {/* Subject line */}
                <div className="rounded-md bg-surface-tertiary px-3 py-2">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-0.5">
                    Subject
                  </p>
                  <p className="text-sm font-medium text-text-primary">
                    {result.subject}
                  </p>
                </div>

                {/* Body */}
                <div
                  className="prose prose-sm max-w-none text-text-primary
                    prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                    prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                    prose-li:text-text-secondary prose-li:text-sm
                    prose-strong:text-text-primary prose-strong:font-medium
                    prose-ul:my-1 prose-ol:my-1"
                  dangerouslySetInnerHTML={{ __html: formatAgentHtml(result.body) }}
                />

                {/* Metadata */}
                <div className="border-t border-border-primary pt-2 flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    Generated{' '}
                    {new Date(result.generatedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                  <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
                    {EMAIL_TYPES.find((t) => t.value === result.emailType)?.label ?? result.emailType}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-surface-tertiary p-8 text-center">
                <p className="text-sm text-text-secondary">
                  Your AI-drafted email will appear here.
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  Select context and click Compose to generate.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
