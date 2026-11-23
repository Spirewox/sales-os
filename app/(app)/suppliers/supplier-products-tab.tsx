'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Boxes, TrendingDown, TrendingUp } from 'lucide-react';
import { useStockLogs } from '@/hooks/use-queries';
import type { InventoryItem, StockLog } from '@/types';
import { formatMoney, plural } from '@/lib/format';
import { EmptyState, StatusBadge } from '@/components/app';
import { isPurchase, isSale } from './supplier-utils';

type Supplied = { itemId: string; itemName: string; totalQty: number; uom: string; lastPrice: number; lastDate: string; orders: number };

/**
 * What this supplier delivers, with their latest price against the cheapest supplier's, and how
 * much of it sold (sell-through) from recent sales.
 */
export function SupplierProductsTab({ purchases, inventory }: Readonly<{ purchases: StockLog[]; inventory: InventoryItem[] }>) {
  // Same query as the list page, so this is usually cached.
  const { data: allPurchases } = useStockLogs({ type: 'PURCHASE', limit: 500 });
  const { data: sales } = useStockLogs({ type: 'SALE', limit: 500 });

  const supplied = useMemo(() => {
    const map: Record<string, Supplied> = {};
    purchases.forEach((l) => {
      const e = map[l.itemId] || { itemId: l.itemId, itemName: l.itemName, totalQty: 0, uom: l.uom, lastPrice: l.unitCost, lastDate: l.date, orders: 0 };
      e.totalQty += Math.abs(l.quantity);
      e.orders += 1;
      if (l.date >= e.lastDate) { e.lastDate = l.date; e.lastPrice = l.unitCost; }
      map[l.itemId] = e;
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [purchases]);

  // Cheapest supplier's latest cost per item.
  const bestCost = useMemo(() => {
    const latest: Record<string, Record<string, { cost: number; date: string; name: string }>> = {};
    (allPurchases?.data ?? []).forEach((l) => {
      const who = l.supplierId || l.supplier;
      if (!who || !isPurchase(l)) return;
      const perItem = latest[l.itemId] || {};
      const cur = perItem[who];
      if (!cur || l.date >= cur.date) perItem[who] = { cost: l.unitCost, date: l.date, name: l.supplier || '' };
      latest[l.itemId] = perItem;
    });
    const best: Record<string, { cost: number; name: string }> = {};
    Object.entries(latest).forEach(([itemId, bySup]) => {
      const entries = Object.values(bySup);
      const min = entries.reduce((m, e) => (e.cost < m.cost ? e : m), entries[0]);
      best[itemId] = { cost: min.cost, name: min.name };
    });
    return best;
  }, [allPurchases]);

  const soldByItem = useMemo(() => {
    const map: Record<string, number> = {};
    (sales?.data ?? []).forEach((l) => {
      if (isSale(l)) map[l.itemId] = (map[l.itemId] || 0) + Math.abs(l.quantity);
    });
    return map;
  }, [sales]);

  if (supplied.length === 0) {
    return <EmptyState size="compact" icon={<Boxes />} title="No products yet" description="Products appear here once a purchase from this supplier is recorded." />;
  }

  return (
    <ul className="space-y-2">
      {supplied.map((p) => {
        const best = bestCost[p.itemId];
        const isCheapest = !!best && Math.abs(best.cost - p.lastPrice) < 0.01;
        const diffPct = best && best.cost > 0 ? Math.round(((p.lastPrice - best.cost) / best.cost) * 100) : 0;
        const item = inventory.find((i) => i.id === p.itemId);
        const sold = soldByItem[p.itemId] || 0;
        const sellThrough = p.totalQty ? Math.min(100, Math.round((sold / p.totalQty) * 100)) : 0;
        return (
          <li key={p.itemId} className="rounded-xl border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {p.itemId ? (
                  <Link href={`/inventory?product=${p.itemId}`} className="text-sm font-medium hover:text-primary hover:underline">{p.itemName}</Link>
                ) : (
                  <span className="text-sm font-medium">{p.itemName}</span>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{plural(p.orders, 'order')}</span>
                  <span>{p.totalQty} {p.uom} bought</span>
                  {sold > 0 && <span>{sellThrough}% sold</span>}
                  {item?.sku && <span className="font-mono">{item.sku}</span>}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <p className="text-sm font-semibold tabular-nums">{formatMoney(p.lastPrice)}<span className="text-xs font-normal text-muted-foreground">/{p.uom}</span></p>
                {isCheapest ? (
                  <StatusBadge tone="good"><TrendingDown size={12} aria-hidden /> Best price</StatusBadge>
                ) : diffPct > 0 ? (
                  <StatusBadge tone="warning"><TrendingUp size={12} aria-hidden /> +{diffPct}% vs best</StatusBadge>
                ) : null}
              </div>
            </div>
            {!isCheapest && best && (
              <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">Cheapest source: <span className="font-medium text-foreground">{best.name || '-'}</span> at {formatMoney(best.cost)}/{p.uom}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
