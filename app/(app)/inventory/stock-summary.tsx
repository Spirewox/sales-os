'use client';

import { AlertCircle } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCount, formatMoney, formatMoneyShort, formatPercent } from '@/lib/format';
import { formatStockQuantity } from '@/lib/format-carton-stock';
import { KpiStrip, type KpiCell } from '@/components/app';
import { stockPosition } from './inventory-utils';

/**
 * The old "Inventory alert: N items critically low" banner: products at or below their minimum
 * (out of stock included), the first three by name, and a button that shows them.
 */
export function LowStockAlert({ items, location, active, onToggle }: Readonly<{
  items: InventoryItem[];
  location: string;
  active: boolean;
  onToggle: () => void;
}>) {
  if (items.length === 0) return null;
  const names = items.slice(0, 3).map((i) => i.name).join(', ');
  const more = items.length > 3 ? ` and ${formatCount(items.length - 3)} more` : '';
  return (
    <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 sm:flex-row sm:items-center">
      <AlertCircle size={18} aria-hidden className="hidden shrink-0 text-warning sm:block" />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {formatCount(items.length)} {items.length === 1 ? 'product is' : 'products are'} at or below minimum{location !== 'All' ? ` in ${location}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{names}{more}</p>
      </div>
      <button type="button" aria-pressed={active} onClick={onToggle} className="h-8 shrink-0 self-start rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted sm:self-auto">
        {active ? 'Show all products' : 'Show them'}
      </button>
    </div>
  );
}

/**
 * Value at cost, retail value (admins only, as before), product count and units on hand for the
 * products the filters show. These were the first cards on the old Inventory page.
 */
export function StockPositionStrip({ items, loading }: Readonly<{ items: InventoryItem[]; loading: boolean }>) {
  const { isAdmin } = usePermissions();
  const pos = stockPosition(items);
  const profit = pos.retail - pos.cost;
  const units = pos.uomBreakdown.slice(0, 3).map((u) => `${formatStockQuantity(u.qty, u.uom)} ${u.uom}`).join(', ');
  const cells: KpiCell[] = [
    { label: 'Stock value (cost)', value: formatMoneyShort(pos.cost), detail: formatMoney(pos.cost) },
    {
      label: 'Retail value', value: formatMoneyShort(pos.retail), hidden: !isAdmin,
      detail: `${formatMoneyShort(profit)} potential gross profit${pos.retail > 0 ? `, ${formatPercent((profit / pos.retail) * 100)}` : ''}`,
    },
    { label: 'Active products', value: formatCount(items.length), detail: `${formatCount(pos.categoryCount)} ${pos.categoryCount === 1 ? 'category' : 'categories'}` },
    { label: 'Units on hand', value: formatCount(pos.units), detail: units || 'Nothing on hand' },
  ];
  return <KpiStrip label="Stock position for the products shown" cells={cells} loading={loading} />;
}
