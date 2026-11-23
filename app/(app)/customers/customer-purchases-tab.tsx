'use client';

import Link from 'next/link';
import { ChevronRight, CreditCard, ShoppingCart, Sparkles } from 'lucide-react';
import type { Sale } from '@/types';
import { formatDate, formatMoney, plural } from '@/lib/format';
import { cn } from '@/lib/utils';
import { EmptyState, StatusBadge, usePagedList } from '@/components/app';
import type { PurchaseAnalytics } from './customer-analytics';
import { saleHref } from './customer-links';

const REC_TONE = {
  good: 'border-primary/20 bg-primary/5',
  warn: 'border-warning/30 bg-warning/10',
  neutral: 'bg-muted/30',
};

export function CustomerPurchasesTab({ sales, analytics, topProducts, loading, recordSaleHref }: Readonly<{
  sales: Sale[];
  analytics: PurchaseAnalytics | null;
  topProducts: { itemName: string; uom: string; qty: number; revenue: number }[];
  loading: boolean;
  recordSaleHref?: string;
}>) {
  const { pageItems, pager } = usePagedList(sales, 'customer-purchases', 10);
  if (loading && sales.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Loading purchases…</p>;
  if (sales.length === 0 || !analytics) {
    return (
      <EmptyState
        size="compact"
        icon={<ShoppingCart />}
        title="No purchases yet"
        description="Sales recorded for this customer will appear here."
        action={recordSaleHref ? <Link href={recordSaleHref} className="text-sm font-medium text-primary hover:underline">Record sale</Link> : undefined}
      />
    );
  }
  const total = sales.reduce((a, s) => a + s.amount, 0);

  return (
    <div className="space-y-5">
      <div className={cn('flex items-start gap-2.5 rounded-xl border p-3', REC_TONE[analytics.rec.tone])}>
        <Sparkles size={16} aria-hidden className={cn('mt-0.5 shrink-0', analytics.rec.tone === 'good' ? 'text-primary' : analytics.rec.tone === 'warn' ? 'text-warning' : 'text-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">Suggested next step</p>
          <p className="text-sm font-medium leading-snug">{analytics.rec.text}</p>
          {(analytics.activity === 'At Risk' || analytics.activity === 'Dormant') && (
            <Link href={`/engagement?activity=${encodeURIComponent(analytics.activity)}`} className="mt-1.5 inline-flex text-xs font-medium text-primary hover:underline">
              View on engagement list
            </Link>
          )}
        </div>
      </div>

      {topProducts.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Most bought</h3>
          <ul className="divide-y rounded-xl border">
            {topProducts.slice(0, 5).map((p) => (
              <li key={p.itemName} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0 truncate font-medium">{p.itemName}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {p.qty}{p.uom ? ` ${p.uom}` : ''}, <span className="font-medium text-foreground">{formatMoney(p.revenue)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">All purchases</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{plural(sales.length, 'order')}, {formatMoney(total)}</span>
        </div>
        <div className="overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {pageItems.map((sale) => (
            <li key={sale.id}>
              <Link href={saleHref(sale.id)} className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <span className="truncate">{sale.productDetails || sale.item?.productName || 'Sale'}</span>
                    {sale.isCredit && <CreditCard size={14} aria-label="On credit" className="shrink-0 text-warning" />}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">{formatDate(sale.date)}{sale.channel ? `, ${sale.channel}` : ''}{sale.agentName ? `, ${sale.agentName}` : ''}{`, profit ${formatMoney(sale.profitAmount || 0)} (${sale.profitMargin || 0}%)`}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-medium tabular-nums">{formatMoney(sale.amount)}</span>
                  <StatusBadge domain="payment" status={sale.status} />
                </div>
                <ChevronRight size={16} aria-hidden className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
        {pager}
        </div>
      </section>
    </div>
  );
}
