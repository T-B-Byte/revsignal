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
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addCompetitiveIntel } from "@/app/(dashboard)/compete/actions";

interface AddIntelDialogProps {
  open: boolean;
  onClose: () => void;
  existingCompetitors: string[];
}

const categoryOptions = [
  { value: "product", label: "Product" },
  { value: "pricing", label: "Pricing" },
  { value: "positioning", label: "Positioning" },
  { value: "weakness", label: "Weakness" },
  { value: "pharosiq_advantage", label: "pharosIQ Advantage" },
  { value: "data_coverage", label: "Data Coverage" },
  { value: "integration", label: "Integration" },
  { value: "market_share", label: "Market Share" },
  { value: "customer_feedback", label: "Customer Feedback" },
];

export function AddIntelDialog({
  open,
  onClose,
  existingCompetitors,
}: AddIntelDialogProps) {
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
      const result = await addCompetitiveIntel(formData);

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
          <DialogTitle>Add Competitive Intel</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-text-secondary">
              Competitor
            </label>
            <input
              name="competitor"
              list="competitor-list"
              placeholder="e.g., Bombora"
              required
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            />
            <datalist id="competitor-list">
              {existingCompetitors.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <Select
            name="category"
            label="Category"
            options={categoryOptions}
            required
          />

          <Textarea
            name="data_point"
            label="Intel"
            placeholder="What did you learn? e.g., 'Their API rate limits are 100 req/min on the enterprise plan'"
            rows={3}
            required
          />

          <Input
            name="source"
            label="Source (optional)"
            placeholder="e.g., Competitor website, customer call, G2 review"
          />

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
              Add Intel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
