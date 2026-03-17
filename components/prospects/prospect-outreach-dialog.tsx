"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Prospect } from "@/types/database";

interface OutreachResult {
  contact: {
    contact_id: string;
    name: string;
    role: string | null;
    email: string | null;
  };
  email: {
    subject: string;
    body: string;
  };
}

interface ProspectOutreachDialogProps {
  prospect: Prospect;
  onClose: () => void;
  onSuccess: (result: OutreachResult) => void;
}

export function ProspectOutreachDialog({
  prospect,
  onClose,
  onSuccess,
}: ProspectOutreachDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OutreachResult | null>(null);
  const [copied, setCopied] = useState<"subject" | "body" | "full" | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/prospects/${prospect.id}/outreach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            name: name.trim(),
            title: title.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            linkedin: linkedin.trim() || undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }

      setResult(data as OutreachResult);
      onSuccess(data as OutreachResult);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string, type: "subject" | "body" | "full") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl border border-border-primary bg-surface-primary shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-primary bg-surface-primary px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Start Prospecting</h2>
            <p className="text-xs text-text-muted mt-0.5">{prospect.company}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {!result ? (
            <>
              {/* Intel summary */}
              {prospect.why_they_buy && (
                <div className="rounded-md bg-accent-primary/5 border border-accent-primary/20 px-3 py-2">
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                    Why They&apos;d Buy
                  </p>
                  <p className="text-xs text-text-secondary">{prospect.why_they_buy}</p>
                </div>
              )}

              {/* Suggested contacts from analysis */}
              {prospect.suggested_contacts && prospect.suggested_contacts.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                    Suggested Titles
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {prospect.suggested_contacts.map((sc, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTitle(sc.title)}
                        className="rounded-full border border-border-primary bg-surface-secondary px-2.5 py-0.5 text-xs text-text-secondary hover:border-accent-primary hover:text-accent-primary transition-colors"
                      >
                        {sc.title}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] text-text-muted">Click a title to pre-fill</p>
                </div>
              )}

              {/* Contact form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <p className="text-xs font-medium text-text-secondary">Contact Info</p>

                {error && (
                  <div className="rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
                    {error}
                  </div>
                )}

                <Input
                  label="Name *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Last"
                  required
                />

                <Input
                  label="Title / Role"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VP of Data Products"
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                  <Input
                    label="LinkedIn URL"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/..."
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    loading={loading}
                    disabled={!name.trim() || loading}
                  >
                    {loading ? "Drafting email..." : "Save Contact & Draft Email"}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Success — show contact saved + email */}
              <div className="flex items-center gap-2 rounded-md bg-status-green/10 border border-status-green/20 px-3 py-2">
                <svg className="w-4 h-4 text-status-green shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 8l4 4 8-8" />
                </svg>
                <p className="text-xs text-status-green">
                  <span className="font-medium">{result.contact.name}</span> saved as a contact
                  {result.contact.role ? ` · ${result.contact.role}` : ""}
                </p>
              </div>

              {/* Drafted email */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                    Prospecting Email
                  </p>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Subject: ${result.email.subject}\n\n${result.email.body}`,
                        "full"
                      )
                    }
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="5" width="8" height="9" rx="1" />
                      <path d="M3 11V3a1 1 0 011-1h8" />
                    </svg>
                    {copied === "full" ? "Copied!" : "Copy all"}
                  </button>
                </div>

                {/* Subject */}
                <div className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-text-muted mb-0.5">Subject</p>
                      <p className="text-sm font-medium text-text-primary truncate">
                        {result.email.subject}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(result.email.subject, "subject")}
                      className="shrink-0 rounded-md px-2 py-1 text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                    >
                      {copied === "subject" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-[10px] text-text-muted">Body</p>
                    <button
                      onClick={() => copyToClipboard(result.email.body, "body")}
                      className="shrink-0 rounded-md px-2 py-1 text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                    >
                      {copied === "body" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {result.email.body}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Done
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setName("");
                    setTitle("");
                    setEmail("");
                    setPhone("");
                    setLinkedin("");
                  }}
                >
                  Add Another Contact
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
