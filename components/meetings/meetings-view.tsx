"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MeetingCard } from "./meeting-card";
import { MeetingNoteDialog } from "./meeting-note-dialog";
import { MeetingDebriefDialog } from "./meeting-debrief-dialog";
import { Button } from "@/components/ui/button";
import { MEETING_TYPES, type MeetingNote } from "@/types/database";

interface MeetingsViewProps {
  notes: MeetingNote[];
  deals: { deal_id: string; company: string }[];
  allTags: string[];
  allAttendees: string[];
  hasAiAccess?: boolean;
}

export function MeetingsView({
  notes,
  deals,
  allTags,
  allAttendees,
  hasAiAccess,
}: MeetingsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedAttendee, setSelectedAttendee] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [debriefNote, setDebriefNote] = useState<MeetingNote | null>(null);

  const filtered = notes.filter((note) => {
    if (selectedType && note.meeting_type !== selectedType) return false;
    if (selectedTag && !note.tags.includes(selectedTag)) return false;
    if (
      selectedAttendee &&
      !note.attendees.some((a) => a.name === selectedAttendee)
    )
      return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = note.title.toLowerCase().includes(q);
      const matchesContent = note.content.toLowerCase().includes(q);
      const matchesAttendee = note.attendees.some((a) =>
        a.name.toLowerCase().includes(q)
      );
      const matchesTags = note.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchesTitle && !matchesContent && !matchesAttendee && !matchesTags)
        return false;
    }
    return true;
  });

  // Split into upcoming and past
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const upcomingNotes = filtered
    .filter((n) => n.meeting_date >= todayStr)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date));

  const pastNotes = filtered
    .filter((n) => n.meeting_date < todayStr)
    .sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  const hasFilters =
    searchQuery || selectedType || selectedTag || selectedAttendee;

  const router = useRouter();

  function handleEdit(note: MeetingNote) {
    router.push(`/meetings/${note.note_id}/edit`);
  }

  function handleClose() {
    setShowDialog(false);
    setEditingNote(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            Meeting Notes
          </h1>
          <p className="mt-1 text-xs text-text-muted">
            {upcomingNotes.length} upcoming, {pastNotes.length} past
            {hasFilters ? ` (${filtered.length} shown)` : ""}
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New Note
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search notes, attendees, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-secondary py-2 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="">All Types</option>
          {MEETING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {allAttendees.length > 0 && (
          <select
            value={selectedAttendee}
            onChange={(e) => setSelectedAttendee(e.target.value)}
            className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="">All People</option>
            {allAttendees.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}

        {allTags.length > 0 && (
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedType("");
              setSelectedTag("");
              setSelectedAttendee("");
            }}
            className="text-xs text-accent-primary hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border-primary bg-surface-tertiary p-8 text-center">
          {notes.length === 0 ? (
            <>
              <p className="text-sm text-text-muted">
                No meeting notes yet. Start logging your internal meetings.
              </p>
              <button
                onClick={() => setShowDialog(true)}
                className="mt-3 text-sm font-medium text-accent-primary hover:underline"
              >
                Log your first meeting
              </button>
            </>
          ) : (
            <p className="text-sm text-text-muted">
              No notes match your filters.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Upcoming Meetings */}
          {upcomingNotes.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                Upcoming
                <span className="rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                  {upcomingNotes.length}
                </span>
              </h2>
              <div className="space-y-3">
                {upcomingNotes.map((note) => (
                  <MeetingCard
                    key={note.note_id}
                    note={note}
                    onEdit={handleEdit}
                    onPrep={(n) => {
                      window.location.href = `/coach?prep=${encodeURIComponent(n.title)}&attendees=${encodeURIComponent(n.attendees.map((a) => a.name).join(","))}`;
                    }}
                    onDebrief={(n) => setDebriefNote(n)}
                    hasAiAccess={hasAiAccess}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Meetings */}
          {pastNotes.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
                Past
                <span className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs font-medium text-text-muted">
                  {pastNotes.length}
                </span>
              </h2>
              <div className="space-y-3">
                {pastNotes.map((note) => (
                  <MeetingCard
                    key={note.note_id}
                    note={note}
                    onEdit={handleEdit}
                    onPrep={(n) => {
                      window.location.href = `/coach?prep=${encodeURIComponent(n.title)}&attendees=${encodeURIComponent(n.attendees.map((a) => a.name).join(","))}`;
                    }}
                    onDebrief={(n) => setDebriefNote(n)}
                    hasAiAccess={hasAiAccess}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit/Create Dialog */}
      <MeetingNoteDialog
        open={showDialog}
        onClose={handleClose}
        deals={deals}
        existingAttendees={allAttendees}
        note={editingNote}
      />

      {/* Debrief Dialog */}
      {debriefNote && (
        <MeetingDebriefDialog
          open={!!debriefNote}
          onClose={() => setDebriefNote(null)}
          note={debriefNote}
        />
      )}
    </div>
  );
}
