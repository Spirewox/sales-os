'use client';

import { AlertTriangle, X } from 'lucide-react';
import {
  Sale,
  Customer,
  Agent,
  InventoryItem,
  SalesChannel,
  DeliveryStatus,
  PaymentType,
  PaymentMode,
} from '@/types';
import type { AppUser } from '@/types/api';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import { hubOptionLabel } from '@/lib/api-mappers';
import { fmt, NAIRA, INPUT_CLS, LABEL_CLS, BTN_PRIMARY, BTN_SECONDARY } from './sales-utils';
import { ModalDialog } from './modal-dialog';
import { SearchableCustomerSelect } from '@/components/searchable-customer-select';
import { SubmitButton } from '@/components/submit-button';

type SelectedFormCustomer = Customer & {
  avgOrder: number;
  lastSale: string | null;
  credit?: { totalOutstanding: number; overdueCount?: number };
};

export interface AddSaleModalProps {
  show: boolean;
  onClose: () => void;
  hubScope: HubScopeFilter;
  selectedHub: string;
  setSelectedHub: (hub: string) => void;
  newSale: Partial<Sale>;
  setNewSale: React.Dispatch<React.SetStateAction<Partial<Sale>>>;
  customers: Customer[];
  touched: Record<string, boolean>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  validationErrors: Record<string, string>;
  selectedFormCustomer: SelectedFormCustomer | null;
  customerCreditWarning: string | null;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  selectedBatchNumber: string;
  setSelectedBatchNumber: (batch: string) => void;
  productBatches: Array<{
    batchNumber: string;
    quantityRemaining: number;
    unitCost: number;
    expiryDate?: string;
    receivedDate?: string;
    supplier?: string;
    uom?: string;
  }>;
  batchesLoading?: boolean;
  handleProductChange: (productId: string) => void;
  availableInventory: InventoryItem[];
  selectedInventoryItem: InventoryItem | undefined;
  quantity: number;
  handleQuantityChange: (qty: number) => void;
  saleUnit: 'Carton' | 'Kg' | '';
  handleSaleUnitChange: (unit: 'Carton' | 'Kg' | '') => void;
  isCartonProduct: boolean;
  paymentMode: PaymentMode;
  setPaymentMode: (mode: PaymentMode) => void;
  amountPaid: number;
  setAmountPaid: (amount: number) => void;
  dueDate: string;
  setDueDate: (date: string) => void;
  paymentType: PaymentType;
  setPaymentType: (type: PaymentType) => void;
  agents: Agent[];
  user: AppUser | null;
  handleSaveSale: () => void;
  savingSale?: boolean;
  isFormValid: boolean;
  isHistoricalSale: boolean;
  isMealSale?: boolean;
  productDetailsText: string;
  setProductDetailsText: (value: string) => void;
  canCreateSale: boolean;
  onCustomerSearchChange: (query: string) => void;
  customersLoading?: boolean;
}

