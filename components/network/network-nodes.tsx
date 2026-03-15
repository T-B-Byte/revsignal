"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type {
  UserNodeData,
  DealNodeData,
  ContactNodeData,
  CompanyGroupData,
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

/** Deal node — shows company, stage badge, ACV */
export const DealNode = memo(function DealNode({ data }: NodeProps) {
  const d = data as unknown as DealNodeData;
  const formattedAcv = d.acv
    ? `$${(d.acv / 1000).toFixed(0)}K`
    : null;

  return (
    <div
      className="cursor-pointer rounded-xl border-2 bg-surface-secondary px-4 py-3 shadow-md transition-shadow hover:shadow-lg min-w-[140px]"
      style={{ borderColor: d.stageColor }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" id="right" />
      <Handle type="source" position={Position.Left} className="!bg-transparent !w-3 !h-3 !border-0 opacity-0" id="left" />

      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary leading-tight">
          {d.company}
        </p>
        {formattedAcv && (
          <span className="shrink-0 text-xs font-data text-text-muted">
            {formattedAcv}
          </span>
        )}
      </div>
      <span
        className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
        style={{ backgroundColor: d.stageColor }}
      >
        {d.stageLabel}
      </span>
    </div>
  );
});

/** Contact node — smaller card with name and role */
export const ContactNode = memo(function ContactNode({ data }: NodeProps) {
  const d = data as unknown as ContactNodeData;

  return (
    <div
      className={`cursor-pointer rounded-lg border bg-surface-primary px-3 py-2 transition-shadow hover:shadow-md ${
        d.isCrossConnected
          ? "border-accent-primary/60 ring-1 ring-accent-primary/30"
          : "border-border-primary"
      }`}
      style={{ width: 160, height: 60 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-transparent !w-2 !h-2 !border-0 opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-2 !h-2 !border-0 opacity-0" />

      <p className="text-xs font-medium text-text-primary truncate">{d.name}</p>
      {d.role && (
        <p className="mt-0.5 text-[10px] text-text-muted truncate">{d.role}</p>
      )}
    </div>
  );
});

/** Company group — transparent container with company label */
export const CompanyGroupNode = memo(function CompanyGroupNode({
  data,
}: NodeProps) {
  const d = data as unknown as CompanyGroupData;

  return (
    <div className="h-full w-full rounded-2xl border border-border-primary/50 bg-surface-tertiary/30 p-0">
      <div className="px-4 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
          {d.company}
        </p>
      </div>
    </div>
  );
});

/** Registry of custom node types for React Flow */
export const nodeTypes = {
  userNode: UserNode,
  dealNode: DealNode,
  contactNode: ContactNode,
  companyGroup: CompanyGroupNode,
};
