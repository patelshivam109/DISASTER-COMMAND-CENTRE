export function Skeleton({ className = "" }) {
  return (
    <div className={`skeleton-block ${className}`}>
      <div className="skeleton-shimmer" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="panel-surface rounded-[28px] p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-11 w-11 rounded-2xl" />
      </div>
      <Skeleton className="mt-5 h-9 w-20 rounded-2xl" />
      <Skeleton className="mt-3 h-3 w-28 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="hero-panel min-h-[200px] rounded-[32px] p-8">
        <Skeleton className="h-4 w-32 rounded-full" />
        <Skeleton className="mt-6 h-12 w-80 max-w-full rounded-3xl" />
        <Skeleton className="mt-4 h-4 w-[28rem] max-w-full rounded-full" />
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-24 rounded-[24px]" />
          <Skeleton className="h-24 rounded-[24px]" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="panel-surface rounded-[28px] p-6">
          <Skeleton className="h-5 w-40 rounded-full" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Skeleton className="h-36 rounded-[24px]" />
            <Skeleton className="h-36 rounded-[24px]" />
          </div>
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-[20px]" />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="panel-surface rounded-[28px] p-6">
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="mt-5 h-48 rounded-[24px]" />
          </div>
          <div className="panel-surface rounded-[28px] p-6">
            <Skeleton className="h-5 w-36 rounded-full" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-[20px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RouteLoader() {
  return (
    <div className="space-y-6">
      <div className="panel-surface relative overflow-hidden rounded-[32px] px-6 py-7">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(38,211,184,0.14),transparent_45%),radial-gradient(circle_at_top_right,rgba(88,114,255,0.16),transparent_40%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Skeleton className="h-4 w-28 rounded-full" />
            <Skeleton className="h-10 w-64 max-w-full rounded-3xl" />
            <Skeleton className="h-4 w-96 max-w-full rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <div className="status-chip">
              <span className="status-dot bg-[var(--accent-success)]" />
              Preparing workspace
            </div>
            <Skeleton className="h-12 w-28 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel-surface rounded-[28px] p-6">
          <Skeleton className="h-5 w-40 rounded-full" />
          <Skeleton className="mt-6 h-72 rounded-[24px]" />
        </div>
        <div className="panel-surface rounded-[28px] p-6">
          <Skeleton className="h-5 w-40 rounded-full" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20 rounded-[20px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapPanelSkeleton() {
  return (
    <section className="panel-surface rounded-[28px] p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full rounded-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      </div>
      <Skeleton className="mt-5 h-[420px] rounded-[24px]" />
    </section>
  );
}
