'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { MetricValue } from '@/components/ui/metric-value';
import { CardSkeleton } from '@/components/ui/loading-skeletons';
import { cn } from '@/lib/utils';
import { formatMoneyInput, parseMoney, paymentState, STAGE_BADGE, STAGE_LABELS, type KitchenJob, type KitchenStage } from '@/lib/kitchen-types';

export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none';
export const btnSecondary = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 disabled:opacity-50 disabled:pointer-events-none';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium hover:bg-accent h-9 px-3 disabled:opacity-50';
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 h-9 px-4 disabled:opacity-50';
export const inputClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60';
export const labelClass = 'text-xs font-medium text-muted-foreground';

export function StageBadge({ stage }: { stage: KitchenStage }) {
  return <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', STAGE_BADGE[stage])}>{STAGE_LABELS[stage]}</span>;
}

export function PaymentBadge({ job }: { job: Pick<KitchenJob, 'total' | 'paid'> }) {
  const s = paymentState(job);
  return <span className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', s.className)}>{s.label}</span>;
}

export function KpiCard({ label, value, icon, tone, hint }: { label: string; value: string | number; icon?: ReactNode; tone?: string; hint?: string }) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className={cn('mb-1 flex items-center gap-2', tone)}>
        {icon}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <MetricValue value={value} className="font-bold" />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function KpiRow({ loading, count, children }: { loading: boolean; count: number; children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {loading ? Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />) : children}
    </div>
  );
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-md border border-destructive/40 bg-card p-5">
      <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle size={15} /> {message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-2 text-sm font-semibold underline">Try again</button>}
    </div>
  );
}

export function Field({ label, htmlFor, children, hint, className }: { label: string; htmlFor?: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Naira input with thousand separators. */
export function MoneyInput({ id, value, onChange, placeholder = '0', disabled, className, ariaLabel }: {
  id?: string; value: number | null | undefined; onChange: (v: number) => void; placeholder?: string; disabled?: boolean; className?: string; ariaLabel?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₦</span>
      <input
        id={id}
        inputMode="decimal"
        aria-label={ariaLabel}
        className={cn(inputClass, 'pl-7 text-right tabular-nums')}
        value={formatMoneyInput(value)}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange(parseMoney(e.target.value))}
      />
    </div>
  );
}

export function NumberInput({ id, value, onChange, min = 0, step = 1, disabled, className, ariaLabel, suffix }: {
  id?: string; value: number | null | undefined; onChange: (v: number) => void; min?: number; step?: number; disabled?: boolean; className?: string; ariaLabel?: string; suffix?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        min={min}
        step={step}
        disabled={disabled}
        className={cn(inputClass, 'tabular-nums', suffix && 'pr-9')}
        value={value == null || Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

/** Small section nav pill group (POS style). */
export function PillTabs<T extends string>({ value, onChange, items, label }: { value: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            value === item.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50',
          )}
        >
          {item.label}
          {item.count !== undefined && <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return <tr><td colSpan={colSpan} className="p-12 text-center italic text-muted-foreground">{children}</td></tr>;
}

export const th = 'h-12 px-4 text-left font-medium text-muted-foreground';
export const thRight = 'h-12 px-4 text-right font-medium text-muted-foreground';
export const td = 'px-4 py-3';
