import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  REVENUE_TARGET,
  TARGET_ACV,
  TARGET_CUSTOMERS,
} from '@/types/database';

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const STRETCH_SCENARIOS = [
  { acv: 50_000, customers: 20, label: 'High Volume' },
  { acv: 75_000, customers: 14, label: 'Mid-Market' },
  { acv: 100_000, customers: 10, label: 'Base Plan' },
  { acv: 150_000, customers: 7, label: 'Enterprise' },
  { acv: 200_000, customers: 5, label: 'Whale Hunting' },
];

export function RevenueMath() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>The $1M Math</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core math */}
        <div className="grid grid-cols-3 gap-4">
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary">Annual Goal</p>
            <p className="font-data text-lg font-bold text-brand-500">
              {currencyFmt.format(REVENUE_TARGET)}
            </p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary">Avg ACV</p>
            <p className="font-data text-lg font-bold text-white">
              {currencyFmt.format(TARGET_ACV)}
            </p>
          </div>
          <div className="metric-card rounded-xl p-4 text-center">
            <p className="text-xs text-text-secondary">Customers</p>
            <p className="font-data text-lg font-bold text-white">
              {TARGET_CUSTOMERS}
            </p>
          </div>
        </div>

        {/* Stretch scenarios */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-muted">
            Scenario Paths
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-text-secondary">
                  <th className="pb-2 font-medium">Scenario</th>
                  <th className="pb-2 text-right font-medium">ACV</th>
                  <th className="pb-2 text-right font-medium">Customers</th>
                  <th className="pb-2 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {STRETCH_SCENARIOS.map((scenario) => {
                  const isBase = scenario.acv === TARGET_ACV;
                  return (
                    <tr
                      key={scenario.label}
                      className={isBase ? 'bg-brand-500/10' : ''}
                    >
                      <td className="py-2 text-text-secondary">
                        {scenario.label}
                        {isBase && (
                          <span className="ml-2 text-xs text-brand-500">
                            *
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right font-data text-text-primary">
                        {currencyFmt.format(scenario.acv)}
                      </td>
                      <td className="py-2 text-right font-data text-text-primary">
                        {scenario.customers}
                      </td>
                      <td className="py-2 text-right font-data font-semibold text-text-primary">
                        {currencyFmt.format(scenario.acv * scenario.customers)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
