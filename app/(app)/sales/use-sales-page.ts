'use client';

import { usePageSize } from '@/hooks/use-page-size';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useUrlState } from '@/hooks/use-url-state';
import {
  useSales,
  useSale,
  useSalesSummary,
  useUpdateSale,
  useUpdateDeliveryStatus,
  useVoidSale,
  useAgents,
  useInventory,
  useStockLogs,
  useCreditSummary,
  useHubs,
  useDownloadSalesImportTemplate,
  useValidateSalesImport,
  useExportSales,
  confirmSalesImport,
  invalidateSalesImportQueries,
  SALES_PAGE_SIZE,
} from '@/hooks/use-queries';
import type { Sale, DeliveryStatus } from '@/types';
import { getBulkJob, salesImportHistoryKey, submitBulkJob, type BulkJob } from '@/lib/bulk-jobs';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { isLockedSale, isSalesImportRowReady, lockedSaleMessage, type DetailTab } from './sales-utils';
import { useSalesFilters } from './use-sales-filters';
import { useRecordSale } from './use-record-sale';

const EMPTY_KPIS = { revenue: 0, profit: 0, count: 0, avgOrder: 0, creditCount: 0, creditAmount: 0, deliveryCount: 0, revenueChange: 0, profitChange: 0, unitsByUnit: {} };

