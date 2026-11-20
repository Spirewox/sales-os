'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, BarChart4, Truck } from 'lucide-react';
import { InventoryItem, StockMovementType } from '@/types';
import { useProductSalesPerformance, useProductSuppliers, useStockLogs } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import { formatStockLogReference } from '@/lib/format-carton-stock';
import { EmptyState, StatusBadge } from '@/components/app';
import { cn } from '@/lib/utils';
import { fmtMoney } from './inventory-utils';

type ProductSupplier = NonNullable<ReturnType<typeof useProductSuppliers>['data']>[number];

const Stat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'warning' }) => (
  <div className="rounded-lg border px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={cn('text-lg font-semibold tracking-tight tabular-nums', tone === 'warning' && 'text-warning')}>{value}</p>
  </div>
);

export function SuppliersPanel({ item, suppliers }: Readonly<{ item: InventoryItem; suppliers: ProductSupplier[] }>) {
  const cheapest = suppliers.length ? Math.min(...suppliers.map((s) => s.lastPrice)) : 0;
  if (suppliers.length === 0) {
    return <EmptyState size="compact" icon={<Truck />} title="No supplier purchases yet" description="Purchases recorded with a supplier appear here." />;
  }
  return (
    <div className="space-y-2">
      <ul className="divide-y rounded-xl border">
        {suppliers.map((s) => {
          const isCheapest = Math.abs(s.lastPrice - cheapest) < 0.01;
          const name = s.supplierId
            ? <Link href={`/suppliers?open=${s.supplierId}`} className="font-medium hover:text-primary hover:underline">{s.name}</Link>
            : <span className="font-medium">{s.name}</span>;
          return (
            <li key={s.supplierId || s.name} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5">
                  {name}
                  {isCheapest && suppliers.length > 1 && <StatusBadge tone="good">Cheapest</StatusBadge>}
                  {s.rating != null && <span className="text-xs text-muted-foreground tabular-nums">Rating {s.rating}</span>}
                  {s.openIssues > 0 && <StatusBadge tone="danger">{s.openIssues} open issue{s.openIssues !== 1 ? 's' : ''}</StatusBadge>}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.orders} order{s.orders !== 1 ? 's' : ''}, {s.qty} {item.unitOfMeasure} bought, last {formatDate(s.lastDate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums">{formatMoney(s.lastPrice)}<span className="text-xs font-normal text-muted-foreground">/{item.unitOfMeasure}</span></p>
                <p className="text-xs text-muted-foreground tabular-nums">Spend {formatMoney(s.spend)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">Open a supplier for its order history and issues.</p>
    </div>
  );
}

export function SalesPanel({ item, suppliers }: Readonly<{ item: InventoryItem; suppliers: ProductSupplier[] }>) {
  const { data: perf, isLoading } = useProductSalesPerformance(item.id);
  if (isLoading) return <p role="status" className="text-sm text-muted-foreground">Loading sales…</p>;
  if (!perf?.hasData) return <EmptyState size="compact" icon={<BarChart4 />} title="No sales yet" description="Retail sales of this product appear here." />;

  const lowCover = perf.daysOfCover != null && perf.daysOfCover < 21;
  const tot = perf.b2bRev + perf.b2cRev;
  const b2bPct = tot > 0 ? Math.round((perf.b2bRev / tot) * 100) : 0;
  const maxTrend = Math.max(...perf.trend.map((t) => t.amount)) || 1;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Units sold" value={<>{perf.units} <span className="text-xs font-medium text-muted-foreground">{item.unitOfMeasure}</span></>} />
        <Stat label="Revenue" value={formatMoney(perf.revenue)} />
        <Stat label="Gross profit" value={<>{formatMoney(perf.profit)} <span className="text-xs font-medium text-muted-foreground">{perf.margin.toFixed(0)}%</span></>} />
        <Stat label="Sales count" value={perf.orders} />
        <Stat label="Sell velocity" value={<>≈{Math.round(perf.unitsPerMonth)} <span className="text-xs font-medium text-muted-foreground">{item.unitOfMeasure}/mo</span></>} />
        <Stat label="Days of cover" value={perf.daysOfCover != null ? `≈${perf.daysOfCover}d` : '-'} tone={lowCover ? 'warning' : undefined} />
      </div>
      {lowCover && suppliers[0] && <p className="text-xs text-warning">Reorder soon, via {suppliers[0].name}.</p>}

      {tot > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Buyer mix</h4>
          <div className="flex h-6 w-full overflow-hidden rounded-md border text-xs font-medium tabular-nums">
            {b2bPct > 0 && <div className="flex items-center justify-center bg-series-1 text-white dark:text-[#06140b]" style={{ width: `${b2bPct}%` }}>{b2bPct >= 12 ? `B2B ${b2bPct}%` : ''}</div>}
            {100 - b2bPct > 0 && <div className="flex items-center justify-center bg-series-2 text-white dark:text-[#1a0610]" style={{ width: `${100 - b2bPct}%` }}>{100 - b2bPct >= 12 ? `B2C ${100 - b2bPct}%` : ''}</div>}
          </div>
        </div>
      )}

      {perf.topSegments.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Bought most by (segments)</h4>
          <div className="flex flex-wrap gap-1.5">
            {perf.topSegments.map((s) => (
              <span key={s.name} className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
                {s.name} <span className="text-muted-foreground tabular-nums">{s.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {perf.trend.length > 1 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Monthly revenue</h4>
          <div className="space-y-1.5">
            {perf.trend.map((t) => (
              <div key={t.month} className="flex items-center gap-2">
                <span className="w-10 shrink-0 text-xs text-muted-foreground">{t.month}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-chart-1" style={{ width: `${Math.max(3, (t.amount / maxTrend) * 100)}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-xs font-medium tabular-nums">{formatMoney(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-medium text-muted-foreground">Top buyers ({perf.byCustomer.length})</h4>
        <ul className="divide-y rounded-xl border">
          {perf.byCustomer.slice(0, 6).map((c) => {
            const share = perf.revenue > 0 ? Math.round((c.revenue / perf.revenue) * 100) : 0;
            return (
              <li key={`${c.id || c.name}-${c.last}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  {c.id ? (
                    <Link href={`/customers?customer=${c.id}`} className="block truncate font-medium hover:text-primary hover:underline">{c.name}</Link>
                  ) : (
                    <span className="block truncate font-medium">{c.name}</span>
                  )}
                  <span className="text-xs text-muted-foreground">{[c.type, c.topSegment].filter(Boolean).join(', ')}</span>
                </div>
                <div className="shrink-0 text-right text-xs tabular-nums">
                  <p><span className="font-semibold">{formatMoney(c.revenue)}</span><span className="text-muted-foreground">, {share}%</span></p>
                  <p className="text-muted-foreground">{c.qty} {item.unitOfMeasure}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PricePanel({ item }: Readonly<{ item: InventoryItem }>) {
  const history = item.priceHistory ?? [];
  return (
    <div className="space-y-3">
      {history.length === 0 ? (
        <EmptyState size="compact" title="No price changes yet" description="Cost and price changes from purchases and edits appear here." />
      ) : (
        <ul className="divide-y rounded-xl border">
          {[...history].reverse().map((entry, idx) => {
            const margin = entry.price > 0 ? ((entry.price - entry.cost) / entry.price) * 100 : 0;
            return (
              <li key={idx} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{formatDate(entry.date)}</p>
                  <p className="tabular-nums">Cost <span className="font-semibold">₦{fmtMoney(entry.cost)}</span>, price <span className="font-semibold">₦{fmtMoney(entry.price)}</span></p>
                </div>
                <span className={cn('font-semibold tabular-nums', margin < 0 ? 'text-destructive' : margin < 15 ? 'text-warning' : 'text-muted-foreground')}>{margin.toFixed(1)}%</span>
              </li>
            );
          })}
        </ul>
      )}
      {item.priceVersion && <p className="text-xs text-muted-foreground">Last price update: {item.priceVersion}</p>}
    </div>
  );
}

const ACTIVITY_PAGE_SIZE = 30;

/** Item-scoped movements, loading more as the end scrolls into view. */
export function ActivityPanel({ item }: Readonly<{ item: InventoryItem }>) {
  const [limit, setLimit] = useState(ACTIVITY_PAGE_SIZE);
  const { data, isFetching } = useStockLogs({ item_id: item.id, limit });
  const meta = data?.meta;
  const logs = useMemo(() => [...(data?.data ?? [])].filter((l) => l.itemId === item.id).sort((a, b) => b.date.localeCompare(a.date)), [data, item.id]);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const inbound = logs.filter((l) => l.quantity > 0).reduce((a, c) => a + c.quantity, 0);
  const outbound = logs.filter((l) => l.quantity < 0).reduce((a, c) => a + Math.abs(c.quantity), 0);

  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node) return;
    // Implicit root: intersection is clipped by the drawer's scroll container.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (!meta?.hasMore || isFetching) return;
        setLimit((prev) => prev + ACTIVITY_PAGE_SIZE);
      },
      { rootMargin: '80px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [meta?.hasMore, isFetching, limit, logs.length]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        In <span className="font-semibold text-foreground tabular-nums">{inbound}</span>, out <span className="font-semibold text-foreground tabular-nums">{outbound}</span>.
        {' '}Showing {logs.length}{meta?.total != null ? ` of ${meta.total}` : ''} movements{meta?.hasMore ? ', scroll for more' : ''}.
      </p>
      {logs.length === 0 && !isFetching ? (
        <EmptyState size="compact" title="No activity yet" />
      ) : (
        <ul className="divide-y rounded-xl border">
          {logs.map((log) => {
            const desc = formatStockLogReference({ notes: log.notes, referenceId: log.referenceId });
            return (
              <li key={log.id} className="px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {log.quantity > 0 ? <ArrowUpRight size={14} className="text-muted-foreground" aria-hidden /> : <ArrowDownRight size={14} className="text-muted-foreground" aria-hidden />}
                    <span className="font-medium">{log.type.charAt(0) + log.type.slice(1).toLowerCase()}</span>
                    {log.batchNumber && <span className="font-mono text-xs text-muted-foreground">{log.batchNumber}</span>}
                  </span>
                  <span className="font-semibold tabular-nums">{log.quantity > 0 ? '+' : ''}{log.quantity}{log.uom ? ` ${log.uom}` : ''}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{formatDate(log.date)}</span>
                  <span className="tabular-nums">₦{fmtMoney(log.unitCost)}/unit</span>
                </div>
                {log.type === StockMovementType.TRANSFER && log.fromLocation && log.toLocation && (
                  <p className="mt-0.5 text-xs font-medium">{log.fromLocation} to {log.toLocation}</p>
                )}
                {log.supplier && <p className="mt-0.5 text-xs text-muted-foreground">Supplier: {log.supplier}</p>}
                {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <div ref={loadMoreRef} className="h-4" aria-hidden />
      {isFetching && <p className="py-2 text-center text-xs text-muted-foreground">Loading…</p>}
    </div>
  );
}
