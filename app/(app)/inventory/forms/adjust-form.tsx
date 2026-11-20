'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { InventoryItem, StockMovementType } from '@/types';
import { useBatchStockUpdate } from '@/hooks/use-queries';
import { formatStockQuantity } from '@/lib/format-carton-stock';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { roundQty2, type RequestConfirm } from '../inventory-utils';
import { FilterSelect } from '@/components/filter-select';
import { ProductSummary, selectClass } from './form-bits';

const REASONS = ['Stock count correction', 'Damaged', 'Spoiled or expired', 'Opening stock', 'Other'] as const;

/**
 * Correct stock on hand with an ADJUSTMENT movement, so the change lands in the batch ledger
 * (replaces overwriting current stock from Edit). Uses the existing batch stock endpoint.
 */
export function AdjustForm({ product, onClose, requestConfirm }: Readonly<{
  product: InventoryItem;
  onClose: () => void;
  requestConfirm: RequestConfirm;
}>) {
  const batchStockUpdate = useBatchStockUpdate();
  const [direction, setDirection] = useState<'add' | 'remove'>('remove');
  const [qtyDraft, setQtyDraft] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('Stock count correction');
  const [notes, setNotes] = useState('');

  const qty = roundQty2(Number.parseFloat(qtyDraft) || 0);
  const delta = direction === 'add' ? qty : -qty;
  const stockAfter = roundQty2((product.currentStock || 0) + delta);
  const tooMuch = direction === 'remove' && qty > (product.currentStock || 0);

  const submit = () => {
    if (!(qty > 0)) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (tooMuch) {
      toast.error(`Only ${formatStockQuantity(product.currentStock, product.unitOfMeasure)} ${product.unitOfMeasure} on hand.`);
      return;
    }
    const note = [reason, notes.trim()].filter(Boolean).join(': ');
    const updates = [{ item_id: product.id, quantity: delta }];
    requestConfirm({
      title: 'Review adjustment',
      subtitle: product.name,
      rows: [
        { label: 'Product', value: `${product.name} (${product.sku})` },
        { label: 'Change', value: `${delta > 0 ? '+' : ''}${delta} ${product.unitOfMeasure}` },
        { label: 'Stock after', value: `${stockAfter} ${product.unitOfMeasure}` },
        { label: 'Reason', value: note },
      ],
      confirmLabel: 'Apply adjustment',
      run: () => {
        batchStockUpdate.mutate(
          { type: StockMovementType.ADJUSTMENT, notes: note, updates },
          {
            onSuccess: () => {
              toast.success('Stock adjusted.');
              onClose();
            },
            onError: (err) => toast.error(err.message),
          },
        );
      },
    });
  };

  const disabledReason = !(qty > 0) ? 'Enter a quantity' : tooMuch ? 'More than is on hand' : null;
  const step = product.unitOfMeasure === 'Units' || product.unitOfMeasure === 'Cartons' ? 'any' : '0.01';

  return (
    <FormSheet
      title="Adjust stock"
      description="Records an adjustment in the stock ledger. To add stock with a cost and expiry date, record a purchase instead."
      onClose={onClose}
      onSubmit={submit}
      submitLabel="Review adjustment"
      submitting={batchStockUpdate.isPending}
      disabledReason={disabledReason}
      preview={qty > 0 ? `Stock after: ${stockAfter} ${product.unitOfMeasure}` : undefined}
    >
      <FormSection title="Product">
        <ProductSummary item={product} />
      </FormSection>
      <FormSection title="Adjustment">
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Direction</legend>
          <div className="inline-flex rounded-md border p-0.5">
            {(['remove', 'add'] as const).map((d) => (
              <label key={d} className={cn('cursor-pointer rounded px-3 py-1.5 text-sm font-medium has-focus-visible:outline-2 has-focus-visible:outline-ring', direction === d ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                <input type="radio" name="adjust-direction" value={d} checked={direction === d} onChange={() => setDirection(d)} className="sr-only" />
                {d === 'remove' ? 'Remove stock' : 'Add stock'}
              </label>
            ))}
          </div>
        </fieldset>
        <FormField label={`Quantity (${product.unitOfMeasure})`} htmlFor="adjust-qty" required error={tooMuch ? 'More than is on hand.' : null}>
          <input id="adjust-qty" type="number" min={0} step={step} value={qtyDraft} onChange={(e) => setQtyDraft(e.target.value)} aria-invalid={tooMuch || undefined} className={fieldClass} />
        </FormField>
        <FormField label="Reason" htmlFor="adjust-reason" required>
          <FilterSelect id="adjust-reason" value={reason} onChange={(v) => setReason(v as (typeof REASONS)[number])} className={selectClass} options={REASONS.map((r) => ({ value: r, label: r }))} />
        </FormField>
        <FormField label="Notes" htmlFor="adjust-notes">
          <input id="adjust-notes" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional details" className={fieldClass} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
