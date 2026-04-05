"use client";

import { useState } from "react";
import type { DealInsightWithThread, InsightType } from "@/types/database";
import { INSIGHT_TYPE_LABELS } from "@/types/database";

interface DealKnowledgeProps {
  dealId: string;
  insights: DealInsightWithThread[];
}

const TYPE_COLORS: Record<InsightType, string> = {
  analysis: "bg-blue-500/10 text-blue-400",
  decision: "bg-green-500/10 text-green-400",
  objection_handling: "bg-orange-500/10 text-orange-400",
  timeline: "bg-purple-500/10 text-purple-400",
  pricing: "bg-emerald-500/10 text-emerald-400",
  competitive: "bg-red-500/10 text-red-400",
  stakeholder_map: "bg-cyan-500/10 text-cyan-400",
  risk_assessment: "bg-yellow-500/10 text-yellow-400",
};

export function DealKnowledge({ dealId, insights }: DealKnowledgeProps) {
  const [showSuperseded, setShowSuperseded] = useState(false);

  const activeInsights = insights.filter((i) => i.is_active);
  const supersededInsights = insights.filter((i) => !i.is_active);

  // Group by insight_type
  const grouped = activeInsights.reduce<Record<string, DealInsightWithThread[]>>((acc, insight) => {
    const type = insight.insight_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(insight);
    return acc;
  }, {});

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-border-primary bg-surface-secondary p-8 text-center">
        <div className="mx-auto mb-3 w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand-500">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>
        <p className="text-sm text-text-muted">
          No insights yet. As you discuss this deal with the Strategist, key analysis and decisions will be captured here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active insights grouped by type */}
      {Object.entries(grouped).map(([type, typeInsights]) => (
        <div key={type} className="space-y-2">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {INSIGHT_TYPE_LABELS[type as InsightType] ?? type}
          </h3>
          <div className="space-y-2">
            {typeInsights.map((insight) => (
              <InsightCard key={insight.insight_id} insight={insight} />
            ))}
          </div>
        </div>
      ))}

      {/* Superseded insights toggle */}
      {supersededInsights.length > 0 && (
        <div className="pt-2 border-t border-border-primary">
          <button
            onClick={() => setShowSuperseded(!showSuperseded)}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            {showSuperseded ? "Hide" : "Show"} {supersededInsights.length} superseded insight{supersededInsights.length !== 1 ? "s" : ""}
          </button>
          {showSuperseded && (
            <div className="mt-2 space-y-2 opacity-60">
              {supersededInsights.map((insight) => (
                <InsightCard key={insight.insight_id} insight={insight} superseded />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightCard({
  insight,
  superseded = false,
}: {
  insight: DealInsightWithThread;
  superseded?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorClass = TYPE_COLORS[insight.insight_type] ?? "bg-gray-500/10 text-gray-400";
  const createdDate = new Date(insight.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const contentPreview = insight.content.length > 200 && !expanded
    ? insight.content.slice(0, 200) + "..."
    : insight.content;

  return (
    <div
      className={`rounded-lg border bg-surface-secondary p-4 transition-colors ${
        superseded
          ? "border-border-primary"
          : "border-border-primary hover:border-brand-500/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
              {INSIGHT_TYPE_LABELS[insight.insight_type]}
            </span>
            {superseded && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-tertiary text-text-muted">
                Superseded
              </span>
            )}
          </div>
          <h4 className="mt-1.5 text-sm font-medium text-text-primary">
            {insight.title}
          </h4>
        </div>
        <span className="shrink-0 text-[10px] text-text-muted">{createdDate}</span>
      </div>

      <p className="mt-2 text-xs text-text-secondary leading-relaxed whitespace-pre-line">
        {contentPreview}
      </p>

      {insight.content.length > 200 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-brand-500 hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {/* Source thread link */}
      <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
        {insight.thread_title && insight.thread_id && (
          <a
            href={`/coach/${insight.thread_id}`}
            className="hover:text-brand-500 transition-colors"
          >
            From: {insight.thread_title}
          </a>
        )}
      </div>
    </div>
  );
}
