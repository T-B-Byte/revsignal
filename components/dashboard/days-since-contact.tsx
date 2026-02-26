import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { differenceInDays } from 'date-fns';
import type { DealStage } from '@/types/database';
import { DEAL_STAGES } from '@/types/database';

export interface DealContactInfo {
  deal_id: string;
  company: string;
  stage: DealStage;
  acv: number | null;
  last_activity_date: string;
}

interface DaysSinceContactProps {
  deals: DealContactInfo[];
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function getDaysColor(days: number): string {
  if (days < 5) return 'text-status-green';
  if (days < 10) return 'text-status-yellow';
  return 'text-status-red';
}

function getDaysBg(days: number): string {
  if (days < 5) return '';
  if (days < 10) return 'bg-status-yellow-bg';
  return 'bg-status-red-bg';
}

export function DaysSinceContact({ deals }: DaysSinceContactProps) {
  const stageConfig = new Map(DEAL_STAGES.map((s) => [s.value, s]));
  const now = new Date();

  // Sort by most stale first (invalid dates go to top)
  const sorted = [...deals].sort((a, b) => {
    const dateA = new Date(a.last_activity_date);
    const dateB = new Date(b.last_activity_date);
    const daysA = isNaN(dateA.getTime()) ? 999 : differenceInDays(now, dateA);
    const daysB = isNaN(dateB.getTime()) ? 999 : differenceInDays(now, dateB);
    return daysB - daysA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Days Since Contact</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No active deals to track.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-primary text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium">Company</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 text-right font-medium">ACV</th>
                  <th className="pb-2 text-right font-medium">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {sorted.map((deal) => {
                  const actDate = new Date(deal.last_activity_date);
                  const days = isNaN(actDate.getTime())
                    ? 999
                    : differenceInDays(now, actDate);
                  const config = stageConfig.get(deal.stage);

                  return (
                    <tr key={deal.deal_id} className={getDaysBg(days)}>
                      <td className="py-2 font-medium text-text-primary">
                        {deal.company}
                      </td>
                      <td className="py-2">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-xs"
                          style={{
                            backgroundColor: `${config?.color ?? '#6b7280'}20`,
                            color: config?.color ?? '#6b7280',
                          }}
                        >
                          {config?.label ?? deal.stage}
                        </span>
                      </td>
                      <td className="py-2 text-right font-data text-text-secondary">
                        {deal.acv != null ? currencyFmt.format(deal.acv) : '--'}
                      </td>
                      <td
                        className={`py-2 text-right font-data font-semibold ${getDaysColor(days)}`}
                      >
                        {days}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
