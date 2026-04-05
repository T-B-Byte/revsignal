"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Maps dashboard routes to trackable page keys and labels.
 * Only top-level features are tracked (sub-routes roll up to the parent).
 */
const PAGE_MAP: Record<string, { key: string; label: string }> = {
  "/": { key: "dashboard", label: "Dashboard" },
  "/deals": { key: "deals", label: "Deals" },
  "/network": { key: "network", label: "Projects" },
  "/coach": { key: "coach", label: "StrategyGPT" },
  "/deal-rooms": { key: "deal-rooms", label: "Deal Rooms" },
  "/tasks": { key: "tasks", label: "Tasks" },
  "/prospects": { key: "prospects", label: "Prospects" },
  "/meetings": { key: "meetings", label: "Meetings" },
  "/tradeshows": { key: "tradeshows", label: "Tradeshows" },
  "/flashcards": { key: "flashcards", label: "Flashcards" },
  "/plan": { key: "plan", label: "90-Day Plan" },
  "/playbook": { key: "playbook", label: "Playbook" },
  "/compete": { key: "compete", label: "Competition" },
  "/ma": { key: "ma", label: "M&A" },
  "/contracts": { key: "contracts", label: "Contracts" },
  "/marketing": { key: "marketing", label: "Marketing" },
  "/studio": { key: "studio", label: "Studio" },
  "/board-report": { key: "board-report", label: "Board Report" },
  "/docs": { key: "docs", label: "Docs" },
  "/settings": { key: "settings", label: "Settings" },
  "/contacts": { key: "contacts", label: "Contacts" },
};

function resolvePageInfo(pathname: string): { key: string; label: string } | null {
  // Exact match first
  if (PAGE_MAP[pathname]) return PAGE_MAP[pathname];

  // Match by prefix (e.g. /deals/abc -> deals)
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    const prefix = "/" + segments[0];
    if (PAGE_MAP[prefix]) return PAGE_MAP[prefix];
  }

  return null;
}

export function PageTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    const pageInfo = resolvePageInfo(pathname);
    if (!pageInfo) return;

    // Don't double-track the same page key in sequence
    if (lastTracked.current === pageInfo.key) return;
    lastTracked.current = pageInfo.key;

    // Fire and forget
    fetch("/api/usage/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page_key: pageInfo.key,
        page_label: pageInfo.label,
      }),
    }).catch(() => {
      // Silent failure, usage tracking is non-critical
    });
  }, [pathname]);

  return null;
}
