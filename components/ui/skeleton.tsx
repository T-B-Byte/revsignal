import type { HTMLAttributes } from 'react';

type SkeletonShape = 'line' | 'circle' | 'card';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  shape?: SkeletonShape;
  /** Width in Tailwind class format, e.g. "w-32", "w-full". Defaults vary by shape. */
  width?: string;
  /** Height in Tailwind class format, e.g. "h-4", "h-10". Defaults vary by shape. */
  height?: string;
}

const shapeDefaults: Record<SkeletonShape, { width: string; height: string; rounded: string }> = {
  line: { width: 'w-full', height: 'h-4', rounded: 'rounded-md' },
  circle: { width: 'w-10', height: 'h-10', rounded: 'rounded-full' },
  card: { width: 'w-full', height: 'h-32', rounded: 'rounded-lg' },
};

function Skeleton({
  shape = 'line',
  width,
  height,
  className = '',
  ...props
}: SkeletonProps) {
  const defaults = shapeDefaults[shape];

  return (
    <div
      className={`animate-pulse bg-white/10 ${width ?? defaults.width} ${height ?? defaults.height} ${defaults.rounded} ${className}`}
      {...props}
    />
  );
}

export { Skeleton, type SkeletonProps };
