"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type {
  UserNodeData,
  ProjectNodeData,
  MemberNodeData,
} from "./use-network-graph";

/** Center "You" node */
export const UserNode = memo(function UserNode({ data }: NodeProps) {
  const d = data as unknown as UserNodeData;
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent-primary bg-accent-primary/20 shadow-lg shadow-accent-primary/20">
      <span className="text-sm font-bold text-accent-primary">{d.label}</span>
      <Handle type="source" position={Position.Top} className="!bg-accent-primary !w-2 !h-2 !border-0 opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-accent-primary !w-2 !h-2 !border-0 opacity-0" id="right" />
      <Handle type="source" position={Position.Bottom} className="!bg-accent-primary !w-2 !h-2 !border-0 opacity-0" id="bottom" />
      <Handle type="source" position={Position.Left} className="!bg-accent-primary !w-2 !h-2 !border-0 opacity-0" id="left" />
    </div>
  );
});

/** Project node — shows project name, status, member count */
export const ProjectNode = memo(function ProjectNode({ data }: NodeProps) {
  const d = data as unknown as ProjectNodeData;

  const statusLabel =
    d.status === "active" ? "Active" : d.status === "paused" ? "Paused" : "Done";

  return (
    <div
      className="cursor-pointer rounded-xl border-2 bg-surface-secondary px-4 py-3 shadow-md transition-shadow hover:shadow-lg min-w-[140px] max-w-[200px]"
      style={{ borderColor: d.color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" id="right" />
      <Handle type="source" position={Position.Left} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" id="left" />

      <p className="text-sm font-semibold text-text-primary leading-tight">
        {d.name}
      </p>
      {d.description && (
        <p className="mt-0.5 text-[10px] text-text-muted truncate">
          {d.description}
        </p>
      )}
      <div className="mt-1.5 flex items-center gap-2">
        <span
          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: d.color }}
        >
          {statusLabel}
        </span>
        <span className="text-[10px] text-text-muted">
          {d.memberCount} {d.memberCount === 1 ? "person" : "people"}
        </span>
      </div>
    </div>
  );
});

/** Member (person) node */
export const MemberNode = memo(function MemberNode({ data }: NodeProps) {
  const d = data as unknown as MemberNodeData;

  // If cross-connected, show a multi-color left border
  const borderStyle = d.isCrossConnected
    ? { borderLeftColor: d.projectColors[0], borderLeftWidth: 3 }
    : {};

  return (
    <div
      className={`cursor-default rounded-lg border bg-surface-primary px-3 py-2 transition-shadow hover:shadow-md min-w-[130px] ${
        d.isCrossConnected
          ? "border-accent-primary/60 ring-1 ring-accent-primary/30"
          : "border-border-primary"
      }`}
      style={borderStyle}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-2 !h-2 !border-0 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-2 !h-2 !border-0 opacity-0" />

      <p className="text-xs font-medium text-text-primary">{d.name}</p>
      {d.role && (
        <p className="mt-0.5 text-[10px] text-text-muted">{d.role}</p>
      )}
      {d.isCrossConnected && (
        <div className="mt-1 flex gap-1">
          {d.projectColors.map((color, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      )}
    </div>
  );
});

/** Registry of custom node types for React Flow */
export const nodeTypes = {
  userNode: UserNode,
  projectNode: ProjectNode,
  memberNode: MemberNode,
};
