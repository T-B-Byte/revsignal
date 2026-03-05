"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityBadge } from "./priority-badge";
import { TradeshowContactRow } from "./tradeshow-contact-row";
import { promoteToProspect, promoteToDeal } from "@/app/(dashboard)/tradeshows/actions";
import type { TradeshowTarget, TradeshowContact } from "@/types/database";

interface TargetCardProps {
  target: TradeshowTarget;
  contacts: TradeshowContact[];
}

export function TargetCard({ target, contacts }: TargetCardProps) {
  const router = useRouter();
  const [isResearching, setIsResearching] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [localContacts, setLocalContacts] = useState(contacts);
  const [isExpanded, setIsExpanded] = useState(false);
  const [promoting, setPromoting] = useState<"prospect" | "deal" | null>(null);

  const isCompetitor = target.is_competitor;
  const hasContacts = localContacts.length > 0;
  const researchComplete = target.research_status === "complete" || hasContacts;

  async function handleResearchContacts() {
    setIsResearching(true);
    try {
      const res = await fetch("/api/agents/tradeshow-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.target_id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalContacts(data.contacts || []);
        setIsExpanded(true);
      }
    } catch (error) {
      console.error("Contact research failed:", error);
    } finally {
      setIsResearching(false);
    }
  }

  async function handlePromoteToProspect() {
    setPromoting("prospect");
    setActionError(null);
    const result = await promoteToProspect(target.target_id);
    if ("id" in result) {
      router.refresh();
    } else {
      setActionError(result.error);
    }
    setPromoting(null);
  }

  async function handlePromoteToDeal() {
    setPromoting("deal");
    setActionError(null);
    const result = await promoteToDeal(target.target_id);
    if ("dealId" in result) {
      router.refresh();
    } else {
      setActionError(result.error);
    }
    setPromoting(null);
  }

  const formatCurrency = (value: number | null) =>
    value
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : "TBD";

  return (
    <Card className={isCompetitor ? "opacity-70" : undefined}>
      <CardContent className="py-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-text-primary">
                {target.company}
              </h3>
              <PriorityBadge priority={target.priority} short />
              {target.sponsorship_tier && (
                <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-muted">
                  {target.sponsorship_tier}
                </span>
              )}
              {target.existing_deal_id && (
                <span className="inline-flex items-center rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400">
                  Active Deal
                </span>
              )}
              {target.existing_prospect_id && !target.existing_deal_id && (
                <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400">
                  Prospect
                </span>
              )}
            </div>
            {target.company_description && (
              <p className="mt-1 text-xs text-text-secondary">
                {target.company_description}
              </p>
            )}
          </div>
          {!isCompetitor && (
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-text-primary">
                {formatCurrency(target.estimated_acv)}
              </p>
              {target.icp_category && (
                <p className="text-xs text-text-muted">{target.icp_category}</p>
              )}
            </div>
          )}
        </div>

        {/* ICP fit strength */}
        {target.icp_fit_strength && !isCompetitor && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Fit:</span>
            <span
              className={`text-xs font-medium ${
                target.icp_fit_strength === "Strong"
                  ? "text-green-400"
                  : target.icp_fit_strength === "Moderate"
                    ? "text-blue-400"
                    : "text-text-muted"
              }`}
            >
              {target.icp_fit_strength}
            </span>
          </div>
        )}

        {/* Pitch angle (most important field for non-competitors) */}
        {!isCompetitor && target.pitch_angle && (
          <div className="rounded-md border border-accent-primary/30 bg-accent-glow/50 p-3">
            <p className="text-xs font-medium text-accent-primary">
              Pitch Angle
            </p>
            <p className="mt-1 text-sm text-text-primary">
              {target.pitch_angle}
            </p>
          </div>
        )}

        {/* Competitor notes (for competitors) */}
        {isCompetitor && target.competitor_notes && (
          <div className="rounded-md border border-border-primary bg-surface-tertiary p-3">
            <p className="text-xs font-medium text-text-muted">
              What to Observe
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {target.competitor_notes}
            </p>
          </div>
        )}

        {/* Bombora angle */}
        {target.bombora_angle && !isCompetitor && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
            <p className="text-xs font-medium text-yellow-400">
              Bombora Differentiation
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {target.bombora_angle}
            </p>
          </div>
        )}

        {/* Contacts section */}
        {hasContacts && (
          <div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-primary"
            >
              <span
                className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}
              >
                ▶
              </span>
              {localContacts.length} contact{localContacts.length !== 1 ? "s" : ""}
            </button>
            {isExpanded && (
              <div className="mt-2 space-y-2">
                {localContacts.map((c) => (
                  <TradeshowContactRow key={c.contact_id} contact={c} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {actionError && (
          <p className="text-xs text-red-400">{actionError}</p>
        )}
        <div className="flex items-center gap-2 pt-1">
          {!isCompetitor && !researchComplete && (
            <button
              onClick={handleResearchContacts}
              disabled={isResearching}
              className="rounded-md bg-surface-tertiary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-tertiary/80 disabled:opacity-50"
            >
              {isResearching ? "Researching..." : "Research Contacts"}
            </button>
          )}
          {!isCompetitor && !target.existing_prospect_id && !target.existing_deal_id && (
            <button
              onClick={handlePromoteToProspect}
              disabled={promoting !== null}
              className="rounded-md bg-surface-tertiary px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-tertiary/80 disabled:opacity-50"
            >
              {promoting === "prospect" ? "Adding..." : "Add as Prospect"}
            </button>
          )}
          {!isCompetitor &&
            target.priority === "priority_1_walk_up" &&
            !target.existing_deal_id && (
              <button
                onClick={handlePromoteToDeal}
                disabled={promoting !== null}
                className="rounded-md bg-accent-primary/20 px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary/30 disabled:opacity-50"
              >
                {promoting === "deal" ? "Creating..." : "Create Deal"}
              </button>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
