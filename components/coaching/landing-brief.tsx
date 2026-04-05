"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { formatDistanceToNow } from "date-fns";

interface LandingBriefData {
  briefing: string | null;
  briefingId: string | null;
  briefingDate: string | null;
  generatedAt: string | null;
  isStale: boolean;
  sections: Record<string, string>;
  sectionNotes: Record<string, unknown>;
}

type LoadState = "loading" | "loaded" | "error" | "generating";

export function LandingBrief() {
  const [data, setData] = useState<LandingBriefData | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [collapsed, setCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchBrief = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState("loading");
    try {
      const res = await fetch("/api/coaching/landing-brief", { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch");
      const json: LandingBriefData = await res.json();
      if (!controller.signal.aborted) {
        setData(json);
        setState("loaded");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setState("error");
    }
  }, []);

  const regenerate = useCallback(async () => {
    setState("generating");
    try {
      const res = await fetch("/api/agents/briefing", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate");
      await fetchBrief();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setState("error");
    }
  }, [fetchBrief]);

  useEffect(() => {
    fetchBrief();
    return () => abortRef.current?.abort();
  }, [fetchBrief]);

  // --- Skeleton ---
  if (state === "loading") {
    return <BriefSkeleton />;
  }

  // --- Error ---
  if (state === "error") {
    return (
      <div className="rounded-lg border border-status-red/30 bg-status-red/5 px-4 py-3">
        <p className="text-sm text-text-secondary">
          Couldn&apos;t load your briefing.{" "}
          <button onClick={fetchBrief} className="text-accent-primary hover:underline">
            Retry
          </button>
        </p>
      </div>
    );
  }

  // --- Generating ---
  if (state === "generating") {
    return (
      <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">
            The Strategist is preparing your briefing...
          </p>
        </div>
      </div>
    );
  }

  // --- No briefing exists yet ---
  if (!data?.briefing) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-text-primary">Where were you?</p>
            <p className="mt-0.5 text-xs text-text-muted">
              No briefing yet. Generate one to see your priorities, pipeline health, and overdue items.
            </p>
          </div>
          <button
            onClick={regenerate}
            className="shrink-0 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            Generate Briefing
          </button>
        </div>
      </div>
    );
  }

  // --- Briefing loaded ---
  const sections = data.sections;
  const generatedDate = data.generatedAt ? new Date(data.generatedAt) : null;

  // Extract key sections for compact display
  const priorities = sections["Top 3 Priorities Today"] ?? null;
  const pipelineHealth = sections["Pipeline Health"] ?? null;
  const overdue = sections["Overdue & Upcoming"] ?? null;
  const dealMomentum = sections["Deal Momentum"] ?? null;

  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary overflow-hidden">
      {/* Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCollapsed(!collapsed); } }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-tertiary cursor-pointer"
      >
        <svg
          className="h-5 w-5 shrink-0 text-accent-primary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
          />
        </svg>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-semibold text-text-primary">Where Were You?</span>
          {data.isStale && (
            <span className="ml-2 rounded-full bg-status-yellow/20 px-1.5 py-0.5 text-[10px] font-semibold text-status-yellow">
              Stale
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {generatedDate && !isNaN(generatedDate.getTime()) && (
            <span className="text-[10px] text-text-muted">
              {formatDistanceToNow(generatedDate, { addSuffix: true })}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              regenerate();
            }}
            className="rounded p-1 text-text-muted transition-colors hover:bg-surface-tertiary hover:text-accent-primary"
            title="Refresh briefing"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
              />
            </svg>
          </button>
          <svg
            className={`h-4 w-4 text-text-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="border-t border-border-primary px-4 py-3 space-y-3">
          {/* Priorities */}
          {priorities && (
            <BriefSection title="Top Priorities" color="accent-primary">
              <BriefContent text={priorities} />
            </BriefSection>
          )}

          {/* Pipeline Health */}
          {pipelineHealth && (
            <BriefSection title="Pipeline Health" color="emerald-400">
              <BriefContent text={pipelineHealth} />
            </BriefSection>
          )}

          {/* Overdue */}
          {overdue && (
            <BriefSection title="Overdue & Upcoming" color="status-red">
              <BriefContent text={overdue} />
            </BriefSection>
          )}

          {/* Deal Momentum */}
          {dealMomentum && (
            <BriefSection title="Deal Momentum" color="status-yellow">
              <BriefContent text={dealMomentum} />
            </BriefSection>
          )}

          {/* If no sections parsed, show raw content */}
          {!priorities && !pipelineHealth && !overdue && !dealMomentum && (
            <div className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
              {data.briefing}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

const SECTION_COLORS: Record<string, string> = {
  "accent-primary": "text-accent-primary",
  "emerald-400": "text-emerald-400",
  "status-red": "text-status-red",
  "status-yellow": "text-status-yellow",
};

function BriefSection({
  title,
  color,
  children,
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const colorClass = SECTION_COLORS[color] ?? "text-text-muted";

  return (
    <div>
      <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${colorClass}`}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function BriefContent({ text }: { text: string }) {
  // Convert markdown list items to clean display
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Strip leading markdown list markers (-, *, 1.)
        const clean = line.replace(/^[-*]\s+|^\d+\.\s+/, "");
        const isBullet = line !== clean;

        return (
          <p key={i} className={`text-xs text-text-secondary leading-relaxed ${isBullet ? "pl-3" : ""}`}>
            {isBullet && <span className="text-text-muted mr-1">&bull;</span>}
            {clean}
          </p>
        );
      })}
    </div>
  );
}

function BriefSkeleton() {
  return (
    <div className="rounded-lg border border-border-primary bg-surface-secondary px-4 py-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 rounded bg-surface-tertiary" />
        <div className="h-4 w-32 rounded bg-surface-tertiary" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-surface-tertiary" />
        <div className="h-3 w-4/5 rounded bg-surface-tertiary" />
        <div className="h-3 w-3/5 rounded bg-surface-tertiary" />
      </div>
    </div>
  );
}
