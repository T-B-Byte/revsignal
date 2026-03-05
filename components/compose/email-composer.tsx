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

const LOG_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call / PLAUD Transcript' },
  { value: 'teams', label: 'Teams Chat' },
  { value: 'linkedin', label: 'LinkedIn Message' },
  { value: 'in_person', label: 'In Person' },
  { value: 'internal', label: 'Internal' },
  { value: 'manual', label: 'Other / Manual' },
] as const;

type LogChannel = (typeof LOG_CHANNELS)[number]['value'];

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

async function saveConversation(params: {
  dealId?: string;
  contactId?: string;
  channel: string;
  subject?: string;
  rawText: string;
}): Promise<{ conversation_id: string } | { error: string }> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deal_id: params.dealId || undefined,
      contact_id: params.contactId || undefined,
      channel: params.channel,
      subject: params.subject || undefined,
      raw_text: params.rawText,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error || 'Failed to save conversation.' };
  }

  return res.json();
}

export function EmailComposer({
  deals,
  contacts,
  hasComposeAccess,
  initialDealId,
  initialContactId,
}: EmailComposerProps) {
  const [emailType, setEmailType] = useState<EmailType>('follow_up');
  const [dealId, setDealIdRaw] = useState(
    initialDealId && deals.some((d) => d.deal_id === initialDealId) ? initialDealId : ''
  );
  const [contactId, setContactIdRaw] = useState(
    initialContactId && contacts.some((c) => c.contact_id === initialContactId) ? initialContactId : ''
  );

  function setDealId(v: string) {
    setDealIdRaw(v);
    setSaved(false);
  }
  function setContactId(v: string) {
    setContactIdRaw(v);
    setSaved(false);
  }
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState<ComposeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Save to Record state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Log Conversation state
  const [logChannel, setLogChannel] = useState<LogChannel>('email');
  const [logContactId, setLogContactId] = useState('');
  const [logSentTo, setLogSentTo] = useState('');
  const [pasteSubject, setPasteSubject] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteSaving, setPasteSaving] = useState(false);
  const [pasteSaved, setPasteSaved] = useState(false);

  const isInternal = logChannel === 'internal';
  const hasContext = dealId || contactId || instructions.trim();
  const canSave = (dealId || contactId) && result;
  const canPasteSave =
    pasteContent.trim() &&
    (isInternal || dealId || contactId || logContactId);

  const handleCompose = useCallback(async () => {
    if (!hasContext) return;

    setLoading(true);
    setError(null);
    setSaved(false);

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

  async function handleSaveToRecord() {
    if (!result || saving || (!dealId && !contactId)) return;

    setSaving(true);
    setError(null);

    try {
      const plainBody = result.body.replace(/<[^>]*>/g, '');
      const response = await saveConversation({
        dealId: dealId || undefined,
        contactId: contactId || undefined,
        channel: 'email',
        subject: result.subject,
        rawText: `[Outbound - AI Drafted]\n\nSubject: ${result.subject}\n\n${plainBody}`,
      });

      if ('error' in response) {
        setError(response.error);
      } else {
        setSaved(true);
      }
    } catch {
      setError('Network error saving to record.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasteSave() {
    if (!pasteContent.trim() || pasteSaving) return;

    const effectiveContactId = logContactId || contactId;
    if (!isInternal && !dealId && !effectiveContactId) return;

    setPasteSaving(true);
    setError(null);

    try {
      const channelLabel = LOG_CHANNELS.find((c) => c.value === logChannel)?.label ?? logChannel;
      const sentToPrefix = isInternal && logSentTo.trim()
        ? `Sent to: ${logSentTo.trim()}\n`
        : '';
      const response = await saveConversation({
        dealId: dealId || undefined,
        contactId: effectiveContactId || undefined,
        channel: logChannel,
        subject: pasteSubject.trim() || undefined,
        rawText: `[${channelLabel}]\n${sentToPrefix}\n${pasteContent.trim()}`,
      });

      if ('error' in response) {
        setError(response.error);
      } else {
        setPasteSaved(true);
        setTimeout(() => {
          setPasteContent('');
          setPasteSubject('');
          setLogChannel('email');
          setLogContactId('');
          setLogSentTo('');
          setPasteSaved(false);
        }, 2000);
      }
    } catch {
      setError('Network error saving thread.');
    } finally {
      setPasteSaving(false);
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
        {/* Left column */}
        <div className="space-y-6">
          {/* Draft Email form */}
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

                {!hasContext && (
                  <p className="text-xs text-text-muted">
                    Select a deal, contact, or provide instructions to compose.
                  </p>
                )}

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

          {/* Log Conversation */}
          <Card>
            <CardHeader>
              <CardTitle>Log Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-text-muted">
                Paste an email thread, PLAUD transcript, LinkedIn message, or any conversation to save it to the selected deal or contact record.
              </p>
              <div className="space-y-3">
                {/* Channel */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Channel
                  </label>
                  <select
                    value={logChannel}
                    onChange={(e) => setLogChannel(e.target.value as LogChannel)}
                    className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                  >
                    {LOG_CHANNELS.map((ch) => (
                      <option key={ch.value} value={ch.value}>
                        {ch.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sent To — contact dropdown or free text for internal */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Sent To
                  </label>
                  {isInternal ? (
                    <input
                      type="text"
                      value={logSentTo}
                      onChange={(e) => setLogSentTo(e.target.value)}
                      maxLength={200}
                      placeholder="Name of recipient (e.g., Jeff Rokuskie)"
                      className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                    />
                  ) : (
                    <select
                      value={logContactId}
                      onChange={(e) => setLogContactId(e.target.value)}
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
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={pasteSubject}
                    onChange={(e) => setPasteSubject(e.target.value)}
                    maxLength={500}
                    placeholder="Email subject line..."
                    className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-text-secondary">
                    Content
                  </label>
                  <textarea
                    value={pasteContent}
                    onChange={(e) => {
                      setPasteContent(e.target.value);
                      setPasteSaved(false);
                    }}
                    rows={6}
                    maxLength={50000}
                    placeholder={
                      logChannel === 'call'
                        ? 'Paste the PLAUD transcript or call notes here...'
                        : logChannel === 'linkedin'
                          ? 'Paste the LinkedIn message thread here...'
                          : 'Paste the email, thread, or conversation here...'
                    }
                    className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-y"
                  />
                </div>

                {!isInternal && !dealId && !contactId && !logContactId && pasteContent.trim() && (
                  <p className="text-xs text-status-yellow">
                    Select a deal or contact to save this conversation.
                  </p>
                )}

                <button
                  onClick={handlePasteSave}
                  disabled={pasteSaving || !canPasteSave}
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
                >
                  {pasteSaving
                    ? 'Saving...'
                    : pasteSaved
                      ? 'Saved to Record'
                      : 'Save to Record'}
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview</CardTitle>
            {result && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveToRecord}
                  disabled={saving || saved || !canSave}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    saved
                      ? 'bg-status-green/10 text-status-green'
                      : 'border border-accent-primary text-accent-primary hover:bg-accent-primary/10 disabled:opacity-50'
                  }`}
                  title={
                    !dealId && !contactId
                      ? 'Select a deal or contact to save'
                      : undefined
                  }
                >
                  {saving ? 'Saving...' : saved ? 'Saved' : 'Save to Record'}
                </button>
                <button
                  onClick={handleCopy}
                  className="rounded-md border border-border-primary px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-tertiary"
                >
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
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

                {/* Metadata + save hint */}
                <div className="border-t border-border-primary pt-2 space-y-1">
                  <div className="flex items-center justify-between">
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
                  {!dealId && !contactId && (
                    <p className="text-xs text-status-yellow">
                      Select a deal or contact to enable Save to Record.
                    </p>
                  )}
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
