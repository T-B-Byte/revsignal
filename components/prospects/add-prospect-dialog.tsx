"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createProspect } from "@/app/(dashboard)/prospects/actions";

interface AddProspectDialogProps {
  open: boolean;
  onClose: () => void;
  icpCategories: string[];
}

export function AddProspectDialog({
  open,
  onClose,
  icpCategories,
}: AddProspectDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createProspect(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      handleClose();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Prospect</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
              {error}
            </div>
          )}

          <Input
            name="company"
            label="Company"
            placeholder="e.g., Demandbase"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-secondary">
                ICP Category
              </label>
              <input
                name="icp_category"
                list="icp-categories"
                placeholder="e.g., B2B SaaS Platform"
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              />
              <datalist id="icp-categories">
                {icpCategories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <Input
              name="estimated_acv"
              label="Estimated ACV ($)"
              type="number"
              placeholder="150000"
              min={0}
            />
          </div>

          <Input
            name="website"
            label="Website"
            type="url"
            placeholder="https://example.com"
          />

          <Textarea
            name="why_they_buy"
            label="Why They'd Buy"
            placeholder="What makes this company a good fit for DaaS?"
            rows={2}
          />

          <Textarea
            name="research_notes"
            label="Research Notes"
            placeholder="What do you know about this company? Paste intel here..."
            rows={3}
          />

          <input type="hidden" name="source" value="manual" />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Add Prospect
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
