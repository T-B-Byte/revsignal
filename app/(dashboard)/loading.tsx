import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Page heading skeleton */}
      <div>
        <Skeleton width="w-64" height="h-8" />
        <Skeleton width="w-80" height="h-4" className="mt-2" />
      </div>

      {/* Row 1: Revenue Tracker + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton shape="card" height="h-64" />
        </div>
        <div>
          <Skeleton shape="card" height="h-64" />
        </div>
      </div>

      {/* Row 2: Pipeline + Follow-ups */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton shape="card" height="h-56" />
        <Skeleton shape="card" height="h-56" />
      </div>

      {/* Row 3: Days Since Contact + Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton shape="card" height="h-48" />
        <Skeleton shape="card" height="h-48" />
      </div>

      {/* Row 4: Revenue Math + Playbook */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton shape="card" height="h-64" />
        <Skeleton shape="card" height="h-48" />
      </div>
    </div>
  );
}
