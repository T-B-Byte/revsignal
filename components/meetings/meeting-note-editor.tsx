"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { autoSaveMeetingNote } from "@/app/(dashboard)/meetings/actions";
import { MEETING_TYPES, type MeetingNote } from "@/types/database";
import { format } from "date-fns";

interface MeetingNoteEditorProps {
  note: MeetingNote;
  deals: { deal_id: string; company: string }[];
}

export function MeetingNoteEditor({ note, deals }: MeetingNoteEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState(note.content);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef(content);
  const lastSavedRef = useRef(note.content);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync
  contentRef.current = content;

  const save = useCallback(async () => {
    const current = contentRef.current;
    if (current === lastSavedRef.current) return;

    setSaving(true);
    setError(null);

    const result = await autoSaveMeetingNote(note.note_id, current);

    if ("error" in result) {
      setError(result.error);
    } else {
      lastSavedRef.current = current;
      setSavedAt(result.savedAt);
    }
    setSaving(false);
  }, [note.note_id]);

  // Debounced auto-save every 30 seconds
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      save();
    }, 30_000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, save]);

  // Cmd+S manual save
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save]);

  // Save before navigating away
  useEffect(() => {
    function handleBeforeUnload() {
      if (contentRef.current !== lastSavedRef.current) {
        save();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [save]);

  const meetingTypeLabel =
    MEETING_TYPES.find((t) => t.value === note.meeting_type)?.label ??
    note.meeting_type;

  const attendeeStr = note.attendees
    .map((a) => (a.role ? `${a.name} (${a.role})` : a.name))
    .join(", ");

  const dealCompany = note.deal_id
    ? deals.find((d) => d.deal_id === note.deal_id)?.company
    : null;

  const isFuture = note.meeting_date >= new Date().toISOString().slice(0, 10);

  function handleDebrief() {
    save();
    router.push(`/meetings?debrief=${note.note_id}`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      {/* Back link */}
      <button
        onClick={() => {
          save();
          router.push("/meetings");
        }}
        className="flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M10 12L6 8l4-4" />
        </svg>
        Back to Meetings
      </button>

      {/* Metadata header */}
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
        <h1 className="text-lg font-semibold text-text-primary">
          {note.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="font-data">
            {format(new Date(note.meeting_date + "T00:00:00"), "EEEE, MMM d, yyyy")}
          </span>
          <span className="rounded bg-surface-tertiary px-2 py-0.5">
            {meetingTypeLabel}
          </span>
          {dealCompany && (
            <span className="rounded bg-accent-primary/10 px-2 py-0.5 text-accent-primary">
              {dealCompany}
            </span>
          )}
          {isFuture && (
            <span className="rounded bg-status-green/10 px-2 py-0.5 text-status-green">
              Upcoming
            </span>
          )}
        </div>
        {attendeeStr && (
          <p className="mt-2 text-xs text-text-secondary">
            <span className="font-medium text-text-muted">Attendees:</span>{" "}
            {attendeeStr}
          </p>
        )}
        {note.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-surface-tertiary px-2 py-0.5 text-[10px] text-text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start taking notes..."
          className="min-h-[60vh] w-full resize-none rounded-lg border border-border-primary bg-surface-primary p-4 font-mono text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>

      {/* Footer: save status + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-text-muted">
          {saving && <span>Saving...</span>}
          {!saving && savedAt && (
            <span>
              Saved at{" "}
              {new Date(savedAt).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          {!saving && !savedAt && content !== note.content && (
            <span>Unsaved changes</span>
          )}
          {error && (
            <span className="text-status-red">{error}</span>
          )}
          <span className="text-text-muted/50">
            {"\u2318"}S to save
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!isFuture && note.deal_id && (
            <button
              onClick={handleDebrief}
              className="rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
            >
              Save & Debrief
            </button>
          )}
          <button
            onClick={() => save()}
            disabled={saving || content === lastSavedRef.current}
            className="rounded-md border border-border-primary px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-tertiary disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
