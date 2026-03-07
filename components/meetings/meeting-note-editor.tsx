"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoSaveMeetingNote, toggleMeetingNotePin } from "@/app/(dashboard)/meetings/actions";
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
  const [pinned, setPinned] = useState((note.tags ?? []).includes("foundational"));
  const [, startPinTransition] = useTransition();

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
        <div className="flex items-start justify-between">
          <h1 className="text-lg font-semibold text-text-primary">
            {note.title}
          </h1>
          <button
            onClick={() => {
              const next = !pinned;
              setPinned(next);
              startPinTransition(async () => {
                const result = await toggleMeetingNotePin(note.note_id);
                if ("error" in result) setPinned(!next);
              });
            }}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              pinned
                ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                : "bg-surface-tertiary text-text-muted hover:bg-surface-tertiary/80 hover:text-text-secondary"
            }`}
            title={pinned ? "Unpin: remove from permanent memory" : "Pin: always remembered by the Strategist"}
          >
            <svg className="mr-1 inline h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.828 1.282a1 1 0 0 1 1.414 0l3.476 3.476a1 1 0 0 1 0 1.414L13.5 7.39l.5.5a.5.5 0 0 1 0 .707l-1.5 1.5a.5.5 0 0 1-.707 0L11 9.304l-3.146 3.147a.5.5 0 0 1-.354.146H5.5l-2.354 2.354a.5.5 0 0 1-.707-.707L4.793 11.89v-2a.5.5 0 0 1 .147-.354L8.086 6.39l-.793-.793a.5.5 0 0 1 0-.707l1.5-1.5a.5.5 0 0 1 .707 0l.5.5 1.828-1.828z" />
            </svg>
            {pinned ? "Pinned" : "Pin"}
          </button>
        </div>
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
