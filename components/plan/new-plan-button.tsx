"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export function NewPlanButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setTitle("");
    setDescription("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setError(null);
    setOpen(false);
  }

  async function handleCreate() {
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          start_date: startDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create plan.");
        return;
      }

      const plan = await res.json();
      handleClose();
      router.push(`/plan/${plan.plan_id}`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        + New Plan
      </Button>

      <Dialog open={open} onClose={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New 90-Day Plan</DialogTitle>
            <DialogClose onClose={handleClose} />
          </DialogHeader>

          <div className="space-y-4 px-6 py-4">
            <div>
              <label
                htmlFor="plan-title"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Plan Name
              </label>
              <input
                id="plan-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                placeholder="e.g. pharosIQ Onboarding, Q2 Revenue Ramp"
                maxLength={200}
                autoFocus
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="plan-desc"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Description (optional)
              </label>
              <textarea
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Goals, context, what success looks like at 90 days"
                maxLength={2000}
                rows={2}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none resize-none"
              />
            </div>

            <div>
              <label
                htmlFor="plan-start"
                className="mb-1 block text-xs font-medium text-text-secondary"
              >
                Start Date
              </label>
              <input
                id="plan-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>

            {error && <p className="text-xs text-status-red">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                loading={loading}
                disabled={!title.trim()}
              >
                Create Plan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
