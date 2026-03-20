"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThreadChat } from "@/components/coaching/thread-chat";
import { ProspectOutreachDialog } from "@/components/prospects/prospect-outreach-dialog";
import { formatAgentHtml } from "@/lib/format-agent-html";
import { updateProspect, deleteProspect } from "@/app/(dashboard)/prospects/actions";
import type { Prospect, FitScore, CoachingThread, CoachingMessage, Deal } from "@/types/database";

interface ProspectCardProps {
  prospect: Prospect;
  icpCategories: string[];
  thread?: CoachingThread | null;
  threadMessages?: CoachingMessage[];
  activeDeals?: Pick<Deal, "deal_id" | "company" | "stage">[];
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const FIT_BADGE_STYLES: Record<FitScore, string> = {
  strong: "bg-status-green/15 text-status-green border-status-green/30",
  moderate: "bg-status-yellow/15 text-status-yellow border-status-yellow/30",
  weak: "bg-status-red/15 text-status-red border-status-red/30",
  not_a_fit: "bg-text-muted/15 text-text-muted border-text-muted/30",
};

const FIT_LABELS: Record<FitScore, string> = {
  strong: "Strong Fit",
  moderate: "Moderate Fit",
  weak: "Weak Fit",
  not_a_fit: "Not a Fit",
};

export function ProspectCard({ prospect, icpCategories, thread, threadMessages = [], activeDeals = [] }: ProspectCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatThread, setChatThread] = useState<CoachingThread | null>(thread ?? null);
  const [chatMessages, setChatMessages] = useState<CoachingMessage[]>(threadMessages);
  const [creatingThread, setCreatingThread] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passing, setPassing] = useState(false);
  const [showOutreach, setShowOutreach] = useState(false);
  const isPassed = prospect.status === "passed";

  async function handleOpenChat() {
    if (chatThread) {
      setShowChat(true);
      return;
    }

    // Create a thread for this prospect
    setCreatingThread(true);
    try {
      const res = await fetch("/api/coaching/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: prospect.company,
          company: prospect.company,
          prospect_id: prospect.id,
        }),
      });

      if (!res.ok) {
        setError("Failed to start Strategist conversation.");
        return;
      }

      const thread = await res.json();
      setChatThread(thread);
      setChatMessages([]);
      setShowChat(true);
    } catch {
      setError("Failed to start Strategist conversation.");
    } finally {
      setCreatingThread(false);
    }
  }

  function handleSave(formData: FormData) {
    setError(null);
    const updates: Record<string, unknown> = {};

    const company = formData.get("company") as string;
    if (company && company !== prospect.company) updates.company = company;

    const icpCategory = formData.get("icp_category") as string;
    if (icpCategory !== (prospect.icp_category ?? "")) {
      updates.icp_category = icpCategory || null;
    }

    const estimatedAcv = formData.get("estimated_acv") as string;
    if (estimatedAcv !== String(prospect.estimated_acv ?? "")) {
      updates.estimated_acv = estimatedAcv ? Number(estimatedAcv) : null;
    }

    const website = formData.get("website") as string;
    if (website !== (prospect.website ?? "")) {
      updates.website = website || null;
    }

    const whyTheyBuy = formData.get("why_they_buy") as string;
    if (whyTheyBuy !== (prospect.why_they_buy ?? "")) {
      updates.why_they_buy = whyTheyBuy || null;
    }

    const researchNotes = formData.get("research_notes") as string;
    if (researchNotes !== (prospect.research_notes ?? "")) {
      updates.research_notes = researchNotes || null;
    }

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateProspect(prospect.id, updates);
      if ("error" in result) {
        setError(result.error);
      } else {
        setEditing(false);
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteProspect(prospect.id);
    if ("error" in result) {
      setError(result.error);
      setDeleting(false);
    } else {
      router.refresh();
    }
  }

  async function handleTogglePass() {
    setPassing(true);
    const newStatus = isPassed ? "active" : "passed";
    const result = await updateProspect(prospect.id, { status: newStatus });
    if ("error" in result) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setPassing(false);
  }

  if (editing) {
    return (
      <Card>
        <CardContent className="py-4">
          <form action={handleSave} className="space-y-3">
            {error && (
              <div className="rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
                {error}
              </div>
            )}

            <Input
              name="company"
              label="Company"
              defaultValue={prospect.company}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">
                  ICP Category
                </label>
                <input
                  name="icp_category"
                  list={`icp-cats-${prospect.id}`}
                  defaultValue={prospect.icp_category ?? ""}
                  placeholder="e.g., B2B SaaS Platform"
                  className="w-full rounded-md border border-border-primary bg-surface-secondary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
                <datalist id={`icp-cats-${prospect.id}`}>
                  {icpCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <Input
                name="estimated_acv"
                label="Estimated ACV ($)"
                type="number"
                defaultValue={prospect.estimated_acv ?? ""}
                min={0}
              />
            </div>

            <Input
              name="website"
              label="Website"
              type="url"
              defaultValue={prospect.website ?? ""}
              placeholder="https://example.com"
            />

            <Textarea
              name="why_they_buy"
              label="Why They'd Buy"
              defaultValue={prospect.why_they_buy ?? ""}
              rows={2}
            />

            <Textarea
              name="research_notes"
              label="Research Notes"
              defaultValue={prospect.research_notes ?? ""}
              rows={3}
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setEditing(false); setError(null); }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={isPending}>
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className={`py-4 ${isPassed ? "opacity-60" : ""}`}>
        {error && (
          <div className="mb-2 rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
            {error}
          </div>
        )}

        {/* Header row — clickable area + always-visible actions */}
        <div className="flex items-start gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm font-semibold truncate ${isPassed ? "text-text-muted line-through" : "text-text-primary"}`}>
                    {prospect.company}
                  </h3>
                  {isPassed && (
                    <span className="shrink-0 rounded-full border border-text-muted/30 bg-text-muted/10 px-2 py-0.5 text-[10px] font-semibold text-text-muted">
                      Passed
                    </span>
                  )}
                  {prospect.fit_score && (
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${FIT_BADGE_STYLES[prospect.fit_score]}`}>
                      {FIT_LABELS[prospect.fit_score]}
                    </span>
                  )}
                  {prospect.icp_category && (
                    <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                      {prospect.icp_category}
                    </span>
                  )}
                </div>

                {/* Preview line when collapsed — show why they'd buy if available */}
                {!expanded && (
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                    {prospect.why_they_buy || prospect.research_notes?.slice(0, 200) || "No analysis yet"}
                  </p>
                )}

                <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
                  {prospect.estimated_acv != null && (
                    <span className="font-data">
                      Est. {acvFormatter.format(prospect.estimated_acv)}
                    </span>
                  )}
                  {prospect.source && <span>{prospect.source}</span>}
                  {prospect.last_researched_date && (
                    <span>
                      Analyzed{" "}
                      {new Date(prospect.last_researched_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>
              </div>

              {/* Chevron */}
              <svg
                className={`h-4 w-4 shrink-0 mt-0.5 text-text-muted transition-transform ${
                  expanded ? "rotate-180" : ""
                }`}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6l4 4 4-4" />
              </svg>
            </div>
          </button>

          {/* Always-visible Start Prospecting button */}
          {!isPassed && (
            <Button
              size="sm"
              className="shrink-0 mt-0.5"
              onClick={() => setShowOutreach(true)}
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 4h12v8H2zM2 4l6 5 6-5" />
              </svg>
              Start Prospecting
            </Button>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-4 border-t border-border-primary pt-3">
            {/* Why They'd Buy — prominent */}
            {prospect.why_they_buy && (
              <div className="rounded-md bg-accent-primary/5 px-3 py-2">
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Why They&apos;d Buy
                </p>
                <p className="text-sm text-text-primary">
                  {prospect.why_they_buy}
                </p>
              </div>
            )}

            {/* Next Action */}
            {prospect.next_action && (
              <div className="rounded-md bg-status-green/5 border border-status-green/20 px-3 py-2">
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Next Action
                </p>
                <p className="text-sm text-text-primary">
                  {prospect.next_action}
                </p>
              </div>
            )}

            {/* Suggested Contacts */}
            {prospect.suggested_contacts && prospect.suggested_contacts.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                  Target Contacts
                </p>
                <div className="space-y-2">
                  {prospect.suggested_contacts.map((contact, i) => (
                    <div key={i} className="rounded-md border border-border-primary bg-surface-tertiary px-3 py-2">
                      <p className="text-sm font-medium text-text-primary">{contact.title}</p>
                      {contact.why_they_care && (
                        <p className="mt-0.5 text-xs text-text-secondary">{contact.why_they_care}</p>
                      )}
                      {contact.approach && (
                        <p className="mt-0.5 text-xs text-text-muted italic">{contact.approach}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full research notes (collapsible) */}
            {prospect.fit_analysis && (
              <details className="group">
                <summary className="cursor-pointer text-[10px] font-medium text-text-muted uppercase tracking-wider hover:text-text-secondary">
                  Full Research Notes
                  <span className="ml-1 group-open:hidden">+</span>
                  <span className="ml-1 hidden group-open:inline">-</span>
                </summary>
                <div
                  className="mt-2 prose prose-sm max-w-none text-text-secondary
                    prose-headings:text-text-primary prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1
                    prose-p:text-text-secondary prose-p:text-sm prose-p:my-1
                    prose-li:text-text-secondary prose-li:text-sm
                    prose-strong:text-text-primary prose-strong:font-medium
                    prose-ul:my-1"
                  dangerouslySetInnerHTML={{ __html: formatAgentHtml(prospect.fit_analysis) }}
                />
              </details>
            )}

            {prospect.website && (
              <div>
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Website
                </p>
                <a
                  href={prospect.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-primary hover:underline"
                >
                  {prospect.website}
                </a>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleOpenChat}
                disabled={creatingThread}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 3h12v8H5l-3 3V3Z" />
                </svg>
                {creatingThread ? "Opening..." : "Talk to Strategist"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleTogglePass}
                disabled={passing}
              >
                {isPassed ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M2 8h12M8 2v12" />
                    </svg>
                    {passing ? "Reactivating..." : "Reactivate"}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                    {passing ? "Passing..." : "Pass"}
                  </>
                )}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5Z" />
                </svg>
                Edit
              </Button>

              {confirmDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-status-red">Delete?</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                    disabled={deleting}
                  >
                    No
                  </Button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-md bg-status-red px-3 py-1.5 text-xs font-medium text-white hover:bg-status-red/90 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "Deleting..." : "Yes"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-md p-1.5 text-text-muted hover:text-status-red hover:bg-status-red/10 transition-colors"
                  title="Delete prospect"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M2 4h12M5.5 4V2.5h5V4M6 7v5M10 7v5M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5L12.5 4" />
                  </svg>
                </button>
              )}
            </div>

            {/* Strategist Chat */}
            {showChat && chatThread && (
              <div className="mt-3 border-t border-border-primary pt-3">
                <ThreadChat
                  thread={chatThread}
                  initialMessages={chatMessages}
                  dealCompany={prospect.company}
                  activeDeals={activeDeals}
                />
              </div>
            )}
          </div>
        )}

        {/* Outreach dialog — portaled to body to escape Card's backdrop-blur stacking context */}
        {showOutreach && createPortal(
          <ProspectOutreachDialog
            prospect={prospect}
            onClose={() => setShowOutreach(false)}
            onSuccess={() => {
              router.refresh();
            }}
          />,
          document.body
        )}
      </CardContent>
    </Card>
  );
}
