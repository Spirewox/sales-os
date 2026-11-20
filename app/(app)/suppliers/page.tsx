'use client';

import { Suspense, useCallback, useMemo, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useOpenFromQuery } from '@/hooks/use-open-from-query';
import { useUrlState } from '@/hooks/use-url-state';
import { useInventory, useSupplier, useUpdateSupplier } from '@/hooks/use-queries';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { periodLabel } from '@/lib/period';
import { FilterSelect } from '@/components/filter-select';
import { ConfirmPreviewModal } from '@/components/confirm-preview-modal';
import {
  DataTable, EmptyState, FilterBar, KpiStrip, LocationSelect, MoreFilterField, PageHeader, PeriodSelect,
  SectionErrorBoundary, fieldClass, type KpiCell,
} from '@/components/app';
import type { Supplier } from '@/types';
import { PurchaseForm } from '../inventory/forms/purchase-form';
import type { ConfirmState } from '../inventory/inventory-utils';
import { IssueFormSheet } from './issue-form';
import { SupplierRowMenu, supplierColumns, type SupplierActions } from './supplier-columns';
import { SupplierDrawer } from './supplier-drawer';
import { SupplierFormSheet } from './supplier-form';
import { BUSINESS_TYPES, STALE_DAYS } from './supplier-utils';
import { useSupplierFilters, type SupplierStatus } from './use-supplier-filters';
import { useSupplierList } from './use-supplier-list';

const selectClass = 'h-9 w-auto min-w-36 data-[size=default]:h-9';

type Sheet =
  | { kind: 'add' }
  | { kind: 'edit'; supplier: Supplier }
  | { kind: 'issue'; supplier: Supplier }
  | { kind: 'purchase'; supplier: Supplier };

export default function SuppliersPage() {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading suppliers…</p>}>
      <Suppliers />
    </Suspense>
  );
}

