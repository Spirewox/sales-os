'use client';

import {
  Package, CreditCard, MapPin, Truck, Edit3,
  Calendar, Clock, Users, ShoppingCart, ArrowRightLeft, Check, ArrowUpRight, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Sale, PaymentTerms, SalesChannel, DeliveryStatus, PaymentMode } from '@/types';
import type { StockLog } from '@/types';
import type { Permission } from '@/lib/permissions';
import {
  fmt, statusColor, paymentModeBadgeClass, DELIVERY_STEPS,
  INPUT_CLS, BTN_PRIMARY,
} from './sales-utils';
import type { DetailTab } from './sales-utils';
import { SubmitButton } from '@/components/submit-button';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';

import type { Hub } from '@/types';
import { hubOptionLabel } from '@/lib/api-mappers';

export type SaleDetailTabProps = Readonly<{
  sale: Sale;
  isEditing: boolean;
  editForm: Partial<Sale>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Sale>>>;
  saleStockLogs: StockLog[];
  customerSalesHistory: Sale[];
  onSelectSale: (sale: Sale) => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  updatingDelivery?: boolean;
  can: (permission: Permission) => boolean;
  isCompanyAdmin: boolean;
  activeHubs: Hub[];
  batchPriceError?: string | null;
}>;

function DeliveryAdvanceButton({
  sale,
  canUpdate,
  onAdvance,
  updatingDelivery = false,
}: Readonly<{
  sale: Sale;
  canUpdate: boolean;
  onAdvance: (status: DeliveryStatus) => void;
  updatingDelivery?: boolean;
}>) {
  if (sale.status === 'Voided' || !canUpdate) return null;
  const currentIdx = DELIVERY_STEPS.indexOf(sale.deliveryStatus as DeliveryStatus);
  const nextStep = currentIdx < DELIVERY_STEPS.length - 1 ? DELIVERY_STEPS[currentIdx + 1] : null;
  if (!nextStep) {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <Check size={14} aria-hidden /> Delivery confirmed by customer.
      </p>
    );
  }
  return (
    <SubmitButton
      type="button"
      onClick={() => onAdvance(nextStep)}
      loading={updatingDelivery}
      disabled={!canUpdate}
      className={`${BTN_PRIMARY} w-full justify-center h-10`}
    >
      <ArrowUpRight size={14} aria-hidden className="mr-1.5" /> Advance to: {nextStep}
    </SubmitButton>
  );
}

