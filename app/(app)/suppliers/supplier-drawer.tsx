'use client';

import { useState } from 'react';
import { Ban, CheckCircle2, ClipboardList, Edit3, PackagePlus, Phone } from 'lucide-react';
import { useAgents, useInventory, useSupplierIssues, useSupplierPurchases } from '@/hooks/use-queries';
import type { Supplier } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { EntityDrawer, OverflowMenu, RowAction, SectionErrorBoundary, StatusBadge, type DrawerStat, type SectionTab } from '@/components/app';
import type { SupplierActions } from './supplier-columns';
import { SupplierDetailsTab } from './supplier-details-tab';
import { SupplierIssuesTab, type ResolveState } from './supplier-issues-tab';
import { SupplierProductsTab } from './supplier-products-tab';
import { SupplierPurchasesTab } from './supplier-purchases-tab';
import { logValue } from './supplier-utils';

type DrawerTab = 'purchases' | 'issues' | 'products' | 'details';

/** One supplier: Call, Record purchase and Log issue up top; Edit and Deactivate in `⋯`. Purchases first. */
export function SupplierDrawer({ supplier: s, onClose, actions, canResolve }: Readonly<{
  supplier: Supplier;
  onClose: () => void;
  actions: SupplierActions;
  canResolve: boolean;
}>) {
  const [tab, setTab] = useState<DrawerTab>('purchases');
  const [resolve, setResolve] = useState<ResolveState>({ issueId: null, note: '' });
  const { data: purchaseData, isLoading: purchasesLoading } = useSupplierPurchases(s.id);
  const purchases = purchaseData?.items ?? [];
  const { data: issues = [], isLoading: issuesLoading } = useSupplierIssues(s.id);
  const { data: inventory = [] } = useInventory();
  const { data: agents = [] } = useAgents();
  const agentName = (id?: string) => agents.find((a) => a.id === id)?.name || id || '-';

  // Same rule as the list: the API's total_spend when present, else summed purchases.
  const spend = typeof s.totalSpend === 'number' ? s.totalSpend : purchaseData?.summary.totalSpend || purchases.reduce((a, l) => a + logValue(l), 0);
  const orders = purchaseData?.summary.orderCount || purchases.length;
  const last = purchases.reduce((m, l) => (l.date > m ? l.date : m), '');
  const openIssues = issues.filter((i) => i.status === 'Open').length;
  const productCount = new Set(purchases.map((l) => l.itemId)).size;

  const stats: DrawerStat[] = [
    { label: 'Total spend', value: spend > 0 ? formatMoney(spend) : '-' },
    { label: 'Orders', value: purchasesLoading ? '…' : orders },
    { label: 'Last purchase', value: purchasesLoading ? '…' : last ? formatDate(last, { day: 'numeric', month: 'short', year: '2-digit' }) : 'None' },
    { label: 'Open issues', value: issuesLoading ? '…' : openIssues, tone: openIssues > 0 ? 'warning' : 'default' },
  ];

  const tabs: SectionTab<DrawerTab>[] = [
    { id: 'purchases', label: 'Purchases', count: purchases.length },
    { id: 'issues', label: 'Issues', count: openIssues, countTone: 'warning' },
    { id: 'products', label: 'Products', count: productCount },
    { id: 'details', label: 'Details' },
  ];

  const purchaseButton = actions.purchase && s.isActive
    ? <RowAction tone="primary" onClick={() => actions.purchase!(s)}><PackagePlus aria-hidden /> Record purchase</RowAction>
    : undefined;
  const issueButton = actions.logIssue ? <RowAction onClick={() => actions.logIssue!(s)}><ClipboardList aria-hidden /> Log issue</RowAction> : undefined;

  return (
    <EntityDrawer
      onClose={onClose}
      dismissible={!resolve.issueId}
      title={s.name}
      subtitle={[s.code, s.businessType, s.location].filter(Boolean).join(' · ')}
      status={!s.isActive ? <StatusBadge tone="neutral">Inactive</StatusBadge> : undefined}
      actions={
        <>
          {s.phone && <RowAction href={`tel:${s.phone}`}><Phone aria-hidden /> Call</RowAction>}
          {purchaseButton}
          {issueButton}
        </>
      }
      overflow={
        <OverflowMenu
          label={`More actions for ${s.name}`}
          items={[
            { label: 'Edit', icon: <Edit3 />, onSelect: () => actions.edit?.(s), hidden: !actions.edit },
            s.isActive
              ? { label: 'Deactivate', icon: <Ban />, onSelect: () => actions.toggleActive?.(s), hidden: !actions.toggleActive, destructive: true }
              : { label: 'Reactivate', icon: <CheckCircle2 />, onSelect: () => actions.toggleActive?.(s), hidden: !actions.toggleActive },
          ]}
        />
      }
      stats={stats}
      tabs={{ items: tabs, value: tab, onChange: setTab }}
    >
      <SectionErrorBoundary label="Supplier details" resetKey={`${s.id}-${tab}`}>
        {tab === 'purchases' && <SupplierPurchasesTab purchases={purchases} loading={purchasesLoading} inventory={inventory} agentName={agentName} action={purchaseButton} />}
        {tab === 'issues' && <SupplierIssuesTab issues={issues} loading={issuesLoading} inventory={inventory} canResolve={canResolve} resolve={resolve} setResolve={setResolve} action={issueButton} />}
        {tab === 'products' && <SupplierProductsTab purchases={purchases} inventory={inventory} />}
        {tab === 'details' && <SupplierDetailsTab supplier={s} />}
      </SectionErrorBoundary>
    </EntityDrawer>
  );
}
