'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, History } from 'lucide-react';
import { InventoryItem, StockLog, StockMovementType } from '@/types';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import { formatDate, formatMoney, formatCount } from '@/lib/format';
import { inPeriod, parsePeriod, periodLabel, periodRange, periodToParams } from '@/lib/period';
import { fetchStockLogs } from '@/hooks/use-queries';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, PeriodSelect, StatusBadge, type Column, type FilterChip,
} from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { MOVEMENT_EXPORT_COLUMNS } from '@/lib/exports/inventory';
import { filterLabels } from '@/lib/export';
import { expiryTone } from './inventory-utils';

const PAGE_SIZE = 25;

/** Stock ledger: in / out / net for the period and a paginated movement table. */
export function MovementsTab({ hubScope, items, logs, loading, onOpenProduct }: Readonly<{
  hubScope: HubScopeFilter;
  items: InventoryItem[];
  logs: StockLog[];
  loading: boolean;
  onOpenProduct: (id: string) => void;
}>) {
  const { get, set, params } = useUrlState();
  const period = parsePeriod(params, '30d');
  const rawType = get('type');
  const type = rawType && (Object.values(StockMovementType) as string[]).includes(rawType) ? (rawType as StockMovementType) : 'All';
  const urlSearch = get('mq') ?? '';
  const [search, setSearch] = useState(urlSearch);
  useEffect(() => {
    if (search === urlSearch) return;
    const t = setTimeout(() => set({ mq: search.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [search, urlSearch, set]);

  // One filter for the table and its export, so both hold the same movements.
  const selectLogs = useCallback((all: StockLog[]) => {
    let rows = all;
    if (hubScope.filterHub !== 'All') {
      const hub = hubScope.filterHub;
      const hubItemIds = new Set(items.filter((i) => i.location === hub).map((i) => i.id));
      rows = rows.filter((l) => hubItemIds.has(l.itemId) || l.fromLocation === hub || l.toLocation === hub);
    }
    rows = rows.filter((l) => inPeriod(l.date, period));
    if (type !== 'All') rows = rows.filter((l) => l.type === type);
    const q = urlSearch.trim().toLowerCase();
    if (q) rows = rows.filter((l) => l.itemName.toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q) || (l.batchNumber || '').toLowerCase().includes(q));
    return rows;
  }, [items, hubScope.filterHub, period, type, urlSearch]);
  const filteredLogs = useMemo(() => selectLogs(logs), [logs, selectLogs]);

  // The table shows the newest loaded movements; the export pages through every one in the period.
  const range = periodRange(period);
  const exportMovements = useExport({
    module: 'stock-movements', title: 'Stock movements',
    filters: () => filterLabels({ location: hubScope.filterHub, period: periodLabel(period), chips }),
    noun: { one: 'movement', many: 'movements' }, columns: MOVEMENT_EXPORT_COLUMNS,
    fetchPage: async (page, limit) => {
      const res = await fetchStockLogs({
        hub_id: hubScope.hubIdForApi, type: type === 'All' ? undefined : type,
        date_from: range.from ?? undefined, date_to: range.to ?? undefined, page, limit,
      });
      return { items: res.data, totalPages: res.meta.totalPages };
    },
    select: selectLogs,
    disabled: filteredLogs.length === 0,
  });

  const stats = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let inCount = 0;
    let outCount = 0;
    for (const log of filteredLogs) {
      const value = Math.abs(log.quantity) * log.unitCost;
      if (log.quantity > 0) { inbound += value; inCount += 1; } else { outbound += value; outCount += 1; }
    }
    return { inbound, outbound, net: inbound - outbound, inCount, outCount };
  }, [filteredLogs]);

  const columns: Column<StockLog>[] = [
    { id: 'date', header: 'Date', mobile: 'meta', cell: (l) => <span className="whitespace-nowrap">{formatDate(l.date)}</span>, sortValue: (l) => l.date },
    {
      id: 'product', header: 'Product', mobile: 'title',
      cell: (l) => <span>{l.itemName}{l.batchNumber && <span className="block text-xs font-normal text-muted-foreground">Batch {l.batchNumber}</span>}</span>,
      sortValue: (l) => l.itemName,
    },
    { id: 'type', header: 'Type', mobile: 'subtitle', cell: (l) => <StatusBadge tone="neutral">{l.type.charAt(0) + l.type.slice(1).toLowerCase()}</StatusBadge>, sortValue: (l) => l.type },
    {
      id: 'qty', header: 'Qty', align: 'right', mobile: 'value',
      cell: (l) => <span className="font-medium">{l.quantity > 0 ? '+' : ''}{l.quantity}</span>,
      sortValue: (l) => l.quantity,
    },
    { id: 'cost', header: 'Unit cost', align: 'right', hideBelow: 'lg', cell: (l) => formatMoney(l.unitCost), sortValue: (l) => l.unitCost },
    { id: 'value', header: 'Value', align: 'right', mobile: 'meta', cell: (l) => formatMoney(Math.abs(l.quantity) * l.unitCost), sortValue: (l) => Math.abs(l.quantity) * l.unitCost },
    {
      id: 'details', header: 'Details', hideBelow: 'xl', className: 'max-w-xs text-xs text-muted-foreground',
      cell: (l) => (
        <div className="space-y-0.5">
          {l.type === StockMovementType.TRANSFER && l.fromLocation && l.toLocation && (
            <p className="flex items-center gap-1 font-medium text-foreground">{l.fromLocation} <ArrowRightLeft size={12} aria-label="to" /> {l.toLocation}</p>
          )}
          {l.supplier && <p>Supplier: {l.supplier}</p>}
          {l.expiryDate && <StatusBadge tone={expiryTone(l.expiryDate)}>Expiry {formatDate(l.expiryDate)}</StatusBadge>}
          {l.notes && <p className="truncate">{l.notes}</p>}
        </div>
      ),
    },
  ];

  const chips: FilterChip[] = [
    ...(period.preset !== '30d' ? [{ key: 'period', label: periodLabel(period), onRemove: () => set(periodToParams({ preset: '30d' })) }] : []),
    ...(type !== 'All' ? [{ key: 'type', label: `Type: ${type.toLowerCase()}`, onRemove: () => set({ type: null }) }] : []),
    ...(urlSearch ? [{ key: 'mq', label: `"${urlSearch}"`, onRemove: () => { setSearch(''); set({ mq: null }); } }] : []),
  ];
  const clearAll = () => { setSearch(''); set({ mq: null, type: null, period: null, from: null, to: null }); };

  return (
    <div className="space-y-4">
      <KpiStrip
        label="Movement totals"
        loading={loading && logs.length === 0}
        cells={[
          { label: 'Stock in', value: formatMoney(stats.inbound), detail: `${formatCount(stats.inCount)} movements, at cost` },
          { label: 'Stock out', value: formatMoney(stats.outbound), detail: `${formatCount(stats.outCount)} movements, at cost` },
          { label: 'Net', value: `${stats.net >= 0 ? '+' : '-'}${formatMoney(Math.abs(stats.net))}`, detail: periodLabel(period) },
        ]}
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Search product, notes or batch', label: 'Search movements' }}
        filters={
          <>
            <LocationSelect scope={hubScope} />
            <PeriodSelect value={period} onChange={(p) => set(periodToParams(p))} />
            <FilterSelect
              ariaLabel="Movement type"
              value={type}
              onChange={(v) => set({ type: v === 'All' ? null : v })}
              className="h-9 w-auto min-w-36 data-[size=default]:h-9"
              options={[{ value: 'All', label: 'All types' }, ...Object.values(StockMovementType).map((t) => ({ value: t, label: t.charAt(0) + t.slice(1).toLowerCase() }))]}
            />
          </>
        }
        chips={chips}
        onClearAll={clearAll}
        resultLabel={loading && logs.length === 0 ? undefined : `${formatCount(filteredLogs.length)} ${filteredLogs.length === 1 ? 'movement' : 'movements'}`}
        trailing={exportMovements.menu}
      />
      <DataTable
        // DataTable keeps its page internally; remount on filter change so it starts at page 1.
        key={[hubScope.filterHub, period.preset, period.from, period.to, type, urlSearch].join('|')}
        label="Stock movements"
        columns={columns}
        rows={loading && logs.length === 0 ? undefined : filteredLogs}
        loading={loading}
        getRowId={(l) => l.id}
        onRowClick={(l) => onOpenProduct(l.itemId)}
        pageSize={PAGE_SIZE}
        defaultSort={{ id: 'date', dir: 'desc' }}
        empty={
          <EmptyState
            size="compact"
            icon={<History />}
            title="No stock movements"
            description={chips.length ? 'Nothing matches these filters.' : `No purchases, sales, transfers or adjustments in ${periodLabel(period).toLowerCase()}.`}
            action={chips.length ? <button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        }
      />
      <p className="text-xs text-muted-foreground">Shows the latest 200 movements for this location. Values are at unit cost.</p>
    </div>
  );
}
