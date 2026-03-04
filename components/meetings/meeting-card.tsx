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

export function MeetingCard({ note, onEdit, onPrep, onDebrief, hasAiAccess }: MeetingCardProps) {
  const typeConfig = TYPE_CONFIG[note.meeting_type] ?? TYPE_CONFIG.other;
  const attendeeNames = (note.attendees ?? []).map((a) => a.name).join(", ");
  const meetingDate = new Date(note.meeting_date);
  const isFuture = meetingDate > new Date();

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
            {hasAiAccess && (
              <div className="mt-2 flex justify-end gap-1">
                {isFuture && onPrep && (
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
                {!isFuture && onDebrief && (
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
