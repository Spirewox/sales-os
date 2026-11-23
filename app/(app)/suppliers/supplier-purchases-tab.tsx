'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FileText, ShoppingCart } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import type { InventoryItem, StockLog } from '@/types';
import { CHART_TOOLTIP, formatAxisMoney, formatDate, formatMoney, plural } from '@/lib/format';
import { EmptyState, usePagedList } from '@/components/app';
import { cn } from '@/lib/utils';
import { logValue } from './supplier-utils';

function Detail({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-medium">{children}</dd>
    </div>
  );
}

/** Purchase orders, newest first, with a monthly spend trend. Rows expand to batch, expiry and markup. */
export function SupplierPurchasesTab({ purchases, loading, inventory, agentName, action }: Readonly<{
  purchases: StockLog[];
  loading: boolean;
  inventory: InventoryItem[];
  agentName: (id?: string) => string;
  /** "Record purchase" for the empty state. */
  action?: React.ReactNode;
}>) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const sorted = useMemo(() => [...purchases].sort((a, b) => b.date.localeCompare(a.date)), [purchases]);
  const { pageItems, pager } = usePagedList(sorted, 'supplier-purchases', 10);
  const total = purchases.reduce((a, l) => a + logValue(l), 0);

  const trend = useMemo(() => {
    const byMonth: Record<string, number> = {};
    purchases.forEach((l) => {
      const m = l.date.substring(0, 7);
      byMonth[m] = (byMonth[m] || 0) + logValue(l);
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, amount]) => ({ month: new Date(`${m}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }), amount }));
  }, [purchases]);

  if (loading) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">Loading purchases…</p>;
  if (purchases.length === 0) {
    return <EmptyState size="compact" icon={<ShoppingCart />} title="No purchases yet" description="Purchases recorded against this supplier show up here." action={action} />;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Average order <span className="font-semibold text-foreground tabular-nums">{formatMoney(total / purchases.length)}</span>
        <span> across the {plural(purchases.length, 'order')} listed</span>
      </p>
      {trend.length > 1 && (
        <section aria-label="Monthly spend">
          <h3 className="mb-2 text-sm font-semibold">Monthly spend</h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs><linearGradient id="supSpendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} /><stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis width={56} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatAxisMoney(Number(v))} />
                <RechartsTooltip {...CHART_TOOLTIP} formatter={(value) => [formatMoney(Number(value)), 'Spent']} />
                <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" fill="url(#supSpendGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section aria-label="Purchase orders" className="overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {pageItems.map((l) => {
            const open = expanded === l.id;
            const qty = Math.abs(l.quantity);
            const item = inventory.find((i) => i.id === l.itemId);
            const markup = l.unitCost > 0 ? Math.round(((l.unitPrice - l.unitCost) / l.unitCost) * 100) : 0;
            const detailId = `purchase-${l.id}`;
            return (
              <li key={l.id}>
                <button type="button" aria-expanded={open} aria-controls={detailId} onClick={() => setExpanded(open ? null : l.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40', open && 'bg-muted/40')}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{l.itemName}</span>
                    <span className="block text-xs text-muted-foreground">{formatDate(l.date)} · {qty} {l.uom} at {formatMoney(l.unitCost)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{formatMoney(qty * l.unitCost)}</span>
                  <ChevronDown size={16} aria-hidden className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                </button>
                <div id={detailId} hidden={!open} className="border-t bg-muted/10 px-4 py-3">
                  <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                    <Detail label="Product">{l.itemId ? <Link href={`/inventory?product=${l.itemId}`} className="text-primary hover:underline">{item?.sku || 'Open product'}</Link> : '-'}</Detail>
                    <Detail label="Batch no.">{l.batchNumber || '-'}</Detail>
                    <Detail label="Expiry">{l.expiryDate ? formatDate(l.expiryDate) : '-'}</Detail>
                    <Detail label="Sell price">{formatMoney(l.unitPrice)}<span className="text-xs font-normal text-muted-foreground">/{l.uom}</span></Detail>
                    <Detail label="Markup"><span className={cn('tabular-nums', markup < 0 && 'text-destructive')}>{markup}%</span></Detail>
                    <Detail label="Recorded by">{agentName(l.agentId)}</Detail>
                  </dl>
                  {l.notes && (
                    <p className="mt-3 flex items-start gap-2 border-t pt-3 text-xs text-muted-foreground"><FileText size={14} aria-hidden className="mt-0.5 shrink-0" />{l.notes}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {pager}
        <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Total across {plural(purchases.length, 'order')}</span>
          <span className="font-semibold tabular-nums">{formatMoney(total)}</span>
        </div>
      </section>
    </div>
  );
}
