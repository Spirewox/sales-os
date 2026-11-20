'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { DeliveryStatus, PaymentMode, PaymentType, SalesChannel, type Agent } from '@/types';
import type { AppUser } from '@/types/api';
import { hubOptionLabel } from '@/lib/api-mappers';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FormField, FormSection, FormSheet, StatusBadge, fieldClass } from '@/components/app';
import { SearchableCustomerSelect } from '@/components/searchable-customer-select';
import { type SaleFormUnit, volumeUnitOptions } from '@/lib/volume-units';
import { NAIRA, PAYMENT_MODE_LABEL } from './sales-utils';
import { ProductCombobox } from './product-combobox';
import type { RecordSaleForm } from './use-record-sale';

type Props = Readonly<{
  form: RecordSaleForm;
  onClose: () => void;
  agents: Agent[];
  user: AppUser | null;
  canCreateSale: boolean;
  hubName: string;
}>;

const segment = (on: boolean) =>
  cn('h-9 flex-1 rounded-md border px-3 text-sm font-medium transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground');

/** Record sale: Customer, then Items, then Payment, then optional Details. One item line per sale. */
export function RecordSaleSheet({ form, onClose, agents, user, canCreateSale, hubName }: Props) {
  const f = form;
  const err = (k: string) => (f.touched[k] ? f.validationErrors[k] : null);
  const item = f.selectedInventoryItem;
  const credit = f.paymentMode !== PaymentMode.FULL_PAYMENT;

  return (
    <FormSheet
      title="Record sale"
      onClose={onClose}
      onSubmit={f.handleSaveSale}
      submitLabel="Record sale"
      disabledReason={!canCreateSale ? 'You do not have permission to record sales.' : f.firstError}
      submitting={f.saving}
      preview={f.amount > 0 ? <>Total {formatMoney(f.amount)} · Paid {formatMoney(f.paidNow)} · Balance <span className={f.balance > 0 ? 'font-medium text-warning' : undefined}>{formatMoney(f.balance)}</span></> : undefined}
    >
      <FormSection title="Customer">
        <FormField label="Customer" htmlFor="sale-customer" required error={err('customerId')}>
          <SearchableCustomerSelect
            id="sale-customer"
            customers={f.customers}
            value={f.customerId}
            serverSearch
            onSearchChange={f.setCustomerSearch}
            placeholder={f.customersFetching ? 'Searching customers…' : 'Search customers by name or hub'}
            onChange={f.setCustomerId}
            error={Boolean(err('customerId'))}
          />
        </FormField>
        {f.selectedCustomer && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground tabular-nums">
            <span>{f.selectedCustomer.type}</span>
            <span>{f.selectedCustomer.totalOrders} orders</span>
            <span>{formatMoney(f.selectedCustomer.totalSpent)} spent</span>
            {f.selectedCustomer.lastSale && <span>Last purchase {f.selectedCustomer.lastSale}</span>}
            {f.customerCredit && (
              <Link href={`/credits?customer=${f.customerId}`} className="hover:underline" title={f.customerCredit.text}>
                <StatusBadge tone={f.customerCredit.overdue ? 'danger' : 'warning'}>
                  {f.customerCredit.overdue ? 'Overdue' : 'Owes'} {formatMoney(f.customerCredit.outstanding)}
                </StatusBadge>
              </Link>
            )}
          </div>
        )}
      </FormSection>

      <FormSection title="Item" description="One product per sale. Stock is taken from the oldest receipts first.">
        <FormField label="Product" htmlFor="sale-product" required error={err('productId')}>
          <ProductCombobox id="sale-product" items={f.inventory} value={f.selectedProductId} onChange={f.handleProductChange} invalid={Boolean(err('productId'))} />
        </FormField>
        {item && !f.isMealSale && (
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular-nums">
            <span>{item.currentStock} {item.unitOfMeasure} on hand at {f.selectedHub}</span>
            {f.isCartonProduct && item.cartonWeight ? <span>{item.cartonWeight} kg per carton</span> : null}
            {item.currentStock <= item.minStockLevel && <span className="inline-flex items-center gap-1 font-medium text-warning"><AlertTriangle size={12} aria-hidden /> Low stock</span>}
          </p>
        )}
        {f.isMealSale && (
          <FormField label="Meal name" htmlFor="sale-meal-name" required error={err('productDetails')} hint="Recorded under Kitchen, unit food plate.">
            <input id="sale-meal-name" type="text" value={f.productDetailsText} placeholder="e.g. Jollof rice plate" className={fieldClass} aria-invalid={Boolean(err('productDetails')) || undefined}
              onChange={(e) => { f.setProductDetailsText(e.target.value); f.setTouched((t) => ({ ...t, productDetails: true })); }} />
          </FormField>
        )}
        <div className="grid grid-cols-2 gap-3">
          {(f.isCartonProduct || f.isVolumeProduct) && !f.isMealSale && (
            <FormField label="Unit" htmlFor="sale-unit" required error={err('saleUnit')}>
              <select id="sale-unit" value={f.saleUnit} onChange={(e) => f.handleSaleUnitChange((e.target.value as SaleFormUnit) || '')} className={fieldClass} aria-invalid={Boolean(err('saleUnit')) || undefined}>
                <option value="">Select</option>
                {f.isCartonProduct && (<><option value="Carton">Carton</option><option value="Kg">Kg</option></>)}
                {f.isVolumeProduct && volumeUnitOptions(item?.unitOfMeasure).map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </FormField>
          )}
          <FormField label={`Quantity${f.isMealSale ? ' (plates)' : f.saleUnit ? ` (${f.saleUnit})` : ''}`} htmlFor="sale-quantity" error={err('quantity')} hint={f.saleUnit === 'Carton' ? 'Steps of 0.5' : undefined}>
            <input id="sale-quantity" type="number" inputMode="decimal" min={f.saleUnit === 'Carton' ? 0.5 : 0.01} step={f.saleUnit === 'Carton' ? '0.5' : '0.01'} value={f.quantity}
              onChange={(e) => f.handleQuantityChange(Number(e.target.value) || 0)} className={fieldClass} aria-invalid={Boolean(err('quantity')) || undefined} />
          </FormField>
          {f.isCartonProduct && f.saleUnit === 'Carton' && !f.isMealSale && (
            <FormField label="Weighed kg" htmlFor="sale-weight-kg" required error={err('saleWeightKg')} hint={item?.cartonWeight ? `Suggested ${Math.round(f.quantity * item.cartonWeight * 100) / 100} kg` : undefined}>
              <input id="sale-weight-kg" type="number" inputMode="decimal" min={0.01} step="0.01" value={f.saleWeightKg || ''} onChange={(e) => f.handleSaleWeightChange(Number(e.target.value) || 0)} className={fieldClass} aria-invalid={Boolean(err('saleWeightKg')) || undefined} />
            </FormField>
          )}
          <FormField label={`Amount (${NAIRA})`} htmlFor="sale-amount" required={f.isHistoricalSale || f.isMealSale} error={err('amount')}>
            <input id="sale-amount" type="number" inputMode="decimal" step="0.01" value={f.newSale.amount || ''} className={fieldClass} aria-invalid={Boolean(err('amount')) || undefined}
              onChange={(e) => { f.setNewSale({ ...f.newSale, amount: Number(e.target.value) || 0 }); f.setTouched((t) => ({ ...t, amount: true })); }} />
          </FormField>
          {!f.isMealSale && (
            <FormField label={`Discount (${NAIRA})`} htmlFor="sale-discount">
              <input id="sale-discount" type="number" inputMode="decimal" step="0.01" min={0} value={f.newSale.discount || ''} className={fieldClass}
                onChange={(e) => { f.setNewSale({ ...f.newSale, discount: Number(e.target.value) || 0 }); f.setTouched((t) => ({ ...t, amount: true })); }} />
            </FormField>
          )}
        </div>
        {item && !f.isMealSale && f.quantity > 0 && <ListPriceLine form={f} />}
      </FormSection>

      <FormSection title="Payment">
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">How was it paid?</legend>
          <div className="flex gap-2">
            {Object.values(PaymentMode).map((mode) => (
              <button key={mode} type="button" aria-pressed={f.paymentMode === mode} onClick={() => f.setPaymentMode(mode)} className={segment(f.paymentMode === mode)}>
                {PAYMENT_MODE_LABEL[mode]}
              </button>
            ))}
          </div>
        </fieldset>
        {f.paymentMode !== PaymentMode.FULL_CREDIT && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Payment method</legend>
            <div className="flex gap-2">
              {Object.values(PaymentType).map((type) => (
                <button key={type} type="button" aria-pressed={f.paymentType === type} onClick={() => f.setPaymentType(type)} className={segment(f.paymentType === type)}>{type}</button>
              ))}
            </div>
          </fieldset>
        )}
        {credit && (
          <div className="grid grid-cols-2 gap-3">
            {f.paymentMode === PaymentMode.PARTIAL_CREDIT && (
              <FormField label={`Paid now (${NAIRA})`} htmlFor="sale-amount-paid">
                <input id="sale-amount-paid" type="number" inputMode="decimal" step="0.01" min={0} max={f.amount || undefined} value={f.amountPaid} onChange={(e) => { f.setAmountPaid(Number(e.target.value) || 0); f.setTouched((t) => ({ ...t, amount: true })); }} className={fieldClass} />
              </FormField>
            )}
            <FormField label="Due date" htmlFor="sale-due-date" required error={err('dueDate')}>
              <input id="sale-due-date" type="date" value={f.dueDate} onChange={(e) => { f.setDueDate(e.target.value); f.setTouched((t) => ({ ...t, dueDate: true })); }} className={fieldClass} aria-invalid={Boolean(err('dueDate')) || undefined} />
            </FormField>
          </div>
        )}
        {credit && f.customerCredit && (
          <p className="flex items-start gap-1.5 text-xs text-warning"><AlertTriangle size={14} aria-hidden className="mt-px shrink-0" /> {f.customerCredit.text}. This sale adds to it.</p>
        )}
      </FormSection>

      <FormSection title="Details" optional description={`${f.selectedHub || 'No hub'}, ${f.newSale.channel || SalesChannel.WALK_IN}, ${f.newSale.date || 'today'}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Fulfilment hub" htmlFor="sale-hub" error={f.validationErrors.hub ? 'Choose a hub.' : null} hint="Changing the hub clears the product.">
            {canCreateSale ? (
              <select id="sale-hub" value={f.selectedHub} onChange={(e) => f.setHub(e.target.value)} className={fieldClass}>
                {!f.selectedHub && <option value="">Select hub</option>}
                {f.activeHubs.map((h) => <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>)}
              </select>
            ) : (
              <input id="sale-hub" type="text" readOnly disabled value={hubName} className={fieldClass} />
            )}
          </FormField>
          <FormField label="Sales channel" htmlFor="sale-channel">
            <select id="sale-channel" value={f.newSale.channel || SalesChannel.WALK_IN} className={fieldClass}
              onChange={(e) => { const ch = e.target.value as SalesChannel; f.setNewSale({ ...f.newSale, channel: ch, deliveryStatus: ch === SalesChannel.DELIVERY ? DeliveryStatus.PENDING : DeliveryStatus.NOT_APPLICABLE }); }}>
              {Object.values(SalesChannel).filter((c) => c !== SalesChannel.POS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          {f.newSale.channel === SalesChannel.DELIVERY && (
            <>
              <FormField label="Delivery address" htmlFor="sale-delivery-address">
                <input id="sale-delivery-address" type="text" value={f.newSale.deliveryAddress || ''} onChange={(e) => f.setNewSale({ ...f.newSale, deliveryAddress: e.target.value })} placeholder="Enter address" className={fieldClass} />
              </FormField>
              <FormField label="Customer phone" htmlFor="sale-customer-phone">
                <input id="sale-customer-phone" type="tel" value={f.newSale.customerPhone || ''} onChange={(e) => f.setNewSale({ ...f.newSale, customerPhone: e.target.value })} placeholder="Phone for delivery" className={fieldClass} />
              </FormField>
            </>
          )}
          <FormField label="Date sold" htmlFor="sale-date" hint={f.isHistoricalSale ? 'Past-dated: enter the amount charged.' : undefined}>
            <input id="sale-date" type="date" value={f.newSale.date || ''} onChange={(e) => f.setNewSale({ ...f.newSale, date: e.target.value })} className={fieldClass} />
          </FormField>
          <FormField label="Agent" htmlFor="sale-agent">
            <select id="sale-agent" value={f.newSale.agentId || user?.id || ''} onChange={(e) => f.setNewSale({ ...f.newSale, agentId: e.target.value })} className={fieldClass}>
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </FormField>
        </div>
        <FormField label="Notes" htmlFor="sale-notes">
          <textarea id="sale-notes" value={f.newSale.notes || ''} onChange={(e) => f.setNewSale({ ...f.newSale, notes: e.target.value })} placeholder="Internal comments" rows={2} className={cn(fieldClass, 'h-auto resize-none py-2')} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}

/** List price vs what is being charged, so under-list sales are visible before saving. */
function ListPriceLine({ form: f }: Readonly<{ form: RecordSaleForm }>) {
  const item = f.selectedInventoryItem!;
  const unitPrice = f.listUnitPriceForSale(item, f.saleUnit);
  const listTotal = unitPrice * f.quantity;
  const charged = Number(f.newSale.amount) || 0;
  const discount = Number(f.newSale.discount) || 0;
  const discountMatches = listTotal > 0 && Math.abs(charged + discount - listTotal) < 0.01;
  const underList = listTotal > 0 && charged < listTotal - 0.005 && !discountMatches;
  const pctOff = underList ? Math.round(((listTotal - charged) / listTotal) * 1000) / 10 : 0;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground tabular-nums">
      <span>List: {f.quantity} {f.saleUnit || item.unitOfMeasure} × {formatMoney(unitPrice)} = <span className="font-medium text-foreground">{formatMoney(listTotal)}</span></span>
      {underList && <span className="font-medium text-warning">Under list price ({formatMoney(charged)}{pctOff > 0 ? `, ${pctOff}% off` : ''})</span>}
      {discountMatches && discount > 0 && <span className="font-medium text-foreground">Discount {formatMoney(discount)}</span>}
      {!underList && charged > listTotal + 0.005 && listTotal > 0 && <span className="font-medium text-warning">Above list ({formatMoney(charged)})</span>}
    </p>
  );
}
