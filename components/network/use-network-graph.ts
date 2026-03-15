"use client";

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { Deal, Contact, DealStage } from "@/types/database";
import { DEAL_STAGES } from "@/types/database";

export interface NetworkFilters {
  stages: DealStage[];
  company: string | null;
  showCrossConnections: boolean;
  search: string;
}

export const DEFAULT_FILTERS: NetworkFilters = {
  stages: [],
  company: null,
  showCrossConnections: true,
  search: "",
};

/** Node data payloads */
export interface UserNodeData {
  label: string;
  [key: string]: unknown;
}

export interface DealNodeData {
  dealId: string;
  company: string;
  stage: DealStage;
  stageLabel: string;
  stageColor: string;
  acv: number | null;
  [key: string]: unknown;
}

export interface ContactNodeData {
  contactId: string;
  name: string;
  role: string | null;
  company: string;
  isCrossConnected: boolean;
  [key: string]: unknown;
}

export interface CompanyGroupData {
  company: string;
  [key: string]: unknown;
}

const STAGE_COLOR_MAP = new Map(DEAL_STAGES.map((s) => [s.value, s.color]));
const STAGE_LABEL_MAP = new Map(DEAL_STAGES.map((s) => [s.value, s.label]));

/**
 * Transforms deals + contacts into React Flow nodes and edges
 * with a radial layout centered on the user.
 */
