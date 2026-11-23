'use client';

import Link from 'next/link';
import { CalendarClock, ChevronDown, ExternalLink, Flag, Loader2, Wallet } from 'lucide-react';
import type { SaleCreditRecord } from '@/types/credits';
import { StatusBadge } from '@/components/app';
import { cn } from '@/lib/utils';
import { creditProductLabel, creditTone, daysLate, fmt, formatDate, lateLabel } from './credit-utils';

type Props = {
  credit: SaleCreditRecord;
  expanded: boolean;
  onToggle: () => void;
  canRecordPayment: boolean;
  canExtend: boolean;
  onRecordPayment: () => void;
  onExtend: () => void;
  onFlag: () => void;
  flagging?: boolean;
};

const btn = 'inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5';

/** One credit item: summary row, inline Pay / Extend / Flag, and an expandable history. */
export function CreditItemCard({ credit, expanded, onToggle, canRecordPayment, canExtend, onRecordPayment, onExtend, onFlag, flagging = false }: Readonly<Props>) {
  const late = credit.status === 'Overdue' ? daysLate(credit.dueDate) : null;
  const paidSoFar = credit.originalAmount - credit.amountOwed;
  const paidPct = credit.originalAmount > 0 ? Math.round((paidSoFar / credit.originalAmount) * 100) : 0;
  const isOpen = credit.status !== 'Clear' && credit.status !== 'Voided';
  const detailsId = `credit-${credit.id}-details`;

  return (
    <li className={cn('overflow-hidden rounded-xl border bg-card', credit.status === 'Overdue' && 'border-destructive/40')}>
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">{creditProductLabel(credit)}</span>
            <StatusBadge tone={creditTone(credit.status)}>{credit.status}</StatusBadge>
            {credit.flagged && <StatusBadge tone="warning"><Flag size={12} aria-hidden /> Flagged</StatusBadge>}
            {credit.extensionCount > 0 && (
              <StatusBadge tone="neutral">{credit.extensionCount} extension{credit.extensionCount !== 1 ? 's' : ''}</StatusBadge>
            )}
          </div>
          <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tabular-nums text-muted-foreground">
            <span className={cn(late ? 'font-medium text-destructive' : undefined)}>
              Due {formatDate(credit.dueDate)}{late ? `, ${lateLabel(late)}` : ''}
            </span>
            <span>Sale {formatDate(credit.sale.date)}, {fmt(credit.sale.amount)}</span>
            {credit.sale.paymentMode && <span>{credit.sale.paymentMode}</span>}
            {(credit.sale.quantity != null || credit.sale.unit) && <span>{[credit.sale.quantity, credit.sale.unit].filter(Boolean).join(' ')}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn('text-base font-semibold tabular-nums', !isOpen && 'text-primary')}>{isOpen ? fmt(credit.amountOwed) : 'Cleared'}</p>
          {isOpen && credit.originalAmount > 0 && <p className="text-xs tabular-nums text-muted-foreground">{paidPct}% collected</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t px-4 py-2">
        {isOpen && canRecordPayment && (
          <button type="button" onClick={onRecordPayment} className={cn(btn, 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10')}>
            <Wallet aria-hidden /> Pay
          </button>
        )}
        {isOpen && canExtend && (
          <button type="button" onClick={onExtend} className={cn(btn, 'bg-background hover:bg-muted')}>
            <CalendarClock aria-hidden /> Extend
          </button>
        )}
        {isOpen && canRecordPayment && (
          <button type="button" onClick={onFlag} disabled={flagging} aria-pressed={!!credit.flagged} className={cn(btn, 'bg-background hover:bg-muted', credit.flagged && 'border-warning/50 text-warning')}>
            {flagging ? <Loader2 aria-hidden className="animate-spin" /> : <Flag aria-hidden />}
            {credit.flagged ? 'Remove flag' : 'Flag'}
          </button>
        )}
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-controls={detailsId} className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          {expanded ? 'Hide history' : 'History'}
          <ChevronDown size={14} aria-hidden className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>

      {expanded && (
        <div id={detailsId} className="space-y-4 border-t bg-muted/20 px-4 pt-3 pb-4">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-background p-2">
              <dt className="text-muted-foreground">Original credit</dt>
              <dd className="font-semibold tabular-nums">{fmt(credit.originalAmount)}</dd>
            </div>
            <div className="rounded-md border bg-background p-2">
              <dt className="text-muted-foreground">Collected</dt>
              <dd className="font-semibold tabular-nums">{fmt(paidSoFar)} ({paidPct}%)</dd>
            </div>
          </dl>

          {credit.sale.id && (
            <Link href={`/sales?sale=${encodeURIComponent(credit.sale.id)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View sale <ExternalLink size={12} aria-hidden />
            </Link>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Repayment history</p>
            {credit.payments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No repayments yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {[...credit.payments].reverse().map((p) => (
                  <li key={p.id} className="rounded-md border bg-background p-2 text-xs">
                    <p className="font-medium tabular-nums">{fmt(p.amount)}{p.method && ` via ${p.method}`}</p>
                    <p className="truncate tabular-nums text-muted-foreground">
                      {formatDate(p.date)}{p.recordedByName ? `, ${p.recordedByName}` : ''}, balance {fmt(p.balanceAfter)}
                    </p>
                    {p.note && <p className="truncate text-muted-foreground italic">{p.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {credit.dueDateExtensions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Extension trail</p>
              <ul className="space-y-2">
                {[...credit.dueDateExtensions].reverse().map((ext, i) => (
                  <li key={`${ext.extendedAt}-${i}`} className="rounded-md border bg-background p-2.5 text-xs">
                    <p className="font-medium">{formatDate(ext.previousDueDate)} → {formatDate(ext.newDueDate)}</p>
                    <p className="mt-0.5 text-muted-foreground">{formatDate(ext.extendedAt)}, {ext.extendedByName}</p>
                    {ext.reason && <p className="mt-1 text-muted-foreground italic">{ext.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
