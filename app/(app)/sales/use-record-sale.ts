'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { isArchivedProductError } from '@/lib/inventory-archive';
import { useCreateSale, useCustomer, useCustomers, useInventory } from '@/hooks/use-queries';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { DeliveryStatus, PaymentMode, PaymentTerms, PaymentType, SalesChannel, type Hub, type Sale } from '@/types';
import type { CreditCustomerSummary } from '@/types/credits';
import { isHistoricalDate } from '@/lib/historical-date';
import { defaultVolumeUnit, isVolumeUom, type SaleFormUnit, volumeUnitOptions, volumeUnitPrice } from '@/lib/volume-units';
import { catalogBatchPriceError, creditWarningText, fmt, getAmountPaidForMode } from './sales-utils';

export const MEAL_PRODUCT_ID = '__meal__';

const today = () => new Date().toISOString().split('T')[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split('T')[0];
};
const blankSale = (): Partial<Sale> => ({
  amount: 0,
  status: 'Pending',
  date: today(),
  paymentTerms: PaymentTerms.COD,
  notes: '',
  channel: SalesChannel.WALK_IN,
  deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
});

type Args = {
  open: boolean;
  /** From /sales?new=1&customer=<id>. Used until the user picks another customer. */
  presetCustomerId: string | null;
  hubScope: HubScopeFilter;
  hubs: Hub[];
  creditSummary: CreditCustomerSummary[];
  /** Loaded sales, for the selected customer's last purchase and average order. */
  sales: Sale[];
  onSaved: () => void;
};

