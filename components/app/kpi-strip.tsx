import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type KpiTone = 'default' | 'good' | 'warning' | 'danger';

export type KpiCell = {
  label: string;
  value: ReactNode;
  /** One line under the value: a count, a breakdown, the period. */
  detail?: ReactNode;
  tone?: KpiTone;
  /** Percent change vs the previous period; `goodWhen` sets which direction is green. */
  change?: { pct: number; goodWhen?: 'up' | 'down' | 'neutral'; label?: string } | null;
  /** A cell that filters the page: pass onClick and `active`. A cell that navigates: pass href. */
  onClick?: () => void;
  active?: boolean;
  href?: string;
  hidden?: boolean;
};

const TONE_TEXT: Record<KpiTone, string> = {
  default: 'text-foreground',
  good: 'text-primary',
  warning: 'text-warning',
  danger: 'text-destructive',
};

/**
 * Up to 4 numbers in one bordered strip. Each should either filter the page, link somewhere, or
 * carry a comparison. While loading, cells show skeletons, never "0".
 */
export function KpiStrip({ cells, loading, className, label = 'Key figures' }: Readonly<{ cells: KpiCell[]; loading?: boolean; className?: string; label?: string }>) {
  const visible = cells.filter((c) => !c.hidden);
  const n = visible.length;
  // Odd counts: the first cell spans the phone row so no empty divider cell shows.
  const cols =
    n >= 4 ? 'grid-cols-2 lg:grid-cols-4' : n === 3 ? 'grid-cols-2 sm:grid-cols-3 max-sm:[&>*:first-child]:col-span-2' : n === 1 ? 'grid-cols-1' : 'grid-cols-2';
  return (
    <section aria-label={label} className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      {/* gap-px over a border-coloured background draws the dividers at any column count */}
      <div className={cn('grid gap-px bg-border', cols)}>
        {visible.map((cell) => (
          <Cell key={cell.label} cell={cell} loading={loading} />
        ))}
      </div>
    </section>
  );
}

function Cell({ cell, loading }: Readonly<{ cell: KpiCell; loading?: boolean }>) {
  const body = (
    <>
      <span className="text-xs text-muted-foreground">{cell.label}</span>
      {loading ? (
        <>
          <Skeleton className="mt-1 h-7 w-24" />
          <Skeleton className="mt-1 h-3 w-16" />
        </>
      ) : (
        <>
          <span className={cn('truncate text-2xl font-semibold tracking-tight tabular-nums', TONE_TEXT[cell.tone ?? 'default'])}>{cell.value}</span>
          <span className="flex min-h-4 flex-wrap items-center gap-x-2 text-xs leading-snug text-muted-foreground">
            {cell.change && <Change change={cell.change} />}
            {cell.detail}
          </span>
        </>
      )}
    </>
  );
  const base = 'flex min-w-0 flex-col gap-1 bg-card px-5 py-4 text-left';
  const interactive = 'transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring';
  if (cell.href) return <Link href={cell.href} className={cn(base, interactive)}>{body}</Link>;
  if (cell.onClick)
    return (
      <button type="button" onClick={cell.onClick} aria-pressed={!!cell.active} className={cn(base, interactive, cell.active && 'bg-accent shadow-[inset_0_-2px_0_var(--primary)]')}>
        {body}
      </button>
    );
  return <div className={base}>{body}</div>;
}

function Change({ change }: Readonly<{ change: NonNullable<KpiCell['change']> }>) {
  if (!Number.isFinite(change.pct)) return null;
  const up = change.pct >= 0;
  const neutral = change.goodWhen === 'neutral';
  const good = (change.goodWhen ?? 'up') === 'up' ? up : !up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-medium tabular-nums', neutral ? 'text-foreground' : good ? 'text-primary' : 'text-destructive')}>
      <Icon size={12} aria-hidden />
      <span className="sr-only">{up ? 'Up' : 'Down'}</span>
      {Math.abs(change.pct).toFixed(Math.abs(change.pct) < 10 ? 1 : 0)}%
      <span className="font-normal text-muted-foreground">{change.label ?? 'vs previous'}</span>
    </span>
  );
}
