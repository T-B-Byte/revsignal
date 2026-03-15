"use client";

import { useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { ProjectWithMembers, ProjectStatus } from "@/types/database";

export interface NetworkFilters {
  statuses: ProjectStatus[];
  showCrossConnections: boolean;
  search: string;
}

export const DEFAULT_FILTERS: NetworkFilters = {
  statuses: [],
  showCrossConnections: true,
  search: "",
};

/** Node data payloads */
export interface UserNodeData {
  label: string;
  [key: string]: unknown;
}

export interface ProjectNodeData {
  projectId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  color: string;
  memberCount: number;
  [key: string]: unknown;
}

export interface MemberNodeData {
  memberId: string;
  name: string;
  role: string | null;
  isCrossConnected: boolean;
  projectColors: string[];
  [key: string]: unknown;
}

/**
 * Transforms projects + members into React Flow nodes and edges
 * with a radial layout centered on the user.
 *
 * Center: You
 * First ring: Projects
 * Second ring: Members (people), with cross-connections when
 * the same person appears on multiple projects (matched by name).
 */
export function useNetworkGraph(
  projects: ProjectWithMembers[],
  filters: NetworkFilters
) {
  return useMemo(() => {
    // 1. Filter projects by status
    let filtered = projects;
    if (filters.statuses.length > 0) {
      filtered = projects.filter((p) => filters.statuses.includes(p.status));
    }

    // 2. Build person-to-projects mapping (by lowercase name for cross-connections)
    const nameToProjects = new Map<string, { projectId: string; color: string }[]>();
    const nameToMember = new Map<string, { memberId: string; name: string; role: string | null }>();

    for (const project of filtered) {
      for (const member of project.project_members ?? []) {
        const key = member.name.toLowerCase().trim();
        const existing = nameToProjects.get(key) ?? [];
        existing.push({ projectId: project.project_id, color: project.color });
        nameToProjects.set(key, existing);

        // Keep the most recent member record for display
        if (!nameToMember.has(key) || member.role) {
          nameToMember.set(key, {
            memberId: member.member_id,
            name: member.name,
            role: member.role,
          });
        }
      }
    }

    // 3. Search filtering
    const searchLower = filters.search.toLowerCase().trim();
    const hasSearch = searchLower.length > 0;
    const matchedNodeIds = new Set<string>();

    if (hasSearch) {
      for (const project of filtered) {
        if (project.name.toLowerCase().includes(searchLower)) {
          matchedNodeIds.add(`project-${project.project_id}`);
        }
      }
      for (const [key, member] of nameToMember) {
        if (member.name.toLowerCase().includes(searchLower)) {
          matchedNodeIds.add(`member-${key}`);
        }
      }
    }

    // 4. Generate nodes and edges
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

    // Project nodes in a circle around center
    const projectRadius = 300;
    const projectCount = filtered.length;

    filtered.forEach((project, i) => {
      const angle = (i / Math.max(projectCount, 1)) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * projectRadius;
      const y = Math.sin(angle) * projectRadius;
      const nodeId = `project-${project.project_id}`;

      nodes.push({
        id: nodeId,
        type: "projectNode",
        position: { x, y },
        data: {
          projectId: project.project_id,
          name: project.name,
          description: project.description,
          status: project.status,
          color: project.color,
          memberCount: (project.project_members ?? []).length,
        } satisfies ProjectNodeData,
        className: hasSearch && !matchedNodeIds.has(nodeId) ? "opacity-30" : "",
        draggable: true,
      });

      // Edge: user → project
      edges.push({
        id: `user-${project.project_id}`,
        source: "user",
        target: nodeId,
        type: "default",
        style: {
          stroke: project.color,
          strokeWidth: 2,
        },
        className: hasSearch && !matchedNodeIds.has(nodeId) ? "opacity-30" : "",
      });
    });

    // Member nodes — placed near the projects they belong to
    const memberRadius = 200;
    const placedMembers = new Set<string>();

    for (const project of filtered) {
      const projectIdx = filtered.indexOf(project);
      const projectAngle = (projectIdx / Math.max(projectCount, 1)) * 2 * Math.PI - Math.PI / 2;
      const members = project.project_members ?? [];

      members.forEach((member, mi) => {
        const key = member.name.toLowerCase().trim();
        if (placedMembers.has(key)) return; // Only place each person once
        placedMembers.add(key);

        const memberInfo = nameToMember.get(key)!;
        const memberProjects = nameToProjects.get(key) ?? [];
        const isCrossConnected = memberProjects.length > 1;
        const memberNodeId = `member-${key}`;

        // Position around the first project they appear on
        const spread = Math.PI * 0.6; // spread members across an arc
        const memberAngle =
          projectAngle +
          (members.length === 1
            ? 0
            : -spread / 2 + (mi / Math.max(members.length - 1, 1)) * spread);

        const mx =
          Math.cos(projectAngle) * projectRadius +
          Math.cos(memberAngle) * memberRadius;
        const my =
          Math.sin(projectAngle) * projectRadius +
          Math.sin(memberAngle) * memberRadius;

        nodes.push({
          id: memberNodeId,
          type: "memberNode",
          position: { x: mx, y: my },
          data: {
            memberId: memberInfo.memberId,
            name: memberInfo.name,
            role: memberInfo.role,
            isCrossConnected,
            projectColors: memberProjects.map((p) => p.color),
          } satisfies MemberNodeData,
          className: hasSearch && !matchedNodeIds.has(memberNodeId) ? "opacity-30" : "",
          draggable: true,
        });

        // Edges: project → member (for each project this person is on)
        for (const mp of memberProjects) {
          edges.push({
            id: `project-${mp.projectId}-member-${key}`,
            source: `project-${mp.projectId}`,
            target: memberNodeId,
            type: isCrossConnected && mp.projectId !== project.project_id
              ? "crossEdge"
              : "default",
            style: isCrossConnected && mp.projectId !== project.project_id
              ? undefined
              : { stroke: `${mp.color}80`, strokeWidth: 1.5 },
            animated: isCrossConnected && mp.projectId !== project.project_id,
            className: hasSearch && !matchedNodeIds.has(memberNodeId) ? "opacity-30" : "",
          });
        }
      });
    }

    return { nodes, edges };
  }, [projects, filters]);
}