export function useSalesPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const { get, set } = useUrlState();
  const queryClient = useQueryClient();

  // SKU options for the "More filters" SKU picker (scoped to location and chosen categories).
  const { data: skuInventory = [], isFetched: skuInventoryFetched } = useInventory(hubScope.hubIdForApi ? { hub_id: hubScope.hubIdForApi } : undefined);
  const { data: agents = [] } = useAgents();
  const catParam = get('cat') ?? '';
  const { filterHub } = hubScope;
  const skuOptions = useMemo(() => {
    const cats = new Set(catParam.split(',').filter(Boolean).map((c) => c.toLowerCase()));
    return skuInventory
      .filter((item) => !!item.sku && (filterHub === 'All' || item.location === filterHub) && (cats.size === 0 || cats.has((item.category || '').toLowerCase())))
      .toSorted((a, b) => a.sku.localeCompare(b.sku) || a.name.localeCompare(b.name));
  }, [skuInventory, catParam, filterHub]);

  const filters = useSalesFilters(hubScope, skuInventoryFetched ? skuOptions.map((s) => s.id) : null, {
    agentName: (id) => agents.find((a) => a.id === id)?.name,
    skuName: (id) => skuOptions.find((s) => s.id === id)?.name,
  });

  // Reset to page 1 whenever the filters change (no effect: compare during render).
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeRaw] = usePageSize('sales', SALES_PAGE_SIZE);
  const setPageSize = (n: number) => { setPageSizeRaw(n); setPage(1); };
  const [seenKey, setSeenKey] = useState(filters.filterKey);
  if (seenKey !== filters.filterKey) {
    setSeenKey(filters.filterKey);
    setPage(1);
  }

  const { data: salesList, isLoading: salesLoading, isFetching: salesFetching } = useSales({ ...filters.summaryFilters, ...filters.sortParams, page, limit: pageSize });
  const { data: salesSummary, isFetching: summaryFetching } = useSalesSummary(filters.summaryFilters);
  const { data: previousSummary } = useSalesSummary(filters.previousFilters ?? undefined, { enabled: !!filters.previousFilters });
  const sales = useMemo(() => salesList?.items ?? [], [salesList]);
  const salesMeta = salesList?.meta ?? { page: 1, limit: pageSize, total: 0, totalPages: 1 };
  const kpis = salesSummary ?? EMPTY_KPIS;
  const revenueChangePct = filters.previousFilters && previousSummary && previousSummary.revenue > 0
    ? ((kpis.revenue - previousSummary.revenue) / previousSummary.revenue) * 100
    : null;
  // Same comparison for profit (the old page showed it "vs last month" from the server).
  const previousProfit = previousSummary?.profit ?? 0;
  const profitChangePct = filters.previousFilters && previousProfit > 0
    ? (((kpis.profit ?? 0) - previousProfit) / previousProfit) * 100
    : null;

  const { data: stockLogsResult } = useStockLogs();
  const { data: creditSummary = [] } = useCreditSummary();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);

  // ── Record sale: /sales?new=1 opens it, &customer=<id> preselects the customer.
  const showAddModal = get('new') === '1';
  const setShowAddModal = (open: boolean) => set(open ? { new: '1' } : { new: null, customer: null });
  const recordSale = useRecordSale({
    open: showAddModal,
    presetCustomerId: showAddModal ? get('customer') : null,
    hubScope,
    hubs,
    creditSummary,
    sales,
    onSaved: () => setShowAddModal(false),
  });
  const closeRecordSale = () => {
    recordSale.resetForm();
    setShowAddModal(false);
  };

  // ── Sale drawer: /sales?sale=<id>. Uses the loaded row, or fetches it for deep links.
  const saleId = get('sale');
  const [patchedSale, setPatchedSale] = useState<Sale | null>(null);
  const listedSale = saleId ? sales.find((s) => s.id === saleId) : undefined;
  const { data: fetchedSale, isFetching: saleFetching } = useSale(saleId && !listedSale ? saleId : null);
  const selectedSale = saleId ? (patchedSale?.id === saleId ? patchedSale : listedSale ?? fetchedSale ?? null) : null;
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const openSale = (sale: Sale) => {
    setPatchedSale(null);
    setDetailTab('overview');
    setIsEditing(false);
    setShowVoidConfirm(false);
    set({ sale: sale.id });
  };
  const closeDetailPanel = () => {
    setIsEditing(false);
    setShowVoidConfirm(false);
    setPatchedSale(null);
    set({ sale: null });
  };

  const updateSale = useUpdateSale();
  const updateDeliveryStatusMutation = useUpdateDeliveryStatus();
  const voidSale = useVoidSale();

  const resolveHubId = (hubName: string) => (activeHubs.find((h) => h.name === hubName) ?? hubs.find((h) => h.name === hubName))?.id;

  const handleUpdateDeliveryStatus = (id: string, status: DeliveryStatus) => {
    updateDeliveryStatusMutation.mutate(
      { id, delivery_status: status },
      {
        onSuccess: (updated) => {
          if (selectedSale?.id === id) setPatchedSale(updated);
          toast.success(`Delivery: ${status}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const startEditing = () => {
    if (!selectedSale) return;
    if (isLockedSale(selectedSale)) {
      toast.error(lockedSaleMessage(selectedSale));
      return;
    }
    setEditForm({
      amount: selectedSale.amount,
      discount: selectedSale.discount ?? 0,
      paymentMode: selectedSale.paymentMode,
      notes: selectedSale.notes,
      deliveryAddress: selectedSale.deliveryAddress,
      customerPhone: selectedSale.customerPhone,
      paymentTerms: selectedSale.paymentTerms,
      channel: selectedSale.channel,
      hubName: selectedSale.hubName,
      item: selectedSale.item,
    });
    setShowVoidConfirm(false);
    setDetailTab('overview');
    setIsEditing(true);
  };

  const editBatchPriceError: string | null = null;

  const saveEdit = () => {
    if (!selectedSale) return;
    if (isLockedSale(selectedSale)) {
      toast.error(lockedSaleMessage(selectedSale));
      return;
    }
    const amount = Number(editForm.amount) || selectedSale.amount;
    const hubId = editForm.hubName ? resolveHubId(editForm.hubName) : undefined;
    updateSale.mutate(
      {
        id: selectedSale.id,
        amount,
        discount: Number(editForm.discount ?? selectedSale.discount ?? 0) || 0,
        // amount_paid is not sent: payments go through the credit repayment
        // flow (Credits > Record payment) so the ledger stays correct.
        payment_mode: editForm.paymentMode ?? selectedSale.paymentMode,
        notes: editForm.notes,
        delivery_address: editForm.deliveryAddress,
        payment_terms: editForm.paymentTerms,
        channel: editForm.channel,
        ...(isAdmin && editForm.item
          ? {
              item: {
                product_id: editForm.item.productId,
                product_name: editForm.item.productName,
                quantity: editForm.item.quantity,
                unit: editForm.item.unit,
                category: editForm.item.category,
              },
            }
          : {}),
        ...(hubId && hubId !== selectedSale.hubId ? { hub_id: hubId } : {}),
      },
      {
        onSuccess: (updated) => {
          setPatchedSale(updated);
          setIsEditing(false);
          toast.success('Sale updated.');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleVoidSale = () => {
    if (!selectedSale) return;
    if (isLockedSale(selectedSale)) {
      toast.error(lockedSaleMessage(selectedSale));
      return;
    }
    voidSale.mutate(selectedSale.id, {
      onSuccess: (updated) => {
        setPatchedSale(updated);
        setShowVoidConfirm(false);
        toast.success('Sale voided.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  // ── Export, template, import
  const exportSales = useExportSales();
  const handleExport = () => {
    exportSales.mutate(
      { ...filters.summaryFilters, ...filters.sortParams },
      {
        onSuccess: () => toast.success('Sales export downloaded'),
        onError: (err) => toast.error(err.message || 'Export failed'),
      },
    );
  };

  const downloadTemplate = useDownloadSalesImportTemplate();
  const handleDownloadTemplate = (type: 'catalog' | 'custom' = 'catalog') => {
    const toastId = toast.loading('Preparing your template…');
    downloadTemplate.mutate(type, {
      onSuccess: () => toast.success(`${type === 'custom' ? 'Custom' : 'Catalog'} template downloaded.`, { id: toastId }),
      onError: (err) => toast.error(err.message || 'Failed to download template.', { id: toastId }),
    });
  };

  const validateImport = useValidateSalesImport();
  const canConfirmImport = Boolean(validateImport.data?.summary.valid &&
    validateImport.data.summary.invalid === 0 &&
    validateImport.data.rows.every(isSalesImportRowReady));
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<string | null>(null);
  const [importPhase, setImportPhase] = useState<'submitting' | 'direct' | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [queuedImport, setQueuedImport] = useState<BulkJob | null>(null);
  const [latestImportId, setLatestImportId] = useState<string | null>(null);
  const importInFlight = useRef(false);

  const { data: latestImport } = useQuery({
    queryKey: ['bulkJob', user?.id, latestImportId],
    queryFn: () => getBulkJob(latestImportId!),
    enabled: Boolean(user && latestImportId),
    refetchInterval: ({ state }) => {
      const status = state.data?.status;
      return status === 'queued' || status === 'running' ? 3000 : false;
    },
  });
  useEffect(() => {
    if (latestImport?.status !== 'complete') return;
    invalidateSalesImportQueries(queryClient);
    void queryClient.invalidateQueries({ queryKey: salesImportHistoryKey });
  }, [latestImport?.id, latestImport?.status, queryClient]);

  const closeImportModal = () => {
    setImportFile(null);
    setImportError(null);
    validateImport.reset();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || importInFlight.current) return;
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Please select an .xlsx Excel file.');
      return;
    }
    if (file.size === 0) {
      toast.error('This file is empty. Download a local copy and select it again.');
      return;
    }
    setImportFile(file.name);
    setImportError(null);
    validateImport.mutate(file);
  };

  const handleImportConfirm = async () => {
    if (!canConfirmImport || importInFlight.current) return;
    const auditId = validateImport.data?.validate_audit_id;
    if (!auditId) {
      setImportError('Validation session expired. Please re-upload the file.');
      return;
    }
    importInFlight.current = true;
    setImportPhase('submitting');
    setImportError(null);
    try {
      const job = await submitBulkJob('sales-import', { validate_audit_id: auditId });
      if (job) {
        queryClient.setQueryData(['bulkJob', user?.id, job.id], job);
        setLatestImportId(job.id);
        closeImportModal();
        setQueuedImport(job);
        void queryClient.invalidateQueries({ queryKey: salesImportHistoryKey });
        return;
      }

      setImportPhase('direct');
      const result = await confirmSalesImport({ validate_audit_id: auditId });
      closeImportModal();
      const imported = result.imported_so_far ?? result.imported;
      const failed = result.failed_so_far ?? result.failed;
      if (failed) toast.error(`Imported ${imported} sales. ${failed} rows failed.`);
      else toast.success(`Imported ${imported} sales.`);
      invalidateSalesImportQueries(queryClient);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Could not confirm the import.');
    } finally {
      importInFlight.current = false;
      setImportPhase(null);
    }
  };

  const stockLogs = stockLogsResult?.data;
  const saleStockLogs = useMemo(() => (selectedSale && stockLogs ? stockLogs.filter((l) => l.referenceId === selectedSale.id) : []), [selectedSale, stockLogs]);
  const customerSalesHistory = useMemo(() => {
    if (!selectedSale) return [];
    return sales
      .filter((s) => s.customerId === selectedSale.customerId && s.id !== selectedSale.id && s.status !== 'Voided')
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [selectedSale, sales]);

  return {
    user, can, isAdmin, hubScope, activeHubs, agents,
    filters, skuOptions, productCategories: PRODUCT_CATEGORIES,
    sales, salesMeta, page, setPage, pageSize, setPageSize, salesLoading, salesFetching, summaryFetching, kpis, revenueChangePct, profitChangePct,
    showAddModal, setShowAddModal, closeRecordSale, recordSale,
    saleId, selectedSale, saleFetching, openSale, closeDetailPanel,
    detailTab, setDetailTab, isEditing, setIsEditing, editForm, setEditForm, showVoidConfirm, setShowVoidConfirm,
    saleStockLogs, customerSalesHistory, handleUpdateDeliveryStatus, startEditing, saveEdit, editBatchPriceError, handleVoidSale,
    savingEdit: updateSale.isPending, voidingSale: voidSale.isPending, updatingDelivery: updateDeliveryStatusMutation.isPending,
    handleExport, exportingSales: exportSales.isPending,
    handleDownloadTemplate, downloadingTemplate: downloadTemplate.isPending,
    importInputRef, handleImportFile, handleImportConfirm, closeImportModal,
    importFile, importPreview: validateImport.data, importPhase, importError: importError ?? validateImport.error?.message,
    queuedImport, closeQueuedImport: () => setQueuedImport(null),
    showImportHistory: get('importHistory') === '1', setShowImportHistory: (open: boolean) => set({ importHistory: open ? '1' : null }),
    validating: validateImport.isPending, canConfirmImport,
  };
}
