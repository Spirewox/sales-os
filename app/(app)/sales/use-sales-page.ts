'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import {
  useSales,
  useSalesSummary,
  useCreateSale,
  useUpdateSale,
  useUpdateDeliveryStatus,
  useVoidSale,
  useCustomers,
  useAgents,
  useInventory,
  useStockLogs,
  useProductBatches,
  useCreditSummary,
  useHubs,
  useDownloadSalesImportTemplate,
  useValidateSalesImport,
  runChunkedSalesImport,
  SALES_PAGE_SIZE,
} from '@/hooks/use-queries';
import {
  Sale,
  PaymentTerms,
  SalesChannel,
  DeliveryStatus,
  PaymentType,
  PaymentMode,
  Customer,
} from '@/types';
import { toast } from 'sonner';
import {
  fmt,
  getDateRange,
  creditWarningText,
  escapeCsvCell,
  getAmountPaidForMode,
  BTN_PRIMARY,
  BTN_SECONDARY,
  INPUT_CLS,
  LABEL_CLS,
  type DetailTab,
  type QuickDatePreset,
  type SaleDateFieldFilter,
} from './sales-utils';
import type { SalesImportChunkResult, SalesImportPreviewRow } from '@/types/api';
import { isHistoricalDate } from '@/lib/historical-date';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';

