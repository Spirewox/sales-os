'use client';

import Link from 'next/link';
import { ChevronRight, CreditCard } from 'lucide-react';
import type { SaleCreditRecord } from '@/types/credits';
import { formatDate, formatMoney, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, StatusBadge } from '@/components/app';
import { CreditGradeBadge, type creditGrade } from './customer-grades';

export function CustomerCreditTab({ grade, credits, outstanding, overdue, split, creditLink, canRecordPayment, loading }: Readonly<{
  /** From every credit record on file, cleared ones included (old drawer rule). */
  grade: ReturnType<typeof creditGrade>;
  credits: SaleCreditRecord[];
  outstanding: number;
  overdue: boolean;
  split: { cashCount: number; cashTotal: number; creditCount: number; creditTotal: number };
  creditLink: string;
  canRecordPayment: boolean;
  loading: boolean;
}>) {
  const breakdown = (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">How they pay</h3>
      <dl className="divide-y rounded-xl border text-sm">
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-muted-foreground">Paid at sale</dt>
          <dd className="tabular-nums"><span className="font-medium">{formatMoney(split.cashTotal)}</span> <span className="text-xs text-muted-foreground">({plural(split.cashCount, 'sale')})</span></dd>
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <dt className="text-muted-foreground">On credit</dt>
          <dd className="tabular-nums"><span className="font-medium">{formatMoney(split.creditTotal)}</span> <span className="text-xs text-muted-foreground">({plural(split.creditCount, 'sale')})</span></dd>
        </div>
      </dl>
    </section>
  );

  const gradeSection = (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted-foreground">Credit grade</h3>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-sm">
        <CreditGradeBadge grade={grade} />
        <span className="text-xs text-muted-foreground">
          {grade === 'N/A' ? 'No credit sales on record yet.' : grade === 'F' ? 'At least one credit item is overdue.' : 'Credit on record, nothing overdue.'}
        </span>
      </div>
    </section>
  );

  if (loading && credits.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Loading credit…</p>;

  if (credits.length === 0) {
    return (
      <div className="space-y-5">
        <EmptyState size="compact" icon={<CreditCard />} title="Nothing owed" description="This customer has no open credit." />
        {split.cashCount + split.creditCount > 0 && breakdown}
        {gradeSection}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4', overdue ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30')}>
        <div>
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={cn('text-2xl font-semibold tracking-tight tabular-nums', overdue && 'text-destructive')}>{formatMoney(outstanding)}</p>
          <p className="text-xs text-muted-foreground">{plural(credits.length, 'open item')}{overdue ? ', some overdue' : ''}</p>
        </div>
        <Link href={creditLink} className={cn('inline-flex h-9 items-center rounded-md px-3 text-sm font-medium', canRecordPayment ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border bg-background hover:bg-muted')}>
          {canRecordPayment ? 'Record payment' : 'Open in Credits'}
        </Link>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Open items</h3>
        <ul className="divide-y rounded-xl border">
          {credits.map((cr) => (
            <li key={cr.id}>
              <Link href={creditLink} className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{cr.sale?.productDetails || `Sale on ${formatDate(cr.sale?.date || cr.dateIssued)}`}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">Due {formatDate(cr.dueDate)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium tabular-nums">{formatMoney(cr.amountOwed)}</span>
                  <StatusBadge tone={cr.status === 'Overdue' ? 'danger' : 'warning'}>{cr.status}</StatusBadge>
                </div>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {gradeSection}
      {breakdown}
    </div>
  );
}
