import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { EscalationLevel } from '@/types/database';

export interface FollowUpGroup {
  level: EscalationLevel;
  items: {
    item_id: string;
    description: string;
    due_date: string | null;
    owner: string;
    deal_company: string | null;
  }[];
}

interface FollowUpAlertsProps {
  groups: FollowUpGroup[];
}

const LEVEL_CONFIG: Record<
  EscalationLevel,
  { label: string; variant: BadgeVariant; sort: number }
> = {
  red: { label: 'Overdue', variant: 'red', sort: 0 },
  yellow: { label: 'Due Soon', variant: 'yellow', sort: 1 },
  green: { label: 'On Track', variant: 'green', sort: 2 },
};

export function FollowUpAlerts({ groups }: FollowUpAlertsProps) {
  // Sort: red first, then yellow, then green
  const sorted = [...groups].sort(
    (a, b) => LEVEL_CONFIG[a.level].sort - LEVEL_CONFIG[b.level].sort
  );

  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Follow-Up Alerts</CardTitle>
        <span className="font-data text-xs text-text-muted">{totalItems} active</span>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No pending follow-ups. You are all caught up.
          </p>
        ) : (
          <div className="space-y-4">
            {sorted.map((group) => {
              if (group.items.length === 0) return null;
              const config = LEVEL_CONFIG[group.level];
              return (
                <div key={group.level}>
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant={config.variant}>{config.label}</Badge>
                    <span className="font-data text-xs text-text-muted">
                      {group.items.length}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item.item_id}
                        className="rounded-md bg-surface-tertiary px-3 py-2 text-sm"
                      >
                        <p className="text-text-primary">{item.description}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                          {item.deal_company && <span>{item.deal_company}</span>}
                          {item.due_date && (
                            <span className="font-data">
                              {format(new Date(item.due_date), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span className="capitalize">{item.owner}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
