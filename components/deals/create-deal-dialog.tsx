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
import { DatePicker } from "@/components/ui/date-picker";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createDeal } from "@/app/(dashboard)/deals/actions";
import { DEAL_STAGES } from "@/types/database";

interface CreateDealDialogProps {
  open: boolean;
  onClose: () => void;
}

const stageOptions = DEAL_STAGES.map((s) => ({
  value: s.value,
  label: s.label,
}));

const deploymentOptions = [
  { value: "api", label: "API" },
  { value: "flat_file", label: "Flat File" },
  { value: "cloud_delivery", label: "Cloud Delivery" },
  { value: "platform_integration", label: "Platform Integration" },
  { value: "embedded_oem", label: "Embedded / OEM" },
];

const tierOptions = [
  { value: "signals", label: "Signals" },
  { value: "intelligence", label: "Intelligence" },
  { value: "embedded", label: "Embedded" },
];

export function CreateDealDialog({ open, onClose }: CreateDealDialogProps) {
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
      const result = await createDeal(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      handleClose();
      router.push(`/deals/${result.deal_id}`);
    });
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
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
            <Input
              name="acv"
              label="ACV ($)"
              type="number"
              placeholder="100000"
              min={0}
            />

            <Select
              name="stage"
              label="Stage"
              options={stageOptions}
              defaultValue="lead"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              name="deployment_method"
              label="Deployment Method"
              options={deploymentOptions}
              placeholder="Select method"
            />

            <Select
              name="product_tier"
              label="Product Tier"
              options={tierOptions}
              placeholder="Select tier"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="win_probability"
              label="Win Probability (%)"
              type="number"
              placeholder="10"
              min={0}
              max={100}
            />

            <DatePicker name="close_date" label="Expected Close Date" placeholder="Pick date" />
          </div>

          <Textarea
            name="notes"
            label="Notes"
            placeholder="Initial notes about this deal..."
            rows={3}
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
              Create Deal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
