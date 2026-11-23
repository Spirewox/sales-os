'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Banknote, Edit3, Printer, Trash2 } from 'lucide-react';
import type { Sale, DeliveryStatus, Hub, StockLog } from '@/types';
import type { Permission } from '@/lib/permissions';
import { useCustomerCredits } from '@/hooks/use-queries';
import { formatDate, formatMoney } from '@/lib/format';
import { lagosDay } from '@/lib/period';
import { EntityDrawer, OverflowMenu, RowAction, StatusBadge } from '@/components/app';
import { SubmitButton } from '@/components/submit-button';
import { isKitchenSale, isLockedSale, lockedSaleMessage, saleBalance, salePaymentStatus, saleRef, type DetailTab } from './sales-utils';
import { SaleDetailTabContent } from './sale-detail-tabs';
import { printSaleReceipt } from './sale-receipt';

export type SaleDetailPanelProps = Readonly<{
  sale: Sale;
  detailTab: DetailTab;
  setDetailTab: (tab: DetailTab) => void;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  editForm: Partial<Sale>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Sale>>>;
  showVoidConfirm: boolean;
  setShowVoidConfirm: (v: boolean) => void;
  saleStockLogs: StockLog[];
  customerSalesHistory: Sale[];
  onClose: () => void;
  onSelectSale: (sale: Sale) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onVoidSale: () => void;
  onUpdateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
  savingEdit?: boolean;
  voidingSale?: boolean;
  updatingDelivery?: boolean;
  can: (permission: Permission) => boolean;
  isCompanyAdmin: boolean;
  activeHubs: Hub[];
  batchPriceError?: string | null;
}>;

/** Sale drawer: amount and payment status up top, Record payment and Receipt, Edit and Void in the overflow. */
export function SaleDetailPanel(props: SaleDetailPanelProps) {
  const { sale, detailTab, setDetailTab, isEditing, setIsEditing, showVoidConfirm, setShowVoidConfirm, onClose, onStartEditing, onSaveEdit, onVoidSale, savingEdit = false, voidingSale = false, can, customerSalesHistory } = props;

  // The linked credit record carries repayments made after the sale, so it is the true balance.
  const { data: credits } = useCustomerCredits(sale.customerId || null);
  const credit = credits?.find((c) => c.sale?.id === sale.id);
  const creditOwed = credit && credit.status !== 'Voided' ? credit.amountOwed : null;
  const { paid, balance } = saleBalance(sale, creditOwed);
  const today = lagosDay();
  const status = salePaymentStatus(sale, { creditOwed, overdue: credit ? credit.status === 'Overdue' : undefined, today });
  const dueDate = credit?.dueDate || sale.dueDate;

  const voided = sale.status === 'Voided';
  const locked = isLockedSale(sale);
  const canEdit = !voided && !locked && can('sales.edit');
  const canVoid = !voided && !locked && can('sales.void');
  const creditHref = `/credits?customer=${sale.customerId}`;

  const close = () => {
    if (isEditing && !window.confirm('Discard your changes to this sale?')) return;
    onClose();
  };

  const receipt = () => {
    if (!printSaleReceipt(sale, { balance })) toast.error('Allow pop-ups for this site to print the receipt.');
  };

  const actions = isEditing ? (
    <>
      <SubmitButton type="button" onClick={onSaveEdit} loading={savingEdit} className="h-8 px-3 text-sm">Save changes</SubmitButton>
      <button type="button" onClick={() => setIsEditing(false)} className="h-8 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Cancel</button>
    </>
  ) : (
    <>
      {!voided && balance > 0 && (
        <RowAction href={creditHref} tone="primary"><Banknote aria-hidden /> Record payment</RowAction>
      )}
      <RowAction onClick={receipt}><Printer aria-hidden /> Receipt</RowAction>
    </>
  );

  return (
    <EntityDrawer
      onClose={close}
      width="lg"
      title={formatMoney(sale.amount)}
      status={<StatusBadge domain="payment" status={status} />}
      subtitle={
        <>
          {sale.customerId ? (
            <Link href={`/customers?customer=${sale.customerId}`} className="font-medium text-foreground hover:underline">{sale.customerName}</Link>
          ) : sale.customerName}
          {` · Sale #${saleRef(sale.id)} · ${sale.channel || 'Walk-In'}`}
          {isKitchenSale(sale) && ' · Kitchen'}
        </>
      }
      actions={actions}
      overflow={!isEditing && (
        <OverflowMenu
          label="Sale actions"
          size="sm"
          items={[
            { label: 'Edit sale', icon: <Edit3 aria-hidden />, onSelect: onStartEditing, hidden: !canEdit },
            { label: 'Void sale', icon: <Trash2 aria-hidden />, destructive: true, onSelect: () => setShowVoidConfirm(true), hidden: !canVoid },
          ]}
        />
      )}
      stats={[
        { label: 'Amount', value: formatMoney(sale.amount) },
        { label: 'Paid', value: formatMoney(voided ? 0 : paid), tone: !voided && balance <= 0 ? 'good' : 'default' },
        { label: 'Balance', value: formatMoney(voided ? 0 : balance), tone: voided || balance <= 0 ? 'default' : status === 'Overdue' ? 'danger' : 'warning' },
        { label: 'Date', value: formatDate(sale.date) },
      ]}
      tabs={isEditing ? undefined : {
        items: [
          { id: 'overview', label: 'Overview' },
          { id: 'delivery', label: 'Delivery' },
          { id: 'history', label: 'History', count: customerSalesHistory.length },
        ],
        value: detailTab,
        onChange: setDetailTab,
      }}
    >
      <div className="space-y-6">
        {locked && <p className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{lockedSaleMessage(sale)}</p>}

        {showVoidConfirm && canVoid && (
          <div role="alertdialog" aria-labelledby="void-sale-title" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
            <p id="void-sale-title" className="mb-3 text-sm font-medium text-destructive">Void this sale? This reverses customer stats and marks the sale as voided.</p>
            <div className="flex gap-2">
              <SubmitButton type="button" onClick={onVoidSale} loading={voidingSale} variant="destructive" className="h-8 px-3">Yes, void sale</SubmitButton>
              <button type="button" onClick={() => setShowVoidConfirm(false)} className="h-8 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted">Keep sale</button>
            </div>
          </div>
        )}

        {!voided && balance > 0 && !isEditing && (
          <p className="text-sm text-muted-foreground">
            {formatMoney(balance)} outstanding{dueDate ? `, due ${formatDate(dueDate)}` : ''}.{' '}
            <Link href={creditHref} className="font-medium text-primary hover:underline">Open credit</Link>
          </p>
        )}

        <SaleDetailTabContent {...props} detailTab={isEditing ? 'overview' : detailTab} />
      </div>
    </EntityDrawer>
  );
}
