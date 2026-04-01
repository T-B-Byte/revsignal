import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { REVENUE_TARGET, REV_SHARE_PERCENT, BASE_SALARY } from '@/types/database';

interface RevenueTrackerProps {
  closedRevenue: number;
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function RevenueTracker({ closedRevenue }: RevenueTrackerProps) {
  const progressPercent = Math.min((closedRevenue / REVENUE_TARGET) * 100, 100);

  // Calculate pacing: months remaining in 2026
  const now = new Date();
  const yearEnd = new Date(2026, 11, 31);
  const msRemaining = yearEnd.getTime() - now.getTime();
  const monthsRemaining = Math.max(msRemaining / (1000 * 60 * 60 * 24 * 30.44), 0.5);
  const remaining = REVENUE_TARGET - closedRevenue;
  const neededPerMonth = remaining > 0 ? remaining / monthsRemaining : 0;

  // Rev-share projection at current pace
  const monthsElapsed = 12 - monthsRemaining;
  const projectedAnnual =
    monthsElapsed > 0 ? (closedRevenue / monthsElapsed) * 12 : 0;
  const revShareEarnings = projectedAnnual * REV_SHARE_PERCENT;
  const totalComp = BASE_SALARY + revShareEarnings;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big number */}
        <div>
          <p className="font-data text-4xl font-bold text-brand-500">
            {currencyFmt.format(closedRevenue)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            of {currencyFmt.format(REVENUE_TARGET)} goal
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
            <span>{progressPercent.toFixed(1)}%</span>
            <span>
              {remaining > 0
                ? `${currencyFmt.format(remaining)} remaining`
                : `${currencyFmt.format(Math.abs(remaining))} over target`}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pacing */}
        <div className="grid grid-cols-2 gap-4">
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-text-secondary">Needed / month</p>
            <p className="font-data text-lg font-semibold text-white">
              {currencyFmt.format(neededPerMonth)}
            </p>
          </div>
          <div className="metric-card rounded-xl p-4">
            <p className="text-xs text-text-secondary">Months left</p>
            <p className="font-data text-lg font-semibold text-white">
              {Math.ceil(monthsRemaining)}
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-1">
        <p className="text-xs text-text-muted">
          Rev-share at current pace:{' '}
          <span className="font-data text-status-green">
            {currencyFmt.format(revShareEarnings)}
          </span>
        </p>
        <p className="text-xs text-text-muted">
          Projected total comp:{' '}
          <span className="font-data text-text-primary">
            {currencyFmt.format(totalComp)}
          </span>
        </p>
      </CardFooter>
    </Card>
  );
}
