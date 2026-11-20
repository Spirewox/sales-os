'use client';

import { ArrowRightLeft, ArrowUpRight, Package, RefreshCw, SlidersHorizontal, Pencil } from 'lucide-react';
import type { InventoryItem } from '@/types';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { formatCount, formatDate, formatMoney } from '@/lib/format';
import { formatInventoryStockDisplay, formatStockQuantity } from '@/lib/format-carton-stock';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { SkuPhoto } from '@/components/product-image-editor';
import { SkuMultiSelect } from '@/components/sku-multi-select';
import { FilterSelect } from '@/components/filter-select';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, MoreFilterField, OverflowMenu, RowAction, StatusBadge,
  type Column, type FilterChip,
} from '@/components/app';
import { cn } from '@/lib/utils';
import { expiryTone, getExpiryLabel, marginPct, sellingPriceForMargin, stockState } from './inventory-utils';
import type { StockView } from './use-stock-view';
import { SalesTrendsSection } from './sales-trends';

export type StockActions = {
  open: (item: InventoryItem) => void;
  purchase?: (item: InventoryItem) => void;
  transfer?: (item: InventoryItem) => void;
  adjust?: (item: InventoryItem) => void;
  edit?: (item: InventoryItem) => void;
  bulkUpdate?: (items: InventoryItem[]) => void;
};

const STOCK_LABEL = { low: 'Low stock', out: 'Out of stock', expiring: 'Expiring in 30 days' } as const;

