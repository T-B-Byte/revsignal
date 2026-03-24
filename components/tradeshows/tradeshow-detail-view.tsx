"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TargetCard } from "./target-card";
import { deleteTradeshowAction } from "@/app/(dashboard)/tradeshows/actions";
import type {
  Tradeshow,
  TradeshowTarget,
  TradeshowContact,
} from "@/types/database";

interface TradeshowDetailViewProps {
  tradeshow: Tradeshow;
  targets: TradeshowTarget[];
  contacts: TradeshowContact[];
}

export function TradeshowDetailView({
  tradeshow: initialTradeshow,
  targets: initialTargets,
  contacts: initialContacts,
}: TradeshowDetailViewProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [tradeshow, setTradeshow] = useState(initialTradeshow);
  const [targets, setTargets] = useState(initialTargets);
  const [contacts, setContacts] = useState(initialContacts);

  const isAnalyzing =
    tradeshow.status === "analyzing" || tradeshow.status === "partial";
  const isError = tradeshow.status === "error";

  // Poll for updates when analysis is in progress
  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/tradeshows/${tradeshow.tradeshow_id}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setTradeshow(data.tradeshow);
        setTargets(data.targets ?? []);
        setContacts(data.contacts ?? []);

        if (
          data.tradeshow.status === "complete" ||
          data.tradeshow.status === "error"
        ) {
          clearInterval(interval);
          router.refresh();
        }
      } catch {
        // Silently retry on next interval
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAnalyzing, tradeshow.tradeshow_id, router]);

  // Group targets by priority
  const p1Targets = targets.filter(
    (t) => t.priority === "priority_1_walk_up"
  );
  const p2Targets = targets.filter(
    (t) => t.priority === "priority_2_strong_conversation"
  );
  const p3Targets = targets.filter(
    (t) => t.priority === "priority_3_competitive_intel"
  );
  const unclassified = targets.filter((t) => !t.priority);

  // Group contacts by target_id
  const contactsByTarget = new Map<string, TradeshowContact[]>();
  for (const contact of contacts) {
    const existing = contactsByTarget.get(contact.target_id) || [];
    existing.push(contact);
    contactsByTarget.set(contact.target_id, existing);
  }

  // Stats
  const totalPipeline = targets
    .filter((t) => !t.is_competitor)
    .reduce((sum, t) => sum + (t.estimated_acv || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  async function handleDelete() {
    if (!confirm("Delete this tradeshow and all its targets?")) return;
    setIsDeleting(true);
    const result = await deleteTradeshowAction(tradeshow.tradeshow_id);
    if ("success" in result) {
      router.push("/tradeshows");
      router.refresh();
    }
    setIsDeleting(false);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link href="/tradeshows" className="hover:text-text-primary">
          Tradeshows
        </Link>
        <span>/</span>
        <span className="text-text-primary">{tradeshow.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {tradeshow.name}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
            {tradeshow.dates && <span>{tradeshow.dates}</span>}
            {tradeshow.dates && tradeshow.location && <span>·</span>}
            {tradeshow.location && <span>{tradeshow.location}</span>}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {/* Analyzing state */}
      {isAnalyzing && (
        <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-6">
          <div className="flex items-center gap-3">
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            <div>
              <p className="text-sm font-medium text-text-primary">
                {tradeshow.status === "partial"
                  ? "Classifying sponsors against ICPs..."
                  : "Analyzing sponsor page..."}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {tradeshow.status === "partial" && tradeshow.total_sponsors
                  ? `Found ${tradeshow.total_sponsors} sponsors. Now prioritizing targets and generating pitch angles.`
                  : "Fetching the sponsor page and extracting company names. This usually takes 30-60 seconds."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-6">
          <p className="text-sm font-medium text-red-400">Analysis failed</p>
          <p className="text-xs text-text-muted mt-1">
            {tradeshow.analysis_summary ||
              "Something went wrong. Try deleting this tradeshow and analyzing again."}
          </p>
        </div>
      )}

      {/* Summary stats (only show when we have results or are complete) */}
      {!isAnalyzing && !isError && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
              <p className="text-xs text-text-muted">Total Pipeline</p>
              <p className="text-lg font-bold text-text-primary">
                {formatCurrency(totalPipeline)}
              </p>
            </div>
            <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
              <p className="text-xs text-text-muted">P1: Walk Up</p>
              <p className="text-lg font-bold text-green-400">
                {p1Targets.length}
              </p>
            </div>
            <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
              <p className="text-xs text-text-muted">P2: Strong Convo</p>
              <p className="text-lg font-bold text-blue-400">
                {p2Targets.length}
              </p>
            </div>
            <div className="rounded-lg border border-border-primary bg-surface-secondary p-3">
              <p className="text-xs text-text-muted">P3: Intel Only</p>
              <p className="text-lg font-bold text-text-muted">
                {p3Targets.length}
              </p>
            </div>
          </div>

          {/* Priority sections */}
          <PrioritySection
            title="Priority 1: Walk Up"
            color="text-green-400"
            borderColor="border-green-500/30"
            targets={p1Targets}
            contactsByTarget={contactsByTarget}
          />

          <PrioritySection
            title="Priority 2: Strong Conversations"
            color="text-blue-400"
            borderColor="border-blue-500/30"
            targets={p2Targets}
            contactsByTarget={contactsByTarget}
          />

          <PrioritySection
            title="Priority 3: Competitive Intel / Listen Only"
            color="text-text-muted"
            borderColor="border-border-primary"
            targets={p3Targets}
            contactsByTarget={contactsByTarget}
            defaultCollapsed
          />

          {unclassified.length > 0 && (
            <PrioritySection
              title="Unclassified"
              color="text-text-muted"
              borderColor="border-border-primary"
              targets={unclassified}
              contactsByTarget={contactsByTarget}
              defaultCollapsed
            />
          )}
        </>
      )}
    </div>
  );
}

function PrioritySection({
  title,
  color,
  borderColor,
  targets,
  contactsByTarget,
  defaultCollapsed = false,
}: {
  title: string;
  color: string;
  borderColor: string;
  targets: TradeshowTarget[];
  contactsByTarget: Map<string, TradeshowContact[]>;
  defaultCollapsed?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  if (targets.length === 0) return null;

  return (
    <div className={`rounded-lg border ${borderColor}`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <h2 className={`text-sm font-semibold ${color}`}>
          {title} ({targets.length})
        </h2>
        <span
          className={`text-xs text-text-muted transition-transform ${
            isCollapsed ? "" : "rotate-90"
          }`}
        >
          ▶
        </span>
      </button>
      {!isCollapsed && (
        <div className="space-y-3 px-4 pb-4">
          {targets.map((target) => (
            <TargetCard
              key={target.target_id}
              target={target}
              contacts={contactsByTarget.get(target.target_id) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