export function useNetworkGraph(
  deals: Deal[],
  contacts: Contact[],
  filters: NetworkFilters
) {
  return useMemo(() => {
    // 1. Filter deals by stage
    let filteredDeals = deals;
    if (filters.stages.length > 0) {
      filteredDeals = deals.filter((d) => filters.stages.includes(d.stage));
    }

    // 2. Filter by company
    if (filters.company) {
      filteredDeals = filteredDeals.filter(
        (d) => d.company.toLowerCase() === filters.company!.toLowerCase()
      );
    }

    // 3. Build contact lookup from full contacts table
    const contactMap = new Map(contacts.map((c) => [c.contact_id, c]));

    // 4. Build contact-to-deals mapping for cross-connections
    const contactToDeals = new Map<string, string[]>();
    for (const deal of filteredDeals) {
      for (const ref of deal.contacts ?? []) {
        const existing = contactToDeals.get(ref.contact_id) ?? [];
        existing.push(deal.deal_id);
        contactToDeals.set(ref.contact_id, existing);
      }
    }

    // 5. Collect unique contacts and group by company
    const companyContacts = new Map<string, Set<string>>(); // company -> contact_ids
    const seenContacts = new Set<string>();

    for (const deal of filteredDeals) {
      for (const ref of deal.contacts ?? []) {
        if (seenContacts.has(ref.contact_id)) continue;
        seenContacts.add(ref.contact_id);

        const fullContact = contactMap.get(ref.contact_id);
        const company = fullContact?.company ?? deal.company;
        const companyKey = company.toLowerCase();

        if (!companyContacts.has(companyKey)) {
          companyContacts.set(companyKey, new Set());
        }
        companyContacts.get(companyKey)!.add(ref.contact_id);
      }
    }

    // 6. Search filtering — determine which nodes to highlight
    const searchLower = filters.search.toLowerCase().trim();
    const hasSearch = searchLower.length > 0;
    const matchedNodeIds = new Set<string>();

    if (hasSearch) {
      for (const deal of filteredDeals) {
        if (deal.company.toLowerCase().includes(searchLower)) {
          matchedNodeIds.add(`deal-${deal.deal_id}`);
        }
      }
      for (const contactId of seenContacts) {
        const ref = contactMap.get(contactId);
        if (ref && ref.name.toLowerCase().includes(searchLower)) {
          matchedNodeIds.add(`contact-${contactId}`);
        }
      }
    }

    // 7. Generate nodes
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Center user node
    nodes.push({
      id: "user",
      type: "userNode",
      position: { x: 0, y: 0 },
      data: { label: "You" } satisfies UserNodeData,
      draggable: true,
    });

    // Deal nodes in a circle around center
    const dealRadius = 320;
    const dealCount = filteredDeals.length;

    filteredDeals.forEach((deal, i) => {
      const angle = (i / Math.max(dealCount, 1)) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * dealRadius;
      const y = Math.sin(angle) * dealRadius;
      const nodeId = `deal-${deal.deal_id}`;

      nodes.push({
        id: nodeId,
        type: "dealNode",
        position: { x, y },
        data: {
          dealId: deal.deal_id,
          company: deal.company,
          stage: deal.stage,
          stageLabel: STAGE_LABEL_MAP.get(deal.stage) ?? deal.stage,
          stageColor: STAGE_COLOR_MAP.get(deal.stage) ?? "#6b7280",
          acv: deal.acv,
        } satisfies DealNodeData,
        className: hasSearch && !matchedNodeIds.has(nodeId) ? "opacity-30" : "",
        draggable: true,
      });

      // Edge: user → deal
      edges.push({
        id: `user-${deal.deal_id}`,
        source: "user",
        target: nodeId,
        type: "default",
        style: {
          stroke: STAGE_COLOR_MAP.get(deal.stage) ?? "#6b7280",
          strokeWidth: 2,
        },
        className: hasSearch && !matchedNodeIds.has(nodeId) ? "opacity-30" : "",
      });
    });

    // Company group nodes + contact nodes
    const contactRadius = 180; // distance from deal node to contacts
    let companyIndex = 0;

    for (const [companyKey, contactIds] of companyContacts) {
      // Find deals for this company to position the group near them
      const companyDeals = filteredDeals.filter(
        (d) => d.company.toLowerCase() === companyKey
      );

      // Use the first deal's position as anchor, or distribute if no direct match
      let anchorAngle: number;
      if (companyDeals.length > 0) {
        const dealIdx = filteredDeals.indexOf(companyDeals[0]);
        anchorAngle = (dealIdx / Math.max(dealCount, 1)) * 2 * Math.PI - Math.PI / 2;
      } else {
        // Contact belongs to a company that isn't a direct deal company
        // Place them at an offset angle
        anchorAngle = (companyIndex / Math.max(companyContacts.size, 1)) * 2 * Math.PI - Math.PI / 2;
      }

      const groupX = Math.cos(anchorAngle) * (dealRadius + contactRadius + 60);
      const groupY = Math.sin(anchorAngle) * (dealRadius + contactRadius + 60);

      // Get display company name from first contact
      const firstContactId = Array.from(contactIds)[0];
      const firstContact = contactMap.get(firstContactId);
      const displayCompany = firstContact?.company ?? companyKey;

      const groupId = `company-${companyKey}`;

      // Calculate group dimensions
      const contactCount = contactIds.size;
      const cols = Math.min(contactCount, 3);
      const rows = Math.ceil(contactCount / cols);
      const cardW = 160;
      const cardH = 60;
      const gap = 12;
      const padding = 16;
      const headerH = 32;
      const groupW = cols * cardW + (cols - 1) * gap + padding * 2;
      const groupH = rows * cardH + (rows - 1) * gap + padding * 2 + headerH;

      nodes.push({
        id: groupId,
        type: "companyGroup",
        position: { x: groupX - groupW / 2, y: groupY - groupH / 2 },
        data: { company: displayCompany } satisfies CompanyGroupData,
        style: { width: groupW, height: groupH },
        draggable: true,
      });

      // Contact nodes inside group
      let contactIdx = 0;
      for (const contactId of contactIds) {
        const fullContact = contactMap.get(contactId);
        const ref = [...filteredDeals.flatMap((d) => d.contacts ?? [])].find(
          (c) => c.contact_id === contactId
        );

        const col = contactIdx % cols;
        const row = Math.floor(contactIdx / cols);
        const cx = padding + col * (cardW + gap);
        const cy = headerH + padding + row * (cardH + gap);

        const isCrossConnected = (contactToDeals.get(contactId)?.length ?? 0) > 1;
        const contactNodeId = `contact-${contactId}`;

        nodes.push({
          id: contactNodeId,
          type: "contactNode",
          position: { x: cx, y: cy },
          parentId: groupId,
          extent: "parent" as const,
          data: {
            contactId,
            name: fullContact?.name ?? ref?.name ?? "Unknown",
            role: fullContact?.role ?? ref?.role ?? null,
            company: displayCompany,
            isCrossConnected,
          } satisfies ContactNodeData,
          className: hasSearch && !matchedNodeIds.has(contactNodeId) ? "opacity-30" : "",
          draggable: true,
        });

        // Edges: deal → contact (for each deal this contact is on)
        const dealIds = contactToDeals.get(contactId) ?? [];
        for (const dealId of dealIds) {
          edges.push({
            id: `deal-${dealId}-contact-${contactId}`,
            source: `deal-${dealId}`,
            target: contactNodeId,
            type: "default",
            style: { stroke: "#6b728080", strokeWidth: 1 },
            className: hasSearch && !matchedNodeIds.has(contactNodeId) ? "opacity-30" : "",
          });
        }

        // Cross-deal dotted edges
        if (filters.showCrossConnections && isCrossConnected && dealIds.length > 1) {
          for (let di = 1; di < dealIds.length; di++) {
            edges.push({
              id: `cross-${contactId}-${dealIds[di]}`,
              source: contactNodeId,
              target: `deal-${dealIds[di]}`,
              type: "crossEdge",
              animated: true,
              data: { contactName: fullContact?.name ?? ref?.name ?? "" },
            });
          }
        }

        contactIdx++;
      }

      companyIndex++;
    }

    return { nodes, edges };
  }, [deals, contacts, filters]);
}