export function AddSaleModal({
  show,
  onClose,
  hubScope,
  selectedHub,
  setSelectedHub,
  newSale,
  setNewSale,
  customers,
  touched,
  setTouched,
  validationErrors,
  selectedFormCustomer,
  customerCreditWarning,
  selectedProductId,
  setSelectedProductId,
  selectedBatchNumber,
  setSelectedBatchNumber,
  productBatches,
  batchesLoading = false,
  handleProductChange,
  availableInventory,
  selectedInventoryItem,
  quantity,
  handleQuantityChange,
  saleUnit,
  handleSaleUnitChange,
  isCartonProduct,
  paymentMode,
  setPaymentMode,
  amountPaid,
  setAmountPaid,
  dueDate,
  setDueDate,
  paymentType,
  setPaymentType,
  agents,
  user,
  handleSaveSale,
  savingSale = false,
  isFormValid,
  isHistoricalSale,
  isMealSale = false,
  productDetailsText,
  setProductDetailsText,
  canCreateSale,
  onCustomerSearchChange,
  customersLoading = false,
}: Readonly<AddSaleModalProps>) {
  if (!show) return null;

  return (
    <ModalDialog onClose={onClose}>
      <div className="relative z-10 w-full max-w-lg rounded-md border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Record New Sale</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          {/* Hub & Channel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="sale-hub" className={LABEL_CLS}>Hub Location</label>
              {canCreateSale ? (
                <select id="sale-hub" value={selectedHub} onChange={(e) => { setSelectedHub(e.target.value); setSelectedProductId(''); }} className={INPUT_CLS}>
                  {hubScope.activeHubs.map((h) => (
                    <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
                  ))}
                </select>
              ) : (
                <input id="sale-hub" type="text" readOnly disabled value={hubScope.hubName} className={`${INPUT_CLS} opacity-80 cursor-not-allowed`} />
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="sale-channel" className={LABEL_CLS}>Sales Channel</label>
              <select id="sale-channel" value={newSale.channel || SalesChannel.WALK_IN} onChange={(e) => { const ch = e.target.value as SalesChannel; setNewSale({ ...newSale, channel: ch, deliveryStatus: ch === SalesChannel.DELIVERY ? DeliveryStatus.PENDING : DeliveryStatus.NOT_APPLICABLE }); }} className={INPUT_CLS}>
                {Object.values(SalesChannel).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Delivery details (conditional) */}
          {newSale.channel === SalesChannel.DELIVERY && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-md border border-dashed bg-muted/20">
              <div className="space-y-2">
                <label htmlFor="sale-delivery-address" className={LABEL_CLS}>Delivery Address</label>
                <input id="sale-delivery-address" type="text" value={newSale.deliveryAddress || ''} onChange={(e) => setNewSale({ ...newSale, deliveryAddress: e.target.value })} placeholder="Enter address" className={INPUT_CLS} />
              </div>
              <div className="space-y-2">
                <label htmlFor="sale-customer-phone" className={LABEL_CLS}>Customer Phone</label>
                <input id="sale-customer-phone" type="text" value={newSale.customerPhone || ''} onChange={(e) => setNewSale({ ...newSale, customerPhone: e.target.value })} placeholder="Phone for delivery" className={INPUT_CLS} />
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="space-y-2">
            <label htmlFor="sale-customer" className={LABEL_CLS}>Customer *</label>
            <SearchableCustomerSelect
              id="sale-customer"
              customers={customers}
              value={newSale.customerId || ''}
              serverSearch
              onSearchChange={onCustomerSearchChange}
              placeholder={customersLoading ? 'Searching customers...' : 'Search customers by name or hub...'}
              onChange={(customerId) => {
                setNewSale({ ...newSale, customerId });
                setTouched((t) => ({ ...t, customerId: true }));
              }}
              error={Boolean(touched.customerId && validationErrors.customerId)}
            />
            {touched.customerId && validationErrors.customerId && <p className="text-xs text-red-500">{validationErrors.customerId}</p>}
          </div>

          {/* Customer context card */}
          {selectedFormCustomer && (
            <div className="p-3 rounded-md border bg-muted/20 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{selectedFormCustomer.name}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${selectedFormCustomer.type === 'B2B' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>{selectedFormCustomer.type}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div><span className="block font-medium text-foreground">{selectedFormCustomer.totalOrders}</span>orders</div>
                <div><span className="block font-medium text-foreground">{fmt(selectedFormCustomer.totalSpent)}</span>total spent</div>
                <div><span className="block font-medium text-foreground">{fmt(Math.round(selectedFormCustomer.avgOrder))}</span>avg order</div>
              </div>
              {selectedFormCustomer.lastSale && <p className="text-xs text-muted-foreground mt-1">Last purchase: {selectedFormCustomer.lastSale}</p>}
              {selectedFormCustomer.credit && selectedFormCustomer.credit.totalOutstanding > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-700 bg-orange-50 p-1.5 rounded">
                  <AlertTriangle size={12} /> Outstanding credit: {fmt(selectedFormCustomer.credit.totalOutstanding)}
                </div>
              )}
            </div>
          )}

          {/* Credit warning — shown when customer has outstanding credit, regardless of credit toggle */}
          {customerCreditWarning && (
            <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{customerCreditWarning}</span>
            </div>
          )}

          {!isMealSale && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
              {isHistoricalSale
                ? 'Historical sales must use a catalog product on the fulfillment hub so inventory stays linked.'
                : 'Select a catalog product and batch. Inventory is deducted when stock tracking is enabled.'}
            </div>
          )}
          {isMealSale && (
            <div className="rounded-md border border-pink-200 bg-pink-50 p-3 text-sm text-pink-900">
              Meal sale — category Kitchen, unit Food plate.
            </div>
          )}

          {/* Product */}
          <div className="space-y-2">
            <label htmlFor="sale-product" className={LABEL_CLS}>
              Product{isMealSale ? '' : ' *'}
            </label>
            <select id="sale-product" value={selectedProductId} onChange={(e) => handleProductChange(e.target.value)} className={`${INPUT_CLS} ${touched.productId && validationErrors.productId ? 'border-red-500' : ''}`}>
              <option value="">-- Select Product --</option>
              <option value="__meal__">Record a meal…</option>
              {availableInventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            {touched.productId && validationErrors.productId && <p className="text-xs text-red-500">{validationErrors.productId}</p>}
            {isMealSale && (
              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <div className="space-y-1">
                  <label htmlFor="sale-meal-name" className="text-xs font-medium text-muted-foreground">
                    Meal name *
                  </label>
                  <input
                    id="sale-meal-name"
                    type="text"
                    value={productDetailsText}
                    onChange={(e) => {
                      setProductDetailsText(e.target.value);
                      setTouched((t) => ({ ...t, productDetails: true }));
                    }}
                    placeholder="e.g. Jollof rice plate"
                    className={`${INPUT_CLS} ${touched.productDetails && validationErrors.productDetails ? 'border-red-500' : ''}`}
                  />
                  {touched.productDetails && validationErrors.productDetails && (
                    <p className="text-xs text-red-500">{validationErrors.productDetails}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Category</p>
                    <p className="text-sm font-medium">Kitchen</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Unit</p>
                    <p className="text-sm font-medium">Food plate</p>
                  </div>
                </div>
              </div>
            )}
            {selectedInventoryItem && !isMealSale && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Catalog ref: {selectedInventoryItem.currentStock} {selectedInventoryItem.unitOfMeasure} on hand (informational)</span>
                {isCartonProduct && selectedInventoryItem.cartonWeight ? (
                  <span>&middot; {selectedInventoryItem.cartonWeight} Kg / carton</span>
                ) : null}
                <span>
                  &middot;{' '}
                  {isCartonProduct
                    ? `${fmt(selectedInventoryItem.cartonPrice ?? 0)}/Carton · ${fmt(selectedInventoryItem.baseSellingPrice)}/Kg`
                    : `${fmt(selectedInventoryItem.baseSellingPrice)}/${selectedInventoryItem.unitOfMeasure}`}
                </span>
                {selectedInventoryItem.currentStock <= selectedInventoryItem.minStockLevel && (
                  <span className="text-red-500 font-medium flex items-center gap-1"><AlertTriangle size={10} /> Low stock</span>
                )}
              </div>
            )}
          </div>

          {!isMealSale && selectedProductId && (
            <div className="space-y-2">
              <label htmlFor="sale-batch" className={LABEL_CLS}>Batch *</label>
              <select
                id="sale-batch"
                value={selectedBatchNumber}
                onChange={(e) => {
                  setSelectedBatchNumber(e.target.value);
                  setTouched((t) => ({ ...t, batchNumber: true }));
                }}
                className={`${INPUT_CLS} ${touched.batchNumber && validationErrors.batchNumber ? 'border-red-500' : ''}`}
                disabled={batchesLoading || productBatches.length === 0}
              >
                <option value="">
                  {batchesLoading
                    ? 'Loading batches…'
                    : productBatches.length === 0
                      ? 'No open batches — record a Purchase first'
                      : '-- Select batch --'}
                </option>
                {productBatches.map((b) => (
                  <option key={b.batchNumber} value={b.batchNumber}>
                    {b.batchNumber}
                    {` · ${b.quantityRemaining} ${b.uom || selectedInventoryItem?.unitOfMeasure || ''} left`}
                    {b.expiryDate ? ` · exp ${b.expiryDate}` : ''}
                    {b.supplier ? ` · ${b.supplier}` : ''}
                  </option>
                ))}
              </select>
              {touched.batchNumber && validationErrors.batchNumber && (
                <p className="text-xs text-red-500">{validationErrors.batchNumber}</p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Stock is deducted from the selected purchase batch only.
              </p>
            </div>
          )}

          {/* Quantity, sale unit & Amount */}
          <div className={`grid grid-cols-1 ${isCartonProduct && !isMealSale ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
            {isCartonProduct && !isMealSale && (
              <div className="space-y-2">
                <label htmlFor="sale-unit" className={LABEL_CLS}>Unit *</label>
                <select
                  id="sale-unit"
                  value={saleUnit}
                  onChange={(e) => handleSaleUnitChange((e.target.value as 'Carton' | 'Kg' | '') || '')}
                  className={`${INPUT_CLS} ${touched.saleUnit && validationErrors.saleUnit ? 'border-red-500' : ''}`}
                >
                  <option value="">-- Select --</option>
                  <option value="Carton">Carton</option>
                  <option value="Kg">Kg</option>
                </select>
                {touched.saleUnit && validationErrors.saleUnit && (
                  <p className="text-xs text-red-500">{validationErrors.saleUnit}</p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="sale-quantity" className={LABEL_CLS}>
                Quantity{isMealSale ? ' (Food plate)' : saleUnit ? ` (${saleUnit})` : ''}
              </label>
              <input
                id="sale-quantity"
                type="number"
                min={0.01}
                step="0.01"
                value={quantity}
                onChange={(e) => handleQuantityChange(Number(e.target.value) || 0)}
                className={`${INPUT_CLS} ${touched.quantity && validationErrors.quantity ? 'border-red-500' : ''}`}
              />
              {touched.quantity && validationErrors.quantity && <p className="text-xs text-red-500">{validationErrors.quantity}</p>}
            </div>
            <div className="space-y-2">
              <label htmlFor="sale-amount" className={LABEL_CLS}>Amount ({NAIRA}){isHistoricalSale || isMealSale ? ' *' : ''}</label>
              <input id="sale-amount" type="number" step="0.01" value={newSale.amount || ''} onChange={(e) => setNewSale({ ...newSale, amount: Number(e.target.value) || 0 })} className={`${INPUT_CLS} ${touched.amount && validationErrors.amount ? 'border-red-500' : ''}`} />
              {touched.amount && validationErrors.amount && <p className="text-xs text-red-500">{validationErrors.amount}</p>}
            </div>
          </div>
          {/* Live price breakdown */}
          {selectedInventoryItem && !isMealSale && quantity > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 flex items-center gap-3 flex-wrap">
              {(() => {
                const unitPrice =
                  isCartonProduct && saleUnit === 'Kg'
                    ? selectedInventoryItem.baseSellingPrice
                    : isCartonProduct
                      ? (selectedInventoryItem.cartonPrice ?? 0)
                      : selectedInventoryItem.baseSellingPrice;
                const suggested = unitPrice * quantity;
                return (
                  <>
                    <span>
                      {quantity} {saleUnit || selectedInventoryItem.unitOfMeasure} &times; {fmt(unitPrice)} ={' '}
                      <span className="font-medium text-foreground">{fmt(suggested)}</span>
                    </span>
                    {Number(newSale.amount) !== suggested && (
                      <span className="text-orange-600 font-medium">Custom price applied ({fmt(Number(newSale.amount))})</span>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {/* Payment Mode */}
          <fieldset className="border-0 p-0 m-0 space-y-2">
            <legend className={LABEL_CLS}>Amount Paid *</legend>
            <div className="flex items-center gap-2">
              {Object.values(PaymentMode).map((mode) => (
                <button key={mode} type="button" onClick={() => {
                  setPaymentMode(mode);
                  if (mode === PaymentMode.FULL_PAYMENT) { setAmountPaid(Number(newSale.amount) || 0); }
                  else if (mode === PaymentMode.FULL_CREDIT) { setAmountPaid(0); }
                }} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium border transition-colors ${paymentMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}>
                  {mode}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Amount paid input (only for partial credit) */}
          {paymentMode === PaymentMode.PARTIAL_CREDIT && (
            <div className="space-y-2">
              <label htmlFor="sale-amount-paid" className={LABEL_CLS}>Amount Paid Now ({NAIRA})</label>
              <input id="sale-amount-paid" type="number" step="0.01" min={0} max={Number(newSale.amount) || undefined} value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value) || 0)} className={INPUT_CLS} />
              {Number(newSale.amount) > 0 && (
                <p className="text-xs text-orange-600 font-medium">Balance on credit: {fmt(Math.max(0, Number(newSale.amount) - amountPaid))}</p>
              )}
            </div>
          )}

          {(paymentMode === PaymentMode.FULL_CREDIT || paymentMode === PaymentMode.PARTIAL_CREDIT) && (
            <div className="space-y-2">
              <label htmlFor="sale-due-date" className={LABEL_CLS}>Due Date *</label>
              <input
                id="sale-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setTouched((t) => ({ ...t, dueDate: true })); }}
                className={`${INPUT_CLS} ${touched.dueDate && validationErrors.dueDate ? 'border-red-500' : ''}`}
              />
              {touched.dueDate && validationErrors.dueDate && <p className="text-xs text-red-500">{validationErrors.dueDate}</p>}
            </div>
          )}

          {/* Credit warning for partial/full credit */}
          {(paymentMode === PaymentMode.FULL_CREDIT || paymentMode === PaymentMode.PARTIAL_CREDIT) && customerCreditWarning && (
            <div className="flex items-start gap-2 rounded-md border border-orange-300 bg-orange-50 p-3 text-sm text-orange-800">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{customerCreditWarning} — Proceeding with credit sale.</span>
            </div>
          )}

          {/* Payment Type */}
          {paymentMode !== PaymentMode.FULL_CREDIT && (
            <fieldset className="border-0 p-0 m-0 space-y-2">
              <legend className={LABEL_CLS}>Payment Type</legend>
              <div className="flex items-center gap-2">
                {Object.values(PaymentType).map((type) => (
                  <button key={type} type="button" onClick={() => setPaymentType(type)} className={`flex-1 py-2 px-3 rounded-md text-xs font-medium border transition-colors ${paymentType === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Date & Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="sale-date" className={LABEL_CLS}>Date</label>
              <input id="sale-date" type="date" value={newSale.date || ''} onChange={(e) => setNewSale({ ...newSale, date: e.target.value })} className={INPUT_CLS} />
            </div>
            <div className="space-y-2">
              <label htmlFor="sale-agent" className={LABEL_CLS}>Agent</label>
              <select id="sale-agent" value={newSale.agentId || user?.id || ''} onChange={(e) => setNewSale({ ...newSale, agentId: e.target.value })} className={INPUT_CLS}>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label htmlFor="sale-notes" className={LABEL_CLS}>Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea id="sale-notes" value={newSale.notes || ''} onChange={(e) => setNewSale({ ...newSale, notes: e.target.value })} placeholder="Internal comments..." rows={2} className={`${INPUT_CLS} h-auto resize-none`} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
          <SubmitButton type="button" onClick={handleSaveSale} disabled={!isFormValid} loading={savingSale} className={BTN_PRIMARY}>Record Sale</SubmitButton>
        </div>
      </div>
    </ModalDialog>
  );
}
