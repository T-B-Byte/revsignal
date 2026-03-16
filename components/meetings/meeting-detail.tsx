"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { formatAgentHtml } from "@/lib/format-agent-html";
import type {
  MeetingNote,
  MeetingAgendaItem,
  ContactAgendaItem,
  Deal,
  MeetingStatus,
} from "@/types/database";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DatePicker } from "@/components/ui/date-picker";

const STATUS_STYLES: Record<
  MeetingStatus,
  { label: string; className: string }
> = {
  upcoming: {
    label: "Upcoming",
    className: "bg-accent-primary/20 text-accent-primary",
  },
  completed: {
    label: "Completed",
    className: "bg-status-green/20 text-status-green",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-status-red/20 text-status-red",
  },
};

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
  }) +
    " at " +
    d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
}

interface MeetingDetailProps {
  meeting: MeetingNote;
  contactAgendaItems: ContactAgendaItem[];
  contacts: {
    contact_id: string;
    name: string;
    role: string | null;
    company: string;
  }[];
  activeDeals: Pick<Deal, "deal_id" | "company" | "stage">[];
}

export function MeetingDetail({
  meeting: initialMeeting,
  contactAgendaItems: initialContactAgendaItems,
  contacts,
  activeDeals,
}: MeetingDetailProps) {
  const router = useRouter();
  const [meeting, setMeeting] = useState<MeetingNote>(initialMeeting);
  const [contactAgendaItems, setContactAgendaItems] = useState<
    ContactAgendaItem[]
  >(initialContactAgendaItems);

  // Prep brief state
  const [isGeneratingPrep, setIsGeneratingPrep] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  // Notes state
  const [notesContent, setNotesContent] = useState(meeting.content ?? "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesSavedTimeout = useRef<NodeJS.Timeout | null>(null);

  // Agenda state
  const [newAgendaText, setNewAgendaText] = useState("");

  // Contact agenda quick-add state
  const [contactAgendaInputs, setContactAgendaInputs] = useState<
    Record<string, string>
  >({});

  // Edit info state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editDealId, setEditDealId] = useState<string | null>(
    meeting.deal_id
  );
  const [editLocation, setEditLocation] = useState(meeting.location ?? "");
  const [editDate, setEditDate] = useState(meeting.meeting_date);
  const [editStatus, setEditStatus] = useState<MeetingStatus>(meeting.status);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Saving error
  const [saveError, setSaveError] = useState<string | null>(null);

  const contactMap = new Map(
    contacts.map((c) => [c.contact_id, c])
  );

  // ---- API helpers ----

  const patchMeeting = useCallback(
    async (data: Record<string, unknown>): Promise<MeetingNote | null> => {
      setSaveError(null);
      try {
        const res = await fetch(`/api/meetings/${meeting.note_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error ?? "Failed to save"
          );
        }
        const json = (await res.json()) as { meeting: MeetingNote };
        setMeeting(json.meeting);
        return json.meeting;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to save";
        setSaveError(message);
        return null;
      }
    },
    [meeting.note_id]
  );

  // ---- Prep Brief ----

  const generatePrepBrief = useCallback(async () => {
    setIsGeneratingPrep(true);
    setPrepError(null);
    try {
      const res = await fetch(
        `/api/meetings/${meeting.note_id}/prep`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? "Failed to generate prep brief"
        );
      }
      const json = (await res.json()) as { prep_brief: string };
      setMeeting((prev) => ({ ...prev, prep_brief: json.prep_brief }));
    } catch (err) {
      setPrepError(
        err instanceof Error ? err.message : "Failed to generate prep brief"
      );
    } finally {
      setIsGeneratingPrep(false);
    }
  }, [meeting.note_id]);

  // ---- Notes auto-save ----

  const saveNotes = useCallback(async () => {
    setIsSavingNotes(true);
    const result = await patchMeeting({ content: notesContent });
    setIsSavingNotes(false);
    if (result) {
      setNotesSaved(true);
      if (notesSavedTimeout.current) clearTimeout(notesSavedTimeout.current);
      notesSavedTimeout.current = setTimeout(() => setNotesSaved(false), 2000);
    }
  }, [notesContent, patchMeeting]);

  // Cmd+S handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveNotes();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [saveNotes]);

  // ---- Agenda ----

  const toggleAgendaItem = useCallback(
    async (index: number) => {
      const updated = meeting.agenda.map((item, i) =>
        i === index ? { ...item, covered: !item.covered } : item
      );
      await patchMeeting({ agenda: updated });
    },
    [meeting.agenda, patchMeeting]
  );

  const addAgendaItem = useCallback(async () => {
    const text = newAgendaText.trim();
    if (!text) return;
    const updated: MeetingAgendaItem[] = [
      ...meeting.agenda,
      { text, covered: false },
    ];
    const result = await patchMeeting({ agenda: updated });
    if (result) setNewAgendaText("");
  }, [newAgendaText, meeting.agenda, patchMeeting]);

  // ---- Contact Agenda Items ----

  const markContactItemCovered = useCallback(
    async (item: ContactAgendaItem) => {
      try {
        const res = await fetch(
          `/api/contact-agenda-items/${item.item_id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "covered",
              covered_in_meeting: meeting.note_id,
            }),
          }
        );
        if (!res.ok) throw new Error("Failed to update");
        setContactAgendaItems((prev) =>
          prev.filter((i) => i.item_id !== item.item_id)
        );
      } catch {
        setSaveError("Failed to mark item as covered");
      }
    },
    [meeting.note_id]
  );

  const addContactAgendaItem = useCallback(
    async (contactId: string) => {
      const text = (contactAgendaInputs[contactId] ?? "").trim();
      if (!text) return;
      try {
        const res = await fetch("/api/contact-agenda-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contact_id: contactId,
            description: text,
            source: "manual",
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const json = (await res.json()) as { item: ContactAgendaItem };
        setContactAgendaItems((prev) => [...prev, json.item]);
        setContactAgendaInputs((prev) => ({ ...prev, [contactId]: "" }));
      } catch {
        setSaveError("Failed to add contact agenda item");
      }
    },
    [contactAgendaInputs]
  );

  // ---- Edit Info ----

  const saveInfo = useCallback(async () => {
    setIsSavingInfo(true);
    const result = await patchMeeting({
      deal_id: editDealId || null,
      location: editLocation || null,
      meeting_date: editDate,
      status: editStatus,
    });
    setIsSavingInfo(false);
    if (result) {
      setIsEditingInfo(false);
    }
  }, [editDealId, editLocation, editDate, editStatus, patchMeeting]);

  // ---- Group contact agenda items by contact ----

  const contactAgendaGrouped = new Map<string, ContactAgendaItem[]>();
  for (const item of contactAgendaItems) {
    const existing = contactAgendaGrouped.get(item.contact_id) ?? [];
    existing.push(item);
    contactAgendaGrouped.set(item.contact_id, existing);
  }

  // Include contacts that have no items yet (for quick-add)
  for (const contactId of meeting.contact_ids ?? []) {
    if (!contactAgendaGrouped.has(contactId)) {
      contactAgendaGrouped.set(contactId, []);
    }
  }

  const linkedDeal = activeDeals.find((d) => d.deal_id === meeting.deal_id);
  const statusStyle = STATUS_STYLES[meeting.status];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Error banner */}
      {saveError && (
        <div className="mb-4 rounded-lg border border-status-red/30 bg-status-red/10 px-4 py-3 text-sm text-status-red">
          {saveError}
          <button
            onClick={() => setSaveError(null)}
            className="ml-3 font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex gap-6">
        {/* ============ LEFT COLUMN ============ */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Header */}
          <div>
            <Link
              href="/meetings"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back to Meetings
            </Link>

            <h1 className="text-2xl font-bold text-text-primary">
              {meeting.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span>{formatMeetingDate(meeting.meeting_date)}</span>
              <span className="text-text-muted">
                &mdash; {getCountdown(meeting.meeting_date)}
              </span>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
              >
                {statusStyle.label}
              </span>
            </div>

            {meeting.location && (
              <p className="mt-1.5 text-sm text-text-secondary">
                <span className="text-text-muted">Location:</span>{" "}
                {meeting.location}
              </p>
            )}

            {meeting.attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {meeting.attendees.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-tertiary px-2.5 py-1 text-xs text-text-secondary"
                  >
                    <span className="font-medium text-text-primary">
                      {a.name}
                    </span>
                    {a.role && (
                      <span className="text-text-muted">({a.role})</span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prep Brief */}
          <section className="rounded-lg border border-border-primary bg-surface-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                Prep Brief
              </h2>
              {meeting.prep_brief ? (
                <button
                  onClick={generatePrepBrief}
                  disabled={isGeneratingPrep}
                  className="rounded px-3 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors disabled:opacity-50"
                >
                  {isGeneratingPrep ? "Regenerating..." : "Regenerate"}
                </button>
              ) : null}
            </div>

            {isGeneratingPrep && !meeting.prep_brief && (
              <div className="flex items-center gap-2 py-8 text-sm text-text-muted">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Generating prep brief...
              </div>
            )}

            {prepError && (
              <p className="py-2 text-sm text-status-red">{prepError}</p>
            )}

            {meeting.prep_brief ? (
              <div
                className="prose prose-sm max-w-none font-mono text-[13px] leading-relaxed text-text-primary prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-5 prose-headings:mb-2 prose-p:text-text-secondary prose-p:text-[13px] prose-p:my-1.5 prose-li:text-text-secondary prose-li:text-[13px] prose-strong:text-text-primary prose-strong:font-medium prose-ul:my-2 prose-ol:my-2 prose-hr:my-4 prose-hr:border-border-primary"
                dangerouslySetInnerHTML={{
                  __html: formatAgentHtml(meeting.prep_brief),
                }}
              />
            ) : (
              !isGeneratingPrep &&
              !prepError && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-text-muted">
                    No prep brief yet. Generate one with The Strategist.
                  </p>
                  <button
                    onClick={generatePrepBrief}
                    disabled={isGeneratingPrep}
                    className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                  >
                    Generate Prep Brief
                  </button>
                </div>
              )
            )}

            {/* Show spinner overlay when regenerating an existing brief */}
            {isGeneratingPrep && meeting.prep_brief && (
              <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                <svg
                  className="h-3 w-3 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Regenerating...
              </div>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-lg border border-border-primary bg-surface-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-primary">
                Notes
              </h2>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                {isSavingNotes && <span>Saving...</span>}
                {notesSaved && (
                  <span className="text-status-green">Saved</span>
                )}
                <span className="hidden sm:inline">Cmd+S to save</span>
              </div>
            </div>
            <textarea
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              onBlur={saveNotes}
              placeholder="Meeting notes, takeaways, decisions..."
              rows={8}
              className="w-full resize-y rounded-md border border-border-primary bg-surface-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
            />

            {meeting.ai_summary && (
              <div className="mt-4 rounded-md border border-border-primary bg-surface-tertiary p-3">
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  AI Summary
                </h3>
                <div
                  className="prose prose-sm max-w-none text-text-primary prose-p:text-text-secondary prose-p:text-sm prose-p:my-1 prose-li:text-text-secondary prose-li:text-sm prose-strong:text-text-primary prose-strong:font-medium"
                  dangerouslySetInnerHTML={{
                    __html: formatAgentHtml(meeting.ai_summary),
                  }}
                />
              </div>
            )}
          </section>
        </div>

        {/* ============ RIGHT SIDEBAR ============ */}
        <div className="w-80 shrink-0 space-y-4">
          {/* Agenda Items */}
          <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
            <h3 className="mb-3 text-sm font-semibold text-text-primary">
              Agenda
            </h3>

            {meeting.agenda.length === 0 && (
              <p className="mb-3 text-xs text-text-muted">
                No agenda items yet.
              </p>
            )}

            <ul className="space-y-2">
              {meeting.agenda.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <button
                    onClick={() => toggleAgendaItem(i)}
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                      item.covered
                        ? "border-accent-primary bg-accent-primary text-white"
                        : "border-border-primary hover:border-accent-primary"
                    }`}
                  >
                    {item.covered && (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`text-sm ${
                      item.covered
                        ? "text-text-muted line-through"
                        : "text-text-secondary"
                    }`}
                  >
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newAgendaText}
                onChange={(e) => setNewAgendaText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAgendaItem();
                  }
                }}
                placeholder="Add agenda item..."
                className="flex-1 rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
              />
              <button
                onClick={addAgendaItem}
                disabled={!newAgendaText.trim()}
                className="rounded-md bg-accent-primary/10 px-2.5 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary/20 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </div>

          {/* Contact Agenda Items */}
          {contactAgendaGrouped.size > 0 && (
            <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
              <h3 className="mb-3 text-sm font-semibold text-text-primary">
                Items to Cover by Contact
              </h3>

              <div className="space-y-4">
                {Array.from(contactAgendaGrouped.entries()).map(
                  ([contactId, items]) => {
                    const contact = contactMap.get(contactId);
                    const contactName = contact?.name ?? "Unknown Contact";
                    const contactRole = contact?.role;

                    return (
                      <div key={contactId}>
                        <p className="mb-1.5 text-xs font-medium text-text-primary">
                          {contactName}
                          {contactRole && (
                            <span className="ml-1 font-normal text-text-muted">
                              ({contactRole})
                            </span>
                          )}
                        </p>

                        {items.length > 0 ? (
                          <ul className="space-y-1.5">
                            {items.map((item) => (
                              <li
                                key={item.item_id}
                                className="flex items-start gap-2"
                              >
                                <button
                                  onClick={() => markContactItemCovered(item)}
                                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border-primary hover:border-accent-primary transition-colors"
                                >
                                  {/* empty checkbox */}
                                </button>
                                <span className="text-xs text-text-secondary">
                                  {item.description}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-text-muted">
                            No items yet.
                          </p>
                        )}

                        <div className="mt-1.5 flex gap-1.5">
                          <input
                            type="text"
                            value={contactAgendaInputs[contactId] ?? ""}
                            onChange={(e) =>
                              setContactAgendaInputs((prev) => ({
                                ...prev,
                                [contactId]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addContactAgendaItem(contactId);
                              }
                            }}
                            placeholder="Add item..."
                            className="flex-1 rounded border border-border-primary bg-surface-primary px-2 py-1 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                          />
                          <button
                            onClick={() => addContactAgendaItem(contactId)}
                            disabled={
                              !(contactAgendaInputs[contactId] ?? "").trim()
                            }
                            className="rounded bg-accent-primary/10 px-2 py-1 text-xs text-accent-primary hover:bg-accent-primary/20 transition-colors disabled:opacity-40"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Meeting Info */}
          <div className="rounded-lg border border-border-primary bg-surface-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                Meeting Info
              </h3>
              {!isEditingInfo ? (
                <button
                  onClick={() => setIsEditingInfo(true)}
                  className="text-xs text-accent-primary hover:underline"
                >
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditingInfo(false)}
                    className="text-xs text-text-muted hover:text-text-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveInfo}
                    disabled={isSavingInfo}
                    className="text-xs font-medium text-accent-primary hover:underline disabled:opacity-50"
                  >
                    {isSavingInfo ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {!isEditingInfo ? (
              <dl className="space-y-2.5 text-sm">
                <div>
                  <dt className="text-xs text-text-muted">Status</dt>
                  <dd className="mt-0.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                  </dd>
                </div>
                {linkedDeal && (
                  <div>
                    <dt className="text-xs text-text-muted">Deal</dt>
                    <dd className="mt-0.5">
                      <Link
                        href={`/deals/${linkedDeal.deal_id}`}
                        className="text-xs text-accent-primary hover:underline"
                      >
                        {linkedDeal.company}
                      </Link>
                    </dd>
                  </div>
                )}
                {!linkedDeal && !meeting.deal_id && (
                  <div>
                    <dt className="text-xs text-text-muted">Deal</dt>
                    <dd className="mt-0.5 text-xs text-text-muted">
                      Not linked
                    </dd>
                  </div>
                )}
                {meeting.location && (
                  <div>
                    <dt className="text-xs text-text-muted">Location</dt>
                    <dd className="mt-0.5 text-xs text-text-secondary">
                      {meeting.location}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) =>
                      setEditStatus(e.target.value as MeetingStatus)
                    }
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">
                    Date & Time
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <DatePicker
                        value={editDate.slice(0, 10)}
                        onChange={(d) => {
                          const time = editDate.slice(11, 16) || "09:00";
                          setEditDate(
                            new Date(`${d}T${time}`).toISOString()
                          );
                        }}
                        size="sm"
                        placeholder="Pick date"
                      />
                    </div>
                    <input
                      type="time"
                      value={editDate.slice(11, 16)}
                      onChange={(e) => {
                        const date = editDate.slice(0, 10);
                        setEditDate(
                          new Date(`${date}T${e.target.value}`).toISOString()
                        );
                      }}
                      className="rounded-md border border-border-primary bg-surface-secondary px-2 py-0.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Zoom, office, etc."
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-text-muted">
                    Linked Deal
                  </label>
                  <select
                    value={editDealId ?? ""}
                    onChange={(e) =>
                      setEditDealId(e.target.value || null)
                    }
                    className="w-full rounded-md border border-border-primary bg-surface-primary px-2.5 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                  >
                    <option value="">No deal linked</option>
                    {activeDeals.map((deal) => (
                      <option key={deal.deal_id} value={deal.deal_id}>
                        {deal.company}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
