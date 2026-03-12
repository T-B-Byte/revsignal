"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Deal } from "@/types/database";

interface NewThreadDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (thread: {
    thread_id: string;
    title: string;
    contact_name: string | null;
    contact_role: string | null;
    company: string | null;
  }) => void;
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
}

export function NewThreadDialog({
  open,
  onClose,
  onCreated,
  activeDeals,
}: NewThreadDialogProps) {
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [company, setCompany] = useState("");
  const [dealId, setDealId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes
  function resetForm() {
    setContactName("");
    setContactRole("");
    setCompany("");
    setDealId("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  async function handleCreate() {
    const name = contactName.trim();
    const comp = company.trim();
    if (!name || !comp) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coaching/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name,
          contact_name: name,
          contact_role: contactRole.trim() || undefined,
          company: comp,
          deal_id: dealId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create thread.");
        return;
      }

      const thread = await res.json();
      setContactName("");
      setContactRole("");
      setCompany("");
      setDealId("");
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
          {/* Person name */}
          <div>
            <label
              htmlFor="contact-name"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Person Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Anna Eliot"
              maxLength={200}
              autoFocus
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Account / Company */}
          <div>
            <label
              htmlFor="company"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Account / Company
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. pharosIQ"
              maxLength={200}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Role / Title */}
          <div>
            <label
              htmlFor="contact-role"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Role / Title (optional)
            </label>
            <input
              id="contact-role"
              type="text"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. CMO"
              maxLength={200}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Deal association */}
          <div>
            <label
              htmlFor="thread-deal"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Link to deal (optional)
            </label>
            <select
              id="thread-deal"
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">No deal</option>
              {activeDeals.map((d) => (
                <option key={d.deal_id} value={d.deal_id}>
                  {d.company} ({d.stage.replace(/_/g, " ")})
                </option>
              ))}
            </select>
          </div>

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
              disabled={!contactName.trim() || !company.trim()}
            >
              Create Thread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