/** Stock tab: attention strip, one-row filters, the stock table, then collapsed sales trends. */
export function StockTab({ hubScope, view, loading, pendingRequests, needsActionCount, actions }: Readonly<{
  hubScope: HubScopeFilter;
  view: StockView;
  loading: boolean;
  pendingRequests: number;
  needsActionCount: number;
  actions: StockActions;
}>) {
  const { counts, stockFilter, filteredItems, nextExpiryByItem, expiringByItem } = view;

  const columns: Column<InventoryItem>[] = [
    {
      id: 'product', header: 'Product', mobile: 'title',
      cell: (i) => (
        <span className="flex items-center gap-2.5">
          <SkuPhoto url={i.imageUrl} className="hidden h-8 w-8 md:inline-grid" />
          <span className="min-w-0">
            <span className="block">{i.name}</span>
            <span className="block font-mono text-xs font-normal text-muted-foreground">{i.sku}</span>
          </span>
        </span>
      ),
      sortValue: (i) => i.name.toLowerCase(),
    },
    { id: 'location', header: 'Location', mobile: 'subtitle', hideBelow: 'lg', cell: (i) => <span className="text-muted-foreground">{i.location}</span>, sortValue: (i) => i.location },
    {
      id: 'onhand', header: 'On hand', mobile: 'value', align: 'right',
      cell: (i) => {
        const s = stockState(i);
        return (
          <span className="inline-flex flex-col items-end">
            <span className={cn('font-medium', s === 'Out' ? 'text-destructive' : s === 'Low' ? 'text-warning' : '')}>{formatInventoryStockDisplay(i)}</span>
            <span className="text-xs font-normal text-muted-foreground">min {formatStockQuantity(i.minStockLevel, i.unitOfMeasure)}</span>
          </span>
        );
      },
      sortValue: (i) => (i.minStockLevel > 0 ? i.currentStock / i.minStockLevel : i.currentStock),
    },
    {
      id: 'status', header: 'Status', mobile: 'meta',
      cell: (i) => <StatusBadge domain="stock" status={stockState(i)} />,
      sortValue: (i) => ['Out', 'Low', 'In stock'].indexOf(stockState(i)),
    },
    {
      id: 'expiry', header: 'Next expiry', mobile: 'meta',
      cell: (i) => {
        const next = nextExpiryByItem.get(i.id);
        if (!next) return <span className="hidden text-muted-foreground md:inline">-</span>;
        const tone = expiryTone(next);
        const batches = expiringByItem.get(i.id)?.length ?? 0;
        return (
          <span className="inline-flex flex-col gap-0.5">
            {tone === 'neutral' ? <span>{formatDate(next)}</span> : <StatusBadge tone={tone}>{getExpiryLabel(next)}</StatusBadge>}
            {batches > 1 && <span className="text-xs text-muted-foreground">{batches} batches due</span>}
          </span>
        );
      },
      sortValue: (i) => nextExpiryByItem.get(i.id) ?? null,
    },
    { id: 'cost', header: 'Avg cost', align: 'right', hideBelow: 'xl', cell: (i) => formatMoney(i.avgUnitCost), sortValue: (i) => i.avgUnitCost },
    { id: 'price', header: 'Price', align: 'right', hideBelow: 'xl', cell: (i) => formatMoney(sellingPriceForMargin(i)), sortValue: (i) => sellingPriceForMargin(i) },
    {
      id: 'margin', header: 'Margin', align: 'right', hideBelow: 'lg',
      cell: (i) => {
        const m = marginPct(i);
        return <span className={m < 0 ? 'text-destructive' : m < 15 ? 'text-warning' : ''}>{m.toFixed(1)}%</span>;
      },
      sortValue: (i) => marginPct(i),
    },
    { id: 'value', header: 'Value', align: 'right', mobile: 'meta', cell: (i) => <span className="font-medium">{formatMoney(i.currentStock * i.avgUnitCost)}</span>, sortValue: (i) => i.currentStock * i.avgUnitCost },
  ];

  const rowActions = (i: InventoryItem) => (
    <>
      {actions.purchase && <RowAction onClick={() => actions.purchase!(i)}><ArrowUpRight aria-hidden /> Purchase</RowAction>}
      {actions.transfer && <RowAction onClick={() => actions.transfer!(i)}><ArrowRightLeft aria-hidden /> Transfer</RowAction>}
      <OverflowMenu
        size="sm"
        label={`More actions for ${i.name}`}
        items={[
          { label: 'Adjust stock', icon: <SlidersHorizontal />, onSelect: () => actions.adjust?.(i), hidden: !actions.adjust },
          { label: 'Edit product', icon: <Pencil />, onSelect: () => actions.edit?.(i), hidden: !actions.edit },
        ]}
      />
    </>
  );

  const categoryOptions = [{ value: 'All', label: 'All categories' }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))];
  const chips: FilterChip[] = [
    ...(stockFilter ? [{ key: 'stock', label: STOCK_LABEL[stockFilter], onRemove: view.clearStockFilter }] : []),
    ...(view.category !== 'All' ? [{ key: 'category', label: view.category, onRemove: () => view.setCategory('All') }] : []),
    ...(view.skuIds.length ? [{ key: 'sku', label: `${view.skuIds.length} SKU${view.skuIds.length === 1 ? '' : 's'}`, onRemove: () => view.setSkuIds([]) }] : []),
    ...(view.urlSearch ? [{ key: 'q', label: `"${view.urlSearch}"`, onRemove: () => { view.setSearch(''); } }] : []),
  ];
  const showLoading = loading && filteredItems.length === 0;

  return (
    <div className="space-y-4">
      <KpiStrip
        label="Needs attention"
        loading={showLoading}
        cells={[
          { label: 'Low stock', value: formatCount(counts.low), detail: 'At or below minimum', tone: counts.low ? 'warning' : 'default', onClick: () => view.toggleStockFilter('low'), active: stockFilter === 'low' },
          { label: 'Out of stock', value: formatCount(counts.out), detail: 'Nothing on hand', tone: counts.out ? 'danger' : 'default', onClick: () => view.toggleStockFilter('out'), active: stockFilter === 'out' },
          {
            label: 'Expiring in 30 days', value: formatCount(counts.expiring),
            detail: counts.expiringBatches ? `${formatCount(counts.expiringBatches)} batches, incl. expired` : 'No batches due',
            tone: counts.expiring ? 'warning' : 'default', onClick: () => view.toggleStockFilter('expiring'), active: stockFilter === 'expiring',
          },
          {
            label: 'Pending requests', value: formatCount(pendingRequests),
            detail: needsActionCount ? `${formatCount(needsActionCount)} need your action` : 'Open the requests tab',
            tone: needsActionCount ? 'warning' : 'default', href: '/inventory?tab=requests',
          },
        ]}
      />

      <FilterBar
        search={{ value: view.search, onChange: view.setSearch, placeholder: 'Search product or SKU', label: 'Search stock' }}
        filters={
          <>
            <LocationSelect scope={hubScope} />
            <FilterSelect ariaLabel="Category" value={view.category} onChange={view.setCategory} className="h-9 w-auto min-w-40 data-[size=default]:h-9" options={categoryOptions} />
          </>
        }
        more={
          <MoreFilterField label="SKU">
            <SkuMultiSelect inline options={view.skuOptions} selectedIds={view.skuIds} onChange={view.setSkuIds} />
          </MoreFilterField>
        }
        moreActiveCount={view.skuIds.length ? 1 : 0}
        chips={chips}
        onClearAll={view.clearAll}
        resultLabel={showLoading ? undefined : `${formatCount(filteredItems.length)} ${filteredItems.length === 1 ? 'product' : 'products'}`}
      />

      <DataTable
        key={[hubScope.filterHub, stockFilter, view.category, view.urlSearch, view.skuIds.join(',')].join('|')}
        label="Stock"
        // Kit gap: the sr-only "Actions" header is absolute; a positioned table keeps it clipped (no page scroll).
        className="relative"
        columns={columns}
        rows={showLoading ? undefined : filteredItems}
        loading={loading}
        getRowId={(i) => i.id}
        onRowClick={actions.open}
        rowActions={rowActions}
        pageSize={20}
        rowClassName={(i) => (stockState(i) === 'Out' ? 'bg-destructive/[0.03]' : undefined)}
        bulkActions={actions.bulkUpdate ? (selected, clear) => (
          <button
            type="button"
            onClick={() => { actions.bulkUpdate!(selected); clear(); }}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RefreshCw size={14} aria-hidden /> Update stock
          </button>
        ) : undefined}
        empty={
          <EmptyState
            size="compact"
            icon={<Package />}
            title={chips.length ? 'No products match' : 'No products yet'}
            description={chips.length ? `Nothing matches ${chips.map((c) => c.label).join(', ')}.` : 'Create a SKU to start tracking stock in this location.'}
            action={chips.length ? <button type="button" onClick={view.clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
          />
        }
      />

      <SalesTrendsSection hubId={hubScope.hubIdForApi} />
    </div>
  );
}
