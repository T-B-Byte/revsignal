"use client";

import { memo } from "react";
import {
  BaseEdge,
  getStraightPath,
  type EdgeProps,
} from "@xyflow/react";

/** Dotted cross-deal edge — shows when same contact is on multiple deals */
export const CrossEdge = memo(function CrossEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  ...rest
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <BaseEdge
      {...rest}
      path={edgePath}
      style={{
        stroke: "var(--color-accent-primary, #3b82f6)",
        strokeWidth: 1.5,
        strokeDasharray: "6 4",
        opacity: 0.6,
      }}
    />
  );
});

export const edgeTypes = {
  crossEdge: CrossEdge,
};