export function useSalesPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateFieldFilter, setDateFieldFilter] = useState<SaleDateFieldFilter>('sold');
  const [quickPreset, setQuickPreset] = useState<QuickDatePreset>('all');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgent, setFilterAgent] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'quantity' | 'amount' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const summaryFilters = useMemo(
    () => ({
      hub_id: hubScope.hubIdForApi,
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(dateFrom || dateTo ? { date_field: dateFieldFilter } : {}),
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(filterAgent !== 'All' ? { agent_id: filterAgent } : {}),
      ...(filterStatus === 'All'
        ? { exclude_voided: true }
        : { status: filterStatus }),
      ...(filterChannel !== 'All' ? { channel: filterChannel } : {}),
      ...(filterCategories.length
        ? { categories: filterCategories.join(',') }
        : {}),
    }),
    [
      hubScope.hubIdForApi,
      dateFrom,
      dateTo,
      dateFieldFilter,
      searchTerm,
      filterAgent,
      filterStatus,
      filterChannel,
      filterCategories,
    ],
  );

  const listFilters = useMemo(
    () => ({
      ...summaryFilters,
      page,
      limit: SALES_PAGE_SIZE,
      ...(sortBy ? { sort_by: sortBy, sort_dir: sortDir } : {}),
    }),
    [summaryFilters, page, sortBy, sortDir],
  );

  const { data: salesList, isLoading: salesLoading, isFetching: salesFetching } = useSales(listFilters);
  const { data: salesSummary } = useSalesSummary(summaryFilters);
  const sales = salesList?.items ?? [];
  const salesMeta = salesList?.meta ?? { page: 1, limit: SALES_PAGE_SIZE, total: 0, totalPages: 1 };
  const kpis = salesSummary ?? {
    revenue: 0,
    profit: 0,
    count: 0,
    avgOrder: 0,
    creditCount: 0,
    creditAmount: 0,
    deliveryCount: 0,
    revenueChange: 0,
    profitChange: 0,
  };

  useEffect(() => {
    setPage(1);
  }, [
    hubScope.hubIdForApi,
    dateFrom,
    dateTo,
    dateFieldFilter,
    searchTerm,
    filterAgent,
    filterStatus,
    filterChannel,
    filterCategories,
    sortBy,
    sortDir,
  ]);

  const toggleSort = (field: 'quantity' | 'amount') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const { data: stockLogs = [] } = useStockLogs();
  const { data: creditSummary = [] } = useCreditSummary();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);
  const createSale = useCreateSale();
  const updateSale = useUpdateSale();
  const updateDeliveryStatusMutation = useUpdateDeliveryStatus();
  const voidSale = useVoidSale();
  const downloadTemplate = useDownloadSalesImportTemplate();
  const validateImport = useValidateSalesImport();
  const importInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState('');
  const [pinnedSaleCustomer, setPinnedSaleCustomer] = useState<Customer | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState('');
  const [selectedHub, setSelectedHub] = useState<string>(hubScope.defaultHubName || 'Lagos');
  useEffect(() => {
    if (hubScope.defaultHubName) setSelectedHub(hubScope.defaultHubName);
  }, [hubScope.defaultHubName]);
  const [quantity, setQuantity] = useState(1);
  const [saleUnit, setSaleUnit] = useState<'Carton' | 'Kg' | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(PaymentMode.FULL_PAYMENT);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.CASH);
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [newSale, setNewSale] = useState<Partial<Sale>>({
    amount: 0,
    status: 'Pending',
    date: new Date().toISOString().split('T')[0],
    paymentTerms: PaymentTerms.COD,
    notes: '',
    channel: SalesChannel.WALK_IN,
    deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Sale>>({});
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<SalesImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [validateAuditId, setValidateAuditId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number; imported: number; failed: number } | null>(null);
  const [importResult, setImportResult] = useState<SalesImportChunkResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCustomerSearch(customerSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const resolveHubId = useCallback(
    (hubName: string) => {
      const hub = activeHubs.find((h) => h.name === hubName) ?? hubs.find((h) => h.name === hubName);
      return hub?.id;
    },
    [activeHubs, hubs],
  );

  const selectedHubId = useMemo(() => resolveHubId(selectedHub), [resolveHubId, selectedHub]);

  const { data: customerList, isFetching: customersFetching } = useCustomers(
    { search: debouncedCustomerSearch || undefined, limit: 50 },
    { enabled: showAddModal },
  );

  const saleModalCustomers = useMemo(() => {
    const items = customerList?.items ?? [];
    if (pinnedSaleCustomer && !items.some((c) => c.id === pinnedSaleCustomer.id)) {
      return [pinnedSaleCustomer, ...items];
    }
    return items;
  }, [customerList, pinnedSaleCustomer]);

  useEffect(() => {
    if (!newSale.customerId) {
      setPinnedSaleCustomer(null);
      return;
    }
    const found = saleModalCustomers.find((c) => c.id === newSale.customerId);
    if (found) setPinnedSaleCustomer(found);
  }, [newSale.customerId, saleModalCustomers]);

  const { data: agents = [] } = useAgents();
  const { data: inventory = [] } = useInventory(
    selectedHubId ? { hub_id: selectedHubId } : undefined,
    { enabled: showAddModal && !!selectedHubId },
  );

  const availableInventory = inventory;
  const selectedInventoryItem = useMemo(
    () => inventory.find((i) => i.id === selectedProductId),
    [inventory, selectedProductId],
  );
  const catalogProductId =
    selectedProductId && selectedProductId !== '__meal__' ? selectedProductId : null;
  const { data: productBatches = [], isFetching: batchesLoading } = useProductBatches(
    showAddModal ? catalogProductId : null,
  );

  useEffect(() => {
    if (!catalogProductId || batchesLoading) return;
    if (productBatches.length === 1 && !selectedBatchNumber) {
      setSelectedBatchNumber(productBatches[0].batchNumber);
    }
  }, [catalogProductId, batchesLoading, productBatches, selectedBatchNumber]);

  const isCartonProduct = selectedInventoryItem?.unitOfMeasure === 'Cartons';

  const computeSaleAmount = (item: typeof selectedInventoryItem, qty: number, unit: 'Carton' | 'Kg' | '') => {
    if (!item || qty <= 0) return 0;
    if (item.unitOfMeasure === 'Cartons') {
      if (unit === 'Kg') {
        if (!(item.baseSellingPrice > 0)) return 0;
        return item.baseSellingPrice * qty;
      }
      if (!(item.cartonPrice && item.cartonPrice > 0)) return 0;
      return item.cartonPrice * qty;
    }
    return item.baseSellingPrice * qty;
  };

  const stockQtyForSale = (item: typeof selectedInventoryItem, qty: number, unit: 'Carton' | 'Kg' | '') => {
    if (!item || qty <= 0) return 0;
    if (item.unitOfMeasure === 'Cartons' && unit === 'Kg') {
      if (!item.cartonWeight || item.cartonWeight <= 0) return Infinity;
      return qty / item.cartonWeight;
    }
    return qty;
  };

  const [productDetailsText, setProductDetailsText] = useState('');
  const MEAL_PRODUCT_ID = '__meal__';
  const isMealSale = selectedProductId === MEAL_PRODUCT_ID;

  const saleDateStr = newSale.date || new Date().toISOString().split('T')[0];
  const isHistoricalSale = isHistoricalDate(saleDateStr);

  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};
    if (!newSale.customerId) errors.customerId = 'Customer is required.';
    if (isMealSale) {
      if (!productDetailsText.trim()) errors.productDetails = 'Meal name is required.';
      if (quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
      if (!newSale.amount || newSale.amount <= 0) errors.amount = 'Amount is required for meal sales.';
    } else {
      if (!selectedProductId) errors.productId = 'Product is required.';
      if (selectedProductId && !selectedBatchNumber) {
        errors.batchNumber = 'Select a purchase batch.';
      }
      if (quantity <= 0) errors.quantity = 'Quantity must be greater than 0.';
      if (isHistoricalSale && (!newSale.amount || newSale.amount <= 0)) {
        errors.amount = 'Amount is required for historical sales.';
      }
      if (isCartonProduct) {
        if (!saleUnit) errors.saleUnit = 'Select Carton or Kg.';
        if (!selectedInventoryItem?.cartonWeight || selectedInventoryItem.cartonWeight <= 0) {
          errors.saleUnit = 'Set carton weight on this product before recording a sale.';
        } else if (saleUnit === 'Carton' && !(selectedInventoryItem.cartonPrice && selectedInventoryItem.cartonPrice > 0)) {
          errors.saleUnit = 'Set carton selling price on this product before selling by Carton.';
        } else if (saleUnit === 'Kg' && !(selectedInventoryItem.baseSellingPrice > 0)) {
          errors.saleUnit = 'Set unit selling price on this product before selling by Kg.';
        }
      }
    }
    if (paymentMode !== PaymentMode.FULL_PAYMENT && !dueDate) {
      errors.dueDate = 'Due date is required for credit sales.';
    }
    return errors;
  }, [
    newSale.customerId,
    newSale.amount,
    selectedProductId,
    selectedBatchNumber,
    quantity,
    saleUnit,
    selectedInventoryItem,
    isCartonProduct,
    paymentMode,
    dueDate,
    isHistoricalSale,
    isMealSale,
    productDetailsText,
  ]);
  const isFormValid = Object.keys(validationErrors).length === 0;

  const customerCreditWarning = useMemo(() => {
    if (!newSale.customerId) return null;
    const row = creditSummary.find((cr) => cr.customerId === newSale.customerId);
    if (!row || row.totalOutstanding <= 0) return null;
    return creditWarningText(row);
  }, [newSale.customerId, creditSummary]);

  const selectedFormCustomer = useMemo(() => {
    if (!newSale.customerId) return null;
    const c = saleModalCustomers.find((cu) => cu.id === newSale.customerId);
    if (!c) return null;
    const custSales = sales.filter((s) => s.customerId === c.id && s.status !== 'Voided');
    const avgOrder =
      custSales.length > 0 ? custSales.reduce((a, s) => a + s.amount, 0) / custSales.length : 0;
    const sorted = custSales.toSorted((a, b) => b.date.localeCompare(a.date));
    const lastSale = sorted.length > 0 ? sorted[0]?.date : null;
    const credit = creditSummary.find((cr) => cr.customerId === c.id);
    return { ...c, avgOrder, lastSale, credit };
  }, [newSale.customerId, saleModalCustomers, sales, creditSummary]);

  const applyPreset = (preset: QuickDatePreset) => {
    setQuickPreset(preset);
    const { from, to } = getDateRange(preset);
    setDateFrom(from);
    setDateTo(to);
  };

  const filteredSales = sales;

  const hasFilters =
    searchTerm ||
    filterAgent !== 'All' ||
    filterStatus !== 'All' ||
    hubScope.filterHub !== 'All' ||
    filterChannel !== 'All' ||
    filterCategories.length > 0 ||
    dateFrom ||
    dateTo ||
    dateFieldFilter !== 'sold';

  const clearFilters = () => {
    setSearchTerm('');
    setFilterAgent('All');
    setFilterStatus('All');
    hubScope.setFilterHub(hubScope.canSwitchHubs ? 'All' : hubScope.hubName);
    setFilterChannel('All');
    setFilterCategories([]);
    setDateFrom('');
    setDateTo('');
    setDateFieldFilter('sold');
    setQuickPreset('all');
    setPage(1);
  };

  const toggleCategoryFilter = (category: string) => {
    setFilterCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    setSelectedBatchNumber('');
    setTouched((t) => ({ ...t, productId: true, batchNumber: false }));
    if (productId === MEAL_PRODUCT_ID) {
      setSaleUnit('');
      setProductDetailsText('');
      setNewSale((prev) => ({ ...prev, amount: 0 }));
      return;
    }
    const item = inventory.find((i) => i.id === productId);
    const nextUnit: 'Carton' | 'Kg' | '' = item?.unitOfMeasure === 'Cartons' ? 'Carton' : '';
    setSaleUnit(nextUnit);
    if (item) {
      setNewSale((prev) => ({
        ...prev,
        amount: computeSaleAmount(item, quantity, nextUnit),
        productDetails: `${quantity} ${nextUnit || item.unitOfMeasure} of ${item.name}`,
      }));
    }
  };

  const handleQuantityChange = (qty: number) => {
    setQuantity(qty);
    setTouched((t) => ({ ...t, quantity: true }));
    const item = inventory.find((i) => i.id === selectedProductId);
    if (item) {
      setNewSale((prev) => ({
        ...prev,
        amount: computeSaleAmount(item, qty, saleUnit),
        productDetails: `${qty} ${saleUnit || item.unitOfMeasure} of ${item.name}`,
      }));
    }
  };

  const handleSaleUnitChange = (unit: 'Carton' | 'Kg' | '') => {
    setSaleUnit(unit);
    setTouched((t) => ({ ...t, saleUnit: true }));
    const item = inventory.find((i) => i.id === selectedProductId);
    if (item) {
      setNewSale((prev) => ({
        ...prev,
        amount: computeSaleAmount(item, quantity, unit),
        productDetails: `${quantity} ${unit || item.unitOfMeasure} of ${item.name}`,
      }));
    }
  };

  const resetForm = () => {
    setNewSale({
      amount: 0,
      status: 'Pending',
      date: new Date().toISOString().split('T')[0],
      paymentTerms: PaymentTerms.COD,
      notes: '',
      channel: SalesChannel.WALK_IN,
      deliveryStatus: DeliveryStatus.NOT_APPLICABLE,
    });
    setSelectedProductId('');
    setSelectedBatchNumber('');
    setQuantity(1);
    setSaleUnit('');
    setPaymentMode(PaymentMode.FULL_PAYMENT);
    setPaymentType(PaymentType.CASH);
    setAmountPaid(0);
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
    setTouched({});
    setProductDetailsText('');
    setCustomerSearch('');
    setDebouncedCustomerSearch('');
    setPinnedSaleCustomer(null);
  };

  const handleSaveSale = () => {
    const touchFields: Record<string, boolean> = {
      customerId: true,
      dueDate: true,
      ...(isMealSale
        ? { productId: true, productDetails: true, quantity: true, amount: true }
        : {
            productId: true,
            batchNumber: true,
            quantity: true,
            saleUnit: true,
            ...(isHistoricalSale ? { amount: true } : {}),
          }),
    };
    setTouched(touchFields);
    if (!isFormValid) {
      toast.error('Please fix validation errors.');
      return;
    }

    const inventoryItem = inventory.find((i) => i.id === selectedProductId);
    if (!isHistoricalSale && !isMealSale && !inventoryItem && selectedProductId) {
      toast.error('Product not found.');
      return;
    }

    const amount = Number(newSale.amount);
    const saleDate = newSale.date || new Date().toISOString().split('T')[0];
    const finalAmountPaid = getAmountPaidForMode(paymentMode, amount, amountPaid);
    const isCreditMode = paymentMode !== PaymentMode.FULL_PAYMENT;
    const hubId = resolveHubId(selectedHub);
    if (!hubId) {
      toast.error('Invalid fulfillment hub.');
      return;
    }

    const saleItemPayload = isMealSale
      ? {
          item: {
            product_name: productDetailsText.trim(),
            quantity: quantity > 0 ? quantity : 1,
            unit: 'Food plate',
            category: 'Kitchen',
          },
        }
      : selectedProductId && quantity > 0
        ? {
            item: {
              product_id: selectedProductId,
              quantity,
              batch_number: selectedBatchNumber,
              ...(saleUnit
                ? { sale_unit: saleUnit, unit: saleUnit }
                : inventoryItem
                  ? { unit: inventoryItem.unitOfMeasure }
                  : {}),
            },
          }
        : null;

    if (!saleItemPayload) {
      toast.error(
        isMealSale
          ? 'Enter a meal name.'
          : 'Select a catalog product (or Record a meal).',
      );
      return;
    }

    createSale.mutate(
      {
        customer_id: newSale.customerId!,
        hub_id: hubId,
        amount,
        amount_paid: finalAmountPaid,
        payment_mode: paymentMode,
        payment_type: isCreditMode ? undefined : paymentType,
        due_date: isCreditMode ? dueDate : undefined,
        payment_terms: newSale.paymentTerms,
        channel: newSale.channel || SalesChannel.WALK_IN,
        delivery_status: newSale.deliveryStatus || DeliveryStatus.NOT_APPLICABLE,
        delivery_address: newSale.deliveryAddress,
        notes: newSale.notes || undefined,
        date: saleDate,
        ...saleItemPayload,
      },
      {
        onSuccess: (result) => {
          if (result.creditRecord) {
            toast.success(
              `Sale recorded — credit of ${fmt(result.creditRecord.amountOwed)} created, due ${dueDate}`,
            );
          } else {
            toast.success('Sale recorded.');
          }
          setShowAddModal(false);
          resetForm();
        },
        onError: (err) => toast.error(err.message || 'Failed to record sale.'),
      },
    );
  };

  const handleUpdateDeliveryStatus = (id: string, status: DeliveryStatus) => {
    updateDeliveryStatusMutation.mutate(
      { id, delivery_status: status },
      {
        onSuccess: (updated) => {
          if (selectedSale?.id === id) setSelectedSale(updated);
          toast.success(`Delivery: ${status}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const startEditing = () => {
    if (!selectedSale) return;
    setEditForm({
      amount: selectedSale.amount,
      notes: selectedSale.notes,
      deliveryAddress: selectedSale.deliveryAddress,
      customerPhone: selectedSale.customerPhone,
      paymentTerms: selectedSale.paymentTerms,
      channel: selectedSale.channel,
      hubName: selectedSale.hubName,
      item: selectedSale.item,
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!selectedSale) return;
    const amount = Number(editForm.amount) || selectedSale.amount;
    const hubId = editForm.hubName ? resolveHubId(editForm.hubName) : undefined;
    updateSale.mutate(
      {
        id: selectedSale.id,
        amount,
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
          setSelectedSale(updated);
          setIsEditing(false);
          toast.success('Sale updated.');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleVoidSale = () => {
    if (!selectedSale) return;
    voidSale.mutate(selectedSale.id, {
      onSuccess: (updated) => {
        setSelectedSale(updated);
        setShowVoidConfirm(false);
        toast.success('Sale voided.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleExport = () => {
    const headers = [
      'Date Sold',
      'Customer',
      'Product Name',
      'Quantity',
      'Unit',
      'Category',
      'Agent',
      'Amount',
      ...(isAdmin ? (['Profit', 'Margin %'] as const) : []),
      'Status',
      'Channel',
      'Delivery',
      'Payment Terms',
      'Credit',
      'Notes',
    ];
    const rows = filteredSales.map((s) => [
      s.date,
      s.customerName,
      s.item?.productName || '',
      s.item?.quantity ?? '',
      s.item?.unit || '',
      s.item?.category || '',
      s.agentName,
      s.amount,
      ...(isAdmin ? [s.profitAmount, s.profitMargin] : []),
      s.status,
      s.channel || '',
      s.deliveryStatus || '',
      s.paymentTerms || '',
      s.isCredit ? 'Yes' : 'No',
      s.notes || '',
    ]);
    const csv = [
      headers.join(','),
      ...rows.map((r) => r.map((v) => escapeCsvCell(v)).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fudfarmer-sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredSales.length} sales.`);
  };

  const handleDownloadTemplate = (type: 'catalog' | 'custom' = 'catalog') => {
    downloadTemplate.mutate(type, {
      onSuccess: () => toast.success(`${type === 'custom' ? 'Custom' : 'Catalog'} template downloaded.`),
      onError: (err) => toast.error(err.message || 'Failed to download template.'),
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Please select an .xlsx Excel file.');
      return;
    }
    if (file.size === 0) {
      toast.error(
        'This file is empty (0 bytes). If it is from Google Drive, download it first or make it available offline, then select the local copy.',
      );
      return;
    }
    setShowImportModal(true);
    setImportPreview([]);
    setImportSummary(null);
    setValidateAuditId(null);
    setImportProgress(null);
    setImportResult(null);
    setImportError(null);
    setShowImportConfirm(false);
    validateImport.mutate(file, {
      onSuccess: (data) => {
        setImportPreview(data.rows);
        setImportSummary(data.summary);
        setValidateAuditId(data.validate_audit_id ?? null);
        if (data.summary.total === 0) {
          toast.error('No data rows found on the Sales sheet.');
          setShowImportModal(false);
        }
      },
      onError: (err) => {
        toast.error(err.message || 'Validation failed.');
        setShowImportModal(false);
      },
    });
  };

  const handleImportConfirm = async () => {
    const validCount = importPreview.filter((r) => r.valid && r.resolved).length;
    if (validCount === 0) {
      toast.error('No valid rows to import.');
      return;
    }
    if (!validateAuditId) {
      toast.error('Validation session expired. Please re-upload the file.');
      return;
    }
    if (!showImportConfirm) {
      setShowImportConfirm(true);
      return;
    }

    setImporting(true);
    setImportProgress({ processed: 0, total: validCount, imported: 0, failed: 0 });
    setImportResult(null);
    setImportError(null);
    try {
      const result = await runChunkedSalesImport(validateAuditId, validCount, (progress) => {
        setImportProgress(progress);
      });
      const importedCount = result.imported_so_far ?? result.imported;
      // Close/reset before invalidateQueries so the preview + active Import
      // button never flash while cache refreshes.
      setShowImportModal(false);
      setShowImportConfirm(false);
      setImporting(false);
      setImportPreview([]);
      setImportSummary(null);
      setValidateAuditId(null);
      setImportProgress(null);
      setImportResult(null);
      setImportError(null);
      toast.success(`Imported ${importedCount} sales.`);
      await queryClient.invalidateQueries({ queryKey: ['sales'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    } catch (err) {
      setImporting(false);
      setShowImportConfirm(false);
      const message = err instanceof Error ? err.message : 'Import failed.';
      setImportError(message);
      toast.error(message);
    }
  };

  const saleStockLogs = useMemo(() => {
    if (!selectedSale) return [];
    return stockLogs.filter((l) => l.referenceId === selectedSale.id);
  }, [selectedSale, stockLogs]);

  const customerSalesHistory = useMemo(() => {
    if (!selectedSale) return [];
    return sales
      .filter(
        (s) => s.customerId === selectedSale.customerId && s.id !== selectedSale.id && s.status !== 'Voided',
      )
      .toSorted((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);
  }, [selectedSale, sales]);

  const closeDetailPanel = () => {
    setSelectedSale(null);
    setIsEditing(false);
  };

  return {
    user,
    can,
    isAdmin,
    hubScope,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    dateFieldFilter,
    setDateFieldFilter,
    quickPreset,
    setQuickPreset,
    applyPreset,
    listFilters,
    summaryFilters,
    sales,
    salesMeta,
    salesLoading,
    salesFetching,
    page,
    setPage,
    customers: saleModalCustomers,
    customersFetching,
    setCustomerSearch,
    agents,
    inventory,
    filteredSales,
    kpis,
    activeHubs,
    hasFilters,
    clearFilters,
    selectedSale,
    setSelectedSale,
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
    closeDetailPanel,
    handleUpdateDeliveryStatus,
    startEditing,
    saveEdit,
    handleVoidSale,
    showAddModal,
    setShowAddModal,
    newSale,
    setNewSale,
    selectedHub,
    setSelectedHub,
    selectedProductId,
    setSelectedProductId,
    selectedBatchNumber,
    setSelectedBatchNumber,
    productBatches,
    batchesLoading,
    quantity,
    saleUnit,
    paymentMode,
    setPaymentMode,
    paymentType,
    setPaymentType,
    amountPaid,
    setAmountPaid,
    dueDate,
    setDueDate,
    touched,
    setTouched,
    validationErrors,
    productDetailsText,
    setProductDetailsText,
    isHistoricalSale,
    isMealSale,
    isFormValid,
    customerCreditWarning,
    selectedFormCustomer,
    availableInventory,
    selectedInventoryItem,
    isCartonProduct,
    handleProductChange,
    handleQuantityChange,
    handleSaleUnitChange,
    handleSaveSale,
    resetForm,
    showImportModal,
    setShowImportModal,
    importPreview,
    setImportPreview,
    importSummary,
    setImportSummary,
    validateAuditId,
    importing,
    importProgress,
    importResult,
    importError,
    showImportConfirm,
    setShowImportConfirm,
    validating: validateImport.isPending,
    handleDownloadTemplate,
    handleImportFile,
    handleImportConfirm,
    importInputRef,
    downloadingTemplate: downloadTemplate.isPending,
    handleExport,
    searchTerm,
    setSearchTerm,
    filterAgent,
    setFilterAgent,
    filterStatus,
    setFilterStatus,
    filterChannel,
    setFilterChannel,
    filterCategories,
    setFilterCategories,
    toggleCategoryFilter,
    productCategories: PRODUCT_CATEGORIES,
    sortBy,
    sortDir,
    toggleSort,
    btnPrimary: BTN_PRIMARY,
    btnSecondary: BTN_SECONDARY,
    inputCls: INPUT_CLS,
    labelCls: LABEL_CLS,
    savingSale: createSale.isPending,
    savingEdit: updateSale.isPending,
    voidingSale: voidSale.isPending,
    updatingDelivery: updateDeliveryStatusMutation.isPending,
  };
}
