import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export interface WorkstreamProgress {
  workstream: string;
  completed: number;
  total: number;
}

interface PlaybookProgressProps {
  workstreams: WorkstreamProgress[];
}

export function PlaybookProgress({ workstreams }: PlaybookProgressProps) {
  const totalCompleted = workstreams.reduce((sum, w) => sum + w.completed, 0);
  const totalItems = workstreams.reduce((sum, w) => sum + w.total, 0);
  const overallPercent = totalItems > 0 ? (totalCompleted / totalItems) * 100 : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Playbook Progress</CardTitle>
        <span className="font-data text-xs text-text-muted">
          {totalCompleted}/{totalItems} ({overallPercent.toFixed(0)}%)
        </span>
      </CardHeader>
      <CardContent>
        {workstreams.length === 0 ? (
          <p className="py-4 text-center text-sm text-text-muted">
            No playbook items yet. Run the seed script to load the GTM playbook.
          </p>
        ) : (
          <div className="space-y-3">
            {workstreams.map((ws) => {
              const percent = ws.total > 0 ? (ws.completed / ws.total) * 100 : 0;
              return (
                <div key={ws.workstream}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-text-secondary">
                      {ws.workstream}
                    </span>
                    <span className="shrink-0 font-data text-xs text-text-muted">
                      {ws.completed}/{ws.total}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor:
                          percent === 100
                            ? '#10b981'
                            : percent > 50
                              ? '#4f6ef7'
                              : percent > 0
                                ? '#f59e0b'
                                : '#64748b',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
