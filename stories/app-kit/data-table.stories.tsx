import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs';
import { Banknote, MessageCircle, Printer, Receipt } from 'lucide-react';
import { fn } from 'storybook/test';
import { DataTable, EmptyState, OverflowMenu, RowAction, StatusBadge, type Column, type SortState } from '@/components/app';
import { formatMoney } from '@/lib/format';

type Sale = {
  id: string;
  ref: string;
  date: string;
  customer: string;
  phone: string;
  items: string;
  category: string;
  hub: string;
  amount: number;
  status: 'Paid' | 'Partial' | 'Credit' | 'Overdue' | 'Voided';
};

const CUSTOMERS = ['Mama Put Kitchen', 'Chief Adebayo Stores', 'Halima Foods', 'Grace Catering', 'Bukka Hut Lekki', 'Iya Basira Canteen', 'Emeka Cold Room', 'Royal Suya Spot'];
const ITEMS = ['Whole chicken 1.2kg x 10', 'Croaker fish 1kg x 6', 'Rice 50kg x 2', 'Turkey wings 10kg', 'Chicken laps 10kg x 3', 'Titus fish carton'];
const CATS = ['Frozen poultry', 'Fish and seafood', 'Rice and grains'];
const HUBS = ['Ikeja', 'Lekki', 'Abuja Central', 'Ogba'];
const STATUSES: Sale['status'][] = ['Paid', 'Paid', 'Partial', 'Credit', 'Paid', 'Overdue', 'Paid', 'Voided'];

function makeSales(n: number): Sale[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `s${i + 1}`,
    ref: (0xa3f92 + i * 37).toString(16).toUpperCase(),
    date: new Date(Date.UTC(2026, 10, 23 - (i % 28))).toISOString().slice(0, 10),
    customer: CUSTOMERS[i % CUSTOMERS.length],
    phone: `+234 80${(31 + i) % 100} 555 ${String(1000 + i).slice(-4)}`,
    items: ITEMS[i % ITEMS.length],
    category: CATS[i % CATS.length],
    hub: HUBS[i % HUBS.length],
    amount: 12_500 + ((i * 7919) % 40) * 2_750,
    status: STATUSES[i % STATUSES.length],
  }));
}

const SALES = makeSales(12);
const MANY = makeSales(140);

const COLUMNS: Column<Sale>[] = [
  { id: 'date', header: 'Date', mobile: 'meta', sortValue: (s) => s.date, cell: (s) => <span className="whitespace-nowrap tabular-nums">{new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span> },
  { id: 'ref', header: 'Sale #', hideBelow: 'lg', cell: (s) => <span className="font-mono text-xs text-muted-foreground">#{s.ref}</span> },
  { id: 'customer', header: 'Customer', mobile: 'title', sortValue: (s) => s.customer, cell: (s) => s.customer },
  { id: 'items', header: 'Items', mobile: 'subtitle', className: 'max-w-[240px]', cell: (s) => <span className="block truncate" title={s.items}>{s.items}</span> },
  { id: 'category', header: 'Category', hideBelow: 'xl', cell: (s) => <span className="text-muted-foreground">{s.category}</span> },
  { id: 'hub', header: 'Hub', hideBelow: 'xl', cell: (s) => <span className="text-muted-foreground">{s.hub}</span> },
  { id: 'amount', header: 'Amount', align: 'right', mobile: 'value', sortValue: (s) => s.amount, cell: (s) => formatMoney(s.amount) },
  { id: 'status', header: 'Payment', mobile: 'meta', cell: (s) => <StatusBadge domain="payment" status={s.status} /> },
];

const rowActions = (s: Sale) => (
  <>
    {s.status !== 'Paid' && s.status !== 'Voided' && <RowAction tone="primary" onClick={fn()}><Banknote aria-hidden /> Record payment</RowAction>}
    <RowAction href={`https://wa.me/${s.phone.replace(/\D/g, '')}`} external ariaLabel={`WhatsApp ${s.customer}`}><MessageCircle aria-hidden /> WhatsApp</RowAction>
    <OverflowMenu size="sm" label={`More actions for sale #${s.ref}`} items={[{ label: 'Receipt', icon: <Printer aria-hidden />, onSelect: fn() }, { label: 'Void sale', onSelect: fn(), destructive: true }]} />
  </>
);

const empty = (
  <EmptyState
    size="compact"
    icon={<Receipt />}
    title="No sales to show"
    description="No sales match these filters for the last 30 days."
    action={<button type="button" onClick={fn()} className="text-sm font-medium text-primary hover:underline">Clear filters</button>}
  />
);

const base = { label: 'Sales', columns: COLUMNS, getRowId: (s: Sale) => s.id };

/** Server pagination and manual sort, as on the Sales page. */
function ServerPaged() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(25);
  const [sort, setSort] = useState<SortState>(null);
  const sorted = sort ? [...MANY].sort((a, b) => (a.amount - b.amount) * (sort.dir === 'asc' ? 1 : -1)) : MANY;
  const rows = sorted.slice((page - 1) * size, page * size);
  const columns = COLUMNS.map((c) => (c.id === 'amount' ? { ...c, sortValue: undefined, sortable: true } : { ...c, sortValue: undefined }));
  return (
    <DataTable
      {...base}
      columns={columns}
      rows={rows}
      manualSort
      sort={sort}
      onSortChange={setSort}
      pagination={{ page, totalPages: Math.ceil(MANY.length / size), onPageChange: setPage, pageSize: size, onPageSizeChange: (n) => { setSize(n); setPage(1); }, total: MANY.length }}
      rowClassName={(s) => (s.status === 'Voided' ? 'opacity-60' : undefined)}
    />
  );
}

const meta: Meta<typeof DataTable<Sale>> = {
  title: 'App kit/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    docs: { description: { component: 'The one table: sortable headers, rows that open a drawer, labelled row actions (RowAction plus OverflowMenu), pagination, a loading state that never says nothing here, and card rows below 768px.' } },
  },
  args: { ...base, rows: SALES, onRowClick: fn() },
};
export default meta;
type Story = StoryObj<typeof DataTable<Sale>>;

