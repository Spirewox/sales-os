'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { InventoryItem } from '@/types';
import { useHubs, useUpdateProduct } from '@/hooks/use-queries';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { hubOptionLabel } from '@/lib/api-mappers';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { formatInventoryStockDisplay } from '@/lib/format-carton-stock';
import { ProductImageEditor, productImagePayload, type ImageDraft } from '@/components/product-image-editor';
import type { ConfirmPreviewRow } from '@/components/confirm-preview-modal';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { ALL_UOMS, fmtMoney, parseMoneyInput, roundMoney2, type ProductCategory, type RequestConfirm } from '../inventory-utils';
import { selectClass } from './form-bits';

/**
 * Edit catalogue details. Stock on hand is no longer editable here: it used to overwrite
 * `current_stock` directly (bypassing the batch ledger); changes now go through Adjust stock.
 */
export function EditSkuForm({ original, hubScope, canAdjust, onAdjust, onClose, requestConfirm }: Readonly<{
  original: InventoryItem;
  hubScope: HubScopeFilter;
  canAdjust: boolean;
  onAdjust: () => void;
  onClose: () => void;
  requestConfirm: RequestConfirm;
}>) {
  const updateProduct = useUpdateProduct();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);
  const [editProduct, setEditProduct] = useState<Partial<InventoryItem>>(() => ({
    id: original.id,
    sku: original.sku,
    name: original.name,
    imageUrl: original.imageUrl,
    category: original.category,
    unitOfMeasure: original.unitOfMeasure,
    minStockLevel: original.minStockLevel,
    baseSellingPrice: original.baseSellingPrice,
    cartonPrice: original.cartonPrice,
    cartonCost: original.cartonCost,
    cartonWeight: original.cartonWeight,
    location: original.location,
  }));
  const [imageDraft, setImageDraft] = useState<ImageDraft>();
  const [imageProgress, setImageProgress] = useState<number>();
  const uploading = imageProgress !== undefined;

  const handleEditProduct = () => {
    if (!editProduct.id) return;

    if (editProduct.unitOfMeasure === 'Cartons' && !(editProduct.cartonWeight && editProduct.cartonWeight > 0)) {
      toast.error('Carton weight (Kg) is required when unit of measure is Cartons.');
      return;
    }

    const cartonPrice = editProduct.cartonPrice === original.cartonPrice ? undefined : editProduct.cartonPrice;
    const cartonCost = editProduct.cartonCost === original.cartonCost ? undefined : editProduct.cartonCost;
    if (
      editProduct.unitOfMeasure === 'Kg' &&
      [cartonPrice, cartonCost].some((value) => value != null && (!(value > 0) || value !== roundMoney2(value)))
    ) {
      toast.error('Carton prices must be positive amounts with at most two decimal places.');
      return;
    }

    const hub = activeHubs.find((h) => h.name === (editProduct.location || original.location));
    const payload = {
      id: editProduct.id,
      name: editProduct.name,
      category: editProduct.category,
      unit_of_measure: editProduct.unitOfMeasure,
      min_stock_level: editProduct.minStockLevel,
      carton_weight: editProduct.cartonWeight,
      base_selling_price: roundMoney2(editProduct.baseSellingPrice ?? original.baseSellingPrice),
      carton_price: editProduct.unitOfMeasure === 'Kg'
        ? cartonPrice
        : editProduct.unitOfMeasure === 'Cartons'
          ? roundMoney2(editProduct.cartonPrice ?? original.cartonPrice ?? 0)
          : undefined,
      carton_cost: editProduct.unitOfMeasure === 'Kg' ? cartonCost : undefined,
      ...(hub?.id ? { hub_id: hub.id } : {}),
    };

    const fmtDiff = (v: unknown) => (v == null || v === '' ? '-' : String(v));
    const rows: ConfirmPreviewRow[] = [];
    const pushChange = (label: string, before: unknown, after: unknown, asMoney = false) => {
      const beforeStr = asMoney ? `₦${fmtMoney(Number(before) || 0)}` : fmtDiff(before);
      const afterStr = asMoney ? `₦${fmtMoney(Number(after) || 0)}` : fmtDiff(after);
      if (beforeStr === afterStr) return;
      rows.push({ label, value: `${beforeStr} → ${afterStr}` });
    };

    pushChange('Name', original.name, editProduct.name);
    pushChange('Category', original.category, editProduct.category);
    pushChange('UOM', original.unitOfMeasure, editProduct.unitOfMeasure);
    pushChange('Min stock', original.minStockLevel, editProduct.minStockLevel);
    pushChange('Location', original.location, editProduct.location || original.location);
    pushChange('Selling price (all batches)', original.baseSellingPrice, editProduct.baseSellingPrice, true);
    if (payload.carton_price != null) pushChange('Carton selling price (all batches)', original.cartonPrice, payload.carton_price, true);
    if (payload.carton_cost != null) pushChange('Carton cost', original.cartonCost, payload.carton_cost, true);
    pushChange('Carton weight', original.cartonWeight, editProduct.cartonWeight);
    if (imageDraft) rows.push({ label: 'Product image', value: 'url' in imageDraft && !imageDraft.url ? 'Remove' : 'Replace' });

    if (rows.length === 0) {
      toast.error('No changes to save.');
      return;
    }

    requestConfirm({
      title: 'Review changes',
      subtitle: original.name,
      rows,
      confirmLabel: 'Save changes',
      run: async () => {
        try {
          if (imageDraft && 'file' in imageDraft) setImageProgress(0);
          const image = await productImagePayload(imageDraft, { productId: payload.id }, setImageProgress);
          await updateProduct.mutateAsync({ ...payload, ...image });
          onClose();
          toast.success('Product updated successfully.');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not save the product.');
        } finally {
          setImageProgress(undefined);
        }
      },
    });
  };

  const close = () => { if (!uploading) onClose(); };
  const uom = editProduct.unitOfMeasure;

  return (
    <FormSheet
      title="Edit SKU"
      onClose={close}
      onSubmit={handleEditProduct}
      submitLabel="Review changes"
      submitting={updateProduct.isPending || uploading}
      disabledReason={!editProduct.name?.trim() ? 'Enter a product name' : null}
      preview={<span>Product code <span className="font-mono text-foreground">{editProduct.sku || 'N/A'}</span>, regenerated if supplier, location or category changes</span>}
    >
      <FormSection title="Product">
        <fieldset disabled={uploading}>
          <ProductImageEditor saved={editProduct.imageUrl} draft={imageDraft} onChange={setImageDraft} />
        </fieldset>
        {uploading && <progress aria-label="Image upload progress" max={100} value={imageProgress} className="w-full" />}
        <FormField label="Product name" htmlFor="edit-name" required>
          <input id="edit-name" type="text" value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className={fieldClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" htmlFor="edit-category">
            <FilterSelect id="edit-category" value={editProduct.category ?? ''} className={selectClass} onChange={(v) => setEditProduct({ ...editProduct, category: v as ProductCategory })} options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </FormField>
          <FormField label="Unit of measure" htmlFor="edit-uom">
            <FilterSelect id="edit-uom" value={uom ?? ''} className={selectClass} onChange={(v) => setEditProduct({ ...editProduct, unitOfMeasure: v as InventoryItem['unitOfMeasure'] })} options={ALL_UOMS.map((u) => ({ value: u, label: u }))} />
          </FormField>
          <FormField label="Min stock level" htmlFor="edit-min">
            <input id="edit-min" type="number" value={editProduct.minStockLevel ?? ''} onChange={(e) => setEditProduct({ ...editProduct, minStockLevel: parseInt(e.target.value) || 0 })} className={fieldClass} />
          </FormField>
          <FormField label="Location" htmlFor="edit-location">
            {hubScope.canSwitchHubs ? (
              <FilterSelect id="edit-location" value={editProduct.location ?? ''} className={selectClass} onChange={(v) => setEditProduct({ ...editProduct, location: v })} options={hubScope.activeHubs.map((h) => ({ value: h.name, label: hubOptionLabel(h) }))} />
            ) : (
              <input id="edit-location" type="text" readOnly disabled value={editProduct.location || hubScope.hubName} className={fieldClass} />
            )}
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">
            On hand <span className="font-medium text-foreground tabular-nums">{formatInventoryStockDisplay(original)}</span>. Stock changes go through the batch ledger.
          </span>
          {canAdjust && (
            <button type="button" onClick={onAdjust} className="text-sm font-medium text-primary hover:underline">Adjust stock</button>
          )}
        </div>
      </FormSection>

      <FormSection title="Selling prices" description="Prices apply to every available batch of this product. Batch costs stay attached to receipts.">
        <div className="grid grid-cols-2 gap-3">
          <FormField label={`Selling price (₦)${uom === 'Cartons' ? ' per Kg' : ''}`} htmlFor="edit-price">
            <input id="edit-price" type="number" min={0} step="0.01" value={editProduct.baseSellingPrice ?? ''} onChange={(e) => setEditProduct({ ...editProduct, baseSellingPrice: parseMoneyInput(e.target.value) })} className={fieldClass} />
          </FormField>
          {(uom === 'Cartons' || uom === 'Kg') && (
            <FormField label="Carton selling price (₦)" htmlFor="edit-carton-price">
              <input id="edit-carton-price" type="number" min={0} step="0.01" value={editProduct.cartonPrice ?? ''} onChange={(e) => setEditProduct({ ...editProduct, cartonPrice: e.target.value === '' ? undefined : Number(e.target.value) })} className={fieldClass} />
            </FormField>
          )}
          {uom === 'Kg' && (
            <FormField label="Carton cost (₦, optional)" htmlFor="edit-carton-cost">
              <input id="edit-carton-cost" type="number" min={0.01} step="0.01" value={editProduct.cartonCost ?? ''} onChange={(e) => setEditProduct({ ...editProduct, cartonCost: e.target.value === '' ? undefined : Number(e.target.value) })} className={fieldClass} />
            </FormField>
          )}
          {uom === 'Cartons' && (
            <FormField label="Carton weight (Kg)" htmlFor="edit-carton-weight" required>
              <input id="edit-carton-weight" type="number" min={0.01} step="0.01" value={editProduct.cartonWeight ?? ''} onChange={(e) => setEditProduct({ ...editProduct, cartonWeight: parseFloat(e.target.value) || undefined })} placeholder="Required for Cartons" className={fieldClass} />
            </FormField>
          )}
        </div>
      </FormSection>
    </FormSheet>
  );
}
