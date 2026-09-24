'use client';

import { X, Edit3, Save } from 'lucide-react';
import { Sale, DeliveryStatus, Hub } from '@/types';
import type { HubScopeFilter } from '@/hooks/use-hub-scope';
import type { DetailTab } from './sales-utils';
import { isTillSale } from './sales-utils';
import type { Permission } from '@/lib/permissions';
import { ModalDialog } from './modal-dialog';
import { SaleDetailTabContent } from './sale-detail-tabs';
import type { StockLog } from '@/types';
import { SubmitButton } from '@/components/submit-button';

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
  hubScope: HubScopeFilter;
  activeHubs: Hub[];
}>;

function DetailPanelHeader({
  sale,
  isEditing,
  setIsEditing,
  onClose,
  onStartEditing,
  onSaveEdit,
  savingEdit = false,
  can,
}: Readonly<{
  sale: Sale;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onClose: () => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  savingEdit?: boolean;
  can: (permission: Permission) => boolean;
}>) {
  return (
    <div className="p-6 border-b flex justify-between items-start sticky top-0 bg-card z-10">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold truncate">{sale.customerName}</h2>
          {sale.isCredit && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700">Credit</span>}
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">{sale.date} &middot; {sale.agentName} &middot; {sale.channel || 'Walk-In'}</p>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {sale.status !== 'Voided' && !isEditing && !isTillSale(sale) && can('sales.edit') && (
          <button type="button" onClick={onStartEditing} className="h-8 px-3 rounded-md flex items-center gap-1.5 border hover:bg-accent text-sm font-medium"><Edit3 size={14} /> Edit</button>
        )}
        {isEditing && (
          <>
            <SubmitButton type="button" onClick={onSaveEdit} loading={savingEdit} className="h-8 px-3 gap-1.5 text-sm"><Save size={14} /> Save</SubmitButton>
            <button type="button" onClick={() => setIsEditing(false)} className="h-8 px-3 rounded-md flex items-center gap-1.5 border hover:bg-accent text-sm font-medium">Cancel</button>
          </>
        )}
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close"><X size={20} /></button>
      </div>
    </div>
  );
}

export function SaleDetailPanel({
  sale,
  detailTab,
  setDetailTab,
  isEditing,
  setIsEditing,
  editForm,
  setEditForm,
  showVoidConfirm,
  setShowVoidConfirm,
  saleStockLogs,
  customerSalesHistory,
  onClose,
  onSelectSale,
  onStartEditing,
  onSaveEdit,
  onVoidSale,
  onUpdateDeliveryStatus,
  savingEdit = false,
  voidingSale = false,
  updatingDelivery = false,
  can,
  isCompanyAdmin,
  hubScope,
  activeHubs,
}: SaleDetailPanelProps) {
  return (
    <ModalDialog onClose={onClose} align="end">
      <div className="relative z-10 w-full max-w-2xl bg-card border-l shadow-xl h-full overflow-y-auto animate-in slide-in-from-right duration-200">
        <DetailPanelHeader
          sale={sale}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onClose={onClose}
          onStartEditing={onStartEditing}
          onSaveEdit={onSaveEdit}
          savingEdit={savingEdit}
          can={can}
        />

        <div className="flex border-b">
          {(['overview', 'delivery', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setDetailTab(tab)}
              className={`flex-1 py-3 text-xs font-medium text-center transition-colors ${detailTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'delivery' && 'Delivery'}
              {tab === 'history' && `History (${customerSalesHistory.length})`}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          <SaleDetailTabContent
            detailTab={detailTab}
            sale={sale}
            isEditing={isEditing}
            editForm={editForm}
            setEditForm={setEditForm}
            showVoidConfirm={showVoidConfirm}
            setShowVoidConfirm={setShowVoidConfirm}
            saleStockLogs={saleStockLogs}
            customerSalesHistory={customerSalesHistory}
            onSelectSale={onSelectSale}
            onVoidSale={onVoidSale}
            onUpdateDeliveryStatus={onUpdateDeliveryStatus}
            voidingSale={voidingSale}
            updatingDelivery={updatingDelivery}
            can={can}
            isCompanyAdmin={isCompanyAdmin}
            hubScope={hubScope}
            activeHubs={activeHubs}
          />
        </div>
      </div>
    </ModalDialog>
  );
}
