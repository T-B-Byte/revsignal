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

interface CrmCoaching {
  stageRecommendation: string | null;
  sfdcActions: string[];
  winProbabilityAssessment: string | null;
  forecastGuidance: string | null;
}

interface ExtractedNote {
  title: string;
  content: string;
  category: string;
  note_id?: string;
  pinned?: boolean;
}

interface DebriefResult {
  debrief: string;
  extractedNotes: ExtractedNote[];
  followUpActions: string[];
  stakeholderUpdates: string[];
  conflictsDetected: string[];
  crmCoaching: CrmCoaching | null;
}

function ExtractedNoteCard({ note }: { note: ExtractedNote }) {
  const [pinned, setPinned] = useState(note.pinned ?? false);
  const [toggling, setToggling] = useState(false);

  async function handleTogglePin() {
    if (!note.note_id || toggling) return;
    const next = !pinned;
    setPinned(next);
    setToggling(true);

    try {
      const res = await fetch(`/api/strategic-notes/${note.note_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) setPinned(!next);
    } catch {
      setPinned(!next);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="rounded-lg border border-border-primary bg-surface-tertiary p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-primary">
            {note.title}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            {note.content}
          </p>
          <span className="mt-1 inline-block rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs text-accent-primary">
            {note.category}
          </span>
        </div>
        {note.note_id && (
          <button
            onClick={handleTogglePin}
            disabled={toggling}
            className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
              pinned
                ? "text-amber-500 hover:bg-amber-500/10"
                : "text-text-muted hover:bg-surface-secondary"
            }`}
            title={pinned ? "Unpin: remove from permanent memory" : "Pin: always remembered by the Strategist"}
          >
            <svg className="mr-0.5 inline h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.828 1.282a1 1 0 0 1 1.414 0l3.476 3.476a1 1 0 0 1 0 1.414L13.5 7.39l.5.5a.5.5 0 0 1 0 .707l-1.5 1.5a.5.5 0 0 1-.707 0L11 9.304l-3.146 3.147a.5.5 0 0 1-.354.146H5.5l-2.354 2.354a.5.5 0 0 1-.707-.707L4.793 11.89v-2a.5.5 0 0 1 .147-.354L8.086 6.39l-.793-.793a.5.5 0 0 1 0-.707l1.5-1.5a.5.5 0 0 1 .707 0l.5.5 1.828-1.828z" />
            </svg>
            {pinned ? "Pinned" : "Pin"}
          </button>
        )}
      </div>
    </div>
  );
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
        crmCoaching: data.crmCoaching ?? null,
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
                      <ExtractedNoteCard key={n.note_id ?? i} note={n} />
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

              {/* CRM Coaching — Salesforce Update Guide */}
              {result.crmCoaching && (
                <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-4">
                  <h3 className="text-sm font-semibold text-accent-primary mb-3">
                    Salesforce Update Guide
                  </h3>
                  <div className="space-y-3">
                    {result.crmCoaching.stageRecommendation && (
                      <div>
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                          Stage
                        </p>
                        <p className="mt-0.5 text-sm text-text-primary">
                          {result.crmCoaching.stageRecommendation}
                        </p>
                      </div>
                    )}

                    {result.crmCoaching.sfdcActions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                          SFDC Actions
                        </p>
                        <ul className="mt-1 space-y-1">
                          {result.crmCoaching.sfdcActions.map((a, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2 text-sm text-text-secondary"
                            >
                              <input
                                type="checkbox"
                                className="mt-1 h-3.5 w-3.5 rounded border-border-primary accent-accent-primary"
                              />
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {result.crmCoaching.winProbabilityAssessment && (
                      <div>
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                          Win Probability
                        </p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {result.crmCoaching.winProbabilityAssessment}
                        </p>
                      </div>
                    )}

                    {result.crmCoaching.forecastGuidance && (
                      <div>
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                          Forecast
                        </p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {result.crmCoaching.forecastGuidance}
                        </p>
                      </div>
                    )}
                  </div>
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
