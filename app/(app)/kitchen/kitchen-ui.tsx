'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { StatusBadge, type Tone } from '@/components/app';
import { cn } from '@/lib/utils';
import { formatMoneyInput, parseMoney, paymentState, STAGE_LABELS, type KitchenJob, type KitchenStage } from '@/lib/kitchen-types';

export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 disabled:opacity-50 disabled:pointer-events-none';
export const btnSecondary = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border bg-card hover:bg-muted h-9 px-4 disabled:opacity-50 disabled:pointer-events-none';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground h-9 px-3 disabled:opacity-50';
export const btnDanger = 'inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 h-9 px-4 disabled:opacity-50';
export const inputClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60';
export const labelClass = 'text-xs font-medium text-muted-foreground';

/** Status colour only for real state: waiting to accept (warning), ready/completed (good), cancelled (danger). */
const STAGE_TONE: Record<KitchenStage, Tone> = {
  draft: 'neutral',
  quoted: 'neutral',
  new: 'warning',
  accepted: 'neutral',
  cooking: 'neutral',
  ready: 'good',
  completed: 'good',
  declined: 'neutral',
  expired: 'neutral',
  cancelled: 'danger',
};

const PAYMENT_TONE: Record<string, Tone> = {
  'No total': 'neutral',
  Paid: 'good',
  'Part paid': 'warning',
  Unpaid: 'warning',
};

export const stageTone = (stage: KitchenStage): Tone => STAGE_TONE[stage];

export function StageBadge({ stage }: { stage: KitchenStage }) {
  return <StatusBadge tone={STAGE_TONE[stage]}>{STAGE_LABELS[stage]}</StatusBadge>;
}

export function PaymentBadge({ job }: { job: Pick<KitchenJob, 'total' | 'paid'> }) {
  const s = paymentState(job);
  return <StatusBadge tone={PAYMENT_TONE[s.label] ?? 'neutral'}>{s.label}</StatusBadge>;
}

export function ErrorPanel({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-5">
      <p className="flex items-center gap-2 text-sm text-destructive"><AlertTriangle size={16} aria-hidden /> {message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="mt-2 rounded-md text-sm font-medium underline">Try again</button>}
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
        className={cn(inputClass, 'tabular-nums', suffix && (suffix.length > 4 ? 'pr-24' : 'pr-9'))}
        value={value == null || Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-muted-foreground">{suffix}</span>}
    </div>
  );
}

/**
 * A field in a repeated row (dish, item, cost line). Every control gets a full label such as
 * "Item 2 qty"; the short column label shows on the first row (and on every row when rows stack on phones).
 */
export function RowField({ index, noun, label, htmlFor, children, stacked = false, className }: {
  index: number; noun: string; label: string; htmlFor: string; children: ReactNode; stacked?: boolean; className?: string;
}) {
  const visible = index === 0 ? '' : stacked ? 'sm:sr-only' : 'sr-only';
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className={cn(labelClass, 'block', visible)}>
        <span className="sr-only">{noun} {index + 1} </span>
        {label}
      </label>
      {children}
    </div>
  );
}