export const Default: Story = {};

export const WithRowActions: Story = { args: { rowActions } };

/** Skeleton rows while loading, never an empty message. */
export const Loading: Story = { args: { rows: undefined, loading: true } };

export const Empty: Story = { args: { rows: [], empty } };

/** Without an empty slot the table falls back to a plain line. */
export const EmptyDefault: Story = { args: { rows: [] } };

export const SortedByAmount: Story = { args: { defaultSort: { id: 'amount', dir: 'desc' } } };

/** 140 rows paged on the client, with the rows per page picker. */
export const ManyRows: Story = { args: { rows: MANY, pageSizeKey: 'story-sales-many' } };

/** Small dashboard widget: fixed page size, no picker. */
export const FixedPageSize: Story = { args: { rows: MANY, pageSize: 10, fixedPageSize: true } };

export const ServerPagination: Story = { render: () => <ServerPaged /> };

/** Checkboxes and a sticky bar with bulk actions. */
export const BulkActions: Story = {
  args: {
    bulkActions: (selected, clear) => (
      <>
        <RowAction onClick={fn()}>Export {selected.length}</RowAction>
        <RowAction onClick={clear}>Mark reviewed</RowAction>
      </>
    ),
  },
};

export const NotClickable: Story = { args: { onRowClick: undefined } };

export const LongText: Story = {
  args: {
    rowActions,
    rows: SALES.slice(0, 4).map((s, i) => ({
      ...s,
      customer: i === 0 ? 'Mama Put Kitchen and Catering Services, Allen Avenue branch' : s.customer,
      items: 'Whole chicken 1.2kg x 10, Croaker fish 1kg x 6, Rice 50kg x 2, Turkey wings 10kg, Titus fish carton',
      amount: i === 1 ? 128_450_000 : s.amount,
    })),
  },
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { rowActions },
};

export const PhoneLoading: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  args: { rows: undefined, loading: true },
};

/** RowAction on its own: default, primary, in-app link and external link. */
export const RowActions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-1.5">
      <RowAction onClick={fn()}>Edit</RowAction>
      <RowAction tone="primary" onClick={fn()}><Banknote aria-hidden /> Record payment</RowAction>
      <RowAction href="/credits">Open credits</RowAction>
      <RowAction href="https://wa.me/2348031555100" external ariaLabel="WhatsApp Mama Put Kitchen"><MessageCircle aria-hidden /> WhatsApp</RowAction>
    </div>
  ),
};
