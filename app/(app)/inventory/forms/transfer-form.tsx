'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types';
import { useHubs, useProductBatches, useTransferStock } from '@/hooks/use-queries';
import { hubOptionLabel } from '@/lib/api-mappers';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import type { RequestConfirm } from '../inventory-utils';
import { ProductSummary, selectClass } from './form-bits';

/** Move one purchase batch to another location. */
export function TransferForm({ product, onClose, requestConfirm }: Readonly<{
  product: InventoryItem;
  onClose: () => void;
  requestConfirm: RequestConfirm;
}>) {
  const transferStock = useTransferStock();
  const { data: hubs = [] } = useHubs();
  const { data: transferBatches = [], isFetching: transferBatchesLoading } = useProductBatches(product.id);
  const [pickedBatch, setPickedBatch] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferToHubId, setTransferToHubId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Default to the first open batch until the user picks one (FEFO order from the API).
  const transferBatchNumber =
    pickedBatch && transferBatches.some((b) => b.batchNumber === pickedBatch) ? pickedBatch : transferBatches[0]?.batchNumber ?? '';

  const transferDestinations = useMemo(
    () =>
      hubs
        .filter((h) => h.isActive && h.id !== product.hubId)
        .map((h) => ({ key: `hub:${h.id}`, id: h.id, kind: 'hub' as const, label: hubOptionLabel(h) })),
    [hubs, product.hubId],
  );
  const selectedTransferBatch = transferBatches.find((b) => b.batchNumber === transferBatchNumber);

  const handleTransfer = () => {
    if (!product.hubId) {
      toast.error('Product location is missing.');
      return;
    }
    if (!transferBatchNumber) {
      toast.error('Select a purchase batch.');
      return;
    }
    if (!transferToHubId) {
      toast.error('Select a destination location.');
      return;
    }
    if (!(transferQuantity > 0)) {
      toast.error('Enter a valid quantity.');
      return;
    }
    const batchRemaining = selectedTransferBatch?.quantityRemaining ?? 0;
    if (transferQuantity > batchRemaining) {
      toast.error(`Batch ${transferBatchNumber} only has ${batchRemaining} remaining.`);
      return;
    }
    const dest = transferDestinations.find((d) => d.key === transferToHubId);
    const payload = {
      item_id: product.id,
      quantity: transferQuantity,
      from_hub_id: product.hubId,
      to_hub_id: dest?.id || transferToHubId,
      batch_number: transferBatchNumber,
      notes: transferNotes.trim() || undefined,
    };
    requestConfirm({
      title: 'Review transfer',
      subtitle: product.name,
      rows: [
        { label: 'Product', value: `${product.name} (${product.sku})` },
        { label: 'Batch', value: transferBatchNumber },
        { label: 'Quantity', value: `${transferQuantity} ${product.unitOfMeasure}` },
        { label: 'From', value: product.location },
        { label: 'To', value: dest?.label || transferToHubId },
        ...(payload.notes ? [{ label: 'Notes', value: payload.notes }] : []),
      ],
      confirmLabel: 'Confirm transfer',
      run: () => {
        void (async () => {
          try {
            await transferStock.mutateAsync(payload);
            toast.success(`Transferred batch ${transferBatchNumber} to destination.`);
            onClose();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Transfer failed.');
          }
        })();
      },
    });
  };

  const disabledReason = transferBatchesLoading && transferBatches.length === 0
    ? 'Loading batches'
    : transferBatches.length === 0
      ? 'No open batches: record a purchase first'
      : !transferToHubId
        ? 'Choose a destination'
        : null;

  return (
    <FormSheet
      title="Transfer stock"
      description={`From ${product.location}`}
      onClose={onClose}
      onSubmit={handleTransfer}
      submitLabel="Review transfer"
      submitting={transferStock.isPending}
      disabledReason={disabledReason}
    >
      <FormSection title="Product">
        <ProductSummary item={product} />
      </FormSection>
      <FormSection title="Transfer">
        <FormField label="Batch" htmlFor="transfer-batch" required>
          <FilterSelect
            id="transfer-batch"
            value={transferBatchNumber || 'none'}
            className={selectClass}
            onChange={(v) => setPickedBatch(v === 'none' ? '' : v)}
            options={
              transferBatches.length === 0
                ? [{ value: 'none', label: transferBatchesLoading ? 'Loading batches…' : 'No open batches' }]
                : transferBatches.map((b) => ({ value: b.batchNumber, label: `${b.batchNumber}: ${b.quantityRemaining} remaining` }))
            }
          />
        </FormField>
        <FormField
          label="Quantity"
          htmlFor="transfer-qty"
          required
          hint={selectedTransferBatch ? `Max for batch ${transferBatchNumber}: ${selectedTransferBatch.quantityRemaining}` : undefined}
        >
          <input
            id="transfer-qty"
            type="number"
            min={0.01}
            step="any"
            max={selectedTransferBatch?.quantityRemaining ?? undefined}
            value={transferQuantity}
            onChange={(e) => setTransferQuantity(parseFloat(e.target.value) || 0)}
            className={fieldClass}
          />
        </FormField>
        <FormField label="To location" htmlFor="transfer-to" required>
          <FilterSelect
            id="transfer-to"
            value={transferToHubId || 'none'}
            className={selectClass}
            onChange={(v) => setTransferToHubId(v === 'none' ? '' : v)}
            options={[{ value: 'none', label: 'Choose hub, RSP or store' }, ...transferDestinations.map((d) => ({ value: d.key, label: d.label }))]}
          />
        </FormField>
        <FormField label="Notes" htmlFor="transfer-notes">
          <input id="transfer-notes" type="text" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} placeholder="Optional notes" className={fieldClass} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
