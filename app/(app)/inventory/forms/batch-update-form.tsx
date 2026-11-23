'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { InventoryItem, StockMovementType } from '@/types';
import { useBatchStockUpdate } from '@/hooks/use-queries';
import { formatStockQuantity } from '@/lib/format-carton-stock';
import type { ConfirmPreviewRow } from '@/components/confirm-preview-modal';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { fmtMoney, parseMoneyInput, roundMoney2, type RequestConfirm } from '../inventory-utils';
import { selectClass } from './form-bits';

type Update = { quantity: number; cost?: number };

/** Bulk stock update for the rows selected in the Stock table (existing `inventory/batch` endpoint). */
export function BatchUpdateForm({ products, onClose, requestConfirm }: Readonly<{
  products: InventoryItem[];
  onClose: () => void;
  requestConfirm: RequestConfirm;
}>) {
  const batchStockUpdate = useBatchStockUpdate();
  const [batchData, setBatchData] = useState<{ type: StockMovementType; notes: string; updates: Record<string, Update> }>(() => ({
    type: StockMovementType.PURCHASE,
    notes: '',
    updates: Object.fromEntries(products.map((p) => [p.id, { quantity: 1 }])),
  }));

  const handleBatchUpdate = () => {
    const updates = Object.entries(batchData.updates)
      .filter(([, data]) => data.quantity !== 0)
      .map(([itemId, data]) => ({
        item_id: itemId,
        quantity: data.quantity,
        unit_cost: data.cost != null ? roundMoney2(data.cost) : undefined,
      }));

    if (updates.length === 0) {
      toast.error('No valid batch updates selected.');
      return;
    }

    const rows: ConfirmPreviewRow[] = [
      { label: 'Type', value: String(batchData.type) },
      { label: 'Notes', value: batchData.notes || 'Batch Update' },
      { label: 'Items', value: `${updates.length}` },
      ...updates.map((u) => {
        const item = products.find((i) => i.id === u.item_id);
        const costPart = u.unit_cost != null ? `, cost ₦${fmtMoney(u.unit_cost)}` : '';
        return { label: item?.name || u.item_id, value: `${u.quantity > 0 ? '+' : ''}${u.quantity}${costPart}` };
      }),
    ];

    requestConfirm({
      title: 'Review batch update',
      subtitle: `${updates.length} item${updates.length === 1 ? '' : 's'}`,
      rows,
      confirmLabel: 'Apply batch',
      run: () => {
        batchStockUpdate.mutate(
          { type: batchData.type, notes: batchData.notes || 'Batch Update', updates },
          {
            onSuccess: () => {
              onClose();
              toast.success('Batch update complete.');
            },
            onError: (err) => toast.error(err.message),
          },
        );
      },
    });
  };

  const isReduction = [StockMovementType.SALE, StockMovementType.TRANSFER].includes(batchData.type);
  const hasQty = Object.values(batchData.updates).some((u) => u.quantity !== 0);

  return (
    <FormSheet
      title={`Update stock for ${products.length} product${products.length === 1 ? '' : 's'}`}
      onClose={onClose}
      onSubmit={handleBatchUpdate}
      submitLabel="Review batch update"
      submitting={batchStockUpdate.isPending}
      disabledReason={hasQty ? null : 'Enter a quantity for at least one product'}
      width="lg"
    >
      <FormSection title="Movement">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Movement type" htmlFor="batch-type">
            <FilterSelect
              id="batch-type"
              value={batchData.type}
              className={selectClass}
              onChange={(v) => setBatchData({ ...batchData, type: v as StockMovementType })}
              options={Object.values(StockMovementType).map((t) => ({ value: t, label: t }))}
            />
          </FormField>
          <FormField label="Notes" htmlFor="batch-notes">
            <input id="batch-notes" type="text" value={batchData.notes} onChange={(e) => setBatchData({ ...batchData, notes: e.target.value })} className={fieldClass} />
          </FormField>
        </div>
      </FormSection>
      <FormSection title="Products">
        <ul className="divide-y rounded-lg border">
          {products.map((item) => {
            const id = item.id;
            const update = batchData.updates[id] || { quantity: 0 };
            const wouldExceed = isReduction && update.quantity > item.currentStock;
            return (
              <li key={id} className={cn('flex flex-wrap items-center gap-3 p-3', wouldExceed && 'bg-destructive/10')}>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.sku}, on hand {formatStockQuantity(item.currentStock, item.unitOfMeasure)}</p>
                </div>
                <label className="sr-only" htmlFor={`batch-qty-${id}`}>Quantity for {item.name}</label>
                <input
                  id={`batch-qty-${id}`}
                  type="number"
                  placeholder="Qty"
                  aria-invalid={wouldExceed || undefined}
                  className={cn(fieldClass, 'w-24 text-center tabular-nums')}
                  value={update.quantity || ''}
                  onChange={(e) => setBatchData({ ...batchData, updates: { ...batchData.updates, [id]: { ...update, quantity: parseInt(e.target.value) || 0 } } })}
                />
                {batchData.type === StockMovementType.PURCHASE && (
                  <>
                    <label className="sr-only" htmlFor={`batch-cost-${id}`}>Unit cost for {item.name}</label>
                    <input
                      id={`batch-cost-${id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Cost"
                      className={cn(fieldClass, 'w-28 text-center tabular-nums')}
                      value={update.cost || ''}
                      onChange={(e) => setBatchData({
                        ...batchData,
                        updates: { ...batchData.updates, [id]: { ...update, cost: e.target.value.trim() === '' ? undefined : parseMoneyInput(e.target.value) } },
                      })}
                    />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </FormSection>
    </FormSheet>
  );
}
