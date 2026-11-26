'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Archive, ArchiveRestore, ArrowRightLeft, ArrowUpRight, Pencil, SlidersHorizontal } from 'lucide-react';
import { isArchived } from '@/lib/inventory-archive';
import type { InventoryItem } from '@/types';
import { usePermissions } from '@/hooks/use-permissions';
import { useProductBatches, useProductSuppliers, useReconcileProductStock, useUpdatePurchaseBatch } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import { formatInventoryStockDisplay } from '@/lib/format-carton-stock';
import { SkuPhoto } from '@/components/product-image-editor';
import { EmptyState, EntityDrawer, FormField, OverflowMenu, RowAction, StatusBadge, fieldClass, type SectionTab } from '@/components/app';
import {
  expiryTone, fmtMoney, getExpiryLabel, marginPct, nearMinimum, parseMoneyInput, roundMoney2, roundQty2, stockState,
  type FifoBatch, type RequestConfirm,
} from './inventory-utils';
import { ActivityPanel, PricePanel, SalesPanel, SuppliersPanel } from './product-drawer-panels';

type DrawerTab = 'batches' | 'overview' | 'suppliers' | 'sales' | 'price' | 'activity';

export type DrawerActions = {
  purchase?: () => void;
  transfer?: () => void;
  adjust?: () => void;
  edit?: () => void;
  /** Open the archive confirmation; present only with inventory.archive. */
  archive?: () => void;
  restore?: () => void;
  /** Why archiving is blocked right now (stock on hand, open requests), or null. */
  archiveBlocker?: string | null;
};

/** One product: batches first (soonest expiry on top), purchase / transfer / adjust in the header. */
export function ProductDrawer({ item, onClose, actions, requestConfirm }: Readonly<{
  item: InventoryItem;
  onClose: () => void;
  actions: DrawerActions;
  requestConfirm: RequestConfirm;
}>) {
  const [tab, setTab] = useState<DrawerTab>('batches');
  const { data: itemSuppliers = [] } = useProductSuppliers(item.id);
  const { data: apiBatches = [], isSuccess: batchesLoaded, isLoading: batchesLoading } = useProductBatches(item.id, { includeDepleted: true });

  const batches = useMemo((): FifoBatch[] => {
    const rows = apiBatches.map((b) => ({
      logId: b.stockLogId ?? b.purchaseLogId ?? '',
      batchNumber: b.batchNumber,
      date: b.receivedDate ?? '',
      expiryDate: b.expiryDate,
      quantityRemaining: b.quantityRemaining,
      unitCost: b.unitCost,
      unitPrice: b.unitPrice,
      supplier: b.supplier,
    }));
    // Open batches first, soonest expiry first (no expiry last), then oldest received.
    return rows.sort((a, b) => {
      const spentA = a.quantityRemaining <= 0 ? 1 : 0;
      const spentB = b.quantityRemaining <= 0 ? 1 : 0;
      if (spentA !== spentB) return spentA - spentB;
      if (a.expiryDate && b.expiryDate && a.expiryDate !== b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate && !b.expiryDate) return -1;
      if (!a.expiryDate && b.expiryDate) return 1;
      return a.date.localeCompare(b.date);
    });
  }, [apiBatches]);

  const openBatches = batches.filter((b) => b.quantityRemaining > 0).length;
  const margin = marginPct(item);
  const state = stockState(item);
  // An archived product shows its history only: no stock actions, Restore instead.
  const archived = isArchived(item);

  const tabs: SectionTab<DrawerTab>[] = [
    { id: 'batches', label: 'Batches', count: openBatches },
    { id: 'overview', label: 'Overview' },
    { id: 'suppliers', label: 'Suppliers', count: itemSuppliers.length },
    { id: 'sales', label: 'Sales' },
    { id: 'price', label: 'Price' },
    { id: 'activity', label: 'Activity' },
  ];

  return (
    <EntityDrawer
      onClose={onClose}
      width="lg"
      title={<span className="inline-flex items-center gap-2"><SkuPhoto url={item.imageUrl} className="h-8 w-8" />{item.name}</span>}
      subtitle={<span><span className="font-mono">{item.sku}</span>, {item.location}</span>}
      status={archived ? <StatusBadge tone="neutral">Archived</StatusBadge> : <StatusBadge domain="stock" status={state} />}
      actions={archived ? (
        actions.restore && <RowAction tone="primary" onClick={actions.restore}><ArchiveRestore aria-hidden /> Restore</RowAction>
      ) : (
        <>
          {actions.purchase && <RowAction tone="primary" onClick={actions.purchase}><ArrowUpRight aria-hidden /> Purchase</RowAction>}
          {actions.transfer && <RowAction onClick={actions.transfer}><ArrowRightLeft aria-hidden /> Transfer</RowAction>}
          {actions.adjust && <RowAction onClick={actions.adjust}><SlidersHorizontal aria-hidden /> Adjust</RowAction>}
        </>
      )}
      overflow={
        <OverflowMenu
          label="More product actions"
          items={[
            // Restore first: editing leads on to stock adjustments.
            { label: 'Edit product', icon: <Pencil />, onSelect: () => actions.edit?.(), hidden: archived || !actions.edit },
            {
              label: 'Archive product', icon: <Archive />, destructive: true, onSelect: () => actions.archive?.(),
              description: actions.archiveBlocker ?? undefined, hidden: archived || !actions.archive,
            },
          ]}
        />
      }
      stats={[
        { label: 'On hand', value: formatInventoryStockDisplay(item), tone: state === 'Out' ? 'danger' : state === 'Low' ? 'warning' : 'default' },
        { label: 'Stock value', value: formatMoney(item.currentStock * item.avgUnitCost) },
        { label: item.unitOfMeasure === 'Cartons' ? 'Avg carton cost' : 'Avg unit cost', value: formatMoney(item.avgUnitCost) },
        { label: 'Margin', value: `${margin.toFixed(1)}%`, tone: margin < 0 ? 'danger' : margin < 15 ? 'warning' : 'default' },
      ]}
      tabs={{ items: tabs, value: tab, onChange: setTab }}
    >
      {tab === 'batches' && (
        <BatchesPanel item={item} batches={batches} loaded={batchesLoaded} loading={batchesLoading} requestConfirm={requestConfirm} onPurchase={archived ? undefined : actions.purchase} archived={archived} />
      )}
      {tab === 'overview' && <OverviewPanel item={item} margin={margin} />}
      {tab === 'suppliers' && <SuppliersPanel item={item} suppliers={itemSuppliers} />}
      {tab === 'sales' && <SalesPanel item={item} suppliers={itemSuppliers} />}
      {tab === 'price' && <PricePanel item={item} />}
      {tab === 'activity' && <ActivityPanel item={item} />}
    </EntityDrawer>
  );
}

