'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { InventoryItem, StockMovementType } from '@/types';
import { useRecordStockMove, useSuppliers } from '@/hooks/use-queries';
import { FilterSelect } from '@/components/filter-select';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import { isVolumeUom, volumeConversionPreview } from '@/lib/volume-units';
import {
  acceptDecimal2, defaultPurchaseUom, fmtMoney, isCartonsUom, kgQtyDraftToNumber, needsPurchaseCartonWeight,
  parseMoneyInput, purchaseQtyToStockQty, purchaseUnitOptions, roundMoney2, roundQty2, sanitizeKgQtyDraft,
  type RequestConfirm,
} from '../inventory-utils';
import { Hint, ProductField, selectClass } from './form-bits';

type MoveData = {
  quantity: number;
  unitCost: number;
  unitPrice: number;
  cartonPrice: number;
  cartonWeight: number;
  notes: string;
  expiryDate: string;
  purchasedDate: string;
  supplier: string;
  supplierId: string;
};

type SupplierRef = { id: string; name: string };

const emptyMoveData = (item?: InventoryItem | null, supplier?: SupplierRef | null): MoveData => ({
  quantity: 1,
  unitCost: item?.avgUnitCost ?? 0,
  unitPrice: item?.baseSellingPrice ?? 0,
  cartonPrice: item?.cartonPrice ?? 0,
  cartonWeight: item?.cartonWeight ?? 0,
  notes: '',
  expiryDate: '',
  purchasedDate: '',
  supplier: supplier ? supplier.name : item?.supplier || '',
  supplierId: supplier ? supplier.id : item?.supplierId || '',
});

const initialWeightDraft = (item?: InventoryItem | null) => {
  const weight = Number(item?.cartonWeight) || 0;
  return weight > 0 ? String(roundQty2(weight)) : '';
};

/**
 * Record purchase (stock in). Opened from a row with the product fixed, or from the header with a picker.
 * `supplier` preselects the supplier (e.g. opened from a supplier's drawer).
 */
