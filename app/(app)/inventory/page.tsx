'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { useIsMutating } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, Plus, Upload, ArrowUpRight } from 'lucide-react';
import type { InventoryItem } from '@/types';
import type { InventoryImportPreviewRow } from '@/types/api';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import {
  useDownloadInventoryImportTemplate, useImportInventory, useInventory, useStockLogs, useValidateInventoryImport,
} from '@/hooks/use-queries';
import { ConfirmPreviewModal } from '@/components/confirm-preview-modal';
import { OverflowMenu, PageHeader, SectionErrorBoundary, SectionTabs, useSectionTab, type SectionTab } from '@/components/app';
import { InventoryImportModal } from './inventory-import-modal';
import { downloadCsv, roundMoney2, type ConfirmState } from './inventory-utils';
import { useStockView } from './use-stock-view';
import { useRequestScope } from './use-request-scope';
import { StockTab } from './stock-tab';
import { MovementsTab } from './movements-tab';
import { RequestsTab } from './requests-tab';
import { ProductDrawer } from './product-drawer';
import { PurchaseForm } from './forms/purchase-form';
import { TransferForm } from './forms/transfer-form';
import { AdjustForm } from './forms/adjust-form';
import { BatchUpdateForm } from './forms/batch-update-form';
import { CreateSkuForm } from './forms/create-sku-form';
import { EditSkuForm } from './forms/edit-sku-form';
import { RequestForm } from './forms/request-form';

type InventoryTab = 'stock' | 'movements' | 'requests';

type Sheet =
  | { kind: 'create' }
  | { kind: 'edit'; item: InventoryItem }
  | { kind: 'purchase'; item: InventoryItem | null }
  | { kind: 'transfer'; item: InventoryItem }
  | { kind: 'adjust'; item: InventoryItem }
  | { kind: 'batch'; items: InventoryItem[] }
  | { kind: 'request' };

export default function InventoryPage() {
  return (
    <Suspense fallback={<p role="status" className="text-sm text-muted-foreground">Loading inventory…</p>}>
      <InventoryWorkspace />
    </Suspense>
  );
}

