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
import type { Deal, ThreadParticipant } from "@/types/database";

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
  onDealCreated?: (deal: Pick<Deal, "deal_id" | "company" | "stage">) => void;
  /** Known company names from existing threads/deals for autocomplete */
  knownCompanies?: string[];
  /** Existing threads for duplicate detection */
  existingThreads?: ExistingThread[];
}

export function NewThreadDialog({
  open,
  onClose,
  onCreated,
  activeDeals,
  onDealCreated,
  knownCompanies = [],
  existingThreads = [],
}: NewThreadDialogProps) {
  const [projectName, setProjectName] = useState("");
  const [company, setCompany] = useState("");
  const [dealId, setDealId] = useState("");
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

  // Detect duplicate thread as user types
  const duplicateThread = useMemo(() => {
    const title = projectName.trim().toLowerCase();
    const comp = company.trim().toLowerCase();
    if (!title) return null;
    return existingThreads.find(
      (t) =>
        (t.title?.toLowerCase() === title || t.contact_name?.toLowerCase() === title) &&
        (!comp || t.company?.toLowerCase() === comp)
    ) ?? null;
  }, [projectName, company, existingThreads]);

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
    if (matchingDeal) setDealId(matchingDeal.deal_id);
  }

  function resetForm() {
    setProjectName("");
    setCompany("");
    setDealId("");
    setParticipants([]);
    setNewParticipantName("");
    setNewParticipantRole("");
    setError(null);
  }

  function addParticipant() {
    const name = newParticipantName.trim();
    if (!name) return;
    // Avoid duplicates
    if (participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    setParticipants((prev) => [
      ...prev,
      { name, role: newParticipantRole.trim() || undefined, company: company.trim() || undefined },
    ]);
    setNewParticipantName("");
    setNewParticipantRole("");
    // Keep focus on participant name input
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
      onDealCreated?.({ deal_id: deal.deal_id, company: deal.company, stage: deal.stage });
    } catch {
      setError("Network error creating deal.");
    } finally {
      setCreatingDeal(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleCreate() {
    const title = projectName.trim();
    if (!title) return;

    setLoading(true);
    setError(null);

    // Build backward-compatible contact_name from first participant
    const primaryParticipant = participants[0] ?? null;

    try {
      const res = await fetch("/api/coaching/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contact_name: primaryParticipant?.name ?? null,
          contact_role: primaryParticipant?.role ?? null,
          company: company.trim() || undefined,
          deal_id: dealId || undefined,
          participants,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create thread.");
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
          <DialogTitle>New StrategyGPT Thread</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Project / Thread name */}
          <div>
            <label
              htmlFor="project-name"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Project / Topic
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Apollo DaaS Pilot, Midmarket Packaging, Weekly Sync"
              maxLength={200}
              autoFocus
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Account / Company */}
          <div className="relative">
            <label
              htmlFor="company"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Account / Company (optional)
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
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightedIndex((i) =>
                      i > 0 ? i - 1 : companySuggestions.length - 1
                    );
                  } else if (e.key === "Enter" && highlightedIndex >= 0) {
                    e.preventDefault();
                    selectCompany(companySuggestions[highlightedIndex]);
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

          {/* Participants */}
          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              People Involved (optional)
            </label>

            {/* Existing participants */}
            {participants.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {participants.map((p, i) => (
                  <span
                    key={i}
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

            {/* Add participant inline */}
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
                placeholder="Name"
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

          {/* Deal association */}
          <div>
            <label
              htmlFor="thread-deal"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Link to deal (optional)
            </label>
            <div className="flex gap-2">
              <select
                id="thread-deal"
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                className="flex-1 rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              >
                <option value="">No deal</option>
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
                title={company.trim() ? `Create "${company.trim()}" as a new lead` : "Enter a company name first"}
              >
                + New Deal
              </Button>
            </div>
          </div>

          {duplicateThread && (
            <div className="rounded-md border border-status-yellow/40 bg-status-yellow/10 px-3 py-2">
              <p className="text-xs font-medium text-status-yellow">
                A thread named &ldquo;{duplicateThread.title || duplicateThread.contact_name}&rdquo; already exists.
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
              disabled={!projectName.trim() || !!duplicateThread}
            >
              Create Thread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