function OverviewTab({
  sale, isEditing, editForm, setEditForm,
  saleStockLogs, can, isCompanyAdmin, activeHubs,
  batchPriceError,
}: SaleDetailTabProps) {
  const currentItem = editForm.item ?? sale.item;
  const currentCategory = currentItem?.category?.trim() ?? '';
  const isCustomCategory = currentCategory !== '' && !PRODUCT_CATEGORIES.includes(currentCategory as (typeof PRODUCT_CATEGORIES)[number]);

  return (
    <>
      {isEditing && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="sale-edit-amount" className="text-sm font-medium">Total amount</label>
            <input id="sale-edit-amount" type="number" step="0.01" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} className={INPUT_CLS} />
            <label htmlFor="sale-edit-discount" className="block pt-2 text-sm font-medium">Discount</label>
            <input id="sale-edit-discount" type="number" step="0.01" min={0} value={editForm.discount ?? 0} onChange={(e) => setEditForm({ ...editForm, discount: Number(e.target.value) || 0 })} className={INPUT_CLS} />
            {batchPriceError && <p className="text-xs text-destructive">{batchPriceError}</p>}
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="mb-1 text-xs text-muted-foreground">Amount paid</p>
            {/* Read-only even while editing: payments go through the credit
                repayment flow so the ledger stays correct. */}
            <p className="text-xl font-semibold tracking-tight tabular-nums">{fmt(sale.amountPaid ?? sale.amount)}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              To record a payment, open this customer in{' '}
              <Link href={`/credits?customer=${sale.customerId}`} className="font-medium text-foreground underline underline-offset-2 hover:text-primary">Credits</Link>
              {' '}and use Record payment.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {sale.paymentMode && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${paymentModeBadgeClass(sale.paymentMode as PaymentMode)}`}>{sale.paymentMode}</span>
        )}
        {sale.paymentType && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{sale.paymentType}</span>
        )}
        {sale.isCredit && !sale.paymentMode && (
          <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Credit sale</span>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <div className="mb-2 flex items-center gap-2">
          <Package size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-sm font-medium">Product details</span>
        </div>
        {isEditing && isCompanyAdmin ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="sale-edit-product" className="text-xs text-muted-foreground">Product name</label>
              <input id="sale-edit-product"
                type="text"
                value={currentItem?.productName || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    item: {
                      productId: currentItem?.productId,
                      productName: e.target.value,
                      quantity: currentItem?.quantity ?? 1,
                      unit: currentItem?.unit,
                      category: currentItem?.category,
                    },
                  })
                }
                className={`${INPUT_CLS} h-8 text-sm`}
              />
            </div>
            <div>
              <label htmlFor="sale-edit-qty" className="text-xs text-muted-foreground">Quantity</label>
              <input id="sale-edit-qty"
                type="number"
                min={0.01}
                step="0.01"
                value={currentItem?.quantity ?? ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    item: {
                      productId: currentItem?.productId,
                      productName: currentItem?.productName,
                      quantity: Number(e.target.value) || 0,
                      unit: currentItem?.unit,
                      category: currentItem?.category,
                    },
                  })
                }
                className={`${INPUT_CLS} h-8 text-sm`}
              />
            </div>
            <div>
              <label htmlFor="sale-edit-unit" className="text-xs text-muted-foreground">Unit</label>
              <input id="sale-edit-unit"
                type="text"
                value={currentItem?.unit || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    item: {
                      productId: currentItem?.productId,
                      productName: currentItem?.productName,
                      quantity: currentItem?.quantity ?? 1,
                      unit: e.target.value,
                      category: currentItem?.category,
                    },
                  })
                }
                className={`${INPUT_CLS} h-8 text-sm`}
              />
            </div>
            <div>
              <label htmlFor="sale-edit-category" className="text-xs text-muted-foreground">Category</label>
              <select id="sale-edit-category"
                value={currentCategory}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    item: {
                      productId: currentItem?.productId,
                      productName: currentItem?.productName,
                      quantity: currentItem?.quantity ?? 1,
                      unit: currentItem?.unit,
                      category: e.target.value,
                    },
                  })
                }
                className={`${INPUT_CLS} h-8 text-sm`}
              >
                <option value="">Select category</option>
                {PRODUCT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
                {isCustomCategory && (
                  <option value={currentCategory}>{currentCategory} (existing)</option>
                )}
              </select>
            </div>
          </div>
        ) : (
          <div className="text-sm space-y-1">
            <p><span className="text-muted-foreground">Name:</span> {sale.item?.productName || '-'}</p>
            <p><span className="text-muted-foreground">Batch:</span> {sale.item?.batchAllocations?.map(allocation => `${allocation.batchNumber}: ${allocation.quantity}`).join(', ') || sale.item?.batchNumber || '-'}</p>
            <p><span className="text-muted-foreground">Quantity:</span> {sale.item?.quantity ?? '-'}</p>
            <p><span className="text-muted-foreground">Unit:</span> {sale.item?.unit || '-'}</p>
            {sale.item?.saleUnit === 'Carton' && sale.item?.saleWeightKg != null && (
              <p><span className="text-muted-foreground">Weighed kg:</span> {sale.item.saleWeightKg}</p>
            )}
            <p><span className="text-muted-foreground">Category:</span> {sale.item?.category || '-'}</p>
            {(sale.item?.unitCost != null || sale.item?.unitPrice != null) && (
              <>
                {sale.item?.unitCost != null && (
                  <p>
                    <span className="text-muted-foreground">Batch cost:</span>{' '}
                    {fmt(sale.item.unitCost)}
                  </p>
                )}
                {sale.item?.unitPrice != null && (
                  <p>
                    <span className="text-muted-foreground">Recorded SKU price:</span>{' '}
                    {fmt(sale.item.unitPrice)}
                    {sale.item.saleUnit !== 'Carton' &&
                    sale.item.quantity != null &&
                    sale.item.unitPrice > 0
                      ? (() => {
                          const listTotal = sale.item!.unitPrice! * sale.item!.quantity;
                          if (sale.amount < listTotal - 0.005) {
                            return (
                              <span className="ml-1 font-medium text-warning">
                                (under list, charged {fmt(sale.amount)})
                              </span>
                            );
                          }
                          return null;
                        })()
                      : null}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Date sold:</span>
          <span className="font-medium">{sale.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Date recorded:</span>
          <span className="font-medium">{sale.createdAt || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit3 size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Last updated:</span>
          <span className="font-medium">{sale.updatedAt || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Agent:</span>
          <span className="font-medium">{sale.agentName}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Hub:</span>
          {isEditing && can('sales.edit') ? (
            <select
              aria-label="Hub"
              value={editForm.hubName || sale.hubName || ''}
              onChange={(e) => setEditForm({ ...editForm, hubName: e.target.value })}
              className="h-8 rounded-md border bg-background px-2 text-sm"
            >
              {activeHubs.map((h) => (
                <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
              ))}
            </select>
          ) : (
            <span className="font-medium">{sale.hubName || '-'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Channel:</span>
          {isEditing ? (
            <select aria-label="Channel" value={editForm.channel || sale.channel} onChange={(e) => setEditForm({ ...editForm, channel: e.target.value as SalesChannel })} className="h-8 rounded-md border bg-background px-2 text-sm">
              {Object.values(SalesChannel).filter((c) => c !== SalesChannel.POS).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span className="font-medium">{sale.channel || 'Walk-In'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CreditCard size={14} aria-hidden className="text-muted-foreground" />
          <span className="text-muted-foreground">Payment:</span>
          {isEditing ? (
            <select aria-label="Payment terms" value={editForm.paymentTerms || sale.paymentTerms} onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value as PaymentTerms })} className="h-8 rounded-md border bg-background px-2 text-sm">
              {Object.values(PaymentTerms).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <span className="font-medium">{sale.paymentTerms || 'COD'}</span>
          )}
        </div>
      </div>

      {(sale.deliveryAddress || sale.customerPhone) && (
        <div className="rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Truck size={14} aria-hidden className="text-muted-foreground" />
            <span className="text-sm font-medium">Delivery info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {sale.deliveryAddress && (
              <div>
                <span className="text-xs text-muted-foreground">Address</span>
                <p className="font-medium">{sale.deliveryAddress}</p>
              </div>
            )}
            {sale.customerPhone && (
              <div>
                <span className="text-xs text-muted-foreground">Phone</span>
                <p className="font-medium">{sale.customerPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="sale-edit-notes" className="mb-1 block text-sm font-medium text-muted-foreground">Notes</label>
        {isEditing ? (
          <textarea id="sale-edit-notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className={`${INPUT_CLS} h-auto resize-none`} />
        ) : (
          <p className="text-sm text-muted-foreground">{sale.notes || 'No notes'}</p>
        )}
      </div>

      {saleStockLogs.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-medium"><ArrowRightLeft size={14} aria-hidden className="text-muted-foreground" /> Linked stock movements</h4>
          <div className="space-y-2">
            {saleStockLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <span className="font-medium">{log.itemName}</span>
                  <span className="text-muted-foreground ml-2">{log.type}</span>
                </div>
                <span className={`font-medium tabular-nums ${log.quantity < 0 ? 'text-destructive' : 'text-primary'}`}>{log.quantity > 0 ? '+' : ''}{log.quantity} {log.uom}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
}

function DeliveryTab({
  sale, isEditing, editForm, setEditForm, onUpdateDeliveryStatus, updatingDelivery = false, can,
}: SaleDetailTabProps) {
  const isDeliverySale =
    sale.channel === SalesChannel.DELIVERY || sale.deliveryStatus !== DeliveryStatus.NOT_APPLICABLE;

  if (!isDeliverySale) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-sm">This sale is not a delivery order.</p>
      </div>
    );
  }

  const canUpdate = sale.status !== 'Voided' && can('sales.update_delivery');

  return (
    <>
      <div className="space-y-4">
        <h4 className="flex items-center gap-2 text-sm font-medium"><Truck size={14} aria-hidden className="text-muted-foreground" /> Delivery progress</h4>
        <div className="flex items-center gap-1">
          {DELIVERY_STEPS.map((step, idx) => {
            const currentIdx = DELIVERY_STEPS.indexOf(sale.deliveryStatus as DeliveryStatus);
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step} className="flex flex-1 flex-col items-center">
                <button
                  type="button"
                  onClick={() => canUpdate && !updatingDelivery && onUpdateDeliveryStatus(sale.id, step)}
                  disabled={!canUpdate || updatingDelivery}
                  aria-label={`Set delivery status: ${step}`}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-2 ring-primary/30' : ''} ${canUpdate && !updatingDelivery ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'}`}
                >
                  {updatingDelivery && isCurrent ? <Loader2 size={14} aria-hidden className="animate-spin" /> : isCompleted ? <Check size={14} aria-hidden /> : idx + 1}
                </button>
                <span className={`mt-1.5 text-center text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border p-4">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Address:</span>
              {isEditing ? (
                <input aria-label="Delivery address" type="text" value={editForm.deliveryAddress || ''} onChange={(e) => setEditForm({ ...editForm, deliveryAddress: e.target.value })} className={`${INPUT_CLS} mt-1`} />
              ) : (
                <p className="mt-0.5 font-medium">{sale.deliveryAddress || 'Not provided'}</p>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Customer phone:</span>
              {isEditing ? (
                <input aria-label="Customer phone" type="text" value={editForm.customerPhone || ''} onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })} className={`${INPUT_CLS} mt-1`} />
              ) : (
                <p className="mt-0.5 font-medium">{sale.customerPhone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeliveryAdvanceButton
        sale={sale}
        canUpdate={can('sales.update_delivery')}
        onAdvance={(status) => onUpdateDeliveryStatus(sale.id, status)}
        updatingDelivery={updatingDelivery}
      />
    </>
  );
}

function HistoryTab({ sale, customerSalesHistory, onSelectSale }: SaleDetailTabProps) {
  return (
    <>
      <h4 className="mb-3 flex items-center gap-2 text-sm font-medium"><Clock size={14} aria-hidden className="text-muted-foreground" /> Other sales to {sale.customerName}</h4>
      {customerSalesHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">No other sales to this customer.</p>
      ) : (
        <div className="space-y-2">
          {customerSalesHistory.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSale(s)}
              className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors hover:bg-muted/40"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="tabular-nums text-muted-foreground">{s.date}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(s.status)}`}>{s.status}</span>
                  {s.isCredit && <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">Credit</span>}
                </div>
                <p className="mt-0.5 max-w-[350px] truncate text-xs text-muted-foreground">{s.productDetails}</p>
              </div>
              <span className="ml-3 shrink-0 font-medium tabular-nums">{fmt(s.amount)}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function SaleDetailTabContent({
  detailTab,
  ...tabProps
}: SaleDetailTabProps & Readonly<{ detailTab: DetailTab }>) {
  if (detailTab === 'overview') return <OverviewTab {...tabProps} />;
  if (detailTab === 'delivery') return <DeliveryTab {...tabProps} />;
  return <HistoryTab {...tabProps} />;
}