function InventoryWorkspace() {
  const { can } = usePermissions();
  const { get, set } = useUrlState();
  const hubScope = useHubScopeFilter();
  const { data: items = [], isFetching: itemsFetching } = useInventory({ hub_id: hubScope.hubIdForApi });
  const { data: hubLogsResult, isFetching: logsFetching } = useStockLogs({ hub_id: hubScope.hubIdForApi, limit: 200 });
  const logs = useMemo(() => hubLogsResult?.data ?? [], [hubLogsResult]);

  // Active products in the app location; every tab and form works from this list.
  const { filterHub } = hubScope;
  const scopedItems = useMemo(() => items.filter((i) => i.isActive !== false && (filterHub === 'All' || i.location === filterHub)), [items, filterHub]);
  const stockView = useStockView(scopedItems, logs);
  const requestScope = useRequestScope(hubScope.filterHub);

  const tabDefs: SectionTab<InventoryTab>[] = [
    { id: 'stock', label: 'Stock' },
    { id: 'movements', label: 'Movements' },
    { id: 'requests', label: 'Requests', count: requestScope.pendingCount, countTone: requestScope.needsActionCount ? 'warning' : 'neutral' },
  ];
  const tab = useSectionTab(tabDefs, 'stock');

  const [sheet, setSheet] = useState<Sheet | null>(null);
  const closeSheet = () => setSheet(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const mutating = useIsMutating() > 0;

  // ?product=<id> opens that product's drawer.
  const productId = get('product');
  const drawerItem = productId ? items.find((i) => i.id === productId) ?? null : null;
  const openProduct = (id: string) => set({ product: id });

  const canAdjust = can('inventory.adjust_stock');
  const canTransfer = can('inventory.transfer');
  const canEdit = can('inventory.edit');
  const itemActions = {
    open: (i: InventoryItem) => openProduct(i.id),
    purchase: canAdjust ? (i: InventoryItem) => setSheet({ kind: 'purchase', item: i }) : undefined,
    transfer: canTransfer ? (i: InventoryItem) => setSheet({ kind: 'transfer', item: i }) : undefined,
    adjust: canAdjust ? (i: InventoryItem) => setSheet({ kind: 'adjust', item: i }) : undefined,
    edit: canEdit ? (i: InventoryItem) => setSheet({ kind: 'edit', item: i }) : undefined,
    bulkUpdate: canAdjust ? (list: InventoryItem[]) => setSheet({ kind: 'batch', items: list }) : undefined,
  };

  /* ──────── Movement import (Excel) ──────── */
  const importInputRef = useRef<HTMLInputElement>(null);
  const downloadInventoryTemplate = useDownloadInventoryImportTemplate();
  const validateInventoryImport = useValidateInventoryImport();
  const importInventory = useImportInventory();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<InventoryImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importingMovements, setImportingMovements] = useState(false);
  const [importAuditId, setImportAuditId] = useState<string>();
  const [importProcessed, setImportProcessed] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  const handleDownloadInventoryTemplate = () => {
    downloadInventoryTemplate.mutate(undefined, {
      onSuccess: () => toast.success('Template downloaded.'),
      onError: (err) => toast.error(err.message || 'Failed to download template.'),
    });
  };

  const handleInventoryImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setShowImportModal(true);
    setImportPreview([]);
    setImportSummary(null);
    setImportError(null);
    validateInventoryImport.mutate(file, {
      onSuccess: (data) => {
        setImportPreview(data.rows);
        setImportSummary(data.summary);
        setImportAuditId(data.validate_audit_id);
        if (data.summary.total === 0) {
          toast.error('No data rows found on the Movements sheet.');
          setShowImportModal(false);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Validation failed.');
        setShowImportModal(false);
      },
    });
  };

  const handleInventoryImportConfirm = () => {
    const rows = importPreview.filter((r) => r.valid && r.resolved).map((r) => r.resolved!);
    if (rows.length === 0) {
      toast.error('No valid rows to import.');
      return;
    }
    setImportingMovements(true);
    setImportError(null);
    setImportProcessed(0);
    importInventory.mutate({ rows, auditId: importAuditId, onProgress: setImportProcessed }, {
      onSuccess: (result) => {
        setImportingMovements(false);
        setShowImportModal(false);
        setImportPreview([]);
        setImportSummary(null);
        setImportError(null);
        toast.success(`Imported ${result.imported} movements.`);
      },
      onError: (err) => {
        setImportingMovements(false);
        const message = err.message || 'Import failed.';
        setImportError(message);
        toast.error(message);
      },
    });
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportPreview([]);
    setImportSummary(null);
    setImportError(null);
  };

  const exportCsv = () => {
    const list = stockView.filteredItems;
    downloadCsv(
      `fudfarmer-inventory-${new Date().toISOString().split('T')[0]}.csv`,
      ['SKU', 'Name', 'Category', 'Location', 'Stock', 'Unit', 'Min Stock', 'Cost Price', 'Selling Price'],
      list.map((i) => [i.sku, i.name, i.category, i.location, i.currentStock, i.unitOfMeasure, i.minStockLevel, roundMoney2(i.avgUnitCost), roundMoney2(i.baseSellingPrice)]),
    );
    toast.success(`Exported ${list.length} items.`);
  };

  if (!can('inventory.view')) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">You don&apos;t have permission to view inventory.</p>
      </div>
    );
  }

  const primary =
    tab === 'requests' && can('inventory.request') ? (
      <button type="button" onClick={() => setSheet({ kind: 'request' })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        <Plus size={16} aria-hidden /> New request
      </button>
    ) : canAdjust ? (
      <button type="button" onClick={() => setSheet({ kind: 'purchase', item: null })} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        <ArrowUpRight size={16} aria-hidden /> Purchase stock
      </button>
    ) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory"
        description="Stock, batches and expiry across your locations."
        actions={primary}
        overflow={
          <OverflowMenu
            label="More inventory actions"
            items={[
              { label: 'Create SKU', icon: <Plus />, onSelect: () => setSheet({ kind: 'create' }), hidden: !can('inventory.create') },
              { label: 'Import movements', icon: <Upload />, onSelect: () => importInputRef.current?.click(), hidden: !can('inventory.import') },
              { label: 'Download import template', icon: <FileSpreadsheet />, onSelect: handleDownloadInventoryTemplate, hidden: !can('inventory.import') },
              { label: 'Export stock (CSV)', icon: <Download />, onSelect: exportCsv, hidden: !can('inventory.export') },
            ]}
          />
        }
        tabs={<SectionTabs label="Inventory sections" tabs={tabDefs} defaultTab="stock" />}
      />
      <input type="file" accept=".xlsx" ref={importInputRef} className="hidden" aria-hidden tabIndex={-1} onChange={handleInventoryImportFile} />

      <SectionErrorBoundary label="Inventory" resetKey={tab}>
        {tab === 'stock' && (
          <StockTab
            hubScope={hubScope}
            view={stockView}
            loading={itemsFetching}
            pendingRequests={requestScope.pendingCount}
            needsActionCount={requestScope.needsActionCount}
            actions={itemActions}
          />
        )}
        {tab === 'movements' && <MovementsTab hubScope={hubScope} items={scopedItems} logs={logs} loading={logsFetching} onOpenProduct={openProduct} />}
        {tab === 'requests' && <RequestsTab hubScope={hubScope} scope={requestScope} />}
      </SectionErrorBoundary>

      {drawerItem && (
        <ProductDrawer
          key={drawerItem.id}
          item={drawerItem}
          onClose={() => set({ product: null })}
          requestConfirm={setConfirm}
          actions={{
            purchase: itemActions.purchase && (() => itemActions.purchase!(drawerItem)),
            transfer: itemActions.transfer && (() => itemActions.transfer!(drawerItem)),
            adjust: itemActions.adjust && (() => itemActions.adjust!(drawerItem)),
            edit: itemActions.edit && (() => itemActions.edit!(drawerItem)),
          }}
        />
      )}

      {sheet?.kind === 'create' && <CreateSkuForm hubScope={hubScope} onClose={closeSheet} requestConfirm={setConfirm} />}
      {sheet?.kind === 'edit' && (
        <EditSkuForm
          original={sheet.item}
          hubScope={hubScope}
          canAdjust={canAdjust}
          onAdjust={() => setSheet({ kind: 'adjust', item: sheet.item })}
          onClose={closeSheet}
          requestConfirm={setConfirm}
        />
      )}
      {sheet?.kind === 'purchase' && <PurchaseForm items={scopedItems} initial={sheet.item} onClose={closeSheet} requestConfirm={setConfirm} />}
      {sheet?.kind === 'transfer' && <TransferForm product={sheet.item} onClose={closeSheet} requestConfirm={setConfirm} />}
      {sheet?.kind === 'adjust' && <AdjustForm product={sheet.item} onClose={closeSheet} requestConfirm={setConfirm} />}
      {sheet?.kind === 'batch' && <BatchUpdateForm products={sheet.items} onClose={closeSheet} requestConfirm={setConfirm} />}
      {sheet?.kind === 'request' && <RequestForm onClose={closeSheet} />}

      <InventoryImportModal
        show={showImportModal}
        onClose={closeImportModal}
        previewRows={importPreview}
        summary={importSummary}
        importing={importingMovements}
        processed={importProcessed}
        validating={validateInventoryImport.isPending}
        importError={importError}
        onConfirm={handleInventoryImportConfirm}
        onDownloadTemplate={handleDownloadInventoryTemplate}
      />

      <ConfirmPreviewModal
        open={!!confirm}
        title={confirm?.title ?? ''}
        subtitle={confirm?.subtitle}
        rows={confirm?.rows ?? []}
        warning={confirm?.warning}
        confirmLabel={confirm?.confirmLabel}
        loading={mutating}
        onBack={() => setConfirm(null)}
        onConfirm={() => { const run = confirm?.run; setConfirm(null); run?.(); }}
      />
    </div>
  );
}
