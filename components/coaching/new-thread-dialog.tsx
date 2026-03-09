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
  onCreated: (thread: { thread_id: string; title: string }) => void;
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
}

export function NewThreadDialog({
  open,
  onClose,
  onCreated,
  activeDeals,
}: NewThreadDialogProps) {
  const [title, setTitle] = useState("");
  const [dealId, setDealId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coaching/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          deal_id: dealId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create thread.");
        return;
      }

      const thread = await res.json();
      setTitle("");
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
    <Dialog open={open} onClose={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Thread</DialogTitle>
          <DialogClose onClose={onClose} />
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Thread name */}
          <div>
            <label
              htmlFor="thread-title"
              className="mb-1 block text-xs font-medium text-text-secondary"
            >
              Thread name
            </label>
            <input
              id="thread-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Apollo Data Partnership"
              maxLength={200}
              autoFocus
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
              <option value="">No deal (general thread)</option>
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
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              loading={loading}
              disabled={!title.trim()}
            >
              Create Thread
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
