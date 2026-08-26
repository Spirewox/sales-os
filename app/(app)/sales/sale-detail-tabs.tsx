'use client';

import {
  Package, CreditCard, MapPin, Truck, Edit3, Trash2,
  Calendar, Clock, Users, ShoppingCart, ArrowRightLeft, Check, ArrowUpRight, Loader2,
} from 'lucide-react';
import { Sale, PaymentTerms, SalesChannel, DeliveryStatus, PaymentMode } from '@/types';
import type { StockLog } from '@/types';
import type { Permission } from '@/lib/permissions';
import {
  fmt, statusColor, paymentModeBadgeClass, DELIVERY_STEPS,
  INPUT_CLS, BTN_PRIMARY, BTN_SECONDARY,
} from './sales-utils';
import type { DetailTab } from './sales-utils';
import { SubmitButton } from '@/components/submit-button';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';

import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import type { Hub } from '@/types';
import { hubOptionLabel } from '@/lib/api-mappers';

export type SaleDetailTabProps = Readonly<{
  sale: Sale;
  isEditing: boolean;
  editForm: Partial<Sale>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Sale>>>;
  showVoidConfirm: boolean;
  setShowVoidConfirm: (v: boolean) => void;
  saleStockLogs: StockLog[];
  customerSalesHistory: Sale[];
  onSelectSale: (sale: Sale) => void;
  onVoidSale: () => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  voidingSale?: boolean;
  updatingDelivery?: boolean;
  can: (permission: Permission) => boolean;
  isCompanyAdmin: boolean;
  hubScope: HubScopeFilter;
  activeHubs: Hub[];
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
      <p className="text-sm text-green-600 font-medium flex items-center gap-2">
        <Check size={14} /> Delivery confirmed by customer.
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
      <ArrowUpRight size={14} className="mr-1.5" /> Advance to: {nextStep}
    </SubmitButton>
  );
}

