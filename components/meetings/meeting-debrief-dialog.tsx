"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type { MeetingNote } from "@/types/database";

interface MeetingDebriefDialogProps {
  open: boolean;
  onClose: () => void;
  note: MeetingNote;
}

interface DebriefResult {
  debrief: string;
  extractedNotes: { title: string; content: string; category: string }[];
  followUpActions: string[];
  stakeholderUpdates: string[];
  conflictsDetected: string[];
}

export function MeetingDebriefDialog({
  open,
  onClose,
  note,
}: MeetingDebriefDialogProps) {
  const [debriefNotes, setDebriefNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DebriefResult | null>(null);

  function handleClose() {
    setError(null);
    setResult(null);
    setDebriefNotes("");
    onClose();
  }

  async function handleProcess() {
    const trimmed = debriefNotes.trim();
    if (!trimmed || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/agents/meeting-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingNoteId: note.note_id,
          debriefNotes: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to process debrief.");
        return;
      }

      const data = await res.json();
      setResult({
        debrief: data.debrief,
        extractedNotes: data.extractedNotes ?? [],
        followUpActions: data.followUpActions ?? [],
        stakeholderUpdates: data.stakeholderUpdates ?? [],
        conflictsDetected: data.conflictsDetected ?? [],
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const attendeeNames = (note.attendees ?? []).map((a) => a.name).join(", ");

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Debrief: {note.title}</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {/* Meeting context */}
          <div className="rounded-lg bg-surface-tertiary p-3 text-xs text-text-muted">
            <p>
              {new Date(note.meeting_date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {attendeeNames ? ` with ${attendeeNames}` : ""}
            </p>
          </div>

          {!result ? (
            <>
              <Textarea
                label="Debrief Notes"
                placeholder="What happened? Key outcomes, decisions, follow-ups, anything notable..."
                value={debriefNotes}
                onChange={(e) => setDebriefNotes(e.target.value)}
                rows={8}
                disabled={loading}
              />

              {error && (
                <div className="rounded-md border border-status-red/20 bg-status-red/10 p-3 text-sm text-status-red">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProcess}
                  loading={loading}
                  disabled={!debriefNotes.trim()}
                >
                  Process Debrief
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Debrief summary */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">
                  Summary
                </h3>
                <div
                  className="prose prose-sm max-w-none text-text-secondary
                    prose-headings:text-text-primary prose-headings:text-sm
                    prose-p:text-sm prose-p:my-1
                    prose-li:text-sm prose-strong:text-text-primary"
                  dangerouslySetInnerHTML={{
                    __html: formatAgentHtml(result.debrief),
                  }}
                />
              </div>

              {/* Extracted strategic notes */}
              {result.extractedNotes.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Strategic Notes Saved ({result.extractedNotes.length})
                  </h3>
                  <div className="space-y-2">
                    {result.extractedNotes.map((n, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border-primary bg-surface-tertiary p-3"
                      >
                        <p className="text-xs font-medium text-text-primary">
                          {n.title}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {n.content}
                        </p>
                        <span className="mt-1 inline-block rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
                          {n.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Follow-up actions */}
              {result.followUpActions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Follow-up Actions
                  </h3>
                  <ul className="space-y-1">
                    {result.followUpActions.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Stakeholder updates */}
              {result.stakeholderUpdates.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">
                    Stakeholder Insights
                  </h3>
                  <ul className="space-y-1">
                    {result.stakeholderUpdates.map((s, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-text-secondary"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-status-yellow" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conflicts */}
              {result.conflictsDetected.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-status-red mb-2">
                    Conflicts Detected
                  </h3>
                  <ul className="space-y-1">
                    {result.conflictsDetected.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-status-red"
                      >
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-status-red" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button onClick={handleClose}>Done</Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
