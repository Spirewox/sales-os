'use client';

import Link from 'next/link';
import { Ban, CheckCircle2, ClipboardList, Edit3, PackagePlus, PanelRightOpen, Phone } from 'lucide-react';
import { formatDate, formatMoney } from '@/lib/format';
import { OverflowMenu, StatusBadge, type Column } from '@/components/app';
import type { Supplier } from '@/types';
import { StarRating } from './star-rating';
import type { SupplierRow } from './use-supplier-list';

function Supplies({ row }: Readonly<{ row: SupplierRow }>) {
  const { products, supplier } = row;
  if (products.length > 0) {
    const shown = products.slice(0, 2);
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
        {shown.map((p, i) => (
          <span key={p.id} className="inline-flex items-center">
            <Link href={`/inventory?product=${p.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-primary hover:underline">{p.name}</Link>
            {i < shown.length - 1 && ','}
          </span>
        ))}
        {products.length > 2 && <span className="text-xs text-muted-foreground">+{products.length - 2} more</span>}
      </span>
    );
  }
  const cats = supplier.categories ?? [];
  if (cats.length === 0) return <span className="text-muted-foreground">-</span>;
  return (
    <span className="text-sm text-muted-foreground">
      {cats.slice(0, 3).join(', ')}
      {cats.length > 3 && ` +${cats.length - 3}`}
    </span>
  );
}

function OpenIssues({ count }: Readonly<{ count: number | null }>) {
  if (count === null) return <span className="text-muted-foreground">-</span>;
  if (count === 0) return <StatusBadge tone="neutral">None</StatusBadge>;
  return <StatusBadge tone="warning">{count} open</StatusBadge>;
}

/** Columns for the supplier list. Spend follows the selected period. */
export function supplierColumns(): Column<SupplierRow>[] {
  return [
    {
      id: 'supplier',
      header: 'Supplier',
      mobile: 'title',
      sortValue: (r) => r.supplier.name.toLowerCase(),
      cell: ({ supplier: s }) => (
        <span className="flex min-w-0 flex-col">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="truncate">{s.name}</span>
            {!s.isActive && <StatusBadge tone="neutral">Inactive</StatusBadge>}
          </span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            <span className="font-mono">{s.code || '-'}</span>
            {s.businessName && s.businessName !== s.name && <span> · {s.businessName}</span>}
          </span>
        </span>
      ),
    },
    {
      id: 'contact',
      header: 'Contact',
      hideBelow: 'lg',
      sortValue: (r) => (r.supplier.contactPerson || '').toLowerCase(),
      cell: ({ supplier: s }) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{s.contactPerson || '-'}</span>
          {(s.phone || s.email) && <span className="truncate text-xs text-muted-foreground">{s.phone || s.email}</span>}
        </span>
      ),
    },
    {
      id: 'type',
      header: 'Type and location',
      mobile: 'subtitle',
      cell: ({ supplier: s }) => (
        <span className="flex flex-col max-md:inline">
          <span>{s.businessType || '-'}</span>
          <span className="text-xs text-muted-foreground max-md:before:content-['_·_']">{s.location || '-'}</span>
        </span>
      ),
    },
    { id: 'supplies', header: 'Supplies', hideBelow: 'lg', cell: (r) => <Supplies row={r} /> },
    {
      id: 'spend',
      header: 'Spend',
      align: 'right',
      mobile: 'value',
      sortValue: (r) => r.spend,
      cell: (r) => <span className="font-medium whitespace-nowrap">{r.spend > 0 ? formatMoney(r.spend) : '-'}</span>,
    },
    {
      id: 'last',
      header: 'Last purchase',
      mobile: 'meta',
      sortValue: (r) => r.lastPurchase ?? '',
      cell: (r) => (r.lastPurchase ? <span className="whitespace-nowrap"><span className="md:hidden">Last bought </span>{formatDate(r.lastPurchase)}</span> : <span className="text-muted-foreground">No purchases</span>),
    },
    { id: 'rating', header: 'Rating', hideBelow: 'xl', sortValue: (r) => r.supplier.rating ?? 0, cell: (r) => <StarRating value={r.supplier.rating} /> },
    {
      id: 'issues',
      header: 'Open issues',
      mobile: 'meta',
      sortValue: (r) => r.openIssues ?? -1,
      cell: (r) => (r.openIssues ? <OpenIssues count={r.openIssues} /> : <span className="max-md:hidden"><OpenIssues count={r.openIssues} /></span>),
    },
  ];
}

export type SupplierActions = {
  open: (s: Supplier) => void;
  purchase?: (s: Supplier) => void;
  logIssue?: (s: Supplier) => void;
  edit?: (s: Supplier) => void;
  toggleActive?: (s: Supplier) => void;
};

/** Row `⋯`: open, call, record purchase, log issue, edit; Deactivate last (destructive). */
export function SupplierRowMenu({ supplier: s, actions }: Readonly<{ supplier: Supplier; actions: SupplierActions }>) {
  return (
    <OverflowMenu
      size="sm"
      label={`Actions for ${s.name}`}
      items={[
        { label: 'Open', icon: <PanelRightOpen />, onSelect: () => actions.open(s) },
        { label: 'Call', icon: <Phone />, onSelect: () => { window.location.href = `tel:${s.phone}`; }, hidden: !s.phone },
        { label: 'Record purchase', icon: <PackagePlus />, onSelect: () => actions.purchase?.(s), hidden: !actions.purchase || !s.isActive },
        { label: 'Log issue', icon: <ClipboardList />, onSelect: () => actions.logIssue?.(s), hidden: !actions.logIssue },
        { label: 'Edit', icon: <Edit3 />, onSelect: () => actions.edit?.(s), hidden: !actions.edit },
        s.isActive
          ? { label: 'Deactivate', icon: <Ban />, onSelect: () => actions.toggleActive?.(s), hidden: !actions.toggleActive, destructive: true }
          : { label: 'Reactivate', icon: <CheckCircle2 />, onSelect: () => actions.toggleActive?.(s), hidden: !actions.toggleActive },
      ]}
    />
  );
}
