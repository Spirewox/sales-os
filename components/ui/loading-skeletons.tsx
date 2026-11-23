import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

type TableSkeletonProps = Readonly<{
  rows?: number;
  cols?: number;
  className?: string;
}>;

export function TableSkeleton({ rows = 6, cols = 5, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full space-y-3 p-4', className)} role="status" aria-busy="true" aria-label="Loading table">
      <div className="flex gap-3 border-b pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex items-center gap-3 py-1">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={`c-${r}-${c}`}
              className={cn('h-4 flex-1', c === 0 && 'max-w-[180px]', c === cols - 1 && 'max-w-[64px]')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type CardSkeletonProps = Readonly<{
  className?: string;
}>;

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', className)} aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

type ChartSkeletonProps = Readonly<{
  className?: string;
  height?: number;
}>;

export function ChartSkeleton({ className, height = 220 }: ChartSkeletonProps) {
  return (
    <div
      className={cn('rounded-xl border bg-card p-4 space-y-4', className)}
      role="status"
      aria-busy="true"
      aria-label="Loading chart"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 48, 68].map((h, i) => (
          <Skeleton key={`bar-${h}-${i}`} className="flex-1 rounded-t-md rounded-b-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

type PanelSkeletonProps = Readonly<{
  className?: string;
  label?: string;
}>;

export function PanelSkeleton({ className, label = 'Loading…' }: PanelSkeletonProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-4 py-12 px-6', className)}
      aria-busy="true"
      aria-label={label}
    >
      <div className="w-full max-w-sm space-y-3">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6 mx-auto" />
        <Skeleton className="h-3 w-2/3 mx-auto" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

type AnalyticsPageSkeletonProps = Readonly<{
  className?: string;
}>;

export function AnalyticsPageSkeleton({ className }: AnalyticsPageSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} role="status" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={`card-${i}`} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <ChartSkeleton height={180} />
    </div>
  );
}

type CreditSheetSkeletonProps = Readonly<{
  className?: string;
}>;

export function CreditSheetSkeleton({ className }: CreditSheetSkeletonProps) {
  return (
    <div className={cn('space-y-4 py-4', className)} role="status" aria-busy="true" aria-label="Loading credits">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={`credit-${i}`} className="rounded-lg border p-3 space-y-2">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