function BatchesPanel({ item, batches, loaded, loading, requestConfirm, onPurchase, archived }: Readonly<{
  item: InventoryItem;
  batches: FifoBatch[];
  loaded: boolean;
  loading: boolean;
  requestConfirm: RequestConfirm;
  onPurchase?: () => void;
  /** Archived: show the batches, offer nothing that changes stock. */
  archived?: boolean;
}>) {
  const { can } = usePermissions();
  const updatePurchaseBatch = useUpdatePurchaseBatch();
  const reconcileProductStock = useReconcileProductStock();
  const [batchPriceEdit, setBatchPriceEdit] = useState<{ logId: string; unitCost: string } | null>(null);

  const remaining = batches.reduce((sum, b) => sum + (b.quantityRemaining || 0), 0);
  const mismatch = (() => {
    if (!loaded) return null;
    const stock = Number(item.currentStock) || 0;
    const eps = (item.unitOfMeasure || '').toLowerCase() === 'kg' ? 0.01 : 0.0001;
    return Math.abs(stock - remaining) <= eps ? null : { stock, batches: remaining };
  })();

  const qtyLabel = (q: number) =>
    item.unitOfMeasure === 'Kg' ? roundQty2(q) : item.unitOfMeasure === 'Liters' ? Math.round((q || 0) * 1000) / 1000 : q;

  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading batches…</p>;

  return (
    <div className="space-y-3">
      {mismatch && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <p className="font-medium">
            Stock on hand ({mismatch.stock} {item.unitOfMeasure}) does not match open batches ({mismatch.batches} {item.unitOfMeasure}).
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Align stock to the FEFO batch ledger so the stock table matches these batches.</p>
          {can('inventory.adjust_stock') && !archived && (
            <button
              type="button"
              disabled={reconcileProductStock.isPending}
              onClick={() =>
                reconcileProductStock.mutate(item.id, {
                  onSuccess: (res) => toast.success(res.message || 'Stock aligned to open batches.'),
                  onError: (err) => toast.error(err.message),
                })
              }
              className="mt-3 h-8 rounded-md border bg-card px-3 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {reconcileProductStock.isPending ? 'Aligning…' : 'Align stock to batches'}
            </button>
          )}
        </div>
      )}

      {batches.length === 0 ? (
        <EmptyState
          size="compact"
          title="No batches yet"
          description="Each purchase opens a batch with its own cost and expiry date."
          action={onPurchase ? <button type="button" onClick={onPurchase} className="text-sm font-medium text-primary hover:underline">Record purchase</button> : undefined}
        />
      ) : (
        <ul className="divide-y rounded-xl border">
          {batches.map((batch, idx) => {
            const canEditBatchPrices = !!batch.logId;
            const editing = batchPriceEdit?.logId === batch.logId;
            const isSpent = batch.quantityRemaining <= 0;
            const tone = expiryTone(batch.expiryDate);
            return (
              <li key={`${batch.logId}-${idx}`} className={isSpent ? 'px-4 py-3 opacity-70' : 'px-4 py-3'}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {batch.batchNumber ? <span className="font-mono">{batch.batchNumber}</span> : <span className="text-muted-foreground">No batch code</span>}
                      {isSpent && <StatusBadge tone="neutral">Spent</StatusBadge>}
                      {!isSpent && batch.expiryDate && tone !== 'neutral' && <StatusBadge tone={tone}>{getExpiryLabel(batch.expiryDate)}</StatusBadge>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Received {formatDate(batch.date)}
                      {batch.expiryDate && <>, expires {formatDate(batch.expiryDate)}</>}
                      {batch.supplier && <>, via {batch.supplier}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold tabular-nums">{qtyLabel(batch.quantityRemaining)} <span className="text-xs font-normal text-muted-foreground">{item.unitOfMeasure}</span></p>
                    <p className="text-xs text-muted-foreground tabular-nums">Cost ₦{fmtMoney(batch.unitCost)}</p>
                    {/* Selling price applies to every batch of the product (as on the old batch cards). */}
                    {canEditBatchPrices && <p className="text-xs text-muted-foreground tabular-nums">Price ₦{fmtMoney(item.baseSellingPrice)}</p>}
                  </div>
                </div>
                {canEditBatchPrices && can('inventory.edit') && !editing && (
                  <button type="button" className="mt-1 text-xs font-medium text-primary hover:underline" onClick={() => setBatchPriceEdit({ logId: batch.logId, unitCost: String(roundMoney2(batch.unitCost)) })}>
                    Edit cost
                  </button>
                )}
                {canEditBatchPrices && editing && batchPriceEdit && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3">
                    <div className="w-40">
                      <FormField label="Unit cost (₦)" htmlFor={`batch-cost-${batch.logId}`}>
                        <input
                          id={`batch-cost-${batch.logId}`}
                          type="number"
                          min={0}
                          step="0.01"
                          value={batchPriceEdit.unitCost}
                          onChange={(e) => setBatchPriceEdit({ ...batchPriceEdit, unitCost: e.target.value })}
                          className={fieldClass}
                        />
                      </FormField>
                    </div>
                    <button type="button" className="h-9 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted" onClick={() => setBatchPriceEdit(null)}>Cancel</button>
                    <button
                      type="button"
                      className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        const unit_cost = roundMoney2(parseMoneyInput(batchPriceEdit.unitCost));
                        requestConfirm({
                          title: 'Review batch cost',
                          subtitle: batch.batchNumber ? `Batch ${batch.batchNumber}` : item.name,
                          rows: [
                            { label: 'Batch', value: batch.batchNumber || batch.logId },
                            { label: 'Unit cost', value: `₦${fmtMoney(batch.unitCost)} → ₦${fmtMoney(unit_cost)}` },
                          ],
                          confirmLabel: 'Update cost',
                          run: () => {
                            updatePurchaseBatch.mutate(
                              { logId: batch.logId, unit_cost },
                              {
                                onSuccess: () => {
                                  setBatchPriceEdit(null);
                                  toast.success('Batch cost updated.');
                                },
                                onError: (err) => toast.error(err.message),
                              },
                            );
                          },
                        });
                      }}
                    >
                      Review cost
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function OverviewPanel({ item, margin }: Readonly<{ item: InventoryItem; margin: number }>) {
  const rows: { label: string; value: React.ReactNode }[] = [
    { label: item.unitOfMeasure === 'Cartons' ? 'Unit selling price' : 'Selling price', value: `₦${fmtMoney(item.baseSellingPrice)} (avg from batches)` },
    ...(item.cartonPrice != null ? [{ label: 'Carton selling price', value: `₦${fmtMoney(item.cartonPrice)}` }] : []),
    ...(item.cartonWeight != null ? [{ label: 'Carton weight', value: `${item.cartonWeight} Kg` }] : []),
    { label: 'Category', value: item.category },
    { label: 'Unit of measure', value: item.unitOfMeasure },
    { label: 'Minimum level', value: nearMinimum(item) ? `${item.minStockLevel} (on hand is within 1.5x of it)` : String(item.minStockLevel) },
    { label: 'Last stock update', value: formatDate(item.lastStockUpdate) },
    ...(item.lastPurchasePrice != null ? [{ label: 'Last purchase price', value: `₦${fmtMoney(item.lastPurchasePrice)}` }] : []),
    ...(item.supplier
      ? [{
          label: 'Last supplier',
          value: item.supplierId ? <Link href={`/suppliers?open=${item.supplierId}`} className="font-medium text-primary hover:underline">{item.supplier}</Link> : item.supplier,
        }]
      : []),
    ...(item.isExpensed
      ? [{
          label: 'Expensed opening',
          value: `${item.expenseQty != null ? `${item.expenseQty} ${item.unitOfMeasure}` : 'Yes'}${item.expenseValueAmount != null ? ` (₦${fmtMoney(item.expenseValueAmount)})` : ''}`,
        }]
      : []),
  ];
  return (
    <div className="space-y-4">
      {margin < 0 && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">Selling below cost.</p>}
      <dl className="divide-y rounded-xl border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right font-medium tabular-nums">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