function OverviewTab({
  sale, isEditing, editForm, setEditForm, showVoidConfirm, setShowVoidConfirm,
  saleStockLogs, onVoidSale, voidingSale = false, can, isCompanyAdmin, hubScope, activeHubs,
}: SaleDetailTabProps) {
  const currentItem = editForm.item ?? sale.item;
  const currentCategory = currentItem?.category?.trim() ?? '';
  const isCustomCategory = currentCategory !== '' && !PRODUCT_CATEGORIES.includes(currentCategory as (typeof PRODUCT_CATEGORIES)[number]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-md border bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">Total Amount</p>
          {isEditing ? (
            <input type="number" step="0.01" value={editForm.amount || ''} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} className={`${INPUT_CLS} h-8 text-lg font-bold`} />
          ) : (
            <p className="text-xl font-bold">{fmt(sale.amount)}</p>
          )}
        </div>
        <div className="p-4 rounded-md border bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-1">Amount Paid</p>
          {isEditing ? (
            <input type="number" step="0.01" value={editForm.amountPaid ?? sale.amountPaid ?? sale.amount} onChange={(e) => setEditForm({ ...editForm, amountPaid: Number(e.target.value) })} className={`${INPUT_CLS} h-8 text-lg font-bold`} />
          ) : (
            <p className={`text-xl font-bold ${(sale.amountPaid ?? sale.amount) < sale.amount ? 'text-orange-600' : 'text-green-600'}`}>{fmt(sale.amountPaid ?? sale.amount)}</p>
          )}
          {(sale.amountPaid !== undefined && sale.amountPaid < sale.amount) && !isEditing && (
            <p className="text-xs text-orange-600 mt-1">Balance: {fmt(sale.amount - sale.amountPaid)}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-sm">
        {sale.paymentMode && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${paymentModeBadgeClass(sale.paymentMode as PaymentMode)}`}>{sale.paymentMode}</span>
        )}
        {sale.paymentType && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{sale.paymentType}</span>
        )}
        {sale.isCredit && !sale.paymentMode && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">Credit Sale</span>
        )}
      </div>

      <div className="p-4 rounded-md border bg-muted/10">
        <div className="flex items-center gap-2 mb-2">
          <Package size={14} className="text-primary" />
          <span className="text-sm font-medium">Product Details</span>
        </div>
        {isEditing && isCompanyAdmin ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Product Name</label>
              <input
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
              <label className="text-xs text-muted-foreground">Quantity</label>
              <input
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
              <label className="text-xs text-muted-foreground">Unit</label>
              <input
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
              <label className="text-xs text-muted-foreground">Category</label>
              <select
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
            <p><span className="text-muted-foreground">Name:</span> {sale.item?.productName || '—'}</p>
            <p><span className="text-muted-foreground">Batch:</span> {sale.item?.batchNumber || '—'}</p>
            <p><span className="text-muted-foreground">Quantity:</span> {sale.item?.quantity ?? '—'}</p>
            <p><span className="text-muted-foreground">Unit:</span> {sale.item?.unit || '—'}</p>
            <p><span className="text-muted-foreground">Category:</span> {sale.item?.category || '—'}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Date Sold:</span>
          <span className="font-medium">{sale.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Date Recorded:</span>
          <span className="font-medium">{sale.createdAt || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit3 size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Last Updated:</span>
          <span className="font-medium">{sale.updatedAt || '—'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Agent:</span>
          <span className="font-medium">{sale.agentName}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Hub:</span>
          {isEditing && can('sales.edit') ? (
            <select
              value={editForm.hubName || sale.hubName || ''}
              onChange={(e) => setEditForm({ ...editForm, hubName: e.target.value })}
              className="h-8 rounded-md border px-2 text-sm bg-background"
            >
              {activeHubs.map((h) => (
                <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
              ))}
            </select>
          ) : (
            <span className="font-medium">{sale.hubName || '—'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Channel:</span>
          {isEditing ? (
            <select value={editForm.channel || sale.channel} onChange={(e) => setEditForm({ ...editForm, channel: e.target.value as SalesChannel })} className="h-8 rounded-md border px-2 text-sm bg-background">
              {Object.values(SalesChannel).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span className="font-medium">{sale.channel || 'Walk-In'}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Payment:</span>
          {isEditing ? (
            <select value={editForm.paymentTerms || sale.paymentTerms} onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value as PaymentTerms })} className="h-8 rounded-md border px-2 text-sm bg-background">
              {Object.values(PaymentTerms).map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          ) : (
            <span className="font-medium">{sale.paymentTerms || 'COD'}</span>
          )}
        </div>
      </div>

      {(sale.deliveryAddress || sale.customerPhone) && (
        <div className="p-4 rounded-md border bg-muted/10">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={14} className="text-primary" />
            <span className="text-sm font-medium">Delivery Info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {sale.deliveryAddress && (
              <div>
                <span className="text-muted-foreground text-xs">Address</span>
                <p className="font-medium">{sale.deliveryAddress}</p>
              </div>
            )}
            {sale.customerPhone && (
              <div>
                <span className="text-muted-foreground text-xs">Phone</span>
                <p className="font-medium">{sale.customerPhone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <label htmlFor="sale-edit-notes" className="text-sm font-medium text-muted-foreground mb-1 block">Notes</label>
        {isEditing ? (
          <textarea id="sale-edit-notes" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} className={`${INPUT_CLS} h-auto resize-none`} />
        ) : (
          <p className="text-sm text-muted-foreground">{sale.notes || 'No notes'}</p>
        )}
      </div>

      {saleStockLogs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2"><ArrowRightLeft size={14} className="text-primary" /> Linked Stock Movements</h4>
          <div className="space-y-2">
            {saleStockLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-md border bg-muted/10 text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{log.itemName}</span>
                  <span className="text-muted-foreground ml-2">{log.type}</span>
                </div>
                <span className={`font-medium ${log.quantity < 0 ? 'text-red-600' : 'text-green-600'}`}>{log.quantity > 0 ? '+' : ''}{log.quantity} {log.uom}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sale.status !== 'Voided' && !isEditing && can('sales.void') && (
        <div className="pt-4 border-t">
          {showVoidConfirm ? (
            <div className="p-4 rounded-md border border-red-200 bg-red-50">
              <p className="text-sm text-red-800 font-medium mb-3">Are you sure? This will reverse customer stats and mark the sale as voided.</p>
              <div className="flex gap-2">
                <SubmitButton type="button" onClick={onVoidSale} loading={voidingSale} variant="destructive" className="h-8 px-3">Yes, Void Sale</SubmitButton>
                <button type="button" onClick={() => setShowVoidConfirm(false)} className={BTN_SECONDARY}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowVoidConfirm(true)} className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md px-3 py-2"><Trash2 size={14} /> Void this sale</button>
          )}
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
      <div className="text-center py-12 text-muted-foreground">
        <Truck size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">This sale is not a delivery order.</p>
      </div>
    );
  }

  const canUpdate = sale.status !== 'Voided' && can('sales.update_delivery');

  return (
    <>
      <div className="space-y-4">
        <h4 className="text-sm font-medium flex items-center gap-2"><Truck size={14} className="text-primary" /> Delivery Progress</h4>
        <div className="flex items-center gap-1">
          {DELIVERY_STEPS.map((step, idx) => {
            const currentIdx = DELIVERY_STEPS.indexOf(sale.deliveryStatus as DeliveryStatus);
            const isCompleted = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div key={step} className="flex-1 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => canUpdate && !updatingDelivery && onUpdateDeliveryStatus(sale.id, step)}
                  disabled={!canUpdate || updatingDelivery}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'} ${isCurrent ? 'ring-2 ring-primary/30' : ''} ${canUpdate && !updatingDelivery ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed opacity-60'}`}
                >
                  {updatingDelivery && isCurrent ? <Loader2 size={14} className="animate-spin" /> : isCompleted ? <Check size={14} /> : idx + 1}
                </button>
                <span className={`text-[10px] mt-1.5 text-center font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-md border bg-muted/10">
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Address:</span>
              {isEditing ? (
                <input type="text" value={editForm.deliveryAddress || ''} onChange={(e) => setEditForm({ ...editForm, deliveryAddress: e.target.value })} className={`${INPUT_CLS} mt-1`} />
              ) : (
                <p className="font-medium mt-0.5">{sale.deliveryAddress || 'Not provided'}</p>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Customer Phone:</span>
              {isEditing ? (
                <input type="text" value={editForm.customerPhone || ''} onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })} className={`${INPUT_CLS} mt-1`} />
              ) : (
                <p className="font-medium mt-0.5">{sale.customerPhone || 'Not provided'}</p>
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
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2"><Clock size={14} className="text-primary" /> Other Sales to {sale.customerName}</h4>
      {customerSalesHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No other sales to this customer.</p>
      ) : (
        <div className="space-y-2">
          {customerSalesHistory.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectSale(s)}
              className="w-full p-3 rounded-md border bg-muted/10 text-sm flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{s.date}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                  {s.isCredit && <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">CREDIT</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[350px]">{s.productDetails}</p>
              </div>
              <span className="font-medium shrink-0 ml-3">{fmt(s.amount)}</span>
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
