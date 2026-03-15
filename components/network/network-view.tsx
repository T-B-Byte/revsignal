"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import type { Deal, Contact } from "@/types/database";
import { useNetworkGraph, DEFAULT_FILTERS, type NetworkFilters } from "./use-network-graph";
import type { DealNodeData, ContactNodeData } from "./use-network-graph";
import { nodeTypes } from "./network-nodes";
import { edgeTypes } from "./network-edges";
import { NetworkFiltersBar } from "./network-filters";

interface NetworkViewProps {
  deals: Deal[];
  contacts: Contact[];
}

export function NetworkView({ deals, contacts }: NetworkViewProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<NetworkFilters>(DEFAULT_FILTERS);

  // Compute graph
  const { nodes: graphNodes, edges: graphEdges } = useNetworkGraph(
    deals,
    contacts,
    filters
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Keep nodes/edges in sync when the computed graph changes.
  // useNodesState/useEdgesState manage internal drag positions,
  // so we only push new data when the memoized output changes.
  const prevNodesRef = useRef(graphNodes);
  const prevEdgesRef = useRef(graphEdges);
  useEffect(() => {
    if (prevNodesRef.current !== graphNodes) {
      prevNodesRef.current = graphNodes;
      setNodes(graphNodes);
    }
    if (prevEdgesRef.current !== graphEdges) {
      prevEdgesRef.current = graphEdges;
      setEdges(graphEdges);
    }
  }, [graphNodes, graphEdges, setNodes, setEdges]);

  // Click handlers — navigate to detail pages
  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "dealNode") {
        const data = node.data as unknown as DealNodeData;
        router.push(`/deals/${data.dealId}`);
      } else if (node.type === "contactNode") {
        const data = node.data as unknown as ContactNodeData;
        router.push(`/contacts/${data.contactId}`);
      }
    },
    [router]
  );

  // Extract unique companies for filter dropdown
  const companies = Array.from(new Set(deals.map((d) => d.company))).sort();

  if (deals.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
        <svg
          className="h-16 w-16 opacity-40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0l-2.83-2.83M9.76 9.76L6.93 6.93" />
        </svg>
        <p className="text-sm">No active deals in your pipeline yet.</p>
        <button
          onClick={() => router.push("/deals?new=true")}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:bg-accent-primary/90 transition-colors"
        >
          Add Your First Deal
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <NetworkFiltersBar
        filters={filters}
        onChange={setFilters}
        companies={companies}
      />

      <div className="relative flex-1 rounded-xl border border-border-primary overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="var(--color-border-primary, #333)"
          />
          <Controls
            className="!bg-surface-secondary !border-border-primary !shadow-lg [&>button]:!bg-surface-secondary [&>button]:!border-border-primary [&>button]:!text-text-secondary [&>button:hover]:!bg-surface-tertiary"
          />
          <MiniMap
            className="!bg-surface-secondary !border-border-primary"
            nodeColor={(node) => {
              if (node.type === "userNode") return "var(--color-accent-primary, #3b82f6)";
              if (node.type === "dealNode") {
                const data = node.data as unknown as DealNodeData;
                return data.stageColor;
              }
              return "var(--color-text-muted, #6b7280)";
            }}
            maskColor="rgba(0,0,0,0.6)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
