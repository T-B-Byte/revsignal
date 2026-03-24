import type { HTMLAttributes } from 'react';

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'purple' | 'orange';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  green: 'bg-status-green-bg text-status-green border-status-green/20',
  yellow: 'bg-status-yellow-bg text-status-yellow border-status-yellow/20',
  red: 'bg-status-red-bg text-status-red border-status-red/20',
  blue: 'bg-accent-primary/10 text-accent-primary border-accent-primary/20',
  gray: 'bg-surface-tertiary text-text-secondary border-border-primary',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

function Badge({ variant = 'gray', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
