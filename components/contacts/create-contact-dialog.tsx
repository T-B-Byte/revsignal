"use client";

import { useState } from "react";
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

interface CreateContactDialogProps {
  open: boolean;
  onClose: () => void;
  icpCategories: string[];
}

export function CreateContactDialog({
  open,
  onClose,
  icpCategories,
}: CreateContactDialogProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);

    const body: Record<string, unknown> = {
      name: form.get("name"),
      company: form.get("company"),
    };

    const role = form.get("role");
    if (role) body.role = role;

    const email = form.get("email");
    if (email) body.email = email;

    const phone = form.get("phone");
    if (phone) body.phone = phone;

    const linkedin = form.get("linkedin");
    if (linkedin) body.linkedin = linkedin;

    const icp = form.get("icp_category");
    if (icp) body.icp_category = icp;

    const notes = form.get("notes");
    if (notes) body.notes = notes;

    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create contact.");
        return;
      }

      handleClose();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const icpOptions = icpCategories.map((cat) => ({ value: cat, label: cat }));

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contact</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="name"
              label="Name"
              placeholder="Jane Smith"
              required
            />
            <Input
              name="company"
              label="Company"
              placeholder="Acme Corp"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="role" label="Role" placeholder="VP of Marketing" />
            <Input
              name="email"
              label="Email"
              type="email"
              placeholder="jane@acme.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input name="phone" label="Phone" placeholder="+1 555-0123" />
            <Input
              name="linkedin"
              label="LinkedIn URL"
              type="url"
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          {icpOptions.length > 0 && (
            <Select
              name="icp_category"
              label="ICP Category"
              options={icpOptions}
              placeholder="Select category (optional)"
            />
          )}

          <Textarea
            name="notes"
            label="Notes"
            placeholder="How you met, relationship context..."
            rows={3}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add Contact
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
