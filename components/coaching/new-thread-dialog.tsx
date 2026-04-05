"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Deal, Project, Contact, ThreadParticipant } from "@/types/database";

interface ExistingThread {
  thread_id: string;
  title: string;
  contact_name: string | null;
  company: string | null;
}

interface NewThreadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: {
    thread_id: string;
    title: string;
    contact_name: string | null;
    contact_role: string | null;
    company: string | null;
    participants: ThreadParticipant[];
  }) => void;
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
  projects?: Pick<Project, "project_id" | "name" | "status" | "category">[];
  contacts?: Pick<Contact, "contact_id" | "name" | "company" | "role">[];
  onDealCreated?: (deal: Pick<Deal, "deal_id" | "company" | "stage">) => void;
  knownCompanies?: string[];
  existingThreads?: ExistingThread[];
  prefillDealId?: string | null;
  prefillCompany?: string | null;
}

type LinkType = "deal" | "project" | "none";

export function NewThreadDialog({
  open,
  onClose,
  onCreated,
  activeDeals,
  projects = [],
  contacts = [],
  onDealCreated,
  knownCompanies = [],
  existingThreads = [],
  prefillDealId,
  prefillCompany,
}: NewThreadDialogProps) {
  const [linkType, setLinkType] = useState<LinkType>("none");
  const [dealId, setDealId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [topic, setTopic] = useState("");
  const [company, setCompany] = useState("");
  const [participants, setParticipants] = useState<ThreadParticipant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantRole, setNewParticipantRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const companyInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const participantNameRef = useRef<HTMLInputElement>(null);

  // Apply prefill values when dialog opens
  useEffect(() => {
    if (open && prefillDealId) {
      setDealId(prefillDealId);
      setLinkType("deal");
    }
    if (open && prefillCompany) {
      setCompany(prefillCompany);
    }
  }, [open, prefillCompany, prefillDealId]);

  // When selecting a deal, auto-fill company
  useEffect(() => {
    if (dealId) {
      const deal = activeDeals.find((d) => d.deal_id === dealId);
      if (deal) setCompany(deal.company);
    }
  }, [dealId, activeDeals]);

  // Detect duplicate
  const duplicateThread = useMemo(() => {
    const title = topic.trim().toLowerCase();
    const comp = company.trim().toLowerCase();
    if (!title) return null;
    return existingThreads.find(
      (t) =>
        (t.title?.toLowerCase() === title || t.contact_name?.toLowerCase() === title) &&
        (!comp || t.company?.toLowerCase() === comp)
    ) ?? null;
  }, [topic, company, existingThreads]);

  const companySuggestions = useMemo(() => {
    if (!company.trim()) return [];
    const lower = company.toLowerCase();
    return knownCompanies.filter(
      (c) => c.toLowerCase().includes(lower) && c.toLowerCase() !== lower
    );
  }, [company, knownCompanies]);

  // Close suggestions on click outside
  useEffect(() => {
    if (!showCompanySuggestions) return;
    function onClickOutside(e: MouseEvent) {
      if (
        companyInputRef.current &&
        !companyInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowCompanySuggestions(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showCompanySuggestions]);

  function selectCompany(value: string) {
    setCompany(value);
    setShowCompanySuggestions(false);
    setHighlightedIndex(-1);
    const matchingDeal = activeDeals.find(
      (d) => d.company.toLowerCase() === value.toLowerCase()
    );
    if (matchingDeal) {
      setDealId(matchingDeal.deal_id);
      setLinkType("deal");
    }
  }

  function resetForm() {
    setLinkType("none");
    setDealId("");
    setProjectId("");
    setTopic("");
    setCompany("");
    setParticipants([]);
    setNewParticipantName("");
    setNewParticipantRole("");
    setError(null);
    setAutoCreateDeal(false);
  }

  function addParticipant() {
    const name = newParticipantName.trim();
    if (!name) return;
    if (participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    setParticipants((prev) => [
      ...prev,
      { name, role: newParticipantRole.trim() || undefined, company: company.trim() || undefined },
    ]);
    setNewParticipantName("");
    setNewParticipantRole("");
    participantNameRef.current?.focus();
  }

  function removeParticipant(index: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreateDeal() {
    const comp = company.trim();
    if (!comp) {
      setError("Enter a company name first.");
      return;
    }

    setCreatingDeal(true);
    setError(null);

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: comp, stage: "lead" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create deal.");
        return;
      }

      const { deal } = await res.json();
      setDealId(deal.deal_id);
      setLinkType("deal");
      onDealCreated?.({ deal_id: deal.deal_id, company: deal.company, stage: deal.stage });
    } catch {
      setError("Network error creating deal.");
    } finally {
      setCreatingDeal(false);
    }
  }

  // Suggest creating a deal when company + participant are set and no deal is linked
  const shouldSuggestDeal = useMemo(() => {
    if (linkType === "deal" && dealId) return false;
    if (!company.trim()) return false;
    if (participants.length === 0) return false;
    const companyLower = company.trim().toLowerCase();
    return !activeDeals.some((d) => d.company.toLowerCase() === companyLower);
  }, [company, participants, linkType, dealId, activeDeals]);

  const [autoCreateDeal, setAutoCreateDeal] = useState(false);

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleCreate() {
    const title = topic.trim();
    if (!title || loading) return;

    setLoading(true);
    setError(null);

    const primaryParticipant = participants[0] ?? null;

    // Auto-create deal if user opted in
    let finalDealId = linkType === "deal" ? dealId : "";
    if (autoCreateDeal && !finalDealId && company.trim()) {
      try {
        const dealRes = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: company.trim(),
            stage: "conversation",
            win_probability: 0,
          }),
        });
        if (dealRes.ok) {
          const { deal } = await dealRes.json();
          finalDealId = deal.deal_id;
          onDealCreated?.({ deal_id: deal.deal_id, company: deal.company, stage: deal.stage });
        }
      } catch {
        // Non-fatal
      }
    }

    try {
      const res = await fetch("/api/coaching/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contact_name: primaryParticipant?.name || undefined,
          contact_role: primaryParticipant?.role || undefined,
          company: company.trim() || undefined,
          deal_id: finalDealId || undefined,
          project_id: linkType === "project" ? projectId || undefined : undefined,
          participants,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create conversation.");
        return;
      }

      const thread = await res.json();
      resetForm();
      onCreated(thread);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Conversation</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* 1. Link to deal or project (first field) */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-text-secondary">
              Link to
            </label>
            {/* Link type selector */}
            <div className="flex gap-1 mb-2">
              {(["deal", "project", "none"] as LinkType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLinkType(type)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    linkType === type
                      ? "bg-accent-primary text-white"
                      : "bg-surface-tertiary text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {type === "deal" ? "Deal" : type === "project" ? "Project" : "Standalone"}
                </button>
              ))}
            </div>

            {/* Deal selector */}
            {linkType === "deal" && (
              <div className="flex gap-2">
                <select
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  autoFocus
                  className="flex-1 rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">Select a deal...</option>
                  {activeDeals.map((d) => (
                    <option key={d.deal_id} value={d.deal_id}>
                      {d.company} ({d.stage.replace(/_/g, " ")})
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCreateDeal}
                  loading={creatingDeal}
                  disabled={!company.trim()}
                  title={company.trim() ? `Create "${company.trim()}" as a new lead` : "Enter a company name below first"}
                >
                  + New Deal
                </Button>
              </div>
            )}

            {/* Project selector */}
            {linkType === "project" && (
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                autoFocus
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">Select a project...</option>
                {projects.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.name} ({p.status}{p.category ? `, ${p.category}` : ""})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. What do you want to discuss? */}
          <div>
            <label
              htmlFor="conv-topic"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              What do you want to discuss?
            </label>
            <input
              id="conv-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Pricing strategy, Account plan, Competitive positioning"
              maxLength={200}
              autoFocus={linkType === "none"}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* 3. Account / Company (shown when not linked to a deal, or for context) */}
          {linkType !== "deal" && (
            <div className="relative">
              <label
                htmlFor="company"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Company (optional)
              </label>
              <input
                ref={companyInputRef}
                id="company"
                type="text"
                value={company}
                onChange={(e) => {
                  setCompany(e.target.value);
                  setShowCompanySuggestions(true);
                  setHighlightedIndex(-1);
                }}
                onFocus={() => setShowCompanySuggestions(true)}
                onKeyDown={(e) => {
                  if (showCompanySuggestions && companySuggestions.length > 0) {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIndex((i) =>
                        i < companySuggestions.length - 1 ? i + 1 : 0
                      );
                      return;
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIndex((i) =>
                        i > 0 ? i - 1 : companySuggestions.length - 1
                      );
                      return;
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (highlightedIndex >= 0) {
                        selectCompany(companySuggestions[highlightedIndex]);
                      } else {
                        setShowCompanySuggestions(false);
                      }
                      return;
                    } else if (e.key === "Escape") {
                      setShowCompanySuggestions(false);
                      return;
                    }
                  }
                  handleKeyDown(e);
                }}
                placeholder="e.g. pharosIQ"
                maxLength={200}
                autoComplete="off"
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
              {showCompanySuggestions && companySuggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-md border border-border-primary bg-surface-secondary shadow-lg"
                >
                  {companySuggestions.map((c, i) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => selectCompany(c)}
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        i === highlightedIndex
                          ? "bg-accent-primary/15 text-accent-primary"
                          : "text-text-primary hover:bg-surface-tertiary"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. People involved */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              People involved (optional)
            </label>

            {participants.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {participants.map((p, i) => (
                  <span
                    key={p.name}
                    className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2.5 py-1 text-xs font-medium text-accent-primary"
                  >
                    {p.name}
                    {p.role && (
                      <span className="text-text-muted font-normal">· {p.role}</span>
                    )}
                    <button
                      onClick={() => removeParticipant(i)}
                      className="ml-0.5 text-text-muted hover:text-status-red transition-colors"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Contact dropdown */}
            {contacts.length > 0 && (
              <div className="mb-2">
                <select
                  value=""
                  onChange={(e) => {
                    const contact = contacts.find((c) => c.contact_id === e.target.value);
                    if (contact && !participants.some((p) => p.name.toLowerCase() === contact.name.toLowerCase())) {
                      setParticipants((prev) => [
                        ...prev,
                        { name: contact.name, role: contact.role ?? undefined, company: contact.company ?? undefined },
                      ]);
                    }
                  }}
                  className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="">Add from contacts...</option>
                  {contacts
                    .filter((c) => !participants.some((p) => p.name.toLowerCase() === c.name.toLowerCase()))
                    .map((c) => (
                      <option key={c.contact_id} value={c.contact_id}>
                        {c.name}{c.role ? ` (${c.role})` : ""}{c.company ? ` · ${c.company}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Manual add */}
            <div className="flex gap-2">
              <input
                ref={participantNameRef}
                type="text"
                value={newParticipantName}
                onChange={(e) => setNewParticipantName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="Or type a name"
                maxLength={200}
                className="flex-1 rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
              <input
                type="text"
                value={newParticipantRole}
                onChange={(e) => setNewParticipantRole(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="Role (optional)"
                maxLength={200}
                className="w-32 rounded-md border border-border-primary bg-surface-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={addParticipant}
                disabled={!newParticipantName.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          {/* Auto-deal suggestion */}
          {shouldSuggestDeal && (
            <label className="flex items-start gap-2 rounded-lg border border-brand-500/20 bg-brand-500/5 px-3 py-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoCreateDeal}
                onChange={(e) => setAutoCreateDeal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border-primary accent-brand-500"
              />
              <span className="text-xs text-text-secondary">
                Create a deal card for <strong className="text-text-primary">{company.trim()}</strong>?
                <span className="text-text-muted"> Starting stage: Conversation (0%)</span>
              </span>
            </label>
          )}

          {duplicateThread && (
            <div className="rounded-md border border-status-yellow/40 bg-status-yellow/10 px-3 py-2">
              <p className="text-xs font-medium text-status-yellow">
                A conversation named &ldquo;{duplicateThread.title || duplicateThread.contact_name}&rdquo; already exists.
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-status-red">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              loading={loading}
              disabled={!topic.trim() || !!duplicateThread}
            >
              Start Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
