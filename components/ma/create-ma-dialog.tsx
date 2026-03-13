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
import { Select } from "@/components/ui/select";
import { createMaEntity } from "@/app/(dashboard)/ma/actions";
import { MA_STAGES, MA_ENTITY_TYPES } from "@/types/database";

interface CreateMaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const stageOptions = MA_STAGES.map((s) => ({
  value: s.value,
  label: s.label,
}));

const typeOptions = MA_ENTITY_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}));

export function CreateMaDialog({ open, onOpenChange }: CreateMaDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createMaEntity(formData);

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
          <DialogTitle>Add M&amp;A Entity</DialogTitle>
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
            placeholder="e.g., Acme Corp"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              name="entity_type"
              label="Type"
              options={typeOptions}
              defaultValue="target"
            />

            <Select
              name="stage"
              label="Stage"
              options={stageOptions}
              defaultValue="identified"
            />
          </div>

          <Textarea
            name="strategic_rationale"
            label="Strategic Rationale"
            placeholder="Why is this entity relevant to the M&A strategy?"
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="estimated_valuation"
              label="Estimated Valuation ($)"
              type="number"
              placeholder="50000000"
              min={0}
            />

            <Input
              name="website"
              label="Website"
              type="url"
              placeholder="https://example.com"
            />
          </div>

          <Input
            name="source"
            label="Source"
            placeholder="e.g., Banker referral, Industry research"
          />

          <Textarea
            name="notes"
            label="Notes"
            placeholder="Additional notes..."
            rows={2}
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
              Add Entity
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
