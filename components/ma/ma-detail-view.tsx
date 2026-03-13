"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MaHeader } from "./ma-header";
import { MaContactRow } from "./ma-contact-row";
import { MaDocumentUpload } from "./ma-document-upload";
import { addMaContact, addMaNote, deleteMaNote } from "@/app/(dashboard)/ma/actions";
import {
  MA_NOTE_TYPES,
  type MaEntity,
  type MaContact,
  type MaNote,
  type MaDocument,
} from "@/types/database";

interface MaDetailViewProps {
  entity: MaEntity;
  contacts: MaContact[];
  notes: MaNote[];
  documents: MaDocument[];
}

const noteTypeOptions = MA_NOTE_TYPES.map((t) => ({
  value: t.value,
  label: t.label,
}));

const noteTypeColors: Record<string, string> = {
  update: "#3b82f6",
  meeting: "#8b5cf6",
  research: "#06b6d4",
  document: "#eab308",
  decision: "#22c55e",
};

export function MaDetailView({ entity, contacts, notes, documents }: MaDetailViewProps) {
  const router = useRouter();
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactPending, startContactTransition] = useTransition();
  const [contactError, setContactError] = useState<string | null>(null);
  const [notePending, startNoteTransition] = useTransition();
  const [noteError, setNoteError] = useState<string | null>(null);

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

  function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNoteError(null);

    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startNoteTransition(async () => {
      const result = await addMaNote(entity.entity_id, formData);
      if ("error" in result) {
        setNoteError(result.error);
      } else {
        form.reset();
        router.refresh();
      }
    });
  }

  function handleDeleteNote(noteId: string) {
    startNoteTransition(async () => {
      const result = await deleteMaNote(noteId);
      if ("error" in result) {
        setNoteError(result.error);
      } else {
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
        {/* Main column — Notes */}
        <div className="lg:col-span-2 space-y-4">
          {/* Add Note form */}
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleAddNote} className="space-y-3">
                {noteError && (
                  <div className="rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
                    {noteError}
                  </div>
                )}

                <Textarea
                  name="content"
                  placeholder="Add a note, meeting summary, or research finding..."
                  rows={3}
                  required
                />

                <div className="flex items-center justify-between">
                  <Select
                    name="note_type"
                    options={noteTypeOptions}
                    defaultValue="update"
                    className="!w-36"
                  />
                  <Button type="submit" size="sm" loading={notePending}>
                    Add Note
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notes timeline */}
          {sortedNotes.length === 0 ? (
            <div className="rounded-lg border border-border-primary bg-surface-tertiary p-6 text-center">
              <p className="text-sm text-text-muted">
                No notes yet. Add your first note above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => {
                const typeConfig = MA_NOTE_TYPES.find(
                  (t) => t.value === note.note_type
                );
                const color = noteTypeColors[note.note_type] ?? "#6b7280";

                return (
                  <Card key={note.note_id}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                color,
                                backgroundColor: `${color}15`,
                              }}
                            >
                              {typeConfig?.label ?? note.note_type}
                            </span>
                            <span className="text-xs text-text-muted">
                              {formatDistanceToNow(
                                new Date(note.created_at),
                                { addSuffix: true }
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary whitespace-pre-wrap">
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
                            className="w-3.5 h-3.5"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M4 4l8 8M12 4l-8 8" />
                          </svg>
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
        </div>
      </div>
    </div>
  );
}
