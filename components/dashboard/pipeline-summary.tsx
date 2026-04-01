import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DEAL_STAGES, ACTIVE_STAGES, type DealStage } from '@/types/database';

export interface PipelineStageData {
  stage: DealStage;
  count: number;
  totalAcv: number;
}

interface PipelineSummaryProps {
  stages: PipelineStageData[];
}

const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function PipelineSummary({ stages }: PipelineSummaryProps) {
  const maxAcv = Math.max(...stages.map((s) => s.totalAcv), 1);
  const totalPipeline = stages.reduce((sum, s) => sum + s.totalAcv, 0);
  const totalDeals = stages.reduce((sum, s) => sum + s.count, 0);

  // Build a lookup for stage config
  const stageConfig = new Map(DEAL_STAGES.map((s) => [s.value, s]));

  // Only show active stages, in order
  const orderedStages = ACTIVE_STAGES.map((stageValue) => {
    const data = stages.find((s) => s.stage === stageValue);
    const config = stageConfig.get(stageValue);
    return {
      stage: stageValue,
      label: config?.label ?? stageValue,
      color: config?.color ?? '#6b7280',
      count: data?.count ?? 0,
      totalAcv: data?.totalAcv ?? 0,
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pipeline</CardTitle>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            <span className="font-data text-text-primary">{totalDeals}</span> deals
          </span>
          <span>
            <span className="font-data text-text-primary">
              {currencyFmt.format(totalPipeline)}
            </span>{' '}
            total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {totalDeals === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No active deals yet. Add your first deal to see pipeline data.
          </p>
        ) : (
          orderedStages.map((s) => (
            <div key={s.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{s.label}</span>
                <span className="flex items-center gap-2 text-text-muted">
                  <span className="font-data">{s.count}</span>
                  <span className="font-data text-text-primary">
                    {currencyFmt.format(s.totalAcv)}
                  </span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(s.totalAcv / maxAcv) * 100}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