/** State, validation and submit for Record sale (one item line: the create API takes a single `item`). */
export function useRecordSale({ open, presetCustomerId, hubScope, hubs, creditSummary, sales, onSaved }: Args) {
  const createSale = useCreateSale();
  const activeHubs = hubs.filter((h) => h.isActive);

  const [newSale, setNewSale] = useState<Partial<Sale>>(blankSale);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [pickedHub, setPickedHub] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saleUnit, setSaleUnit] = useState<SaleFormUnit>('');
  const [saleWeightKg, setSaleWeightKg] = useState(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.FULL_PAYMENT);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState(in30Days);
  const [productDetailsText, setProductDetailsText] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // The preset customer applies until the user picks or clears one (customerId becomes a string).
  const customerId = newSale.customerId !== undefined ? newSale.customerId : (presetCustomerId ?? '');

  // Hub defaults to the app-wide location, then the user's default hub.
  const selectedHub = pickedHub ?? (hubScope.filterHub !== 'All' ? hubScope.filterHub : hubScope.defaultHubName) ?? '';
  const resolveHubId = (hubName: string) => (activeHubs.find((h) => h.name === hubName) ?? hubs.find((h) => h.name === hubName))?.id;
  const selectedHubId = resolveHubId(selectedHub);

  const { data: customerList, isFetching: customersFetching } = useCustomers(
    { search: debouncedCustomerSearch || undefined, limit: 50 },
    { enabled: open },
  );
  const listed = customerList?.items ?? [];
  const inList = !!customerId && listed.some((c) => c.id === customerId);
  // Keep the chosen (or linked) customer visible even when the search results don't include it.
  const { data: fetchedCustomer } = useCustomer(open && customerId && !inList ? customerId : null);
  const customers = fetchedCustomer && !listed.some((c) => c.id === fetchedCustomer.id) ? [fetchedCustomer, ...listed] : listed;

  const queryClient = useQueryClient();
  const { data: inventory = [] } = useInventory(selectedHubId ? { hub_id: selectedHubId } : undefined, { enabled: open && !!selectedHubId });
  const selectedInventoryItem = inventory.find((i) => i.id === selectedProductId);
  const isMealSale = selectedProductId === MEAL_PRODUCT_ID;
  const isCartonProduct = selectedInventoryItem?.unitOfMeasure === 'Cartons';
  const isVolumeProduct = isVolumeUom(selectedInventoryItem?.unitOfMeasure);

  /** List selling price in the sale unit. */
  const listUnitPriceForSale = (item: typeof selectedInventoryItem, unit: SaleFormUnit) => {
    if (!item) return 0;
    if (item.unitOfMeasure === 'Cartons') return unit === 'Kg' ? item.baseSellingPrice : item.cartonPrice || 0;
    return isVolumeUom(item.unitOfMeasure) && unit ? volumeUnitPrice(item.unitOfMeasure, item.baseSellingPrice, unit) : item.baseSellingPrice;
  };
  const computeSaleAmount = (item: typeof selectedInventoryItem, qty: number, unit: SaleFormUnit) => (!item || qty <= 0 ? 0 : listUnitPriceForSale(item, unit) * qty);

  const saleDateStr = newSale.date || today();
  const isHistoricalSale = isHistoricalDate(saleDateStr);

  // Re-price an unrecorded sale when the chosen SKU's price changes (e.g. edited in Inventory while
  // this form is open and the list refetches). Compared during render, no effect. Product, quantity
  // and unit changes already re-price in their own handlers. Past-dated sales keep the typed amount.
  const priceKey = selectedInventoryItem && !isMealSale
    ? `${selectedInventoryItem.id}|${selectedInventoryItem.baseSellingPrice}|${selectedInventoryItem.cartonPrice ?? ''}`
    : null;
  const [seenPriceKey, setSeenPriceKey] = useState(priceKey);
  const [repriced, setRepriced] = useState(false);
  if (priceKey !== seenPriceKey) {
    const sameProduct = !!priceKey && !!seenPriceKey && priceKey.split('|')[0] === seenPriceKey.split('|')[0];
    setSeenPriceKey(priceKey);
    setRepriced(sameProduct && !isHistoricalSale);
    if (sameProduct && !isHistoricalSale && selectedInventoryItem) {
      setNewSale((prev) => ({ ...prev, amount: computeSaleAmount(selectedInventoryItem, quantity, saleUnit), discount: 0 }));
    }
  }

  const validationErrors = (() => {
    const errors: Record<string, string> = {};
    if (!customerId) errors.customerId = 'Choose a customer.';
    if (isMealSale) {
      if (!productDetailsText.trim()) errors.productDetails = 'Enter the meal name.';
      if (quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
      if (!newSale.amount || newSale.amount <= 0) errors.amount = 'Enter the amount for this meal.';
    } else {
      if (!selectedProductId) errors.productId = 'Choose a product.';
      if (quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
      if (isHistoricalSale && (!newSale.amount || newSale.amount <= 0)) errors.amount = 'Enter the amount for a past-dated sale.';
      if (selectedInventoryItem && quantity > 0) {
        const amount = Number(newSale.amount) || 0;
        const priceError = catalogBatchPriceError({
          batchUnitPrice: selectedInventoryItem.baseSellingPrice,
          cartonPrice: selectedInventoryItem.cartonPrice,
          unitOfMeasure: selectedInventoryItem.unitOfMeasure,
          saleUnit: saleUnit || selectedInventoryItem.unitOfMeasure,
          cartonWeight: selectedInventoryItem.cartonWeight,
          quantity,
          batchNumber: 'SKU',
          amount,
          discount: Number(newSale.discount) || 0,
          amountPaid: getAmountPaidForMode(paymentMode, amount, amountPaid),
          paymentMode,
        });
        if (priceError) errors.amount = priceError;
      }
      if (isCartonProduct) {
        if (!saleUnit) errors.saleUnit = 'Select Carton or Kg.';
        const cartonWeight = selectedInventoryItem?.cartonWeight || 0;
        if (!(cartonWeight > 0)) {
          errors.saleUnit = 'Set the SKU carton weight before recording a sale.';
        } else if (saleUnit === 'Carton') {
          if (!(Number(selectedInventoryItem?.cartonPrice) > 0)) errors.saleUnit = 'Set a carton selling price on the SKU before selling by Carton.';
          const doubled = quantity * 2;
          if (!(quantity > 0) || Math.abs(doubled - Math.round(doubled)) > 1e-6) errors.quantity = 'Carton quantity must be a multiple of 0.5.';
          if (!(saleWeightKg > 0)) errors.saleWeightKg = 'Enter the weighed kg for Carton sales.';
        } else if (saleUnit === 'Kg' && !(Number(selectedInventoryItem?.baseSellingPrice) > 0)) {
          errors.saleUnit = 'Set a selling price on the SKU before selling by Kg.';
        }
      }
      if (isVolumeProduct && !saleUnit) errors.saleUnit = `Select ${volumeUnitOptions(selectedInventoryItem?.unitOfMeasure).join(' or ')}.`;
    }
    if (paymentMode !== PaymentMode.FULL_PAYMENT && !dueDate) errors.dueDate = 'Set a due date for credit sales.';
    if (!selectedHubId) errors.hub = 'Choose a fulfilment hub under Details.';
    return errors;
  })();
  // Order matters: the first message is shown next to the disabled Save button.
  const firstError = ['customerId', 'productId', 'productDetails', 'saleUnit', 'quantity', 'saleWeightKg', 'amount', 'dueDate', 'hub']
    .map((k) => validationErrors[k])
    .find(Boolean) ?? null;

  const credit = customerId ? creditSummary.find((c) => c.customerId === customerId) : undefined;
  const customerCredit = credit && credit.totalOutstanding > 0
    ? { text: creditWarningText(credit), overdue: credit.overdueCount > 0, outstanding: credit.totalOutstanding }
    : null;

  const selectedCustomer = (() => {
    const c = customers.find((cu) => cu.id === customerId);
    if (!c) return null;
    const own = sales.filter((s) => s.customerId === c.id && s.status !== 'Voided');
    const avgOrder = own.length ? own.reduce((a, s) => a + s.amount, 0) / own.length : 0;
    const lastSale = own.toSorted((a, b) => b.date.localeCompare(a.date))[0]?.date ?? null;
    return { ...c, avgOrder, lastSale };
  })();

  const setCustomerId = (id: string) => {
    setNewSale((prev) => ({ ...prev, customerId: id }));
    setTouched((t) => ({ ...t, customerId: true }));
  };

  const setHub = (hub: string) => {
    setPickedHub(hub);
    setSelectedProductId('');
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setTouched((t) => ({ ...t, productId: true }));
    if (productId === MEAL_PRODUCT_ID) {
      setSaleUnit('');
      setProductDetailsText('');
      setNewSale((prev) => ({ ...prev, amount: 0, discount: 0 }));
      return;
    }
    const item = inventory.find((i) => i.id === productId);
    const nextUnit: SaleFormUnit = item?.unitOfMeasure === 'Cartons' ? 'Carton' : defaultVolumeUnit(item?.unitOfMeasure) || '';
    setSaleUnit(nextUnit);
    if (item) {
      setNewSale((prev) => ({ ...prev, amount: computeSaleAmount(item, quantity, nextUnit), discount: 0, productDetails: `${quantity} ${nextUnit || item.unitOfMeasure} of ${item.name}` }));
    }
  };

  const suggestedCartonWeightKg = (qty: number, item?: typeof selectedInventoryItem) => {
    const weight = Number(item?.cartonWeight) || 0;
    return qty > 0 && weight > 0 ? Math.round(qty * weight * 100) / 100 : 0;
  };

  const handleQuantityChange = (qty: number) => {
    setQuantity(qty);
    setTouched((t) => ({ ...t, quantity: true }));
    const item = selectedInventoryItem;
    if (saleUnit === 'Carton' && item) setSaleWeightKg(suggestedCartonWeightKg(qty, item));
    if (item) setNewSale((prev) => ({ ...prev, amount: computeSaleAmount(item, qty, saleUnit), discount: 0, productDetails: `${qty} ${saleUnit || item.unitOfMeasure} of ${item.name}` }));
  };

  const handleSaleUnitChange = (unit: SaleFormUnit) => {
    setSaleUnit(unit);
    setTouched((t) => ({ ...t, saleUnit: true }));
    const item = selectedInventoryItem;
    setSaleWeightKg(unit === 'Carton' && item ? suggestedCartonWeightKg(quantity, item) : 0);
    if (item) setNewSale((prev) => ({ ...prev, amount: computeSaleAmount(item, quantity, unit), discount: 0, productDetails: `${quantity} ${unit || item.unitOfMeasure} of ${item.name}` }));
  };

  const handleSaleWeightChange = (kg: number) => {
    setSaleWeightKg(kg);
    setTouched((t) => ({ ...t, saleWeightKg: true }));
  };

  const handlePaymentModeChange = (mode: PaymentMode) => {
    setPaymentMode(mode);
    if (mode === PaymentMode.FULL_PAYMENT) setAmountPaid(Number(newSale.amount) || 0);
    else if (mode === PaymentMode.FULL_CREDIT) setAmountPaid(0);
  };

  const resetForm = () => {
    setRepriced(false);
    setNewSale(blankSale());
    setPickedHub(null);
    setSelectedProductId('');
    setQuantity(1);
    setSaleUnit('');
    setSaleWeightKg(0);
    setPaymentMode(PaymentMode.FULL_PAYMENT);
    setPaymentType(PaymentType.CASH);
    setAmountPaid(0);
    setDueDate(in30Days());
    setTouched({});
    setProductDetailsText('');
    setCustomerSearch('');
    setDebouncedCustomerSearch('');
  };

  const amount = Number(newSale.amount) || 0;
  const paidNow = getAmountPaidForMode(paymentMode, amount, amountPaid);

  const handleSaveSale = () => {
    if (firstError) {
      setTouched({ customerId: true, productId: true, productDetails: true, quantity: true, saleUnit: true, saleWeightKg: true, amount: true, dueDate: true });
      toast.error(firstError);
      return;
    }
    const inventoryItem = selectedInventoryItem;
    if (!isHistoricalSale && !isMealSale && !inventoryItem && selectedProductId) {
      toast.error('Product not found.');
      return;
    }
    const isCreditMode = paymentMode !== PaymentMode.FULL_PAYMENT;
    const hubId = resolveHubId(selectedHub);
    if (!hubId) {
      toast.error('Invalid fulfillment hub.');
      return;
    }
    const item = isMealSale
      ? { product_name: productDetailsText.trim(), quantity: quantity > 0 ? quantity : 1, unit: 'Food plate', category: 'Kitchen' }
      : selectedProductId && quantity > 0
        ? {
            product_id: selectedProductId,
            quantity,
            ...(saleUnit ? { sale_unit: saleUnit, unit: saleUnit } : inventoryItem ? { unit: inventoryItem.unitOfMeasure } : {}),
            ...(saleUnit === 'Carton' && saleWeightKg > 0 ? { sale_weight_kg: saleWeightKg } : {}),
          }
        : null;
    if (!item) {
      toast.error(isMealSale ? 'Enter a meal name.' : 'Select a catalog product (or Record a meal).');
      return;
    }

    createSale.mutate(
      {
        customer_id: customerId,
        hub_id: hubId,
        amount,
        discount: Number(newSale.discount) || 0,
        amount_paid: paidNow,
        payment_mode: paymentMode,
        payment_type: isCreditMode ? undefined : paymentType,
        due_date: isCreditMode ? dueDate : undefined,
        payment_terms: newSale.paymentTerms,
        channel: newSale.channel || SalesChannel.WALK_IN,
        delivery_status: newSale.deliveryStatus || DeliveryStatus.NOT_APPLICABLE,
        delivery_address: newSale.deliveryAddress,
        notes: newSale.notes || undefined,
        date: saleDateStr,
        item,
      },
      {
        onSuccess: (result) => {
          toast.success(result.creditRecord ? `Sale recorded. Credit of ${fmt(result.creditRecord.amountOwed)} created, due ${dueDate}` : 'Sale recorded.');
          resetForm();
          onSaved();
        },
        onError: (err) => {
          toast.error(err.message || 'Failed to record sale.');
          // Archived while the form was open: reload the picker so the product leaves it.
          if (isArchivedProductError(err.message)) void queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
      },
    );
  };

  return {
    newSale, setNewSale, touched, setTouched, validationErrors, firstError,
    customerId, setCustomerId, customers, customersFetching, setCustomerSearch, selectedCustomer, customerCredit,
    selectedHub, setHub, activeHubs: hubScope.activeHubs,
    inventory, selectedProductId, handleProductChange, selectedInventoryItem, isMealSale, isCartonProduct, isVolumeProduct,
    listUnitPriceForSale, quantity, handleQuantityChange, saleUnit, handleSaleUnitChange, saleWeightKg, handleSaleWeightChange,
    productDetailsText, setProductDetailsText, isHistoricalSale, repriced,
    paymentMode, setPaymentMode: handlePaymentModeChange, paymentType, setPaymentType, amountPaid, setAmountPaid, dueDate, setDueDate,
    amount, paidNow, balance: Math.max(0, amount - paidNow),
    handleSaveSale, resetForm, saving: createSale.isPending,
  };
}

export type RecordSaleForm = ReturnType<typeof useRecordSale>;
