"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { updateContact } from "@/app/(dashboard)/contacts/[contactId]/actions";
import type { Contact } from "@/types/database";

interface ContactHeaderProps {
  contact: Contact;
}

export function ContactHeader({ contact }: ContactHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(formData: FormData) {
    setError(null);

    const updates: Record<string, unknown> = {};

    const name = formData.get("name") as string;
    if (name && name !== contact.name) updates.name = name;

    const company = formData.get("company") as string;
    if (company && company !== contact.company) updates.company = company;

    const role = formData.get("role") as string;
    if (role !== (contact.role ?? "")) updates.role = role || null;

    const email = formData.get("email") as string;
    if (email !== (contact.email ?? "")) updates.email = email || null;

    const phone = formData.get("phone") as string;
    if (phone !== (contact.phone ?? "")) updates.phone = phone || null;

    const linkedin = formData.get("linkedin") as string;
    if (linkedin !== (contact.linkedin ?? "")) updates.linkedin = linkedin || null;

    const icp_category = formData.get("icp_category") as string;
    if (icp_category !== (contact.icp_category ?? ""))
      updates.icp_category = icp_category || null;

    const notes = formData.get("notes") as string;
    if (notes !== (contact.notes ?? "")) updates.notes = notes || null;

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateContact(contact.contact_id, updates);
      if ("error" in result) {
        setError(result.error);
      } else {
        setIsEditing(false);
      }
    });
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="pt-4">
          <form action={handleSave} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-status-red bg-status-red/10 border border-status-red/20 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="name"
                label="Name"
                defaultValue={contact.name}
                required
              />
              <Input
                name="company"
                label="Company"
                defaultValue={contact.company}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="role"
                label="Role"
                defaultValue={contact.role ?? ""}
              />
              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={contact.email ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                name="phone"
                label="Phone"
                defaultValue={contact.phone ?? ""}
              />
              <Input
                name="linkedin"
                label="LinkedIn"
                defaultValue={contact.linkedin ?? ""}
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <Input
              name="icp_category"
              label="ICP Category"
              defaultValue={contact.icp_category ?? ""}
            />

            <Textarea
              name="notes"
              label="Notes"
              defaultValue={contact.notes ?? ""}
              rows={3}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditing(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" loading={isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-primary/10 flex items-center justify-center text-sm font-bold text-accent-primary">
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">
                {contact.name}
              </h1>
              <p className="text-sm text-text-secondary">
                {contact.role ? `${contact.role} — ` : ""}
                {contact.company}
              </p>
              <div className="flex items-center gap-3 flex-wrap mt-2">
                {contact.icp_category && (
                  <Badge variant="blue">{contact.icp_category}</Badge>
                )}
                {contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) && (
                  <a
                    href={`mailto:${encodeURIComponent(contact.email)}`}
                    className="text-xs text-accent-primary hover:underline"
                  >
                    {contact.email}
                  </a>
                )}
                {contact.phone && (
                  <span className="text-xs text-text-muted">
                    {contact.phone}
                  </span>
                )}
                {contact.linkedin && /^https?:\/\//i.test(contact.linkedin) && (
                  <a
                    href={contact.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-primary hover:underline"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5Z" />
            </svg>
            Edit
          </Button>
        </div>

        {contact.notes && (
          <p className="mt-3 text-sm text-text-secondary">{contact.notes}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-text-muted border-t border-border-primary pt-3">
          <span>
            Added: {new Date(contact.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
