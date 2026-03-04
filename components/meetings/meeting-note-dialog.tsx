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
import {
  createMeetingNote,
  updateMeetingNote,
} from "@/app/(dashboard)/meetings/actions";
import {
  MEETING_TYPES,
  PHAROSIQ_TEAM,
  type MeetingNote,
  type MeetingAttendee,
} from "@/types/database";

interface MeetingNoteDialogProps {
  open: boolean;
  onClose: () => void;
  deals: { deal_id: string; company: string }[];
  existingAttendees: string[];
  note?: MeetingNote | null;
}

function formatAttendees(attendees: MeetingAttendee[]): string {
  return attendees
    .map((a) => (a.role ? `${a.name} (${a.role})` : a.name))
    .join(", ");
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MeetingNoteDialog({
  open,
  onClose,
  deals,
  existingAttendees,
  note,
}: MeetingNoteDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!note;

  // Build autocomplete suggestions: pharosIQ team + previously used names
  const allSuggestions = Array.from(
    new Set([
      ...PHAROSIQ_TEAM.map((a) => (a.role ? `${a.name} (${a.role})` : a.name)),
      ...existingAttendees,
    ])
  ).sort();

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = isEdit
        ? await updateMeetingNote(note!.note_id, formData)
        : await createMeetingNote(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      handleClose();
      router.refresh();
    });
  }

  const now = new Date();
  const defaultDate = toDatetimeLocal(now.toISOString());

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Meeting Note" : "New Meeting Note"}
          </DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {error && (
            <div className="rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
              {error}
            </div>
          )}

          <Input
            name="title"
            label="Title"
            placeholder="e.g., 1:1 with Jeff — DaaS strategy"
            required
            defaultValue={note?.title ?? ""}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">
                Date & Time
              </label>
              <input
                name="meeting_date"
                type="datetime-local"
                required
                defaultValue={
                  note ? toDatetimeLocal(note.meeting_date) : defaultDate
                }
                className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>
            <Select
              name="meeting_type"
              label="Type"
              options={MEETING_TYPES}
              defaultValue={note?.meeting_type ?? "one_on_one"}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Attendees
            </label>
            <input
              name="attendees_json"
              placeholder='e.g., Jeff Rokuskie (CEO), Ben Luck (Chief Data Scientist)'
              defaultValue={note ? formatAttendees(note.attendees) : ""}
              className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              list="attendee-suggestions"
            />
            <datalist id="attendee-suggestions">
              {allSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-text-muted">
              Comma-separated. Add role in parentheses: Name (Role)
            </p>
          </div>

          <Textarea
            name="content"
            label="Notes"
            placeholder="What was discussed? Key decisions, context, anything you want to remember..."
            rows={6}
            required
            defaultValue={note?.content ?? ""}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              name="tags"
              label="Tags (optional)"
              placeholder="strategy, data, pricing"
              defaultValue={note?.tags.join(", ") ?? ""}
            />
            <Select
              name="deal_id"
              label="Link to Deal (optional)"
              options={[
                { value: "", label: "None" },
                ...deals.map((d) => ({
                  value: d.deal_id,
                  label: d.company,
                })),
              ]}
              defaultValue={note?.deal_id ?? ""}
            />
          </div>

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
              {isEdit ? "Save Changes" : "Save Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
