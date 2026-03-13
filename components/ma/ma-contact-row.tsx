"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMaContact } from "@/app/(dashboard)/ma/actions";
import type { MaContact } from "@/types/database";

interface MaContactRowProps {
  contact: MaContact;
  entityId: string;
}

export function MaContactRow({ contact }: MaContactRowProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteMaContact(contact.contact_id);
    if ("error" in result) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-xs font-semibold text-accent-primary">
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {contact.name}
          </span>
          {contact.role_in_process && (
            <span className="shrink-0 rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] font-medium text-text-muted">
              {contact.role_in_process}
            </span>
          )}
        </div>
        {contact.title && (
          <p className="text-xs text-text-secondary truncate">
            {contact.title}
          </p>
        )}
        <div className="flex items-center gap-3 mt-0.5">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="text-xs text-accent-primary hover:underline truncate"
            >
              {contact.email}
            </a>
          )}
          {contact.phone && (
            <span className="text-xs text-text-muted">{contact.phone}</span>
          )}
          {contact.linkedin_url && (
            <a
              href={contact.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent-primary hover:underline"
            >
              LinkedIn
            </a>
          )}
        </div>
        {error && (
          <p className="text-xs text-status-red mt-1">{error}</p>
        )}
      </div>

      {/* Delete */}
      {confirmDelete ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            className="rounded px-2 py-1 text-[10px] font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded bg-status-red px-2 py-1 text-[10px] font-medium text-white hover:bg-status-red/90 disabled:opacity-50 transition-colors"
          >
            {deleting ? "..." : "Delete"}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 rounded-md p-1 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
          title="Remove contact"
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