export function PurchaseForm({ items, initial, onClose, requestConfirm, supplier }: Readonly<{
  items: InventoryItem[];
  initial: InventoryItem | null;
  onClose: () => void;
  requestConfirm: RequestConfirm;
  supplier?: SupplierRef | null;
}>) {
  const recordStockMove = useRecordStockMove();
  const { data: supplierList } = useSuppliers({ is_active: true, limit: 200 });
  const activeSuppliers = supplierList?.items ?? [];

  const [product, setProduct] = useState<InventoryItem | null>(initial);
  const [moveData, setMoveData] = useState<MoveData>(() => emptyMoveData(initial, supplier));
  const [purchaseQtyDraft, setPurchaseQtyDraft] = useState('1');
  const [purchaseUom, setPurchaseUom] = useState(() => defaultPurchaseUom(initial));
  const [cartonWeightDraft, setCartonWeightDraft] = useState(() => initialWeightDraft(initial));

  const pickProduct = (item: InventoryItem | null) => {
    setProduct(item);
    setMoveData(emptyMoveData(item, supplier));
    setPurchaseQtyDraft('1');
    setPurchaseUom(defaultPurchaseUom(item));
    setCartonWeightDraft(initialWeightDraft(item));
  };

  const cartonPricing = !!product && (purchaseUom === 'Carton' || isCartonsUom(product.unitOfMeasure));

  const handleStockMove = () => {
    const selectedProduct = product;
    if (!selectedProduct) return;
    if (!purchaseUom) {
      toast.error('Select a unit.');
      return;
    }
    const enteredQty = purchaseUom === 'Kg' ? Math.abs(kgQtyDraftToNumber(purchaseQtyDraft)) : Math.abs(moveData.quantity);
    if (!(enteredQty > 0)) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    const buyingByCarton = purchaseUom === 'Carton';
    const cartonFields = buyingByCarton || isCartonsUom(selectedProduct.unitOfMeasure);
    const cartonWeight = roundQty2(kgQtyDraftToNumber(cartonWeightDraft) || moveData.cartonWeight);
    if ((buyingByCarton || needsPurchaseCartonWeight(selectedProduct, purchaseUom)) && !(cartonWeight > 0)) {
      toast.error('Carton weight (kg) is required.');
      return;
    }

    if (cartonFields) {
      if (!(moveData.unitCost > 0)) {
        toast.error('Carton cost is required.');
        return;
      }
      if (!(moveData.unitPrice > 0)) {
        toast.error('Unit selling price (per kg) is required.');
        return;
      }
      if (!(moveData.cartonPrice > 0)) {
        toast.error('Carton selling price is required.');
        return;
      }
    }

    const stockQty = purchaseQtyToStockQty({ ...selectedProduct, cartonWeight }, enteredQty, purchaseUom);
    if (!(stockQty > 0)) {
      toast.error('Could not convert quantity to stock unit. Check carton weight.');
      return;
    }

    const kgStockFromCarton = buyingByCarton && !isCartonsUom(selectedProduct.unitOfMeasure);
    const unitCost = kgStockFromCarton
      ? roundMoney2(moveData.unitCost / cartonWeight)
      : roundMoney2(moveData.unitCost || selectedProduct.avgUnitCost);
    const unitPrice = roundMoney2(moveData.unitPrice);
    const stockAfter = roundQty2((selectedProduct.currentStock || 0) + stockQty);
    const payload = {
      item_id: selectedProduct.id,
      type: StockMovementType.PURCHASE,
      quantity: stockQty,
      unit_cost: unitCost,
      unit_price: unitPrice,
      carton_cost: kgStockFromCarton ? roundMoney2(moveData.unitCost) : undefined,
      carton_price: cartonFields ? roundMoney2(moveData.cartonPrice) : undefined,
      carton_weight: cartonFields || needsPurchaseCartonWeight(selectedProduct, purchaseUom) ? cartonWeight : undefined,
      notes: moveData.notes || undefined,
      expiry_date: moveData.expiryDate || undefined,
      movement_date: moveData.purchasedDate || undefined,
      supplier: moveData.supplier || undefined,
      supplier_id: moveData.supplierId || undefined,
    };

    requestConfirm({
      title: 'Review purchase',
      subtitle: selectedProduct.name,
      rows: [
        { label: 'Product', value: `${selectedProduct.name} (${selectedProduct.sku})` },
        { label: 'Qty', value: `${enteredQty} ${purchaseUom}` },
        { label: 'Stock qty', value: `${stockQty} ${selectedProduct.unitOfMeasure}` },
        ...(cartonFields
          ? [
              { label: 'Carton cost', value: `₦${fmtMoney(moveData.unitCost)}` },
              { label: 'Per-kg price', value: `₦${fmtMoney(unitPrice)}` },
              { label: 'Carton selling price', value: `₦${fmtMoney(moveData.cartonPrice)}` },
              { label: 'Carton weight', value: `${cartonWeight} Kg` },
              ...(kgStockFromCarton ? [{ label: 'Stock cost / kg', value: `₦${fmtMoney(unitCost)}` }] : []),
            ]
          : [
              { label: 'Cost', value: `₦${fmtMoney(unitCost)}` },
              { label: 'Price', value: `₦${fmtMoney(unitPrice)}` },
            ]),
        { label: 'Stock after', value: `${stockAfter} ${selectedProduct.unitOfMeasure}` },
      ],
      confirmLabel: 'Confirm purchase',
      run: () => {
        recordStockMove.mutate(payload, {
          onSuccess: (result) => {
            const batch = result?.log?.batchNumber;
            toast.success(batch ? `Purchase recorded (batch ${batch}).` : 'Purchase recorded.');
            onClose();
          },
          onError: (err) => toast.error(err.message),
        });
      },
    });
  };

  const conversionLine = (() => {
    if (!product || !purchaseUom) return null;
    if (needsPurchaseCartonWeight(product, purchaseUom)) {
      const entered = purchaseUom === 'Kg' ? kgQtyDraftToNumber(purchaseQtyDraft) : moveData.quantity;
      const weight = moveData.cartonWeight || product.cartonWeight || 0;
      if (!(entered > 0) || !(weight > 0)) return null;
      if (isCartonsUom(product.unitOfMeasure)) {
        if (purchaseUom === 'Carton') return `${entered} Carton = ${roundQty2(entered * weight)} Kg (stock: ${entered} Cartons)`;
        return `${entered} Kg = ${roundQty2(entered / weight)} Carton (stock unit)`;
      }
      if (purchaseUom === 'Carton') return `${entered} Carton = ${roundQty2(entered * weight)} Kg (stock unit)`;
      return `${entered} Kg (stock unit)`;
    }
    if (isVolumeUom(product.unitOfMeasure)) return volumeConversionPreview(product.unitOfMeasure, moveData.quantity, purchaseUom);
    return null;
  })();

  const disabledReason = !product ? 'Choose a product' : !purchaseUom ? 'Choose a unit' : null;

  return (
    <FormSheet
      title="Record purchase"
      description="Batch code is assigned on save (001, 002, …). The product code stays the same."
      onClose={onClose}
      onSubmit={handleStockMove}
      submitLabel="Review purchase"
      submitting={recordStockMove.isPending}
      disabledReason={disabledReason}
      preview={conversionLine}
    >
      <FormSection title="Product">
        <ProductField id="purchase-product" items={items} product={product} locked={!!initial} onChange={pickProduct} />
      </FormSection>

      {product && (
        <>
          <FormSection title="Quantity">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity" htmlFor="purchase-qty" required hint={purchaseUom === 'Kg' ? 'Up to 2 decimal places (Kg).' : undefined}>
                <input
                  id="purchase-qty"
                  type="number"
                  min={0.01}
                  step={purchaseUom === 'Kg' ? '0.01' : 'any'}
                  value={purchaseUom === 'Kg' ? purchaseQtyDraft : moveData.quantity}
                  onChange={(e) => {
                    if (purchaseUom === 'Kg') {
                      const next = sanitizeKgQtyDraft(e.target.value);
                      if (next === null) return;
                      setPurchaseQtyDraft(next);
                      setMoveData({ ...moveData, quantity: kgQtyDraftToNumber(next) });
                      return;
                    }
                    setMoveData({ ...moveData, quantity: parseFloat(e.target.value) || 0 });
                  }}
                  onBlur={() => {
                    if (purchaseUom !== 'Kg') return;
                    const n = kgQtyDraftToNumber(purchaseQtyDraft);
                    setPurchaseQtyDraft(n > 0 ? String(n) : '');
                    setMoveData((prev) => ({ ...prev, quantity: n }));
                  }}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="Unit" htmlFor="purchase-unit" required>
                <FilterSelect
                  id="purchase-unit"
                  value={purchaseUom}
                  className={selectClass}
                  onChange={(next) => {
                    setPurchaseUom(next);
                    if (next === 'Kg') {
                      const n = kgQtyDraftToNumber(purchaseQtyDraft || String(moveData.quantity || ''));
                      setPurchaseQtyDraft(n > 0 ? String(n) : '');
                      setMoveData((prev) => ({ ...prev, quantity: n }));
                    }
                  }}
                  options={purchaseUnitOptions(product).map((u) => ({ value: u, label: u }))}
                />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Cost and price" description="Selling price changes apply to every batch of this product when you confirm.">
            <div className="grid grid-cols-2 gap-3">
              <FormField label={cartonPricing ? 'Carton cost (₦)' : 'Unit cost (₦)'} htmlFor="purchase-cost" hint={cartonPricing ? 'Cost per carton.' : undefined}>
                <input
                  id="purchase-cost"
                  type="number"
                  min={0}
                  step="0.01"
                  value={moveData.unitCost || ''}
                  onChange={(e) => {
                    if (!acceptDecimal2(e.target.value)) return;
                    setMoveData({ ...moveData, unitCost: parseMoneyInput(e.target.value) });
                  }}
                  className={fieldClass}
                />
              </FormField>
              <FormField label={cartonPricing ? 'Selling price per Kg (₦)' : 'Selling price (₦)'} htmlFor="purchase-price">
                <input
                  id="purchase-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={moveData.unitPrice || ''}
                  placeholder={cartonPricing ? 'Price per Kg' : undefined}
                  onChange={(e) => {
                    if (!acceptDecimal2(e.target.value)) return;
                    setMoveData({ ...moveData, unitPrice: parseMoneyInput(e.target.value) });
                  }}
                  className={fieldClass}
                />
              </FormField>
              {cartonPricing && (
                <>
                  <FormField label="Carton selling price (₦)" htmlFor="purchase-carton-price" required>
                    <input
                      id="purchase-carton-price"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={moveData.cartonPrice || ''}
                      onChange={(e) => {
                        if (!acceptDecimal2(e.target.value)) return;
                        setMoveData({ ...moveData, cartonPrice: parseMoneyInput(e.target.value) });
                      }}
                      className={fieldClass}
                    />
                  </FormField>
                  <FormField label="Carton weight (Kg)" htmlFor="purchase-carton-weight" required hint="Up to 2 decimal places (Kg).">
                    <input
                      id="purchase-carton-weight"
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={cartonWeightDraft}
                      placeholder="Kg per carton"
                      onChange={(e) => {
                        const next = sanitizeKgQtyDraft(e.target.value);
                        if (next === null) return;
                        setCartonWeightDraft(next);
                        setMoveData({ ...moveData, cartonWeight: kgQtyDraftToNumber(next) });
                      }}
                      onBlur={() => {
                        const n = kgQtyDraftToNumber(cartonWeightDraft);
                        setCartonWeightDraft(n > 0 ? String(n) : '');
                        setMoveData((prev) => ({ ...prev, cartonWeight: n }));
                      }}
                      className={fieldClass}
                    />
                  </FormField>
                </>
              )}
            </div>
          </FormSection>

          <FormSection title="Batch details">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Purchased date" htmlFor="purchase-date">
                <input id="purchase-date" type="date" value={moveData.purchasedDate} onChange={(e) => setMoveData({ ...moveData, purchasedDate: e.target.value })} className={fieldClass} />
              </FormField>
              <FormField label="Expiry date" htmlFor="purchase-expiry">
                <input id="purchase-expiry" type="date" value={moveData.expiryDate} onChange={(e) => setMoveData({ ...moveData, expiryDate: e.target.value })} className={fieldClass} />
              </FormField>
            </div>
            <FormField label="Supplier (optional)" htmlFor="purchase-supplier">
              <FilterSelect
                id="purchase-supplier"
                value={moveData.supplierId || 'none'}
                className={selectClass}
                onChange={(v) => {
                  const id = v === 'none' ? '' : v;
                  const match = activeSuppliers.find((s) => s.id === id);
                  setMoveData({ ...moveData, supplierId: id, supplier: match?.name || '' });
                }}
                options={[{ value: 'none', label: 'None' }, ...activeSuppliers.map((s) => ({ value: s.id, label: s.name }))]}
              />
            </FormField>
            {activeSuppliers.length === 0 && (
              <Hint>
                No registered suppliers yet. Add one under <Link href="/suppliers" className="text-primary underline">Suppliers</Link>.
              </Hint>
            )}
            <FormField label="Notes" htmlFor="purchase-notes">
              <input id="purchase-notes" type="text" value={moveData.notes} onChange={(e) => setMoveData({ ...moveData, notes: e.target.value })} placeholder="Optional notes" className={fieldClass} />
            </FormField>
          </FormSection>
        </>
      )}
    </FormSheet>
  );
}