function Suppliers() {
  const { can } = usePermissions();
  const { get, set } = useUrlState();
  const hubScope = useHubScopeFilter();
  const f = useSupplierFilters();
  const list = useSupplierList(f, hubScope);
  const updateSupplier = useUpdateSupplier();
  const { data: inventory = [] } = useInventory();
  const purchasableItems = useMemo(() => inventory.filter((i) => i.isActive !== false), [inventory]);

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const closeSheet = () => setSheet(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const mutating = useIsMutating() > 0;

  const openAddFromLink = useCallback(() => { setSheet({ kind: 'add' }); set({ new: null }); }, [set]);
  useOpenFromQuery('new', '1', openAddFromLink);

  // Drawer: ?supplier=<id> (older links use ?open=<id>).
  const openId = get('supplier') ?? get('open');
  const [override, setOverride] = useState<Supplier | null>(null);
  const fromList = openId ? list.suppliers.find((s) => s.id === openId) : undefined;
  const { data: fetched } = useSupplier(openId && !fromList && !list.listLoading ? openId : null);
  const selected = openId ? (override?.id === openId ? override : fromList ?? fetched ?? null) : null;
  const openSupplier = (s: Supplier) => { setOverride(null); set({ supplier: s.id, open: null }); };
  const closeSupplier = () => { setOverride(null); set({ supplier: null, open: null }); };

  const toggleActive = (s: Supplier) => {
    const run = () =>
      updateSupplier.mutate({ id: s.id, is_active: !s.isActive }, {
        onSuccess: (updated) => {
          if (selected?.id === s.id) setOverride(updated);
          toast.success(`${s.name} ${s.isActive ? 'deactivated' : 'reactivated'}.`);
        },
        onError: () => toast.error(`Unable to update ${s.name}.`),
      });
    if (!s.isActive) { run(); return; }
    setConfirm({
      title: `Deactivate ${s.name}?`,
      subtitle: 'They stay in your records but can no longer be chosen for new purchases. You can reactivate them later.',
      rows: [
        { label: 'Supplier', value: `${s.name}${s.code ? ` (${s.code})` : ''}` },
        { label: 'Location', value: s.location || '-' },
      ],
      confirmLabel: 'Deactivate',
      run,
    });
  };

  const actions: SupplierActions = {
    open: openSupplier,
    purchase: can('inventory.adjust_stock') ? (s) => setSheet({ kind: 'purchase', supplier: s }) : undefined,
    logIssue: can('suppliers.log_issue') ? (s) => setSheet({ kind: 'issue', supplier: s }) : undefined,
    edit: can('suppliers.edit') ? (s) => setSheet({ kind: 'edit', supplier: s }) : undefined,
    toggleActive: can('suppliers.deactivate') ? toggleActive : undefined,
  };

  const { kpis } = list;
  const ranged = f.period.preset !== 'all';
  const kpiCells: KpiCell[] = [
    {
      label: ranged ? 'Spend' : 'Total spend',
      value: kpis.spend > 0 ? formatMoneyShort(kpis.spend) : formatMoney(0),
      detail: periodLabel(f.period),
      change: kpis.spendChangePct != null ? { pct: kpis.spendChangePct, goodWhen: 'neutral' } : null,
    },
    {
      label: 'Open issues',
      value: formatCount(kpis.openIssues),
      tone: kpis.openIssues > 0 ? 'warning' : 'default',
      detail: kpis.openIssues > 0 ? `Across ${plural(kpis.suppliersWithIssues, 'supplier')}` : 'All clear',
      onClick: () => f.setShow(f.show === 'issues' ? 'all' : 'issues'),
      active: f.show === 'issues',
    },
    {
      label: `No purchase in ${STALE_DAYS} days`,
      value: formatCount(kpis.stale),
      detail: `Of ${plural(kpis.active, 'active supplier')}`,
      onClick: () => f.setShow(f.show === 'stale' ? 'all' : 'stale'),
      active: f.show === 'stale',
    },
  ];

  const columns = supplierColumns();
  const filtered = f.chips.length > 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        description="Find a supplier, check spend and open issues, then reorder."
        actions={
          can('suppliers.create') ? (
            <button type="button" onClick={() => setSheet({ kind: 'add' })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
              <Plus size={16} aria-hidden /> Add supplier
            </button>
          ) : undefined
        }
      />

      <KpiStrip cells={kpiCells} loading={list.kpiLoading} label="Supplier figures" />

      <FilterBar
        search={{ value: f.search.draft, onChange: f.search.setDraft, placeholder: 'Search name, code, contact, phone', label: 'Search suppliers' }}
        filters={
          <>
            <LocationSelect scope={hubScope} />
            <FilterSelect
              ariaLabel="Business type"
              value={f.type}
              onChange={f.setType}
              className={selectClass}
              options={[{ value: 'All', label: 'All types' }, ...BUSINESS_TYPES.map((t) => ({ value: t, label: t }))]}
            />
            <FilterSelect
              ariaLabel="Category"
              value={f.category}
              onChange={f.setCategory}
              className={selectClass}
              options={[{ value: 'All', label: 'All categories' }, ...PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))]}
            />
            <PeriodSelect value={f.period} onChange={f.setPeriod} />
          </>
        }
        more={
          <>
            <MoreFilterField label="Status" htmlFor="supplier-status">
              <FilterSelect
                id="supplier-status"
                ariaLabel="Status"
                value={f.status}
                onChange={(v) => f.setStatus(v as SupplierStatus)}
                options={[{ value: 'All', label: 'All statuses' }, { value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }]}
              />
            </MoreFilterField>
            <div className="grid grid-cols-2 gap-2">
              <MoreFilterField label="Code from" htmlFor="supplier-code-from">
                <input id="supplier-code-from" type="text" placeholder="SUP-001" value={f.codeFrom.draft} onChange={(e) => f.codeFrom.setDraft(e.target.value)} className={fieldClass} />
              </MoreFilterField>
              <MoreFilterField label="Code to" htmlFor="supplier-code-to">
                <input id="supplier-code-to" type="text" placeholder="SUP-050" value={f.codeTo.draft} onChange={(e) => f.codeTo.setDraft(e.target.value)} className={fieldClass} />
              </MoreFilterField>
            </div>
          </>
        }
        moreActiveCount={f.moreActiveCount}
        chips={f.chips}
        onClearAll={f.clearAll}
        resultLabel={list.listLoading ? undefined : plural(list.rows.length, 'supplier')}
      />

      <SectionErrorBoundary label="Supplier list" resetKey={f.key}>
        <DataTable
          label="Suppliers"
          columns={columns}
          rows={list.listLoading ? undefined : list.rows}
          loading={list.listLoading}
          getRowId={(r) => r.supplier.id}
          onRowClick={(r) => openSupplier(r.supplier)}
          rowActions={(r) => <SupplierRowMenu supplier={r.supplier} actions={actions} />}
          rowClassName={(r) => (r.supplier.isActive ? undefined : 'text-muted-foreground')}
          defaultSort={{ id: 'spend', dir: 'desc' }}
          resetPageKey={f.key}
          empty={
            <EmptyState
              size="compact"
              icon={<Truck />}
              title="No suppliers to show"
              description={filtered ? 'No suppliers match these filters.' : 'Add your first supplier to track spend and issues.'}
              action={filtered ? <button type="button" onClick={f.clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button> : undefined}
            />
          }
        />
      </SectionErrorBoundary>

      {selected && <SupplierDrawer supplier={selected} onClose={closeSupplier} actions={actions} canResolve={can('suppliers.resolve_issue')} />}

      {sheet?.kind === 'add' && <SupplierFormSheet existing={list.suppliers} onClose={closeSheet} />}
      {sheet?.kind === 'edit' && <SupplierFormSheet supplier={sheet.supplier} existing={list.suppliers} onClose={closeSheet} onSaved={(u) => { if (selected?.id === u.id) setOverride(u); }} />}
      {sheet?.kind === 'issue' && <IssueFormSheet supplier={sheet.supplier} onClose={closeSheet} />}
      {sheet?.kind === 'purchase' && (
        <PurchaseForm items={purchasableItems} initial={null} onClose={closeSheet} requestConfirm={setConfirm} supplier={{ id: sheet.supplier.id, name: sheet.supplier.name }} />
      )}

      <ConfirmPreviewModal
        open={!!confirm}
        title={confirm?.title ?? ''}
        subtitle={confirm?.subtitle}
        rows={confirm?.rows ?? []}
        warning={confirm?.warning}
        confirmLabel={confirm?.confirmLabel}
        loading={mutating}
        onBack={() => setConfirm(null)}
        onConfirm={() => { const run = confirm?.run; setConfirm(null); run?.(); }}
      />
    </div>
  );
}
