'use client';

import { Segmented } from '@/components/app/segmented';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCount } from '@/lib/format';
import type { Period } from '@/lib/period';

/* Shared chart settings for every Analytics tab (rules: app/globals.css, docs/ui-ux-improvement-plan.md). */
export const AXIS_TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
/** Bar charts highlight the hovered band; CHART_TOOLTIP's default cursor suits line charts. */
export const BAR_CURSOR = { fill: 'var(--muted)', opacity: 0.4 };
export const LEGEND_STYLE = { fontSize: 12, color: 'var(--muted-foreground)' };

export type Grain = 'day' | 'week' | 'month';
export type GrainOption = [Grain, string];

/** Grains that make sense for the period: no "Monthly" for 7 days, nothing for a single day. */
export function grainOptions(period: Period, include: Grain[] = ['day', 'week', 'month']): GrainOption[] {
  const all: GrainOption[] = [['day', 'By day'], ['week', 'By week'], ['month', 'By month']];
  const allowed: Grain[] =
    period.preset === 'today' ? [] : period.preset === '7d' ? ['day'] : period.preset === '30d' || period.preset === 'month' ? ['day', 'week'] : ['day', 'week', 'month'];
  return all.filter(([g]) => allowed.includes(g) && include.includes(g));
}

/** The chosen grain if the period allows it, else the coarsest allowed one. */
export function effectiveGrain(chosen: Grain | null, options: GrainOption[], fallback: Grain): Grain {
  if (chosen && options.some(([g]) => g === chosen)) return chosen;
  return options.at(-1)?.[0] ?? fallback;
}

/** Percent change vs the previous period, or null when there is nothing to compare with. */
export function pctChange(current: number | undefined, previous: number | undefined): number | null {
  if (current == null || previous == null || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function Panel({ title, subtitle, control, children, className, bodyClassName }: Readonly<{ title: ReactNode; subtitle?: ReactNode; control?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }>) {
  return (
    <section className={cn('min-w-0 rounded-xl border bg-card', className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {control && <div className="flex shrink-0 items-center gap-2">{control}</div>}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small segmented toggle for a chart's metric or grain. Hidden when there's only one choice. */
export function Seg<T extends string>({ value, onChange, options, label }: Readonly<{ value: T; onChange: (v: T) => void; options: [T, string][]; label: string }>) {
  return <Segmented value={value} onChange={onChange} label={label} options={options.map(([id, text]) => ({ id, label: text }))} />;
}

export type RankedRow = {
  key: string;
  label: string;
  value: number;
  /** Secondary figure shown before the share, e.g. "12 orders". */
  detail?: ReactNode;
  /** Status colour for the bar (aging, risk); defaults to the chart-1 green. */
  barClass?: string;
  href?: string;
};

/**
 * Ranked bar list with share of total: the replacement for pie and donut charts.
 * One list, no legend. `showShare=false` for values that aren't parts of a whole (ratios).
 */
export function RankedBars({ rows, format, emptyText = 'No data for this period', showShare = true, limit }: Readonly<{ rows: RankedRow[]; format: (n: number) => string; emptyText?: string; showShare?: boolean; limit?: number }>) {
  if (rows.length === 0) return <ChartEmpty text={emptyText} />;
  const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="space-y-1">
      <ol className="space-y-3">
        {shown.map((r) => {
          const share = total > 0 ? Math.round((Math.max(0, r.value) / total) * 100) : 0;
          const label = r.href ? (
            <Link href={r.href} className="truncate font-medium hover:underline">{r.label}</Link>
          ) : (
            <span className="truncate font-medium">{r.label}</span>
          );
          return (
            <li key={r.key} className="space-y-1.5">
              <div className="flex items-baseline gap-3 text-sm">
                {label}
                <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">{r.detail}</span>
                <span className="shrink-0 font-semibold tabular-nums">{format(r.value)}</span>
                {showShare && <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{share}%</span>}
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div className={cn('h-full rounded-full', r.barClass ?? 'bg-chart-1')} style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      {limit && rows.length > limit && <p className="pt-2 text-xs text-muted-foreground">Top {limit} of {formatCount(rows.length)}</p>}
    </div>
  );
}

export function ChartEmpty({ text = 'No data for this period', className }: Readonly<{ text?: string; className?: string }>) {
  return <div className={cn('flex h-full min-h-32 items-center justify-center text-sm text-muted-foreground', className)}>{text}</div>;
}

/** One muted line saying where a tab's numbers come from and which ones ignore the period. */
export function SourceNote({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info size={14} className="mt-px shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** Main chart, then secondary charts two to a row, then the table: the shape of every tab. */
export function TabLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="space-y-5">{children}</div>;
}

export function TwoCol({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">{children}</div>;
}
