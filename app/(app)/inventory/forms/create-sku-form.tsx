'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import type { InventoryItem } from '@/types';
import { useCreateProduct, useHubs, useSuppliers } from '@/hooks/use-queries';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { hubOptionLabel } from '@/lib/api-mappers';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { isLitersUom } from '@/lib/volume-units';
import { ProductImageEditor, productImagePayload, type ImageDraft } from '@/components/product-image-editor';
import type { ConfirmPreviewRow } from '@/components/confirm-preview-modal';
import { FilterSelect } from '@/components/filter-select';
import { DateField, FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import {
  ALL_UOMS, acceptDecimal2, fmtMoney, kgQtyDraftToNumber, parseMoneyInput, roundMoney2, sanitizeKgQtyDraft,
  sellingPriceForMargin, type ProductCategory, type RequestConfirm,
} from '../inventory-utils';
import { Hint, selectClass } from './form-bits';

type NewProductForm = Partial<InventoryItem> & {
  hubId?: string;
  purchasedDate?: string;
  expiryDate?: string;
  expenseMatchScope?: 'hub' | 'all';
};

const emptyNewProduct = (hubId?: string, hubName?: string): NewProductForm => ({
  sku: '', name: '', category: 'Fish', unitOfMeasure: 'Cartons',
  minStockLevel: 5, currentStock: 0, avgUnitCost: 0, baseSellingPrice: 0,
  hubId: hubId || undefined,
  location: hubName || '',
  supplierId: '',
  purchasedDate: '',
  expiryDate: '',
  isExpensed: false,
  expenseMode: 'percent',
  expenseValue: undefined,
  expenseCountUnit: 'carton',
  expenseMatchScope: 'hub',
});

/** Create SKU: the product first; opening stock is optional and collapsed. */
export function CreateSkuForm({ hubScope, onClose, requestConfirm }: Readonly<{
  hubScope: HubScopeFilter;
  onClose: () => void;
  requestConfirm: RequestConfirm;
}>) {
  const createProduct = useCreateProduct();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);
  const { data: supplierList } = useSuppliers({ is_active: true, limit: 200 });
  const activeSuppliers = supplierList?.items ?? [];

  const [newProduct, setNewProduct] = useState<NewProductForm>(() => {
    const picked = hubScope.activeHubs.find((h) => h.name === hubScope.filterHub);
    return emptyNewProduct(picked?.id ?? hubScope.defaultHubId, picked?.name ?? hubScope.defaultHubName);
  });
  const [initialStockDraft, setInitialStockDraft] = useState('');
  const [imageDraft, setImageDraft] = useState<ImageDraft>();
  const [imageProgress, setImageProgress] = useState<number>();
  const uploading = imageProgress !== undefined;
  const isCartons = newProduct.unitOfMeasure === 'Cartons';

  const handleSaveProduct = () => {
    if (!newProduct.name?.trim()) {
      toast.error('Please fill in Product Name.');
      return;
    }
    if (newProduct.unitOfMeasure === 'Cartons') {
      if (!(newProduct.cartonWeight && newProduct.cartonWeight > 0)) {
        toast.error('Carton weight (Kg) is required when unit of measure is Cartons.');
        return;
      }
      if (!(newProduct.cartonPrice && newProduct.cartonPrice > 0)) {
        toast.error('Carton selling price is required when unit of measure is Cartons.');
        return;
      }
      if (!(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0)) {
        toast.error('Unit selling price is required when unit of measure is Cartons (used for Kg sales).');
        return;
      }
    } else if (!(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0)) {
      toast.error('Selling price is required.');
      return;
    }
    if (newProduct.isExpensed) {
      const initialStockQty = newProduct.unitOfMeasure === 'Kg' ? kgQtyDraftToNumber(initialStockDraft) : Number(newProduct.currentStock) || 0;
      if (!(initialStockQty > 0)) {
        toast.error('Initial (purchased) stock is required when marking as expensed.');
        return;
      }
      if (!newProduct.expenseMode) {
        toast.error('Select expense mode (percent or count).');
        return;
      }
      if (!(newProduct.expenseValue && newProduct.expenseValue > 0)) {
        toast.error('Expense value must be greater than 0.');
        return;
      }
      if (newProduct.expenseMode === 'percent' && newProduct.expenseValue > 100) {
        toast.error('Expense percent cannot exceed 100.');
        return;
      }
      if (newProduct.unitOfMeasure === 'Cartons' && newProduct.expenseMode === 'count' && !newProduct.expenseCountUnit) {
        toast.error('Select whether the expense count is in cartons or kg.');
        return;
      }
      if (!newProduct.expenseMatchScope) {
        toast.error('Select whether to match sales in this hub only or all hubs.');
        return;
      }
    }
    const hubId =
      newProduct.hubId ||
      hubScope.defaultHubId ||
      activeHubs.find((h) => h.name === newProduct.location)?.id ||
      activeHubs[0]?.id;
    if (!hubId) {
      toast.error('Select a location hub.');
      return;
    }
    const hubLabel = activeHubs.find((h) => h.id === hubId)?.name || newProduct.location || hubId;
    const initialStock = newProduct.unitOfMeasure === 'Kg' ? kgQtyDraftToNumber(initialStockDraft) : newProduct.currentStock || 0;
    const payload = {
      name: newProduct.name!,
      category: newProduct.category,
      unit_of_measure: newProduct.unitOfMeasure,
      min_stock_level: newProduct.minStockLevel || 5,
      current_stock: initialStock,
      avg_unit_cost: roundMoney2(newProduct.avgUnitCost),
      base_selling_price: roundMoney2(newProduct.baseSellingPrice),
      carton_price: newProduct.cartonPrice != null ? roundMoney2(newProduct.cartonPrice) : undefined,
      carton_weight: newProduct.cartonWeight,
      hub_id: hubId,
      supplier_id: newProduct.supplierId || undefined,
      purchased_date: newProduct.purchasedDate || undefined,
      expiry_date: newProduct.expiryDate || undefined,
      ...(newProduct.isExpensed
        ? {
            is_expensed: true as const,
            expense_mode: newProduct.expenseMode,
            expense_value: newProduct.expenseValue,
            expense_match_scope: newProduct.expenseMatchScope,
            ...(newProduct.unitOfMeasure === 'Cartons' && newProduct.expenseMode === 'count'
              ? { expense_count_unit: newProduct.expenseCountUnit }
              : {}),
          }
        : {}),
    };
    const rows: ConfirmPreviewRow[] = [
      { label: 'Name', value: payload.name },
      { label: 'Category', value: String(payload.category ?? '-') },
      { label: 'UOM', value: String(payload.unit_of_measure ?? '-') },
      { label: 'Location', value: hubLabel },
      { label: 'Initial stock', value: `${initialStock} ${payload.unit_of_measure ?? ''}`.trim() },
      { label: 'Unit cost', value: `₦${fmtMoney(payload.avg_unit_cost)}` },
      { label: 'Selling price', value: `₦${fmtMoney(payload.base_selling_price)}` },
    ];
    if (payload.carton_price != null) rows.push({ label: 'Carton price', value: `₦${fmtMoney(payload.carton_price)}` });
    if (payload.carton_weight != null) rows.push({ label: 'Carton weight', value: `${payload.carton_weight} Kg` });
    if (newProduct.isExpensed) {
      rows.push({ label: 'Expensed', value: `${payload.expense_mode}, ${payload.expense_value}`, tone: 'warn' });
    }
    requestConfirm({
      title: 'Review & create',
      subtitle: payload.name,
      rows,
      confirmLabel: 'Create product',
      run: async () => {
        try {
          if (imageDraft && 'file' in imageDraft) setImageProgress(0);
          const image = await productImagePayload(imageDraft, { hubId }, setImageProgress);
          const created = await createProduct.mutateAsync({ ...payload, ...image });
          onClose();
          toast.success(created?.sku ? `Product created (${created.sku}).` : 'Product created successfully.');
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Could not save the product.');
        } finally {
          setImageProgress(undefined);
        }
      },
    });
  };

  const priceMissing = isCartons
    ? !(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0) || !(newProduct.cartonPrice && newProduct.cartonPrice > 0) || !(newProduct.cartonWeight && newProduct.cartonWeight > 0)
    : !(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0);
  const disabledReason = !newProduct.name?.trim()
    ? 'Enter a product name'
    : priceMissing
      ? isCartons ? 'Enter the selling prices and carton weight' : 'Enter a selling price'
      : null;

  const hubLabel = hubScope.activeHubs.find((h) => h.id === newProduct.hubId)?.name ?? newProduct.location ?? hubScope.hubName;
  const supplierName = activeSuppliers.find((s) => s.id === newProduct.supplierId)?.name;
  const negativeMargin =
    (newProduct.avgUnitCost ?? 0) > 0 && sellingPriceForMargin(newProduct) > 0 && (newProduct.avgUnitCost ?? 0) > sellingPriceForMargin(newProduct);

  const close = () => { if (!uploading) onClose(); };

  return (
    <FormSheet
      title="Create SKU"
      onClose={close}
      onSubmit={handleSaveProduct}
      submitLabel="Review & create"
      submitting={createProduct.isPending || uploading}
      disabledReason={disabledReason}
      preview={
        <span>
          Product code: assigned on save as {supplierName ? 'supplier/' : ''}location/category-number
          <span className="text-foreground"> ({[supplierName, hubLabel, newProduct.category].filter(Boolean).join(', ')})</span>
        </span>
      }
    >
      <FormSection title="Product">
        <fieldset disabled={uploading}>
          <ProductImageEditor draft={imageDraft} onChange={setImageDraft} />
        </fieldset>
        {uploading && <progress aria-label="Image upload progress" max={100} value={imageProgress} className="w-full" />}
        <FormField label="Product name" htmlFor="sku-name" required>
          <input id="sku-name" type="text" value={newProduct.name || ''} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className={fieldClass} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" htmlFor="sku-category">
            <FilterSelect id="sku-category" value={newProduct.category ?? 'Fish'} className={selectClass} onChange={(v) => setNewProduct({ ...newProduct, category: v as ProductCategory })} options={PRODUCT_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </FormField>
          <FormField label="Unit of measure" htmlFor="sku-uom">
            <FilterSelect id="sku-uom" value={newProduct.unitOfMeasure ?? 'Cartons'} className={selectClass} onChange={(v) => setNewProduct({ ...newProduct, unitOfMeasure: v as InventoryItem['unitOfMeasure'] })} options={ALL_UOMS.map((u) => ({ value: u, label: u }))} />
          </FormField>
          <FormField label={isCartons ? 'Unit selling price (₦)' : 'Selling price (₦)'} htmlFor="sku-price" required hint={isCartons ? 'Price per Kg, used for Kg sales.' : undefined}>
            <input
              id="sku-price"
              type="number"
              min={0.01}
              step="0.01"
              value={newProduct.baseSellingPrice || ''}
              onChange={(e) => {
                if (isCartons && !acceptDecimal2(e.target.value)) return;
                setNewProduct({ ...newProduct, baseSellingPrice: parseMoneyInput(e.target.value) });
              }}
              className={fieldClass}
            />
          </FormField>
          <FormField label="Min stock level" htmlFor="sku-min">
            <input id="sku-min" type="number" value={newProduct.minStockLevel || ''} onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: parseInt(e.target.value) || 0 })} className={fieldClass} />
          </FormField>
          {isCartons && (
            <>
              <FormField label="Carton selling price (₦)" htmlFor="sku-carton-price" required>
                <input
                  id="sku-carton-price"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={newProduct.cartonPrice || ''}
                  onChange={(e) => {
                    if (!acceptDecimal2(e.target.value)) return;
                    setNewProduct({ ...newProduct, cartonPrice: e.target.value.trim() === '' ? undefined : parseMoneyInput(e.target.value) });
                  }}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="Carton weight (Kg)" htmlFor="sku-carton-weight" required hint="Up to 2 decimal places (Kg).">
                <input
                  id="sku-carton-weight"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={newProduct.cartonWeight || ''}
                  onChange={(e) => {
                    const next = sanitizeKgQtyDraft(e.target.value);
                    if (next === null) return;
                    setNewProduct({ ...newProduct, cartonWeight: next === '' ? undefined : kgQtyDraftToNumber(next) });
                  }}
                  className={fieldClass}
                />
              </FormField>
            </>
          )}
        </div>
        <FormField label="Supplier (optional)" htmlFor="sku-supplier">
          <FilterSelect
            id="sku-supplier"
            value={newProduct.supplierId || 'none'}
            className={selectClass}
            onChange={(v) => setNewProduct({ ...newProduct, supplierId: v === 'none' ? undefined : v })}
            options={[{ value: 'none', label: 'None' }, ...activeSuppliers.map((s) => ({ value: s.id, label: `${s.name}${s.businessName ? ` (${s.businessName})` : ''}` }))]}
          />
        </FormField>
        <FormField label="Location" htmlFor="sku-location">
          {hubScope.canSwitchHubs ? (
            <FilterSelect
              id="sku-location"
              value={newProduct.hubId ?? hubScope.defaultHubId ?? ''}
              className={selectClass}
              onChange={(v) => {
                const hub = hubScope.activeHubs.find((h) => h.id === v);
                setNewProduct({ ...newProduct, hubId: hub?.id, location: hub?.name || '' });
              }}
              options={hubScope.activeHubs.map((h) => ({ value: h.id, label: hubOptionLabel(h) }))}
            />
          ) : (
            <input id="sku-location" type="text" readOnly disabled value={hubScope.hubName} className={fieldClass} />
          )}
        </FormField>
      </FormSection>

      <FormSection title="Opening stock" description="Stock you already hold. Leave closed to start at zero and record a purchase later." optional>
        <div className="grid grid-cols-2 gap-3">
          <FormField
            label="Initial stock"
            htmlFor="sku-initial"
            hint={newProduct.unitOfMeasure === 'Kg' ? 'Up to 2 decimal places (Kg).' : isLitersUom(newProduct.unitOfMeasure) ? 'Up to 3 decimal places (Liters). 1000 ml = 1 L.' : undefined}
          >
            <input
              id="sku-initial"
              type="number"
              min={0}
              step={newProduct.unitOfMeasure === 'Kg' || isLitersUom(newProduct.unitOfMeasure) ? (newProduct.unitOfMeasure === 'Kg' ? '0.01' : '0.001') : 1}
              value={newProduct.unitOfMeasure === 'Kg' ? initialStockDraft : newProduct.currentStock || ''}
              onChange={(e) => {
                if (newProduct.unitOfMeasure === 'Kg') {
                  const next = sanitizeKgQtyDraft(e.target.value);
                  if (next === null) return;
                  setInitialStockDraft(next);
                  setNewProduct({ ...newProduct, currentStock: kgQtyDraftToNumber(next) });
                  return;
                }
                setNewProduct({
                  ...newProduct,
                  currentStock: isLitersUom(newProduct.unitOfMeasure) ? parseFloat(e.target.value) || 0 : parseInt(e.target.value, 10) || 0,
                });
              }}
              onBlur={() => {
                if (newProduct.unitOfMeasure !== 'Kg') return;
                const n = kgQtyDraftToNumber(initialStockDraft);
                setInitialStockDraft(n > 0 ? String(n) : '');
                setNewProduct((prev) => ({ ...prev, currentStock: n }));
              }}
              className={fieldClass}
            />
          </FormField>
          <FormField label={isCartons ? 'Avg carton cost (₦)' : 'Avg unit cost (₦)'} htmlFor="sku-cost" hint={isCartons ? 'Cost per carton (same unit as stock).' : undefined}>
            <input id="sku-cost" type="number" min={0} step="0.01" value={newProduct.avgUnitCost || ''} onChange={(e) => setNewProduct({ ...newProduct, avgUnitCost: parseMoneyInput(e.target.value) })} className={fieldClass} />
          </FormField>
          <FormField label="Purchased date" htmlFor="sku-purchased">
            <DateField id="sku-purchased" value={newProduct.purchasedDate || ''} clearable onChange={(v) => setNewProduct({ ...newProduct, purchasedDate: v })} />
          </FormField>
          <FormField label="Expiry date" htmlFor="sku-expiry">
            <DateField id="sku-expiry" value={newProduct.expiryDate || ''} clearable min={newProduct.purchasedDate || undefined} onChange={(v) => setNewProduct({ ...newProduct, expiryDate: v })} />
          </FormField>
        </div>
        {negativeMargin && (
          <p className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <ShieldAlert size={16} aria-hidden /> Cost exceeds selling price: negative margin.
          </p>
        )}
        <div className="space-y-3 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={!!newProduct.isExpensed}
              onChange={(e) =>
                setNewProduct({
                  ...newProduct,
                  isExpensed: e.target.checked,
                  expenseMode: newProduct.expenseMode || 'percent',
                  expenseCountUnit: newProduct.expenseCountUnit || 'carton',
                  expenseMatchScope: newProduct.expenseMatchScope || 'hub',
                })
              }
            />
            Mark opening stock as expensed
          </label>
          <Hint>
            Deducts loss from initial stock (cost on remaining stays as entered). Attaches expense only to whole matching name+category sales (no stock log yet) whose quantities add up exactly to the expense, e.g. 2kg via one 2kg sale or 1kg+1kg. Stock logs show the sale description and date for lookup in Sales.
          </Hint>
          {newProduct.isExpensed && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormField label="Match sales scope" htmlFor="sku-exp-scope" required hint="Finds sales by product name + category (case-insensitive), oldest first.">
                  <FilterSelect
                    id="sku-exp-scope"
                    value={newProduct.expenseMatchScope || 'hub'}
                    className={selectClass}
                    onChange={(v) => setNewProduct({ ...newProduct, expenseMatchScope: v as 'hub' | 'all' })}
                    options={[{ value: 'hub', label: 'This hub only' }, { value: 'all', label: 'All hubs' }]}
                  />
                </FormField>
              </div>
              <FormField label="Expense mode" htmlFor="sku-exp-mode">
                <FilterSelect
                  id="sku-exp-mode"
                  value={newProduct.expenseMode || 'percent'}
                  className={selectClass}
                  onChange={(v) => setNewProduct({ ...newProduct, expenseMode: v as 'percent' | 'count' })}
                  options={[{ value: 'percent', label: 'Percent of purchased' }, { value: 'count', label: 'Count' }]}
                />
              </FormField>
              <FormField label={newProduct.expenseMode === 'count' ? 'Expense count' : 'Expense percent'} htmlFor="sku-exp-value" required>
                <input
                  id="sku-exp-value"
                  type="number"
                  min={0.01}
                  max={newProduct.expenseMode === 'percent' ? 100 : undefined}
                  step="0.01"
                  value={newProduct.expenseValue ?? ''}
                  onChange={(e) => setNewProduct({ ...newProduct, expenseValue: parseFloat(e.target.value) || undefined })}
                  className={fieldClass}
                  placeholder={newProduct.expenseMode === 'percent' ? 'e.g. 10' : 'e.g. 2'}
                />
              </FormField>
              {isCartons && newProduct.expenseMode === 'count' && (
                <div className="col-span-2">
                  <FormField label="Count unit" htmlFor="sku-exp-unit" required>
                    <FilterSelect
                      id="sku-exp-unit"
                      value={newProduct.expenseCountUnit || 'carton'}
                      className={selectClass}
                      onChange={(v) => setNewProduct({ ...newProduct, expenseCountUnit: v as 'carton' | 'kg' })}
                      options={[{ value: 'carton', label: 'Cartons' }, { value: 'kg', label: 'Kg' }]}
                    />
                  </FormField>
                </div>
              )}
            </div>
          )}
        </div>
      </FormSection>
    </FormSheet>
  );
}
