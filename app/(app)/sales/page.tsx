'use client';

import { Suspense } from 'react';
import { PaymentMode, SalesChannel } from '@/types';
import { FileSpreadsheet, Plus, Receipt, Upload } from 'lucide-react';
import type { Sale } from '@/types';
import { formatCount, formatDate, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { lagosDay, periodLabel } from '@/lib/period';
import {
  DataTable, EmptyState, KpiStrip, OverflowMenu, PageHeader, SectionErrorBoundary, StatusBadge, type Column,
} from '@/components/app';
import { saleBalance, saleItemsLabel, salePaymentStatus, saleRef, unitsSoldRows } from './sales-utils';
import { useSalesPage } from './use-sales-page';
import { SalesFilterBar } from './sales-filter-bar';
import { SaleDetailPanel } from './sale-detail-panel';
import { RecordSaleSheet } from './add-sale-modal';
import { SalesImportModal } from './sales-import-modal';

export default function SalesPage() {
  return (
    <Suspense fallback={null}>
      <Sales />
    </Suspense>
  );
}

function salesColumns(today: string): Column<Sale>[] {
  return [
    { id: 'date', header: 'Date', mobile: 'meta', cell: (s) => <span className="whitespace-nowrap tabular-nums">{formatDate(s.date, { day: 'numeric', month: 'short' })}</span> },
    { id: 'ref', header: 'Sale #', hideBelow: 'lg', cell: (s) => <span className="font-mono text-xs text-muted-foreground">#{saleRef(s.id)}</span> },
    {
      id: 'customer', header: 'Customer', mobile: 'title',
      cell: (s) => (
        <span className="inline-flex flex-col">
          <span>{s.customerName}</span>
          <span className="text-xs font-normal text-muted-foreground">{s.channel || 'Walk-In'}</span>
        </span>
      ),
    },
    { id: 'items', header: 'Items', mobile: 'subtitle', className: 'max-w-[240px]', cell: (s) => <span className="block truncate" title={saleItemsLabel(s)}>{saleItemsLabel(s)}</span> },
    { id: 'category', header: 'Category', hideBelow: 'xl', cell: (s) => <span className="text-muted-foreground">{s.item?.category || '-'}</span> },
    { id: 'hub', header: 'Hub', hideBelow: 'xl', cell: (s) => <span className="text-muted-foreground">{s.hubName || '-'}</span> },
    {
      id: 'amount', header: 'Amount', align: 'right', mobile: 'value', sortable: true,
      cell: (s) => {
        const { balance } = saleBalance(s);
        return (
          <span className="inline-flex flex-col items-end">
            <span className="font-medium">{formatMoney(s.amount)}</span>
            {s.status !== 'Voided' && balance > 0 && <span className="text-xs text-warning">{formatMoney(balance)} due</span>}
          </span>
        );
      },
    },
    {
      id: 'status', header: 'Payment', mobile: 'meta',
      cell: (s) => {
        const status = salePaymentStatus(s, { today });
        // Method (Cash, Transfer, POS) under the badge, as the old table showed it; not for unpaid credit.
        const method = s.paymentType && s.status !== 'Voided' && s.paymentMode !== PaymentMode.FULL_CREDIT ? s.paymentType : null;
        return (
          <span className="inline-flex flex-col items-start gap-0.5">
            <StatusBadge domain="payment" status={status} />
            {method && <span className="text-xs text-muted-foreground">{method}</span>}
          </span>
        );
      },
    },
  ];
}

function Sales() {
  const { importInputRef, ...p } = useSalesPage();
  const { can, filters, kpis, salesMeta, recordSale } = p;
  const canCreate = can('sales.create');
  const canImport = can('sales.import');
  const tableLoading = p.salesLoading || p.salesFetching;
  const columns = salesColumns(lagosDay());
  const period = periodLabel(filters.period).toLowerCase();
  const units = unitsSoldRows(kpis.unitsByUnit);
  const [topUnit, ...otherUnits] = units;
  const unitLabel = (u: { unit: string; qty: number }) => `${u.qty.toLocaleString('en-NG')} ${u.unit}`;
  const selectedSkus = p.skuOptions.filter((s) => filters.productIds.includes(s.id));
  const unitsScope = selectedSkus.length
    ? selectedSkus.map((s) => [s.sku, s.name].filter(Boolean).join(' ')).join(', ')
    : filters.categories.length ? filters.categories.join(', ') : 'All categories';
  const deliveriesOnly = filters.channel === SalesChannel.DELIVERY;

  const recordButton = canCreate && (
    <button type="button" onClick={() => p.setShowAddModal(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
      <Plus size={16} aria-hidden /> Record sale
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-20 md:pb-0">
      <input ref={importInputRef} type="file" accept=".xlsx" className="hidden" aria-hidden tabIndex={-1} onChange={p.handleImportFile} />
      <PageHeader
        title="Sales"
        description="Record sales and check what was sold, to whom, and what is still owed."
        actions={<span className="hidden md:contents">{recordButton}</span>}
        overflow={
          <OverflowMenu
            label="More sales actions"
            items={[
              { label: 'Import sales', icon: <Upload aria-hidden />, onSelect: () => importInputRef.current?.click(), hidden: !canImport },
              { label: p.downloadingTemplate ? 'Preparing template…' : 'Catalog sales template', icon: <FileSpreadsheet aria-hidden />, onSelect: () => p.handleDownloadTemplate('catalog'), hidden: !canImport, disabled: p.downloadingTemplate },
              { label: 'Custom product template', icon: <FileSpreadsheet aria-hidden />, onSelect: () => p.handleDownloadTemplate('custom'), hidden: !canImport, disabled: p.downloadingTemplate },
            ]}
          />
        }
      />

      <KpiStrip
        loading={p.summaryFetching}
        cells={[
          {
            label: 'Revenue',
            value: formatMoneyShort(kpis.revenue),
            change: p.revenueChangePct != null ? { pct: p.revenueChangePct, label: 'vs previous period' } : null,
            detail: p.revenueChangePct == null ? period : undefined,
          },
          { label: 'Sales', value: formatCount(kpis.count), detail: period },
          { label: 'Credit sales', value: formatMoneyShort(kpis.creditAmount), detail: `${plural(kpis.creditCount, 'sale')} on credit`, href: '/credits', tone: kpis.creditAmount > 0 ? 'warning' : 'default' },
          { label: 'Average order', value: formatMoneyShort(kpis.avgOrder), detail: period },
        ]}
      />

      {/* Second strip: profit and volume figures from the same summary (old page showed 7 cards). */}
      <KpiStrip
        label="Profit and volume"
        loading={p.summaryFetching}
        cells={[
          {
            label: 'Profit',
            hidden: !p.isAdmin,
            value: formatMoneyShort(kpis.profit ?? 0),
            change: p.profitChangePct != null ? { pct: p.profitChangePct, label: 'vs previous period' } : null,
            detail: p.profitChangePct == null ? period : undefined,
            tone: (kpis.profit ?? 0) < 0 ? 'danger' : 'default',
          },
          {
            label: 'Deliveries',
            value: formatCount(kpis.deliveryCount),
            detail: deliveriesOnly ? 'Showing deliveries only' : 'Show delivery sales',
            onClick: () => filters.setChannel(deliveriesOnly ? '' : SalesChannel.DELIVERY),
            active: deliveriesOnly,
          },
          {
            label: 'Units sold',
            value: topUnit ? unitLabel(topUnit) : '0',
            detail: <span title={unitsScope}>{otherUnits.length ? `${otherUnits.map(unitLabel).join(', ')}. ` : ''}{unitsScope}</span>,
          },
        ]}
      />

      <SalesFilterBar
        filters={filters}
        hubScope={p.hubScope}
        agents={p.agents}
        categories={p.productCategories}
        skuOptions={p.skuOptions}
        trailing={p.exportMenu}
        resultLabel={tableLoading ? 'Loading sales…' : salesMeta.totalPages > 1 ? `${(salesMeta.page - 1) * salesMeta.limit + 1} to ${Math.min(salesMeta.page * salesMeta.limit, salesMeta.total)} of ${plural(salesMeta.total, 'sale')}` : plural(salesMeta.total, 'sale')}
      />

      <SectionErrorBoundary label="Sales">
        <DataTable
          label="Sales"
          columns={columns}
          rows={tableLoading ? undefined : p.sales}
          loading={tableLoading}
          getRowId={(s) => s.id}
          onRowClick={p.openSale}
          pageSize={p.pageSize}
          manualSort
          sort={filters.sort.startsWith('amount_') ? { id: 'amount', dir: filters.sort === 'amount_asc' ? 'asc' : 'desc' } : null}
          onSortChange={(s) => filters.setSort(s ? `amount_${s.dir}` : 'newest')}
          pagination={{ page: salesMeta.page, totalPages: salesMeta.totalPages, onPageChange: p.setPage, pageSize: p.pageSize, onPageSizeChange: p.setPageSize, total: salesMeta.total }}
          rowClassName={(s) => (s.status === 'Voided' ? 'opacity-60' : undefined)}
          empty={
            <EmptyState
              size="compact"
              icon={<Receipt />}
              title="No sales to show"
              description={filters.hasFilters ? `No sales match these filters for ${period}.` : `No sales recorded for ${period}.`}
              action={filters.hasFilters ? (
                <button type="button" onClick={filters.clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button>
              ) : recordButton}
            />
          }
        />
      </SectionErrorBoundary>

      {/* Phones: Record sale stays in reach at the bottom of the screen. */}
      {canCreate && (
        <div className="fixed inset-x-4 bottom-4 z-30 md:hidden">
          <button type="button" onClick={() => p.setShowAddModal(true)} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground shadow-lg">
            <Plus size={16} aria-hidden /> Record sale
          </button>
        </div>
      )}

      {p.saleId && p.selectedSale && (
        <SaleDetailPanel
          sale={p.selectedSale}
          detailTab={p.detailTab}
          setDetailTab={p.setDetailTab}
          isEditing={p.isEditing}
          setIsEditing={p.setIsEditing}
          editForm={p.editForm}
          setEditForm={p.setEditForm}
          showVoidConfirm={p.showVoidConfirm}
          setShowVoidConfirm={p.setShowVoidConfirm}
          saleStockLogs={p.saleStockLogs}
          customerSalesHistory={p.customerSalesHistory}
          onClose={p.closeDetailPanel}
          onSelectSale={p.openSale}
          onStartEditing={p.startEditing}
          onSaveEdit={p.saveEdit}
          batchPriceError={p.editBatchPriceError}
          onVoidSale={p.handleVoidSale}
          onUpdateDeliveryStatus={p.handleUpdateDeliveryStatus}
          savingEdit={p.savingEdit}
          voidingSale={p.voidingSale}
          updatingDelivery={p.updatingDelivery}
          can={can}
          isCompanyAdmin={p.isAdmin}
          activeHubs={p.activeHubs}
        />
      )}

      {p.showAddModal && (
        <RecordSaleSheet form={recordSale} onClose={p.closeRecordSale} agents={p.agents} user={p.user} canCreateSale={canCreate} hubName={p.hubScope.hubName} />
      )}

      <SalesImportModal
        show={p.showImportModal}
        onClose={p.closeImportModal}
        previewRows={p.importPreview}
        summary={p.importSummary}
        importing={p.importing}
        validating={p.validating}
        showImportConfirm={p.showImportConfirm}
        importProgress={p.importProgress}
        importResult={p.importResult}
        importError={p.importError}
        onConfirm={p.handleImportConfirm}
        onCancelConfirm={() => p.setShowImportConfirm(false)}
        onDownloadTemplate={p.handleDownloadTemplate}
      />
    </div>
  );
}
