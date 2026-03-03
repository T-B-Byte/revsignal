import { Card, CardContent } from '@/components/ui/card';
import type { Prospect } from '@/types/database';

interface ProspectCardProps {
  prospect: Prospect;
}

export function ProspectCard({ prospect }: ProspectCardProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {prospect.company}
              </h3>
              {prospect.icp_category && (
                <span className="shrink-0 rounded-full bg-accent-primary/10 px-2 py-0.5 text-xs font-medium text-accent-primary">
                  {prospect.icp_category}
                </span>
              )}
            </div>

            {prospect.why_they_buy && (
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                {prospect.why_they_buy}
              </p>
            )}

            {prospect.research_notes && !prospect.why_they_buy && (
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                {prospect.research_notes.slice(0, 200)}
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
              {prospect.estimated_acv != null && (
                <span className="font-data">
                  Est. {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(prospect.estimated_acv)}
                </span>
              )}
              {prospect.source && (
                <span>{prospect.source}</span>
              )}
              {prospect.last_researched_date && (
                <span>
                  Researched{' '}
                  {new Date(prospect.last_researched_date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
