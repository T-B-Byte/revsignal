"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  PHAROSIQ_TEAM,
  type MeetingNote,
  type MeetingAttendee,
} from "@/types/database";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MeetingsViewProps {
  meetings: MeetingNote[];
  deals: { deal_id: string; company: string }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCountdown(dateStr: string): string {
  const now = new Date();
  const meeting = new Date(dateStr);
  // Compare calendar dates, not raw milliseconds
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meetingDate = new Date(meeting.getFullYear(), meeting.getMonth(), meeting.getDate());
  const diffDays = Math.round((meetingDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  return `in ${diffDays} days`;
}

function formatMeetingDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatMeetingTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function daysFromNow(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
}

// ---------------------------------------------------------------------------
// Timeline Strip
// ---------------------------------------------------------------------------

function TimelineStrip({ meetings }: { meetings: MeetingNote[] }) {
  const totalDays = 21; // 3 weeks

  // Only upcoming meetings within the 3-week window
  const timelineMeetings = meetings.filter((m) => {
    const days = daysFromNow(m.meeting_date);
    return days >= -0.5 && days <= totalDays;
  });

  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          Next 3 Weeks
        </h2>
        <div className="flex items-center gap-4 text-[10px] text-text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-primary" />
            &lt; 3 days
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-primary/50" />
            3-7 days
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-text-muted/40" />
            7+ days
          </span>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative h-10">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-surface-tertiary" />

        {/* Week markers */}
        {[0, 7, 14, 21].map((day) => {
          const pct = (day / totalDays) * 100;
          const label =
            day === 0
              ? "Today"
              : `+${day / 7}w`;
          return (
            <div
              key={day}
              className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${pct}%` }}
            >
              <div
                className={`w-0.5 h-3 ${
                  day === 0 ? "bg-accent-primary" : "bg-text-muted/30"
                }`}
              />
              <span
                className={`text-[10px] mt-1 ${
                  day === 0
                    ? "text-accent-primary font-semibold"
                    : "text-text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}

        {/* Today marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent-primary ring-2 ring-accent-primary/30 z-10"
          style={{ left: "0%" }}
        />

        {/* Meeting dots */}
        {timelineMeetings.map((m) => {
          const days = daysFromNow(m.meeting_date);
          const pct = Math.min(Math.max((days / totalDays) * 100, 1), 99);
          const countdown = getCountdown(m.meeting_date);

          let dotColor = "bg-text-muted/40";
          if (days < 3) dotColor = "bg-accent-primary";
          else if (days < 7) dotColor = "bg-accent-primary/50";

          return (
            <div
              key={m.note_id}
              className="absolute top-1/2 -translate-y-1/2 group z-20"
              style={{ left: `${pct}%` }}
            >
              <div
                className={`w-3 h-3 rounded-full ${dotColor} ring-2 ring-surface-secondary cursor-pointer transition-transform hover:scale-150`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block whitespace-nowrap z-30">
                <div className="rounded-md bg-surface-primary border border-border-primary px-2 py-1 text-xs shadow-lg">
                  <p className="font-medium text-text-primary">{m.title}</p>
                  <p className="text-text-muted">{countdown}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meeting Card
// ---------------------------------------------------------------------------

function MeetingCard({
  meeting,
  muted,
  onDelete,
  onRename,
}: {
  meeting: MeetingNote;
  muted?: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(meeting.title);

  const countdown = getCountdown(meeting.meeting_date);
  const dateFormatted = formatMeetingDate(meeting.meeting_date);
  const timeFormatted = formatMeetingTime(meeting.meeting_date);

  const displayedAttendees = meeting.attendees.slice(0, 3);
  const extraCount = meeting.attendees.length - 3;

  const hasPrep = !!meeting.prep_brief;

  function handleRenameSubmit() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== meeting.title) {
      onRename(meeting.note_id, trimmed);
    }
    setRenaming(false);
  }

  return (
    <div
      className={`relative rounded-lg border border-border-primary p-4 transition-colors hover:border-accent-primary/40 hover:bg-surface-tertiary/50 ${
        muted
          ? "bg-surface-secondary/50 opacity-70"
          : "bg-surface-secondary"
      }`}
    >
      {/* Actions menu button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
            setConfirmDelete(false);
          }}
          className="rounded-md p-1 text-text-muted hover:text-text-primary hover:bg-surface-tertiary transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-1 rounded-md border border-border-primary bg-surface-primary shadow-lg z-30 min-w-[140px]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowMenu(false);
                setRenaming(true);
                setRenameValue(meeting.title);
              }}
              className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              Rename
            </button>
            {!confirmDelete ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setConfirmDelete(true);
                }}
                className="w-full text-left px-3 py-2 text-sm text-status-red hover:bg-status-red/10 transition-colors"
              >
                Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(meeting.note_id);
                }}
                className="w-full text-left px-3 py-2 text-sm text-status-red font-medium bg-status-red/10 hover:bg-status-red/20 transition-colors"
              >
                Confirm delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inline rename */}
      {renaming ? (
        <div className="mb-2" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSubmit();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={handleRenameSubmit}
            autoFocus
            maxLength={200}
            className="w-full rounded-md border border-accent-primary bg-surface-tertiary px-2 py-1 text-sm font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
      ) : null}

      <Link href={`/meetings/${meeting.note_id}`}>
        {/* Top row: title + countdown */}
        <div className="flex items-start justify-between gap-3 pr-6">
          {!renaming && (
            <h3
              className={`font-semibold ${
                muted ? "text-text-secondary" : "text-text-primary"
              }`}
            >
              {meeting.title}
            </h3>
          )}
          <span
            className={`shrink-0 text-xs font-medium ${
              countdown === "today" || countdown === "tomorrow"
                ? "text-accent-primary"
                : "text-text-muted"
            }`}
          >
            {countdown}
          </span>
        </div>

        {/* Date + time */}
        <p className="text-sm text-text-secondary mt-1">
          {dateFormatted} at {timeFormatted}
        </p>

        {/* Attendees */}
        {meeting.attendees.length > 0 && (
          <p className="text-xs text-text-muted mt-2">
            {displayedAttendees.map((a) => a.name).join(", ")}
            {extraCount > 0 && ` +${extraCount} more`}
          </p>
        )}

        {/* Badges row */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Prep status */}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
              hasPrep
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-surface-tertiary text-text-muted"
            }`}
          >
            {hasPrep ? "Prepped" : "Not Prepped"}
          </span>

          {/* Deal badge */}
          {meeting.deal_id && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-accent-primary/10 text-accent-primary">
              Linked to deal
            </span>
          )}

          {/* Location */}
          {meeting.location && (
            <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
              <svg
                className="w-3 h-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M8 1.5a4.5 4.5 0 0 1 4.5 4.5c0 3.5-4.5 8.5-4.5 8.5S3.5 9.5 3.5 6A4.5 4.5 0 0 1 8 1.5z" />
                <circle cx="8" cy="6" r="1.5" />
              </svg>
              {meeting.location}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Meeting Form
// ---------------------------------------------------------------------------

function NewMeetingForm({
  deals,
  onClose,
}: {
  deals: { deal_id: string; company: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [meetingDatePart, setMeetingDatePart] = useState("");
  const [meetingTimePart, setMeetingTimePart] = useState("09:00");
  const [attendees, setAttendees] = useState<MeetingAttendee[]>([]);
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeRole, setAttendeeRole] = useState("");
  const [location, setLocation] = useState("");
  const [dealId, setDealId] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!attendeeName.trim()) return [];
    const lower = attendeeName.toLowerCase();
    return PHAROSIQ_TEAM.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) &&
        !attendees.some((a) => a.name === p.name)
    );
  }, [attendeeName, attendees]);

  function addAttendee(name: string, role?: string) {
    if (!name.trim()) return;
    if (attendees.some((a) => a.name === name)) return;
    setAttendees((prev) => [...prev, { name: name.trim(), role: role?.trim() || undefined }]);
    setAttendeeName("");
    setAttendeeRole("");
    setShowSuggestions(false);
  }

  function removeAttendee(name: string) {
    setAttendees((prev) => prev.filter((a) => a.name !== name));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !meetingDatePart) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          meeting_date: new Date(`${meetingDatePart}T${meetingTimePart}`).toISOString(),
          attendees,
          location: location.trim() || undefined,
          deal_id: dealId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create meeting");
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border-primary bg-surface-secondary p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">
          New Meeting
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>
      </div>

      {error && (
        <p className="text-xs text-status-red bg-status-red/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* Title */}
      <div>
        <label className="block text-xs text-text-muted mb-1">Title *</label>
        <input
          type="text"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Weekly 1:1 with Jeff"
          className="w-full rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>

      {/* Date/time */}
      <div>
        <label className="block text-xs text-text-muted mb-1">
          Date & Time *
        </label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DatePicker
              value={meetingDatePart}
              onChange={(d) => setMeetingDatePart(d)}
              size="sm"
              placeholder="Pick date"
            />
          </div>
          <input
            type="time"
            value={meetingTimePart}
            onChange={(e) => setMeetingTimePart(e.target.value)}
            className="rounded-md border border-border-primary bg-surface-tertiary px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary [color-scheme:dark]"
          />
        </div>
      </div>

      {/* Attendees */}
      <div>
        <label className="block text-xs text-text-muted mb-1">Attendees</label>
        {attendees.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {attendees.map((a) => (
              <span
                key={a.name}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 text-accent-primary px-2 py-0.5 text-xs"
              >
                {a.name}
                {a.role && (
                  <span className="text-text-muted">({a.role})</span>
                )}
                <button
                  type="button"
                  onClick={() => removeAttendee(a.name)}
                  className="ml-0.5 hover:text-status-red transition-colors"
                >
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={nameInputRef}
              type="text"
              value={attendeeName}
              onChange={(e) => {
                setAttendeeName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Name"
              maxLength={200}
              className="flex-1 rounded-md border border-border-primary bg-surface-tertiary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <input
              type="text"
              value={attendeeRole}
              onChange={(e) => setAttendeeRole(e.target.value)}
              placeholder="Role (optional)"
              maxLength={200}
              className="w-36 rounded-md border border-border-primary bg-surface-tertiary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => addAttendee(attendeeName, attendeeRole)}
              disabled={!attendeeName.trim()}
            >
              Add
            </Button>
          </div>

          {/* Autocomplete suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-md border border-border-primary bg-surface-primary shadow-lg z-40 max-h-48 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addAttendee(s.name, s.role);
                    nameInputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary transition-colors flex items-center justify-between"
                >
                  <span className="text-text-primary">{s.name}</span>
                  {s.role && (
                    <span className="text-text-muted text-xs">{s.role}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs text-text-muted mb-1">
          Location (optional)
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Teams, Zoom, Room 301..."
          maxLength={500}
          className="w-full rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
      </div>

      {/* Link to deal */}
      {deals.length > 0 && (
        <div>
          <label className="block text-xs text-text-muted mb-1">
            Link to Deal (optional)
          </label>
          <select
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="w-full rounded-md border border-border-primary bg-surface-tertiary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">None</option>
            {deals.map((d) => (
              <option key={d.deal_id} value={d.deal_id}>
                {d.company}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          loading={saving}
          disabled={!title.trim() || !meetingDatePart}
        >
          Create Meeting
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main View
// ---------------------------------------------------------------------------

export function MeetingsView({ meetings, deals }: MeetingsViewProps) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [showPast, setShowPast] = useState(false);

  async function handleDelete(meetingId: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch {
      // Silently fail — card will remain until next refresh
    }
  }

  async function handleRename(meetingId: string, newTitle: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) router.refresh();
    } catch {
      // Silently fail
    }
  }

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "upcoming")
        .sort(
          (a, b) =>
            new Date(a.meeting_date).getTime() -
            new Date(b.meeting_date).getTime()
        ),
    [meetings]
  );

  const pastMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "completed" || m.status === "cancelled")
        .sort(
          (a, b) =>
            new Date(b.meeting_date).getTime() -
            new Date(a.meeting_date).getTime()
        ),
    [meetings]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Meetings</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {upcomingMeetings.length} upcoming
            {pastMeetings.length > 0 && ` / ${pastMeetings.length} past`}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
            New Meeting
          </Button>
        )}
      </div>

      {/* New Meeting Form */}
      {showForm && (
        <NewMeetingForm deals={deals} onClose={() => setShowForm(false)} />
      )}

      {/* Timeline Strip */}
      {upcomingMeetings.length > 0 && (
        <TimelineStrip meetings={upcomingMeetings} />
      )}

      {/* Upcoming Meetings */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">
          Upcoming
        </h2>
        {upcomingMeetings.length === 0 ? (
          <div className="rounded-lg border border-border-primary bg-surface-secondary p-8 text-center">
            <p className="text-sm text-text-muted">No upcoming meetings.</p>
            <p className="text-xs text-text-muted mt-1">
              Click &quot;New Meeting&quot; to schedule one.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingMeetings.map((m) => (
              <MeetingCard key={m.note_id} meeting={m} onDelete={handleDelete} onRename={handleRename} />
            ))}
          </div>
        )}
      </section>

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setShowPast((prev) => !prev)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-muted hover:text-text-secondary transition-colors mb-3"
          >
            <svg
              className={`w-3 h-3 transition-transform ${
                showPast ? "rotate-90" : ""
              }`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 4l4 4-4 4" />
            </svg>
            Past Meetings ({pastMeetings.length})
          </button>

          {showPast && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pastMeetings.map((m) => (
                <MeetingCard key={m.note_id} meeting={m} muted onDelete={handleDelete} onRename={handleRename} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
