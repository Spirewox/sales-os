'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackagePlus, Phone } from 'lucide-react';
import { DataTable, EmptyState, RowAction, SectionTabs, StatusBadge, type Column, type SectionTab } from '@/components/app';
import { usePermissions } from '@/hooks/use-permissions';
import { formatCount, formatDate, formatMoney, plural } from '@/lib/format';
import type { AttentionData, OverdueRow, StockRow, TicketRow } from './use-attention-data';
import { PanelLink } from './panel';

type TabId = 'overdue' | 'stock' | 'tickets';

const PAGE_SIZE = 6;

/** Full-width action list: who to chase, what to restock, which tickets are open. */
export function NeedsAttention({ data, ticketsLoading }: Readonly<{ data: AttentionData; ticketsLoading: boolean }>) {
  const router = useRouter();
  const { can } = usePermissions();
  const [picked, setPicked] = useState<TabId | null>(null);
  const { overdue, stock, tickets } = data;

  // Until the user picks a tab, open the first one that has something in it.
  const auto: TabId = overdue.length > 0 ? 'overdue' : stock.length > 0 ? 'stock' : tickets.length > 0 ? 'tickets' : 'overdue';
  const tab = picked ?? auto;

  const tabs: SectionTab<TabId>[] = [
    { id: 'overdue', label: 'Overdue credit', count: overdue.length, countTone: 'danger' },
    { id: 'stock', label: 'Low stock', count: stock.length, countTone: data.outOfStock > 0 ? 'danger' : 'warning' },
    { id: 'tickets', label: 'Open tickets', count: tickets.length, countTone: 'neutral' },
  ];

  const viewAll =
    tab === 'overdue' ? (can('credits.view') ? { href: '/credits?overdue=1', label: 'All overdue' } : null)
      : tab === 'stock' ? (can('inventory.view') ? { href: '/inventory?stock=low', label: 'Inventory' } : null)
        : can('interactions.view') ? { href: '/engagement?tab=interactions', label: 'All tickets' } : null;

  return (
    <section aria-labelledby="attention-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-title" className="text-sm font-semibold">Needs attention</h2>
        {viewAll && <PanelLink href={viewAll.href}>{viewAll.label}</PanelLink>}
      </div>
      <SectionTabs label="Needs attention" tabs={tabs} value={tab} onChange={setPicked} />

      {tab === 'overdue' && (
        <DataTable<OverdueRow>
          label="Overdue credit"
          rows={overdue}
          getRowId={(r) => r.customerId}
          loading={data.creditsLoading}
          pageSize={PAGE_SIZE}
          onRowClick={can('credits.view') ? (r) => router.push(`/credits?customer=${r.customerId}`) : undefined}
          rowActions={(r) => (r.phoneNumber ? <RowAction href={`tel:${r.phoneNumber}`}><Phone aria-hidden /> Call</RowAction> : null)}
          columns={overdueColumns}
          empty={<EmptyState size="compact" title="No overdue credit" description="Customers whose credit passes its due date show up here." />}
        />
      )}

      {tab === 'stock' && (
        <DataTable<StockRow>
          label="Low stock"
          rows={stock}
          getRowId={(r) => r.id}
          loading={data.stockLoading}
          pageSize={PAGE_SIZE}
          onRowClick={can('inventory.view') ? (r) => router.push(`/inventory?product=${r.id}`) : undefined}
          rowActions={can('inventory.adjust_stock') ? (r) => (
            <RowAction onClick={() => router.push(`/inventory?product=${r.id}`)}><PackagePlus aria-hidden /> Restock</RowAction>
          ) : undefined}
          columns={stockColumns}
          empty={<EmptyState size="compact" title="Stock is healthy" description="Every product is above its minimum level." />}
        />
      )}

      {tab === 'tickets' && (
        <DataTable<TicketRow>
          label="Open tickets"
          rows={tickets}
          getRowId={(r) => r.id}
          loading={ticketsLoading}
          pageSize={PAGE_SIZE}
          onRowClick={can('interactions.view') ? () => router.push('/engagement?tab=interactions') : undefined}
          columns={ticketColumns}
          empty={<EmptyState size="compact" title="No open tickets" description="Open feedback and enquiries show up here." />}
        />
      )}
    </section>
  );
}

const overdueColumns: Column<OverdueRow>[] = [
  { id: 'customer', header: 'Customer', mobile: 'title', cell: (r) => r.customerName, sortValue: (r) => r.customerName.toLowerCase() },
  { id: 'credits', header: 'Overdue credits', mobile: 'subtitle', cell: (r) => plural(r.overdueCount, 'overdue credit'), sortValue: (r) => r.overdueCount, hideBelow: 'lg' },
  { id: 'due', header: 'Oldest due', mobile: 'meta', cell: (r) => (r.oldestDueDate ? `Due ${formatDate(r.oldestDueDate)}` : 'No due date'), sortValue: (r) => r.oldestDueDate ?? '' },
  { id: 'owed', header: 'Owed in total', align: 'right', mobile: 'meta', cell: (r) => <span className="text-muted-foreground">{formatMoney(r.totalOutstanding)} owed</span>, sortValue: (r) => r.totalOutstanding, hideBelow: 'lg' },
  { id: 'overdue', header: 'Overdue', align: 'right', mobile: 'value', cell: (r) => <span className="font-medium text-destructive">{formatMoney(r.overdue)}</span>, sortValue: (r) => r.overdue },
];

const stockColumns: Column<StockRow>[] = [
  { id: 'name', header: 'Product', mobile: 'title', cell: (r) => r.name, sortValue: (r) => r.name.toLowerCase() },
  { id: 'location', header: 'Location', mobile: 'subtitle', cell: (r) => r.location || '-', hideBelow: 'lg' },
  { id: 'left', header: 'In stock', align: 'right', mobile: 'meta', cell: (r) => `${formatCount(r.currentStock)} ${r.unitOfMeasure.toLowerCase()}, min ${formatCount(r.minStockLevel)}`, sortValue: (r) => r.currentStock },
  { id: 'status', header: 'Status', align: 'right', mobile: 'value', cell: (r) => <StatusBadge domain="stock" status={r.out ? 'Out' : 'Low'} /> },
];

const ticketColumns: Column<TicketRow>[] = [
  { id: 'who', header: 'From', mobile: 'title', cell: (r) => r.who || 'Unknown', sortValue: (r) => r.who.toLowerCase() },
  { id: 'summary', header: 'About', mobile: 'subtitle', cell: (r) => <span className="line-clamp-1 max-w-md text-muted-foreground" title={r.summary}>{r.summary}</span> },
  { id: 'kind', header: 'Type', mobile: 'meta', cell: (r) => (r.detail ? `${r.kind}, ${r.detail}` : r.kind) },
  { id: 'date', header: 'Opened', align: 'right', mobile: 'value', cell: (r) => formatDate(r.date, { day: 'numeric', month: 'short' }), sortValue: (r) => r.date },
];
