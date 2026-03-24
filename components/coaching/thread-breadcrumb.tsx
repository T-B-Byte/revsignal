"use client";

import { useState } from "react";
import type { Deal, Contact, Project, MaEntity } from "@/types/database";

/** Represents a linked entity on a thread */
export interface LinkedEntity {
  id: string;
  type: "deal" | "prospect" | "project" | "ma_entity" | "contact";
  title: string;
  subtitle?: string;
}

interface ThreadBreadcrumbProps {
  project?: Pick<Project, "project_id" | "name" | "status" | "category"> | null;
  deal?: Pick<Deal, "deal_id" | "company" | "stage"> | null;
  contact?: Pick<Contact, "contact_id" | "name" | "company" | "role"> | null;
  maEntity?: Pick<MaEntity, "entity_id" | "company" | "entity_type" | "stage"> | null;
  prospectId?: string | null;
  prospectName?: string | null;
  company?: string | null;
  participants?: { name: string; role?: string; company?: string; contact_id?: string }[];
  onLink: () => void;
  onUnlink: (type: string, id: string) => void;
  linkingInProgress?: boolean;
}

const ENTITY_STYLES: Record<string, string> = {
  project: "bg-violet-500/10 text-violet-400 hover:bg-violet-500/20",
  deal: "bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20",
  contact: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
  prospect: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  ma_entity: "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  company: "bg-surface-tertiary text-text-secondary",
};

export function ThreadBreadcrumb({
  project,
  deal,
  contact,
  maEntity,
  prospectId,
  prospectName,
  company,
  participants,
  onLink,
  onUnlink,
  linkingInProgress,
}: ThreadBreadcrumbProps) {
  const [hoveredChip, setHoveredChip] = useState<string | null>(null);

  // Build the ordered list of entity chips
  const chips: { key: string; type: string; id: string; label: string; detail?: string }[] = [];

  if (project) {
    chips.push({
      key: "project",
      type: "project",
      id: project.project_id,
      label: project.name,
      detail: project.category ?? project.status,
    });
  }

  if (deal) {
    chips.push({
      key: "deal",
      type: "deal",
      id: deal.deal_id,
      label: deal.company,
      detail: deal.stage.replace(/_/g, " "),
    });
  }

  if (prospectId && prospectName) {
    chips.push({
      key: "prospect",
      type: "prospect",
      id: prospectId,
      label: prospectName,
    });
  }

  if (maEntity) {
    chips.push({
      key: "ma_entity",
      type: "ma_entity",
      id: maEntity.entity_id,
      label: maEntity.company,
      detail: `${maEntity.entity_type} · ${maEntity.stage.replace(/_/g, " ")}`,
    });
  }

  if (contact) {
    chips.push({
      key: "contact",
      type: "contact",
      id: contact.contact_id,
      label: contact.name,
      detail: [contact.role, contact.company].filter(Boolean).join(" · "),
    });
  }

  // Show company badge if it's set but not already shown via deal/contact
  const companyAlreadyShown = deal || (contact && contact.company === company);
  if (company && !companyAlreadyShown) {
    chips.push({
      key: "company-badge",
      type: "company",
      id: "company",
      label: company,
    });
  }

  const hasEntities = chips.some((c) => c.type !== "company");

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip, i) => (
        <div key={chip.key} className="flex items-center gap-1.5">
          {i > 0 && (
            <svg className="h-3 w-3 text-text-muted/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${ENTITY_STYLES[chip.type] ?? ENTITY_STYLES.company}`}
            onMouseEnter={() => setHoveredChip(chip.key)}
            onMouseLeave={() => setHoveredChip(null)}
          >
            {/* Type icon */}
            <EntityIcon type={chip.type} />
            {chip.label}
            {chip.detail && (
              <span className="opacity-60 font-normal">· {chip.detail}</span>
            )}
            {/* Remove button (not for company badge) */}
            {chip.type !== "company" && hoveredChip === chip.key && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUnlink(chip.type, chip.id);
                }}
                disabled={linkingInProgress}
                className="ml-0.5 rounded-full hover:bg-white/10 transition-colors"
                title={`Remove ${chip.type} link`}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        </div>
      ))}

      {/* Participant chips (separate from entities) */}
      {participants && participants.length > 0 && (
        <>
          {chips.length > 0 && (
            <svg className="h-3 w-3 text-text-muted/50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
          <div className="flex flex-wrap gap-1">
            {participants.map((p, i) => (
              <span
                key={p.contact_id ?? i}
                className="inline-flex items-center gap-1 rounded-full bg-accent-primary/10 px-2 py-0.5 text-[11px] font-medium text-accent-primary"
              >
                {p.name}
                {p.role && (
                  <span className="text-text-muted font-normal">· {p.role}</span>
                )}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Link button */}
      <button
        onClick={onLink}
        disabled={linkingInProgress}
        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border-primary px-2 py-0.5 text-[11px] text-text-muted hover:text-text-primary hover:border-text-muted transition-colors disabled:opacity-50"
        title="Link to project, deal, contact, or prospect"
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
        </svg>
        {hasEntities ? "" : "Link to..."}
      </button>
    </div>
  );
}

function EntityIcon({ type }: { type: string }) {
  switch (type) {
    case "project":
      return (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    case "deal":
      return (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      );
    case "contact":
      return (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "prospect":
      return (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      );
    case "ma_entity":
      return (
        <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    default:
      return null;
  }
}
