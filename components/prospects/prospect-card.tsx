"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateProspect, deleteProspect } from "@/app/(dashboard)/prospects/actions";
import type { Prospect } from "@/types/database";

interface ProspectCardProps {
  prospect: Prospect;
  icpCategories: string[];
}

const acvFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function ProspectCard({ prospect, icpCategories }: ProspectCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      <CardContent className="py-4">
        {error && (
          <div className="mb-2 rounded-md border border-status-red/20 bg-status-red/10 p-2 text-xs text-status-red">
            {error}
          </div>
        )}

        {/* Clickable header row */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary truncate">
                  {prospect.company}
                </h3>
                {prospect.icp_category && (
                  <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                    {prospect.icp_category}
                  </span>
                )}
              </div>

              {!expanded && (prospect.why_they_buy || prospect.research_notes) && (
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                  {prospect.why_they_buy || prospect.research_notes?.slice(0, 200)}
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
                    Researched{" "}
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
              className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${
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

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border-primary pt-3">
            {prospect.why_they_buy && (
              <div>
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Why They&apos;d Buy
                </p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {prospect.why_they_buy}
                </p>
              </div>
            )}

            {prospect.research_notes && (
              <div>
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-0.5">
                  Research Notes
                </p>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {prospect.research_notes}
                </p>
              </div>
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
            <div className="flex items-center gap-2 pt-1">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
