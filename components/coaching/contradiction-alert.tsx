"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { DealContradictionWithThreads, ContradictionSeverity } from "@/types/database";

interface ContradictionAlertProps {
  /** If provided, only shows contradictions for this deal. Otherwise shows all. */
  dealId?: string;
  /** Compact mode for inline use (attention strip). Full mode for deal hub. */
  compact?: boolean;
}

const SEVERITY_STYLES: Record<ContradictionSeverity, { bg: string; text: string; label: string }> = {
  high: { bg: "bg-status-red/10", text: "text-status-red", label: "High" },
  medium: { bg: "bg-status-yellow/10", text: "text-status-yellow", label: "Medium" },
  low: { bg: "bg-surface-tertiary", text: "text-text-muted", label: "Low" },
};

export function ContradictionAlert({ dealId, compact = false }: ContradictionAlertProps) {
  const [contradictions, setContradictions] = useState<DealContradictionWithThreads[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchContradictions = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const url = dealId
        ? `/api/coaching/contradictions?deal_id=${dealId}`
        : "/api/coaching/contradictions";
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const json = await res.json();
      if (!controller.signal.aborted) {
        setContradictions(json.contradictions ?? []);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchContradictions();
    return () => abortRef.current?.abort();
  }, [fetchContradictions]);

  const handleResolve = async (contradictionId: string) => {
    setContradictions((prev) => prev.filter((c) => c.contradiction_id !== contradictionId));
    try {
      const res = await fetch("/api/coaching/contradictions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contradiction_id: contradictionId }),
      });
      if (!res.ok) fetchContradictions();
    } catch {
      fetchContradictions();
    }
  };

  if (loading || contradictions.length === 0) return null;

  if (compact) {
    return <CompactView contradictions={contradictions} />;
  }

  return (
    <div className="space-y-2">
      {contradictions.map((c) => (
        <ContradictionCard key={c.contradiction_id} contradiction={c} onResolve={handleResolve} />
      ))}
    </div>
  );
}

/** Full card for deal hub / overview. */
function ContradictionCard({
  contradiction: c,
  onResolve,
}: {
  contradiction: DealContradictionWithThreads;
  onResolve: (id: string) => void;
}) {
  const style = SEVERITY_STYLES[c.severity];

  return (
    <div className={`rounded-lg border border-status-red/20 ${style.bg} px-4 py-3`}>
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <svg
          className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>

        <div className="min-w-0 flex-1">
          {/* Severity + category */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            <span className="text-[10px] text-text-muted capitalize">{c.category}</span>
          </div>

          {/* Description */}
          <p className="text-sm text-text-primary leading-relaxed">{c.description}</p>

          {/* Thread references */}
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-text-muted">
            {c.thread_a_title && (
              <span className="rounded bg-surface-secondary px-1.5 py-0.5">
                {c.thread_a_title}
              </span>
            )}
            {c.thread_b_title && (
              <span className="rounded bg-surface-secondary px-1.5 py-0.5">
                {c.thread_b_title}
              </span>
            )}
          </div>
        </div>

        {/* Resolve button */}
        <button
          onClick={() => onResolve(c.contradiction_id)}
          className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-text-muted hover:bg-surface-tertiary hover:text-text-primary transition-colors"
          title="Mark as resolved"
        >
          Resolve
        </button>
      </div>
    </div>
  );
}

/** Compact summary for attention strip. */
function CompactView({ contradictions }: { contradictions: DealContradictionWithThreads[] }) {
  const highCount = contradictions.filter((c) => c.severity === "high").length;
  const total = contradictions.length;

  return (
    <div className="flex items-center gap-1.5">
      <svg
        className="h-3.5 w-3.5 text-status-red"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <span className="text-[10px] font-semibold text-status-red">
        {total} contradiction{total !== 1 ? "s" : ""}
        {highCount > 0 ? ` (${highCount} high)` : ""}
      </span>
    </div>
  );
}

/** Hook for fetching contradiction counts per deal (used by landing view). */
export function useContradictionCounts(): {
  counts: Map<string, { total: number; high: number }>;
  loading: boolean;
} {
  const [counts, setCounts] = useState<Map<string, { total: number; high: number }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function fetch_() {
      try {
        const res = await fetch("/api/coaching/contradictions", { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        if (controller.signal.aborted) return;
        const map = new Map<string, { total: number; high: number }>();
        for (const c of json.contradictions ?? []) {
          const existing = map.get(c.deal_id) ?? { total: 0, high: 0 };
          existing.total++;
          if (c.severity === "high") existing.high++;
          map.set(c.deal_id, existing);
        }
        setCounts(map);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetch_();
    return () => controller.abort();
  }, []);

  return { counts, loading };
}
