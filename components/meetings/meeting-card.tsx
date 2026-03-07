"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { MeetingNote, MeetingType } from "@/types/database";

interface MeetingCardProps {
  note: MeetingNote;
  onEdit: (note: MeetingNote) => void;
  onPrep?: (note: MeetingNote) => void;
  onDebrief?: (note: MeetingNote) => void;
  onTogglePin?: (note: MeetingNote) => void;
  hasAiAccess?: boolean;
}

const TYPE_CONFIG: Record<MeetingType, { label: string; variant: "blue" | "green" | "yellow" | "red" | "gray" }> = {
  one_on_one: { label: "1:1", variant: "blue" },
  team: { label: "Team", variant: "green" },
  strategy: { label: "Strategy", variant: "yellow" },
  cross_functional: { label: "Cross-Func", variant: "gray" },
  board: { label: "Board", variant: "red" },
  standup: { label: "Standup", variant: "gray" },
  other: { label: "Other", variant: "gray" },
};

export function MeetingCard({ note, onEdit, onPrep, onDebrief, onTogglePin, hasAiAccess }: MeetingCardProps) {
  const typeConfig = TYPE_CONFIG[note.meeting_type] ?? TYPE_CONFIG.other;
  const attendeeNames = (note.attendees ?? []).map((a) => a.name).join(", ");
  const meetingDate = new Date(note.meeting_date);
  const isFuture = meetingDate > new Date();
  const isPinned = (note.tags ?? []).includes("foundational");

  return (
    <Card className="cursor-pointer transition-colors hover:border-accent-primary/40">
      <CardContent
        className="p-4"
        onClick={() => onEdit(note)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit(note);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-medium text-text-primary">
                {note.title}
              </h3>
              <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
              {isPinned && (
                <span className="shrink-0 text-xs text-amber-500" title="Pinned: always remembered by the Strategist">
                  <svg className="inline h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M9.828 1.282a1 1 0 0 1 1.414 0l3.476 3.476a1 1 0 0 1 0 1.414L13.5 7.39l.5.5a.5.5 0 0 1 0 .707l-1.5 1.5a.5.5 0 0 1-.707 0L11 9.304l-3.146 3.147a.5.5 0 0 1-.354.146H5.5l-2.354 2.354a.5.5 0 0 1-.707-.707L4.793 11.89v-2a.5.5 0 0 1 .147-.354L8.086 6.39l-.793-.793a.5.5 0 0 1 0-.707l1.5-1.5a.5.5 0 0 1 .707 0l.5.5 1.828-1.828z" />
                  </svg>
                </span>
              )}
            </div>

            {attendeeNames && (
              <p className="mt-1 truncate text-xs text-text-muted">
                with {attendeeNames}
              </p>
            )}

            <p className="mt-2 line-clamp-3 text-sm text-text-secondary">
              {note.content}
            </p>

            {note.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-medium text-text-secondary">
              {format(meetingDate, "MMM d, yyyy")}
            </p>
            <p className="text-xs text-text-muted">
              {format(meetingDate, "h:mm a")}
            </p>
            <div className="mt-2 flex justify-end gap-1">
              {onTogglePin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(note);
                  }}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    isPinned
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-text-muted hover:bg-surface-tertiary"
                  }`}
                  title={isPinned ? "Unpin: remove from permanent memory" : "Pin: always remembered by the Strategist"}
                >
                  {isPinned ? "Unpin" : "Pin"}
                </button>
              )}
              {hasAiAccess && isFuture && onPrep && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrep(note);
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10"
                >
                  Prep
                </button>
              )}
              {hasAiAccess && !isFuture && onDebrief && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDebrief(note);
                  }}
                  className="rounded px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10"
                >
                  Debrief
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
