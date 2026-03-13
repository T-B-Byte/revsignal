"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MaHeader } from "./ma-header";
import { MaContactRow } from "./ma-contact-row";
import { MaDocumentUpload } from "./ma-document-upload";
import { ThreadChat } from "@/components/coaching/thread-chat";
import { addMaContact, deleteMaNote } from "@/app/(dashboard)/ma/actions";
import {
  MA_NOTE_TYPES,
  type MaEntity,
  type MaContact,
  type MaNote,
  type MaDocument,
  type CoachingThread,
  type CoachingMessage,
} from "@/types/database";

interface MaDetailViewProps {
  entity: MaEntity;
  contacts: MaContact[];
  notes: MaNote[];
  documents: MaDocument[];
  thread: CoachingThread | null;
  initialMessages: CoachingMessage[];
}

const noteTypeColors: Record<string, string> = {
  update: "#3b82f6",
  meeting: "#8b5cf6",
  research: "#06b6d4",
  document: "#eab308",
  decision: "#22c55e",
};

export function MaDetailView({ entity, contacts, notes, documents, thread, initialMessages }: MaDetailViewProps) {
  const router = useRouter();
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactPending, startContactTransition] = useTransition();
  const [contactError, setContactError] = useState<string | null>(null);
  const [notePending, startNoteTransition] = useTransition();
  const [showNotes, setShowNotes] = useState(false);

  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  function handleAddContact(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setContactError(null);

    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startContactTransition(async () => {
      const result = await addMaContact(entity.entity_id, formData);
      if ("error" in result) {
        setContactError(result.error);
      } else {
        form.reset();
        setShowAddContact(false);
        router.refresh();
      }
    });
  }

  function handleDeleteNote(noteId: string) {
    startNoteTransition(async () => {
      const result = await deleteMaNote(noteId);
      if (!("error" in result)) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaHeader entity={entity} />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column — Strategist Chat */}
        <div className="lg:col-span-2 space-y-4">
          {thread ? (
            <ThreadChat
              thread={thread}
              initialMessages={initialMessages}
            />
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-text-muted">
                  Unable to initialize Strategist thread. Refresh to try again.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Documents */}
          <MaDocumentUpload entityId={entity.entity_id} documents={documents} />

          {/* Contacts card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="text-sm">
                  Contacts
                  {contacts.length > 0 && (
                    <span className="ml-1.5 text-xs font-normal text-text-muted">
                      ({contacts.length})
                    </span>
                  )}
                </CardTitle>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  className="rounded-md p-1 text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-colors"
                  title="Add contact"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      showAddContact ? "rotate-45" : ""
                    }`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M8 3v10M3 8h10" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add contact form */}
              {showAddContact && (
                <form
                  onSubmit={handleAddContact}
                  className="mb-3 space-y-2 rounded-md border border-border-primary bg-surface-tertiary p-3"
                >
                  {contactError && (
                    <div className="rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
                      {contactError}
                    </div>
                  )}

                  <Input
                    name="name"
                    placeholder="Full name"
                    required
                  />
                  <Input name="title" placeholder="Title" />
                  <Input name="email" type="email" placeholder="Email" />
                  <Input name="phone" placeholder="Phone" />
                  <Input
                    name="linkedin_url"
                    type="url"
                    placeholder="LinkedIn URL"
                  />
                  <Input
                    name="role_in_process"
                    placeholder="Role in process (e.g., Decision maker)"
                  />

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowAddContact(false);
                        setContactError(null);
                      }}
                      disabled={contactPending}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" loading={contactPending}>
                      Add
                    </Button>
                  </div>
                </form>
              )}

              {/* Contact list */}
              {contacts.length === 0 && !showAddContact ? (
                <p className="text-xs text-text-muted py-2">
                  No contacts added yet.
                </p>
              ) : (
                <div className="divide-y divide-border-primary">
                  {contacts.map((contact) => (
                    <MaContactRow
                      key={contact.contact_id}
                      contact={contact}
                      entityId={entity.entity_id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strategic Rationale */}
          {entity.strategic_rationale && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Strategic Rationale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {entity.strategic_rationale}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Source & Notes */}
          {(entity.source || entity.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Source &amp; Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {entity.source && (
                  <div>
                    <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                      Source
                    </p>
                    <p className="text-sm text-text-secondary">
                      {entity.source}
                    </p>
                  </div>
                )}
                {entity.notes && (
                  <div>
                    <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                      Notes
                    </p>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {entity.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Historical Notes (from before Strategist integration) */}
          {sortedNotes.length > 0 && (
            <Card>
              <CardHeader>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center justify-between w-full"
                >
                  <CardTitle className="text-sm">
                    Notes History
                    <span className="ml-1.5 text-xs font-normal text-text-muted">
                      ({sortedNotes.length})
                    </span>
                  </CardTitle>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform ${showNotes ? "rotate-180" : ""}`}
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              </CardHeader>
              {showNotes && (
                <CardContent className="space-y-2">
                  {sortedNotes.map((note) => {
                    const typeConfig = MA_NOTE_TYPES.find(
                      (t) => t.value === note.note_type
                    );
                    const color = noteTypeColors[note.note_type] ?? "#6b7280";

                    return (
                      <div
                        key={note.note_id}
                        className="rounded-md border border-border-primary bg-surface-tertiary p-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                                style={{
                                  color,
                                  backgroundColor: `${color}15`,
                                }}
                              >
                                {typeConfig?.label ?? note.note_type}
                              </span>
                              <span className="text-[10px] text-text-muted">
                                {formatDistanceToNow(
                                  new Date(note.created_at),
                                  { addSuffix: true }
                                )}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary whitespace-pre-wrap">
                              {note.content}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(note.note_id)}
                            disabled={notePending}
                            className="shrink-0 rounded-md p-1 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors disabled:opacity-50"
                            title="Delete note"
                          >
                            <svg
                              className="w-3 h-3"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                            >
                              <path d="M4 4l8 8M12 4l-8 8" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
