'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { HubScopeFilterBar } from '@/components/hub-scope-filter';
import { MetricsPeriodBar, useMetricsPeriod } from '@/components/metrics-period-bar';
import { SubmitButton } from '@/components/submit-button';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useInventory, useCreateProduct, useUpdateProduct, useStockLogs,
  useRecordStockMove, useBatchStockUpdate, useHubs, useTransferStock, useProductBatches,
  useDownloadInventoryImportTemplate, useValidateInventoryImport, useImportInventory,
  useInventorySalesMetrics, useSuppliers, useProductSuppliers, useProductSalesPerformance,
} from '@/hooks/use-queries';
import { InventoryItem, StockLog, StockMovementType } from '@/types';
import type { InventoryImportPreviewRow } from '@/types/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { InventoryImportModal } from './inventory-import-modal';
import { InventoryRequestsPanel } from './inventory-requests-panel';
import { hubOptionLabel } from '@/lib/api-mappers';
import {
  formatInventoryStockDisplay,
  formatStockLogReference,
} from '@/lib/format-carton-stock';
import { toast } from 'sonner';
import {
  Plus, Box, Search, History, Package, AlertTriangle, Truck, Layers,
  Tag, AlertCircle, RefreshCw, Upload, ListChecks, MapPin, BarChart4,
  ArrowUpRight, ArrowDownRight, X, Activity, Calendar, TrendingUp, TrendingDown,
  Edit3, Clock, ArrowRightLeft, Thermometer, Filter, ChevronDown, Download,
  Warehouse, ShieldAlert, Percent, Boxes, UtensilsCrossed,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { PaginationControls } from '@/components/ui/pagination-controls';

type ProductCategory = InventoryItem['category'];
const ALL_UOMS: InventoryItem['unitOfMeasure'][] = ['Cartons', 'Units', 'Kg', 'Liters'];
const INVENTORY_PAGE_SIZE = 20;

const roundMoney2 = (n: number | undefined | null) =>
  Math.round((Number(n) || 0) * 100) / 100;

const fmtMoney = (n: number | undefined | null) =>
  roundMoney2(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseMoneyInput = (raw: string) => {
  if (raw.trim() === '') return 0;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
};

const roundQty2 = (n: number | undefined | null) =>
  Math.round((Number(n) || 0) * 100) / 100;

const parseKgQtyInput = (raw: string) => {
  if (raw.trim() === '') return 0;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return 0;
  return roundQty2(n);
};

/** Allow typing intermediate Kg values like "0." / "0.5" in controlled inputs. */
const sanitizeKgQtyDraft = (raw: string): string | null => {
  const t = raw.trim();
  if (t === '') return '';
  if (!/^\d*\.?\d{0,2}$/.test(t)) return null;
  return t;
};

const kgQtyDraftToNumber = (raw: string) => parseKgQtyInput(raw);

/* ────────────────── FIFO / FEFO helpers ────────────────── */

interface FifoBatch {
  logId: string;
  batchNumber?: string;
  date: string;
  expiryDate?: string;
  quantityRemaining: number;
  unitCost: number;
  supplier?: string;
}

function buildFifoBatches(allLogs: StockLog[], itemId: string): FifoBatch[] {
  const itemLogs = allLogs
    .filter((l) => l.itemId === itemId)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const batches: FifoBatch[] = [];

  const openBatch = (log: StockLog) => {
    batches.push({
      logId: log.id,
      batchNumber: log.batchNumber,
      date: log.date,
      expiryDate: log.expiryDate,
      quantityRemaining: Math.abs(log.quantity),
      unitCost: log.unitCost,
      supplier: log.supplier,
    });
  };

  const deductFromBatches = (log: StockLog) => {
    let toDeduct = Math.abs(log.quantity);
    const targetBatch = (log.batchNumber || '').trim();
    // FEFO: sort by expiry date first (soonest first), then by date received (FIFO)
    const sortedBatches = [...batches].sort((a, b) => {
      if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      return a.date.localeCompare(b.date);
    });
    const pool = targetBatch
      ? sortedBatches.filter((b) => (b.batchNumber || '').trim() === targetBatch)
      : sortedBatches;
    for (const batch of pool) {
      if (toDeduct <= 0) break;
      if (batch.quantityRemaining <= 0) continue;
      const take = Math.min(batch.quantityRemaining, toDeduct);
      batch.quantityRemaining -= take;
      toDeduct -= take;
    }
  };

  for (const log of itemLogs) {
    if (
      log.type === StockMovementType.PURCHASE ||
      log.type === StockMovementType.RETURN ||
      (log.type === StockMovementType.TRANSFER && log.quantity > 0) ||
      (log.type === StockMovementType.ADJUSTMENT && log.quantity > 0)
    ) {
      openBatch(log);
    } else if (
      log.type === StockMovementType.SALE ||
      (log.type === StockMovementType.TRANSFER && log.quantity < 0) ||
      (log.type === StockMovementType.ADJUSTMENT && log.quantity < 0)
    ) {
      deductFromBatches(log);
    }
  }

  return batches.filter((b) => b.quantityRemaining > 0);
}

function getFifoCostForSale(allLogs: StockLog[], itemId: string, saleQty: number): { totalCost: number; avgCost: number } {
  const batches = buildFifoBatches(allLogs, itemId);
  // FEFO sort
  batches.sort((a, b) => {
    if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    if (a.expiryDate) return -1;
    if (b.expiryDate) return 1;
    return a.date.localeCompare(b.date);
  });
  let remaining = saleQty;
  let totalCost = 0;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    totalCost += take * batch.unitCost;
    remaining -= take;
  }
  return { totalCost, avgCost: saleQty > 0 ? totalCost / saleQty : 0 };
}

/* ────────────────── Expiry helpers ────────────────── */

function getExpiryColor(expiryDate?: string): string {
  if (!expiryDate) return 'text-muted-foreground';
  const now = new Date();
  const exp = new Date(expiryDate);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return 'text-red-600 bg-red-50';
  if (daysUntil <= 14) return 'text-orange-600 bg-orange-50';
  if (daysUntil <= 30) return 'text-yellow-700 bg-yellow-50';
  return 'text-green-600 bg-green-50';
}

function getExpiryLabel(expiryDate?: string): string {
  if (!expiryDate) return '';
  const now = new Date();
  const exp = new Date(expiryDate);
  const daysUntil = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return `Expired ${Math.abs(daysUntil)}d ago`;
  if (daysUntil === 0) return 'Expires today';
  return `${daysUntil}d left`;
}

/* ────────────────── Supplier autocomplete helper ────────────────── */

function getUniqueSuppliers(logs: StockLog[]): string[] {
  const set = new Set<string>();
  for (const log of logs) {
    if (log.supplier) set.add(log.supplier);
  }
  return Array.from(set).sort();
}

/* ────────────────── MAIN COMPONENT ────────────────── */

export default function InventoryPage() {
  const router = useRouter();
  const { can, isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const metricsPeriod = useMetricsPeriod('all');
  const importInputRef = useRef<HTMLInputElement>(null);
  const downloadInventoryTemplate = useDownloadInventoryImportTemplate();
  const validateInventoryImport = useValidateInventoryImport();
  const importInventory = useImportInventory();
  const { data: items = [] } = useInventory({ hub_id: hubScope.hubIdForApi });
  const { data: logs = [] } = useStockLogs({ hub_id: hubScope.hubIdForApi, limit: 200 });
  const { data: salesMetrics } = useInventorySalesMetrics({
    hub_id: hubScope.hubIdForApi,
    ...metricsPeriod.apiParams,
  });
  const volumeChartData = useMemo(
    () => [
      { unit: 'Kg', quantity: salesMetrics?.volumeByUnit.Kg ?? 0 },
      { unit: 'Litres', quantity: salesMetrics?.volumeByUnit.Litres ?? 0 },
      { unit: 'Units', quantity: salesMetrics?.volumeByUnit.Units ?? 0 },
    ],
    [salesMetrics],
  );
  const mealsServed = salesMetrics?.mealsServed ?? 0;
  const topSellers = salesMetrics?.topSellers ?? [];
  const mostVolatile = salesMetrics?.mostVolatile ?? [];
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const recordStockMove = useRecordStockMove();
  const batchStockUpdate = useBatchStockUpdate();
  const transferStock = useTransferStock();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter(h => h.isActive);
  const { data: supplierList } = useSuppliers({ is_active: true, limit: 200 });
  const activeSuppliers = supplierList?.items ?? [];

  // View state
  const [activeView, setActiveView] = useState<'Products' | 'Ledger' | 'Requests'>('Products');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterCategory, setFilterCategory] = useState<ProductCategory | 'All'>('All');
  const [inventoryPage, setInventoryPage] = useState(1);
  const [sortBy, setSortBy] = useState<'avgUnitCost' | 'value' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Selection / batch
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockMoveModal, setShowStockMoveModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferProduct, setTransferProduct] = useState<InventoryItem | null>(null);
  const [transferBatchNumber, setTransferBatchNumber] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferToHubId, setTransferToHubId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<InventoryImportPreviewRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ total: number; valid: number; invalid: number } | null>(null);
  const [importingMovements, setImportingMovements] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Detail panel
  const [viewingDetailsItem, setViewingDetailsItem] = useState<InventoryItem | null>(null);
  const [detailTab, setDetailTab] = useState<'overview' | 'suppliers' | 'sales' | 'batches' | 'history' | 'activity'>('overview');
  const detailProductId = viewingDetailsItem?.id ?? null;
  const { data: detailLogs = [] } = useStockLogs(
    detailProductId ? { item_id: detailProductId, limit: 200 } : null,
  );
  // Item-scoped logs include opening PURCHASE (hub list is newest-N and can omit first batch)
  const logsForDetails = detailProductId ? detailLogs : logs;

  // Selected product for stock move
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  const { data: transferBatches = [], isFetching: transferBatchesLoading } = useProductBatches(
    showTransferModal ? transferProduct?.id ?? null : null,
  );

  const transferDestinations = useMemo(
    () => activeHubs.filter((h) => h.id !== transferProduct?.hubId),
    [activeHubs, transferProduct?.hubId],
  );

  const selectedTransferBatch = useMemo(
    () => transferBatches.find((b) => b.batchNumber === transferBatchNumber),
    [transferBatches, transferBatchNumber],
  );

  useEffect(() => {
    if (!showTransferModal || transferBatchesLoading) return;
    if (transferBatchNumber && transferBatches.some((b) => b.batchNumber === transferBatchNumber)) {
      return;
    }
    setTransferBatchNumber(transferBatches[0]?.batchNumber ?? '');
  }, [showTransferModal, transferBatchesLoading, transferBatches, transferBatchNumber]);

  const openTransferModal = (item: InventoryItem) => {
    setTransferProduct(item);
    setTransferBatchNumber('');
    setTransferQuantity(1);
    setTransferToHubId('');
    setTransferNotes('');
    setShowTransferModal(true);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferProduct(null);
    setTransferBatchNumber('');
    setTransferQuantity(1);
    setTransferToHubId('');
    setTransferNotes('');
  };

  // Ledger filters
  const [ledgerDateFrom, setLedgerDateFrom] = useState('');
  const [ledgerDateTo, setLedgerDateTo] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<StockMovementType | 'All'>('All');
  const [ledgerSearch, setLedgerSearch] = useState('');

  // Batch data
  const [batchData, setBatchData] = useState<{
    type: StockMovementType;
    notes: string;
    updates: Record<string, { quantity: number; cost?: number }>;
  }>({ type: StockMovementType.PURCHASE, notes: '', updates: {} });

  // Stock move / Purchase data
  const [moveData, setMoveData] = useState({
    type: StockMovementType.PURCHASE as StockMovementType,
    quantity: 1,
    unitCost: 0,
    unitPrice: 0,
    cartonPrice: 0,
    cartonWeight: 0,
    notes: '',
    expiryDate: '',
    purchasedDate: '',
    supplier: '',
    supplierId: '',
    toLocation: '',
    reason: '',
  });

  const emptyMoveData = (item?: InventoryItem) => ({
    type: StockMovementType.PURCHASE as StockMovementType,
    quantity: 1,
    unitCost: item?.avgUnitCost ?? 0,
    unitPrice: item?.baseSellingPrice ?? 0,
    cartonPrice: item?.cartonPrice ?? 0,
    cartonWeight: item?.cartonWeight ?? 0,
    notes: '',
    expiryDate: '',
    purchasedDate: '',
    supplier: item?.supplier || '',
    supplierId: item?.supplierId || '',
    toLocation: '',
    reason: '',
  });

  // Supplier autocomplete (legacy free-text fallback unused when registered suppliers exist)
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const uniqueSuppliers = useMemo(() => getUniqueSuppliers(logs), [logs]);
  const filteredSuppliers = useMemo(() => {
    if (!moveData.supplier) return uniqueSuppliers;
    return uniqueSuppliers.filter((s) => s.toLowerCase().includes(moveData.supplier.toLowerCase()));
  }, [moveData.supplier, uniqueSuppliers]);

  type NewProductForm = Partial<InventoryItem> & {
    hubId?: string;
    purchasedDate?: string;
    expiryDate?: string;
    expenseMatchScope?: 'hub' | 'all';
  };

  const emptyNewProduct = (hubId?: string, hubName?: string): NewProductForm => ({
    sku: '', name: '', category: 'Fish', unitOfMeasure: 'Cartons',
    minStockLevel: 5, currentStock: 0, avgUnitCost: 0, baseSellingPrice: 0,
    hubId: hubId || undefined,
    location: hubName || '',
    supplierId: '',
    purchasedDate: '',
    expiryDate: '',
    isExpensed: false,
    expenseMode: 'percent',
    expenseValue: undefined,
    expenseCountUnit: 'carton',
    expenseMatchScope: 'hub',
  });

  const [newProduct, setNewProduct] = useState<NewProductForm>(() =>
    emptyNewProduct(hubScope.defaultHubId, hubScope.defaultHubName),
  );
  const [initialStockDraft, setInitialStockDraft] = useState('');
  const [purchaseQtyDraft, setPurchaseQtyDraft] = useState('1');

  const resetNewProduct = () => {
    setInitialStockDraft('');
    setNewProduct(emptyNewProduct(
      hubScope.defaultHubId || activeHubs[0]?.id,
      hubScope.defaultHubName || activeHubs[0]?.name,
    ));
  };

  useEffect(() => {
    const id = hubScope.defaultHubId;
    const name = hubScope.defaultHubName;
    if (!id) return;
    setNewProduct((prev) => {
      if (prev.hubId) return prev;
      return { ...prev, hubId: id, location: name };
    });
  }, [hubScope.defaultHubId, hubScope.defaultHubName]);

  // Edit product
  const [editProduct, setEditProduct] = useState<Partial<InventoryItem> & {
    purchasedDate?: string;
    expiryDate?: string;
  }>({});
  const editSalesPerf = useProductSalesPerformance(editProduct.id ?? null);
  const canEditInitialStock = editSalesPerf.data?.hasData === false;

  /* ──────── Computed data ──────── */

  const filteredItems = useMemo(() => {
    const rows = items.filter((i) => {
      const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLowStock = filterLowStock ? i.currentStock <= i.minStockLevel : true;
      const matchesHub = hubScope.matchesHub(i.location);
      const matchesCategory = filterCategory === 'All' || i.category === filterCategory;
      const matchesActive = i.isActive !== false;
      return matchesSearch && matchesLowStock && matchesHub && matchesCategory && matchesActive;
    });
    if (!sortBy) return rows;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aVal = sortBy === 'avgUnitCost' ? a.avgUnitCost : a.currentStock * a.avgUnitCost;
      const bVal = sortBy === 'avgUnitCost' ? b.avgUnitCost : b.currentStock * b.avgUnitCost;
      return (aVal - bVal) * dir;
    });
  }, [items, searchTerm, filterLowStock, hubScope, filterCategory, sortBy, sortDir]);

  const inventoryTotalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / INVENTORY_PAGE_SIZE),
  );
  const currentInventoryPage = Math.min(inventoryPage, inventoryTotalPages);
  const paginatedItems = useMemo(() => {
    const start = (currentInventoryPage - 1) * INVENTORY_PAGE_SIZE;
    return filteredItems.slice(start, start + INVENTORY_PAGE_SIZE);
  }, [filteredItems, currentInventoryPage]);

  useEffect(() => {
    setInventoryPage(1);
  }, [searchTerm, filterLowStock, filterCategory, hubScope.filterHub, sortBy, sortDir]);

  const toggleSort = (field: 'avgUnitCost' | 'value') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'avgUnitCost' | 'value' }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary" />
      : <ArrowDown size={12} className="text-primary" />;
  };

  const inventoryValue = useMemo(() => filteredItems.reduce((acc, curr) => acc + curr.currentStock * curr.avgUnitCost, 0), [filteredItems]);
  const retailValue = useMemo(() => filteredItems.reduce((acc, curr) => acc + curr.currentStock * curr.baseSellingPrice, 0), [filteredItems]);
  const totalUnits = useMemo(() => filteredItems.reduce((acc, curr) => acc + (curr.currentStock || 0), 0), [filteredItems]);
  const unitsByUom = useMemo(() => {
    const map: Record<string, number> = {};
    filteredItems.forEach((i) => {
      const uom = i.unitOfMeasure || 'units';
      map[uom] = (map[uom] || 0) + (i.currentStock || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filteredItems]);
  const lowStockItems = useMemo(() => items.filter((i) => i.currentStock <= i.minStockLevel && i.isActive !== false && hubScope.matchesHub(i.location)), [items, hubScope]);

  // Expiring soon count
  const expiringSoonCount = useMemo(() => {
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const seen = new Set<string>();
    for (const item of items) {
      if (item.isActive === false) continue;
      if (!hubScope.matchesHub(item.location)) continue;
      const batches = buildFifoBatches(logs, item.id);
      for (const batch of batches) {
        if (batch.expiryDate) {
          const exp = new Date(batch.expiryDate);
          if (exp <= thirtyDays && batch.quantityRemaining > 0) {
            seen.add(item.id);
            break;
          }
        }
      }
    }
    return seen.size;
  }, [items, logs, hubScope]);

  // Ledger filtered logs
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    if (hubScope.filterHub !== 'All') {
      const hub = hubScope.filterHub;
      const hubItemIds = new Set(items.filter((i) => i.location === hub).map((i) => i.id));
      filtered = filtered.filter((l) => hubItemIds.has(l.itemId) || l.fromLocation === hub || l.toLocation === hub);
    }
    if (ledgerDateFrom) filtered = filtered.filter((l) => l.date >= ledgerDateFrom);
    if (ledgerDateTo) filtered = filtered.filter((l) => l.date <= ledgerDateTo);
    if (ledgerTypeFilter !== 'All') filtered = filtered.filter((l) => l.type === ledgerTypeFilter);
    if (ledgerSearch) {
      const q = ledgerSearch.toLowerCase();
      filtered = filtered.filter((l) => l.itemName.toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q) || (l.batchNumber || '').toLowerCase().includes(q));
    }
    return filtered;
  }, [logs, items, hubScope, ledgerDateFrom, ledgerDateTo, ledgerTypeFilter, ledgerSearch]);

  // Ledger summary stats
  const ledgerStats = useMemo(() => {
    let totalInboundValue = 0;
    let totalOutboundValue = 0;
    for (const log of filteredLogs) {
      const value = Math.abs(log.quantity) * log.unitCost;
      if (log.quantity > 0) totalInboundValue += value;
      else totalOutboundValue += value;
    }
    return { totalInboundValue, totalOutboundValue, netMovement: totalInboundValue - totalOutboundValue };
  }, [filteredLogs]);

  // Detail panel data
  const itemLogs = useMemo(() => viewingDetailsItem ? logsForDetails.filter((l) => l.itemId === viewingDetailsItem.id).sort((a, b) => b.date.localeCompare(a.date)) : [], [viewingDetailsItem, logsForDetails]);
  const itemStats = useMemo(() => {
    if (!viewingDetailsItem) return { inbound: 0, outbound: 0 };
    return { inbound: itemLogs.filter((l) => l.quantity > 0).reduce((a, c) => a + c.quantity, 0), outbound: itemLogs.filter((l) => l.quantity < 0).reduce((a, c) => a + Math.abs(c.quantity), 0) };
  }, [itemLogs, viewingDetailsItem]);

  const itemBatches = useMemo(() => {
    if (!viewingDetailsItem) return [];
    const batches = buildFifoBatches(logsForDetails, viewingDetailsItem.id);
    // Sort by expiry (FEFO), then by date
    return batches.sort((a, b) => {
      if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
      if (a.expiryDate) return -1;
      if (b.expiryDate) return 1;
      return a.date.localeCompare(b.date);
    });
  }, [viewingDetailsItem, logsForDetails]);

  const sellingPriceForMargin = (item: {
    unitOfMeasure?: string;
    baseSellingPrice?: number;
    cartonPrice?: number;
  }) => {
    if (item.unitOfMeasure === 'Cartons' && item.cartonPrice != null && item.cartonPrice > 0) {
      return item.cartonPrice;
    }
    return item.baseSellingPrice ?? 0;
  };

  const itemMargin = useMemo(() => {
    if (!viewingDetailsItem) return 0;
    const sell = sellingPriceForMargin(viewingDetailsItem);
    if (!sell) return 0;
    return ((sell - viewingDetailsItem.avgUnitCost) / sell) * 100;
  }, [viewingDetailsItem]);

  const { data: itemSuppliers = [] } = useProductSuppliers(detailProductId);
  const cheapestSupplierPrice = useMemo(
    () => (itemSuppliers.length ? Math.min(...itemSuppliers.map((s) => s.lastPrice)) : 0),
    [itemSuppliers],
  );
  const { data: itemSalesPerf } = useProductSalesPerformance(
    detailProductId && detailTab === 'sales' ? detailProductId : null,
  );

  /* ──────── Helpers ──────── */

  const getStockStatus = (item: InventoryItem) => {
    if (item.currentStock <= 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-700' };
    if (item.currentStock <= item.minStockLevel) return { label: 'Critical', color: 'bg-orange-100 text-orange-700' };
    if (item.currentStock <= item.minStockLevel * 1.5) return { label: 'Low', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Healthy', color: 'bg-green-100 text-green-700' };
  };

  const toggleSelection = (id: string) => {
    const n = new Set(selectedIds);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelectedIds(n);
  };

  const handleSelectAll = () => {
    const pageIds = paginatedItems.map((item) => item.id);
    const allPageSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    const next = new Set(selectedIds);
    pageIds.forEach((id) => {
      if (allPageSelected) next.delete(id);
      else next.add(id);
    });
    setSelectedIds(next);
  };

  const openEditModal = useCallback((item: InventoryItem) => {
    setEditProduct({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      unitOfMeasure: item.unitOfMeasure,
      minStockLevel: item.minStockLevel,
      currentStock: item.currentStock,
      baseSellingPrice: item.baseSellingPrice,
      cartonPrice: item.cartonPrice,
      cartonWeight: item.cartonWeight,
      location: item.location,
      avgUnitCost: item.avgUnitCost,
      purchasedDate: '',
      expiryDate: '',
    });
    setShowEditModal(true);
  }, []);

  /* ──────── CREATE SKU ──────── */

  const handleSaveProduct = () => {
    if (!newProduct.name?.trim()) {
      toast.error('Please fill in Product Name.');
      return;
    }
    if (newProduct.unitOfMeasure === 'Cartons') {
      if (!(newProduct.cartonWeight && newProduct.cartonWeight > 0)) {
        toast.error('Carton weight (Kg) is required when unit of measure is Cartons.');
        return;
      }
      if (!(newProduct.cartonPrice && newProduct.cartonPrice > 0)) {
        toast.error('Carton selling price is required when unit of measure is Cartons.');
        return;
      }
      if (!(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0)) {
        toast.error('Unit selling price is required when unit of measure is Cartons (used for Kg sales).');
        return;
      }
    } else if (!(newProduct.baseSellingPrice && newProduct.baseSellingPrice > 0)) {
      toast.error('Selling price is required.');
      return;
    }
    if (newProduct.isExpensed) {
      if (
        !(
          (newProduct.unitOfMeasure === 'Kg'
            ? kgQtyDraftToNumber(initialStockDraft)
            : newProduct.currentStock) > 0
        )
      ) {
        toast.error('Initial (purchased) stock is required when marking as expensed.');
        return;
      }
      if (!newProduct.expenseMode) {
        toast.error('Select expense mode (percent or count).');
        return;
      }
      if (!(newProduct.expenseValue && newProduct.expenseValue > 0)) {
        toast.error('Expense value must be greater than 0.');
        return;
      }
      if (
        newProduct.expenseMode === 'percent' &&
        newProduct.expenseValue > 100
      ) {
        toast.error('Expense percent cannot exceed 100.');
        return;
      }
      if (
        newProduct.unitOfMeasure === 'Cartons' &&
        newProduct.expenseMode === 'count' &&
        !newProduct.expenseCountUnit
      ) {
        toast.error('Select whether the expense count is in cartons or kg.');
        return;
      }
      if (!newProduct.expenseMatchScope) {
        toast.error('Select whether to match sales in this hub only or all hubs.');
        return;
      }
    }
    const hubId =
      newProduct.hubId ||
      hubScope.defaultHubId ||
      activeHubs.find((h) => h.name === newProduct.location)?.id ||
      activeHubs[0]?.id;
    if (!hubId) {
      toast.error('Select a location hub.');
      return;
    }
    createProduct.mutate({
      name: newProduct.name!,
      category: newProduct.category,
      unit_of_measure: newProduct.unitOfMeasure,
      min_stock_level: newProduct.minStockLevel || 5,
      current_stock:
        newProduct.unitOfMeasure === 'Kg'
          ? kgQtyDraftToNumber(initialStockDraft)
          : newProduct.currentStock || 0,
      avg_unit_cost: roundMoney2(newProduct.avgUnitCost),
      base_selling_price: roundMoney2(newProduct.baseSellingPrice),
      carton_price:
        newProduct.cartonPrice != null ? roundMoney2(newProduct.cartonPrice) : undefined,
      carton_weight: newProduct.cartonWeight,
      hub_id: hubId,
      supplier_id: newProduct.supplierId || undefined,
      purchased_date: newProduct.purchasedDate || undefined,
      expiry_date: newProduct.expiryDate || undefined,
      ...(newProduct.isExpensed
        ? {
            is_expensed: true,
            expense_mode: newProduct.expenseMode,
            expense_value: newProduct.expenseValue,
            expense_match_scope: newProduct.expenseMatchScope,
            ...(newProduct.unitOfMeasure === 'Cartons' &&
            newProduct.expenseMode === 'count'
              ? { expense_count_unit: newProduct.expenseCountUnit }
              : {}),
          }
        : {}),
    }, {
      onSuccess: (created) => {
        setShowAddProductModal(false);
        resetNewProduct();
        toast.success(created?.sku ? `Product created (${created.sku}).` : 'Product created successfully.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  /* ──────── EDIT SKU ──────── */

  const handleEditProduct = () => {
    if (!editProduct.id) return;
    const original = items.find((i) => i.id === editProduct.id);
    if (!original) return;

    if (editProduct.unitOfMeasure === 'Cartons') {
      if (!(editProduct.cartonWeight && editProduct.cartonWeight > 0)) {
        toast.error('Carton weight (Kg) is required when unit of measure is Cartons.');
        return;
      }
      if (!(editProduct.cartonPrice && editProduct.cartonPrice > 0)) {
        toast.error('Carton selling price is required when unit of measure is Cartons.');
        return;
      }
      if (!(editProduct.baseSellingPrice && editProduct.baseSellingPrice > 0)) {
        toast.error('Unit selling price is required when unit of measure is Cartons (used for Kg sales).');
        return;
      }
    } else if (!(editProduct.baseSellingPrice && editProduct.baseSellingPrice > 0)) {
      toast.error('Selling price is required.');
      return;
    }

    if (editProduct.avgUnitCost && sellingPriceForMargin(editProduct) > 0
      && editProduct.avgUnitCost > sellingPriceForMargin(editProduct)) {
      toast.warning('Warning: Cost exceeds selling price — negative margin!');
    }

    const hub = activeHubs.find((h) => h.name === (editProduct.location || original.location));

    updateProduct.mutate({
      id: editProduct.id,
      name: editProduct.name,
      category: editProduct.category,
      unit_of_measure: editProduct.unitOfMeasure,
      min_stock_level: editProduct.minStockLevel,
      base_selling_price:
        editProduct.baseSellingPrice != null
          ? roundMoney2(editProduct.baseSellingPrice)
          : undefined,
      avg_unit_cost:
        editProduct.avgUnitCost != null ? roundMoney2(editProduct.avgUnitCost) : undefined,
      carton_price:
        editProduct.cartonPrice != null ? roundMoney2(editProduct.cartonPrice) : undefined,
      carton_weight: editProduct.cartonWeight,
      ...(hub?.id ? { hub_id: hub.id } : {}),
      ...(canEditInitialStock
        ? {
            current_stock: editProduct.currentStock ?? original.currentStock,
            purchased_date: editProduct.purchasedDate || undefined,
            expiry_date: editProduct.expiryDate || undefined,
          }
        : {}),
    }, {
      onSuccess: (updated) => {
        if (viewingDetailsItem?.id === editProduct.id) setViewingDetailsItem(updated);
        setShowEditModal(false);
        setEditProduct({});
        toast.success('Product updated successfully.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  /* ──────── PURCHASE (stock in) ──────── */

  const handleStockMove = () => {
    if (!selectedProduct) return;
    const absQty =
      selectedProduct.unitOfMeasure === 'Kg'
        ? Math.abs(kgQtyDraftToNumber(purchaseQtyDraft))
        : Math.abs(moveData.quantity);
    if (!(absQty > 0)) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (selectedProduct.unitOfMeasure === 'Cartons') {
      if (!(moveData.cartonWeight > 0)) {
        toast.error('Carton weight is required for Cartons products.');
        return;
      }
      if (!(moveData.cartonPrice > 0)) {
        toast.error('Carton selling price is required for Cartons products.');
        return;
      }
      if (!(moveData.unitPrice > 0)) {
        toast.error('Unit selling price (per kg) is required for Cartons products.');
        return;
      }
    }

    const closeModal = () => {
      setShowStockMoveModal(false);
      setSelectedProduct(null);
      setMoveData(emptyMoveData());
      setPurchaseQtyDraft('1');
    };

    recordStockMove.mutate({
      item_id: selectedProduct.id,
      type: StockMovementType.PURCHASE,
      quantity: absQty,
      unit_cost: roundMoney2(moveData.unitCost || selectedProduct.avgUnitCost),
      unit_price: roundMoney2(moveData.unitPrice || selectedProduct.baseSellingPrice),
      carton_price:
        selectedProduct.unitOfMeasure === 'Cartons'
          ? roundMoney2(moveData.cartonPrice)
          : undefined,
      carton_weight: selectedProduct.unitOfMeasure === 'Cartons' ? moveData.cartonWeight : undefined,
      notes: moveData.notes || undefined,
      expiry_date: moveData.expiryDate || undefined,
      movement_date: moveData.purchasedDate || undefined,
      supplier: moveData.supplier || undefined,
      supplier_id: moveData.supplierId || undefined,
    }, {
      onSuccess: (result) => {
        const batch = result?.log?.batchNumber;
        toast.success(batch ? `Purchase recorded (batch ${batch}).` : 'Purchase recorded.');
        closeModal();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleTransfer = async () => {
    if (!transferProduct?.hubId) {
      toast.error('Product location is missing.');
      return;
    }
    if (!transferBatchNumber) {
      toast.error('Select a purchase batch.');
      return;
    }
    if (!transferToHubId) {
      toast.error('Select a destination location.');
      return;
    }
    if (!(transferQuantity > 0)) {
      toast.error('Enter a valid quantity.');
      return;
    }
    const batchRemaining = selectedTransferBatch?.quantityRemaining ?? 0;
    if (transferQuantity > batchRemaining) {
      toast.error(`Batch ${transferBatchNumber} only has ${batchRemaining} remaining.`);
      return;
    }
    try {
      await transferStock.mutateAsync({
        item_id: transferProduct.id,
        quantity: transferQuantity,
        from_hub_id: transferProduct.hubId,
        to_hub_id: transferToHubId,
        batch_number: transferBatchNumber,
        notes: transferNotes.trim() || undefined,
      });
      toast.success(`Transferred batch ${transferBatchNumber} to destination.`);
      closeTransferModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed.');
    }
  };

  /* ──────── BATCH UPDATE ──────── */

  const handleBatchUpdate = () => {
    const updates = Object.entries(batchData.updates)
      .filter(([, data]) => data.quantity !== 0)
      .map(([itemId, data]) => ({
        item_id: itemId,
        quantity: data.quantity,
        unit_cost: data.cost != null ? roundMoney2(data.cost) : undefined,
      }));

    if (updates.length === 0) {
      toast.error('No valid batch updates selected.');
      return;
    }

    batchStockUpdate.mutate({
      type: batchData.type,
      notes: batchData.notes || 'Batch Update',
      updates,
    }, {
      onSuccess: () => {
        setShowBatchModal(false);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        toast.success('Batch update complete.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  /* ──────── EXCEL IMPORT ──────── */

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
    importInventory.mutate(rows, {
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

  /* ──────── Shared input class ──────── */
  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const labelCls = 'text-sm font-medium';
  const btnSecondary = 'inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2';
  const btnPrimary = 'inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2';

  /* ════════════════════════ RENDER ════════════════════════ */

  if (!can('inventory.view')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">You don&apos;t have permission to view inventory.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cold Store Inventory</h1>
          <p className="text-muted-foreground text-sm">FIFO-tracked stock management across hubs with batch &amp; expiry control.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border bg-muted/30 p-1">
            {(['Products', 'Ledger', 'Requests'] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setActiveView(view)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeView === view ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
          {can('inventory.create') && activeView === 'Products' && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Plus size={16} className="mr-2" /> Create SKU
            </button>
          )}
          <div className="relative">
            <button
              onClick={() => setShowActionDropdown(!showActionDropdown)}
              className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background h-10 px-4 py-2 hover:bg-accent gap-2"
            >
              Actions <ChevronDown size={14} className={`transition-transform ${showActionDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showActionDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowActionDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-md border bg-card shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => { setActiveView(activeView === 'Products' ? 'Ledger' : 'Products'); setShowActionDropdown(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  >
                    {activeView === 'Products' ? <History size={14} className="text-muted-foreground" /> : <Layers size={14} className="text-muted-foreground" />}
                    {activeView === 'Products' ? 'View Ledger' : 'Back to SKUs'}
                  </button>
                  {(can('inventory.request') || can('inventory.fulfill_requests')) && (
                    <button
                      onClick={() => { setActiveView('Requests'); setShowActionDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <Truck size={14} className="text-muted-foreground" />
                      Inventory Requests
                    </button>
                  )}
                  {can('inventory.adjust_stock') && (
                    <button
                      onClick={() => { setIsSelectionMode(!isSelectionMode); setShowActionDropdown(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <ListChecks size={14} className="text-muted-foreground" />
                      {isSelectionMode ? 'Exit Batch Mode' : 'Batch Actions'}
                    </button>
                  )}
                  <div className="h-px bg-border my-1" />
                  {can('inventory.import') && (
                    <>
                      <button
                        onClick={() => { handleDownloadInventoryTemplate(); setShowActionDropdown(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Download size={14} className="text-muted-foreground" />
                        Download Template
                      </button>
                      <button
                        onClick={() => { importInputRef.current?.click(); setShowActionDropdown(false); }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                      >
                        <Upload size={14} className="text-muted-foreground" />
                        Import Movements
                      </button>
                    </>
                  )}
                  {can('inventory.export') && (
                    <button
                      onClick={() => {
                        const headers = ['SKU', 'Name', 'Category', 'Location', 'Stock', 'Unit', 'Min Stock', 'Cost Price', 'Selling Price'];
                        const rows = filteredItems.map((i) => [i.sku, i.name, i.category, i.location, i.currentStock, i.unitOfMeasure, i.minStockLevel, roundMoney2(i.avgUnitCost), roundMoney2(i.baseSellingPrice)]);
                        const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `fudfarmer-inventory-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success(`Exported ${filteredItems.length} items.`);
                        setShowActionDropdown(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <Download size={14} className="text-muted-foreground" />
                      Export CSV
                    </button>
                  )}
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => { setFilterLowStock(!filterLowStock); setShowActionDropdown(false); }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <AlertTriangle size={14} className="text-orange-500" />
                    {filterLowStock ? 'Show All Items' : `Show Low Stock (${lowStockItems.length})`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Location
          </p>
          <HubScopeFilterBar scope={hubScope} />
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Reporting period
          </p>
          <MetricsPeriodBar period={metricsPeriod} />
        </div>
      </div>

      {/* ── Alerts ── */}
      {lowStockItems.length > 0 && activeView === 'Products' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col md:flex-row items-center gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-red-900">Inventory Alert: {lowStockItems.length} items critically low{hubScope.filterHub !== 'All' ? ` in ${hubScope.filterHub}` : ''}!</h4>
            <p className="text-red-700 text-xs">{lowStockItems.slice(0, 3).map((i) => i.name).join(', ')}{lowStockItems.length > 3 ? ` +${lowStockItems.length - 3} more` : ''}</p>
          </div>
          <button onClick={() => setFilterLowStock(!filterLowStock)} className="px-3 py-1.5 rounded-md text-xs font-medium bg-white text-red-700 border border-red-200 hover:bg-red-50">
            {filterLowStock ? 'Show All' : 'Show Critical'}
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {[
          { label: 'Inventory Value (Cost)', value: `\u20A6${fmtMoney(inventoryValue)}`, icon: <BarChart4 size={14} />, color: 'text-primary', sub: null as string | null },
          { label: 'Total Active SKUs', value: filteredItems.length, icon: <Package size={14} />, color: 'text-blue-600', sub: null },
          {
            label: 'Total Units',
            value: totalUnits.toLocaleString(),
            icon: <Boxes size={14} />,
            color: 'text-indigo-600',
            sub: unitsByUom.length > 0 ? unitsByUom.slice(0, 3).map(([uom, qty]) => `${qty.toLocaleString()} ${uom}`).join(' · ') : null,
          },
          { label: 'Meals Served', value: mealsServed.toLocaleString(), icon: <UtensilsCrossed size={14} />, color: 'text-pink-600', sub: 'Kitchen · Food plate' },
          { label: 'Low Stock Alerts', value: lowStockItems.length, icon: <AlertTriangle size={14} />, color: lowStockItems.length > 0 ? 'text-red-600' : 'text-muted-foreground', sub: null },
          { label: 'Expiring Soon', value: expiringSoonCount, icon: <Thermometer size={14} />, color: expiringSoonCount > 0 ? 'text-orange-600' : 'text-muted-foreground', sub: null },
          ...(isAdmin ? [{ label: 'Retail Value', value: `\u20A6${fmtMoney(retailValue)}`, icon: <span className="text-sm font-bold">₦</span>, color: 'text-green-600', sub: null }] : []),
        ].map((kpi, i) => (
          <div key={i} className="rounded-md border bg-card p-4">
            <div className={`flex items-center gap-2 mb-1 ${kpi.color}`}>{kpi.icon}<span className="text-xs font-medium text-muted-foreground">{kpi.label}</span></div>
            <p className="text-xl font-bold">{kpi.value}</p>
            {kpi.sub && <p className="text-[10px] text-muted-foreground mt-1 truncate" title={kpi.sub}>{kpi.sub}</p>}
          </div>
        ))}
      </div>

      {/* Sales volume + rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-card p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BarChart4 size={14} className="text-primary" /> Volume Sold by Unit
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="unit" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => Number(value ?? 0).toLocaleString()} />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                  {volumeChartData.map((_, idx) => (
                    <Cell key={idx} fill={['#0891b2', '#16a34a', '#7c3aed'][idx % 3]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-emerald-600" /> Top 3 Best Sellers
          </h3>
          {topSellers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sales volume yet.</p>
          ) : (
            <ul className="space-y-2">
              {topSellers.map((s, i) => (
                <li key={s.productName} className="flex items-start justify-between gap-2 text-sm border-b border-border/60 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{i + 1}. {s.productName}</p>
                    <p className="text-[11px] text-muted-foreground">{s.quantity.toLocaleString()} sold</p>
                  </div>
                  <p className="text-xs font-semibold text-emerald-700 whitespace-nowrap">₦{Math.round(s.revenue).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity size={14} className="text-orange-600" /> Top 3 Most Volatile
          </h3>
          {mostVolatile.length === 0 ? (
            <p className="text-xs text-muted-foreground">Need 2+ price history points per product.</p>
          ) : (
            <ul className="space-y-2">
              {mostVolatile.map((v, i) => (
                <li key={v.productName} className="flex items-start justify-between gap-2 text-sm border-b border-border/60 pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{i + 1}. {v.productName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Last change {v.lastChangeDate ? new Date(v.lastChangeDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-orange-700 whitespace-nowrap">{v.volatilityPct.toFixed(1)}%</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ════════════════════════ REQUESTS VIEW ════════════════════════ */}
      {activeView === 'Requests' ? (
        <InventoryRequestsPanel />
      ) : activeView === 'Products' ? (
        <div className="space-y-5">
          {/* Search & actions bar */}
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Filter products
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1fr)_220px_auto]">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="inventory-search">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="inventory-search"
                    type="text"
                    placeholder="Search SKU or product..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="inventory-category">
                  Category
                </label>
                <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3">
                  <Filter size={14} className="text-muted-foreground" />
                  <select
                    id="inventory-category"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as ProductCategory | 'All')}
                    className="min-w-0 flex-1 bg-transparent text-sm font-medium focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-1 xl:justify-end">
                <button
                  type="button"
                  onClick={() => setFilterLowStock(!filterLowStock)}
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                    filterLowStock
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-input bg-background hover:bg-accent'
                  }`}
                >
                  <AlertTriangle size={14} />
                  {filterLowStock ? 'Low stock only' : 'All stock levels'}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <input type="file" accept=".xlsx" ref={importInputRef} className="hidden" onChange={handleInventoryImportFile} />
              {can('inventory.import') && (
                <>
                  <button onClick={handleDownloadInventoryTemplate} className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                    <Download size={14} /> Template
                  </button>
                  <button onClick={() => importInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
                    <Upload size={14} /> Import
                  </button>
                </>
              )}
              {selectedIds.size > 0 && can('inventory.adjust_stock') && (
                <button
                  onClick={() => {
                    const updates: Record<string, { quantity: number; cost?: number }> = {};
                    selectedIds.forEach((id) => { updates[id] = { quantity: 1 }; });
                    setBatchData({ type: StockMovementType.PURCHASE, notes: '', updates });
                    setShowBatchModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2"
                >
                  <RefreshCw size={14} /> Update Selected ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Products Table */}
          <div className="rounded-md border bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b hover:bg-muted/50">
                    {isSelectionMode && (
                      <th className="h-12 px-4 w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary"
                          checked={
                            paginatedItems.length > 0 &&
                            paginatedItems.every((item) => selectedIds.has(item.id))
                          }
                          onChange={handleSelectAll}
                        />
                      </th>
                    )}
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">SKU &amp; Product</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Category</th>
                    {hubScope.filterHub === 'All' && <th className="h-12 px-4 text-left font-medium text-muted-foreground">Hub</th>}
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Stock</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleSort('avgUnitCost')}
                        className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                      >
                        Cost / Price
                        <SortIcon field="avgUnitCost" />
                      </button>
                    </th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => toggleSort('value')}
                        className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                      >
                        Value
                        <SortIcon field="value" />
                      </button>
                    </th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedItems.map((item) => {
                    const isLow = item.currentStock <= item.minStockLevel;
                    const isSelected = selectedIds.has(item.id);
                    const status = getStockStatus(item);
                    const sellForMargin = sellingPriceForMargin(item);
                    const margin = sellForMargin > 0 ? ((sellForMargin - item.avgUnitCost) / sellForMargin * 100) : 0;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b hover:bg-muted/50 cursor-pointer group ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => { if (!isSelectionMode) { setViewingDetailsItem(item); setDetailTab('overview'); } }}
                      >
                        {isSelectionMode && (
                          <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="w-4 h-4 accent-primary" checked={isSelected} onChange={() => toggleSelection(item.id)} />
                          </td>
                        )}
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="font-medium group-hover:text-primary transition-colors">{item.name}</span>
                            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                              <Tag size={10} /> {item.sku}
                              {item.supplier && <span className="ml-1.5 text-muted-foreground/60">via {item.supplier}</span>}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{item.category}</span>
                        </td>
                        {hubScope.filterHub === 'All' && (
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin size={10} /> {item.location}
                            </span>
                          </td>
                        )}
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.color}`}>{status.label}</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center">
                            <span className={`font-bold text-center ${isLow ? 'text-red-600' : ''}`}>
                              {formatInventoryStockDisplay(item)}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="text-xs text-muted-foreground">&#8358;{fmtMoney(item.avgUnitCost)} / &#8358;{fmtMoney(sellForMargin)}</div>
                          <div className={`text-[10px] font-medium ${margin < 0 ? 'text-red-600' : margin < 15 ? 'text-amber-600' : 'text-green-600'}`}>
                            {margin.toFixed(1)}% margin
                          </div>
                        </td>
                        <td className="p-4 text-right font-medium">
                          &#8358;{fmtMoney(item.currentStock * item.avgUnitCost)}
                        </td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {can('inventory.edit') && (
                              <button
                                onClick={() => openEditModal(item)}
                                className="h-8 w-8 rounded-md flex items-center justify-center border hover:bg-accent text-muted-foreground hover:text-foreground"
                                title="Edit SKU"
                              >
                                <Edit3 size={14} />
                              </button>
                            )}
                            {can('inventory.adjust_stock') && (
                              <button
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setMoveData(emptyMoveData(item));
                                  setPurchaseQtyDraft('1');
                                  setShowStockMoveModal(true);
                                }}
                                className="h-8 w-8 rounded-md flex items-center justify-center border hover:bg-accent text-muted-foreground hover:text-foreground"
                                title="Purchase"
                              >
                                <ArrowUpRight size={14} />
                              </button>
                            )}
                            {can('inventory.transfer') && (
                              <button
                                onClick={() => openTransferModal(item)}
                                className="h-8 w-8 rounded-md flex items-center justify-center border hover:bg-accent text-muted-foreground hover:text-foreground"
                                title="Transfer"
                              >
                                <ArrowRightLeft size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={9} className="p-12 text-center text-muted-foreground italic">No products found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredItems.length === 0
                  ? 'No products to show'
                  : `Showing ${(currentInventoryPage - 1) * INVENTORY_PAGE_SIZE + 1}–${Math.min(currentInventoryPage * INVENTORY_PAGE_SIZE, filteredItems.length)} of ${filteredItems.length}`}
              </p>
              <PaginationControls
                page={currentInventoryPage}
                totalPages={inventoryTotalPages}
                onPageChange={setInventoryPage}
              />
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════ LEDGER VIEW ══════════════════ */
        <div className="space-y-5">
          {/* Ledger Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-md border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-green-600" />
                <span className="text-xs font-medium text-muted-foreground">Total Inbound Value</span>
              </div>
              <div className="text-lg font-bold text-green-700">&#8358;{fmtMoney(ledgerStats.totalInboundValue)}</div>
            </div>
            <div className="p-4 rounded-md border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-red-600" />
                <span className="text-xs font-medium text-muted-foreground">Total Outbound Value</span>
              </div>
              <div className="text-lg font-bold text-red-700">&#8358;{fmtMoney(ledgerStats.totalOutboundValue)}</div>
            </div>
            <div className="p-4 rounded-md border bg-card">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={14} className="text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Net Movement Value</span>
              </div>
              <div className={`text-lg font-bold ${ledgerStats.netMovement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {ledgerStats.netMovement >= 0 ? '+' : ''}&#8358;{fmtMoney(ledgerStats.netMovement)}
              </div>
            </div>
          </div>

          {/* Ledger Filters */}
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Filter ledger
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5 md:col-span-2 xl:col-span-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ledger-search">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="ledger-search"
                    type="text"
                    placeholder="Product, notes, batch..."
                    className="h-10 w-full rounded-md border border-input bg-background pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ledger-type">
                  Movement type
                </label>
                <select
                  id="ledger-type"
                  value={ledgerTypeFilter}
                  onChange={(e) => setLedgerTypeFilter(e.target.value as StockMovementType | 'All')}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm font-medium"
                >
                  <option value="All">All Types</option>
                  {Object.values(StockMovementType).map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ledger-date-from">
                  From
                </label>
                <input
                  id="ledger-date-from"
                  type="date"
                  value={ledgerDateFrom}
                  max={ledgerDateTo || undefined}
                  onChange={(e) => setLedgerDateFrom(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="ledger-date-to">
                  To
                </label>
                <input
                  id="ledger-date-to"
                  type="date"
                  value={ledgerDateTo}
                  min={ledgerDateFrom || undefined}
                  onChange={(e) => setLedgerDateTo(e.target.value)}
                  className="h-10 w-full rounded-md border bg-background px-2 text-sm"
                />
              </div>
            </div>
            {(ledgerDateFrom || ledgerDateTo || ledgerTypeFilter !== 'All' || ledgerSearch) && (
              <div className="border-t pt-3">
                <button
                  onClick={() => { setLedgerDateFrom(''); setLedgerDateTo(''); setLedgerTypeFilter('All'); setLedgerSearch(''); }}
                  className="h-9 rounded-md border px-3 text-sm font-medium text-muted-foreground hover:bg-accent"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>

          {/* Ledger Table */}
          <div className="bg-card border rounded-md overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="font-semibold flex items-center gap-2">
                <History size={16} className="text-primary" /> Stock Movement Ledger
                <span className="text-sm font-normal text-muted-foreground ml-2">({filteredLogs.length} entries)</span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b">
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Product</th>
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Qty</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Unit Cost</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Total Value</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => {
                    const movementTypeColors: Record<string, string> = {
                      PURCHASE: 'bg-green-50 text-green-700 border-green-200',
                      SALE: 'bg-red-50 text-red-700 border-red-200',
                      ADJUSTMENT: 'bg-blue-50 text-blue-700 border-blue-200',
                      TRANSFER: 'bg-purple-50 text-purple-700 border-purple-200',
                      RETURN: 'bg-amber-50 text-amber-700 border-amber-200',
                    };
                    return (
                      <tr key={log.id} className="hover:bg-muted/10">
                        <td className="p-4 text-muted-foreground whitespace-nowrap">{log.date}</td>
                        <td className="p-4">
                          <div className="font-medium">{log.itemName}</div>
                          {log.batchNumber && <div className="text-xs text-muted-foreground">Batch: {log.batchNumber}</div>}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-xs font-medium px-2 py-1 rounded-md border ${movementTypeColors[log.type] || 'bg-secondary'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`font-medium ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.quantity > 0 ? '+' : ''}{log.quantity}
                          </span>
                        </td>
                        <td className="p-4 text-right text-muted-foreground">&#8358;{fmtMoney(log.unitCost)}</td>
                        <td className="p-4 text-right font-medium">&#8358;{fmtMoney(Math.abs(log.quantity) * log.unitCost)}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {log.type === StockMovementType.TRANSFER && log.fromLocation && log.toLocation && (
                            <div className="flex items-center gap-1 font-medium text-purple-700">
                              <MapPin size={10} /> {log.fromLocation} <ArrowRightLeft size={10} /> {log.toLocation}
                            </div>
                          )}
                          {log.supplier && <div>Supplier: {log.supplier}</div>}
                          {log.expiryDate && <div className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getExpiryColor(log.expiryDate)}`}>Exp: {log.expiryDate}</div>}
                          {log.notes && <div className="mt-0.5">{log.notes}</div>}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredLogs.length === 0 && (
                    <tr><td colSpan={7} className="p-12 text-center text-muted-foreground italic">No stock movements match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ DETAIL SIDE PANEL ══════════════════ */}
      {viewingDetailsItem && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end" onClick={() => setViewingDetailsItem(null)}>
          <div className="w-full max-w-xl bg-card border-l shadow-xl h-full overflow-y-auto animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-start sticky top-0 bg-card z-10">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold truncate">{viewingDetailsItem.name}</h2>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStockStatus(viewingDetailsItem).color}`}>
                    {getStockStatus(viewingDetailsItem).label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-mono flex items-center gap-2 mt-0.5">
                  <Tag size={12} /> {viewingDetailsItem.sku}
                  <span className="text-muted-foreground/40">|</span>
                  <MapPin size={12} /> {viewingDetailsItem.location}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                {can('inventory.edit') && (
                  <button
                    onClick={() => openEditModal(viewingDetailsItem)}
                    className="h-8 px-3 rounded-md flex items-center gap-1.5 border hover:bg-accent text-sm font-medium"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                )}
                <button onClick={() => setViewingDetailsItem(null)} className="text-muted-foreground hover:text-foreground">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b overflow-x-auto">
              {(['overview', 'suppliers', 'sales', 'batches', 'history', 'activity'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`flex-1 py-3 px-1 text-[11px] font-medium text-center transition-colors whitespace-nowrap ${detailTab === tab ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {tab === 'overview' && 'Overview'}
                  {tab === 'suppliers' && `Suppliers (${itemSuppliers.length})`}
                  {tab === 'sales' && 'Sales'}
                  {tab === 'batches' && `Batches (${itemBatches.length})`}
                  {tab === 'history' && 'Price'}
                  {tab === 'activity' && `Activity (${itemLogs.length})`}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-6">
              {/* ── OVERVIEW TAB ── */}
              {detailTab === 'overview' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-md border bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Current Stock</p>
                      <p className="text-xl font-bold">
                        {formatInventoryStockDisplay(viewingDetailsItem)}
                      </p>
                    </div>
                    <div className="p-4 rounded-md border bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Stock Value</p>
                      <p className="text-xl font-bold">&#8358;{fmtMoney(viewingDetailsItem.currentStock * viewingDetailsItem.avgUnitCost)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-md border bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {viewingDetailsItem.unitOfMeasure === 'Cartons' ? 'Avg Carton Cost' : 'Avg Unit Cost'}
                      </p>
                      <p className="text-lg font-bold">&#8358;{fmtMoney(viewingDetailsItem.avgUnitCost)}</p>
                    </div>
                    <div className="p-4 rounded-md border bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        {viewingDetailsItem.unitOfMeasure === 'Cartons' ? 'Unit Selling Price' : 'Selling Price'}
                      </p>
                      <p className="text-lg font-bold">&#8358;{fmtMoney(viewingDetailsItem.baseSellingPrice)}</p>
                    </div>
                    {viewingDetailsItem.unitOfMeasure === 'Cartons' && viewingDetailsItem.cartonPrice != null && (
                      <div className="p-4 rounded-md border bg-muted/20">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Carton Selling Price</p>
                        <p className="text-lg font-bold">&#8358;{fmtMoney(viewingDetailsItem.cartonPrice)}</p>
                      </div>
                    )}
                  </div>

                  {/* Margin */}
                  <div className={`p-4 rounded-md border ${itemMargin < 0 ? 'bg-red-50 border-red-200' : itemMargin < 15 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Percent size={16} className={itemMargin < 0 ? 'text-red-600' : itemMargin < 15 ? 'text-amber-600' : 'text-green-600'} />
                        <span className="text-sm font-medium">Margin</span>
                      </div>
                      <span className={`text-lg font-bold ${itemMargin < 0 ? 'text-red-600' : itemMargin < 15 ? 'text-amber-600' : 'text-green-600'}`}>
                        {itemMargin.toFixed(1)}%
                      </span>
                    </div>
                    {itemMargin < 0 && <p className="text-xs text-red-600 mt-1 font-medium">Warning: Selling below cost!</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2"><TrendingUp size={14} className="text-green-600" /> <span className="text-muted-foreground">Inbound:</span> <span className="font-bold">{itemStats.inbound}</span></div>
                    <div className="flex items-center gap-2"><TrendingDown size={14} className="text-red-600" /> <span className="text-muted-foreground">Outbound:</span> <span className="font-bold">{itemStats.outbound}</span></div>
                    <div className="flex items-center gap-2"><Package size={14} /> <span className="text-muted-foreground">Min Level:</span> <span className="font-bold">{viewingDetailsItem.minStockLevel}</span></div>
                    <div className="flex items-center gap-2"><Calendar size={14} /> <span className="text-muted-foreground">Updated:</span> <span className="font-bold">{viewingDetailsItem.lastStockUpdate}</span></div>
                    {viewingDetailsItem.cartonPrice != null && (
                      <div className="flex items-center gap-2"><Package size={14} /> <span className="text-muted-foreground">Carton selling:</span> <span className="font-bold">&#8358;{fmtMoney(viewingDetailsItem.cartonPrice)}</span></div>
                    )}
                    {viewingDetailsItem.cartonWeight != null && (
                      <div className="flex items-center gap-2"><Activity size={14} /> <span className="text-muted-foreground">Weight:</span> <span className="font-bold">{viewingDetailsItem.cartonWeight} Kg</span></div>
                    )}
                    {viewingDetailsItem.supplier && (
                      <div className="flex items-center gap-2 col-span-2">
                        <Truck size={14} />
                        <span className="text-muted-foreground">Last Supplier:</span>
                        {viewingDetailsItem.supplierId ? (
                          <Link href={`/suppliers?open=${viewingDetailsItem.supplierId}`} className="font-bold text-primary hover:underline">
                            {viewingDetailsItem.supplier}
                          </Link>
                        ) : (
                          <span className="font-bold">{viewingDetailsItem.supplier}</span>
                        )}
                      </div>
                    )}
                    {viewingDetailsItem.isExpensed ? (
                      <div className="flex items-center gap-2 col-span-2">
                        <ShieldAlert size={14} />
                        <span className="text-muted-foreground">Expensed opening:</span>
                        <span className="font-bold">
                          {viewingDetailsItem.expenseQty != null
                            ? `${viewingDetailsItem.expenseQty} ${viewingDetailsItem.unitOfMeasure}`
                            : 'Yes'}
                          {viewingDetailsItem.expenseValueAmount != null
                            ? ` (₦${fmtMoney(viewingDetailsItem.expenseValueAmount)})`
                            : ''}
                        </span>
                      </div>
                    ) : null}
                    {viewingDetailsItem.lastPurchasePrice != null && (
                      <div className="flex items-center gap-2 col-span-2"><span className="text-sm font-bold">₦</span> <span className="text-muted-foreground">Last Purchase Price:</span> <span className="font-bold">&#8358;{fmtMoney(viewingDetailsItem.lastPurchasePrice)}</span></div>
                    )}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    {can('inventory.adjust_stock') && (
                      <button
                        onClick={() => {
                          setSelectedProduct(viewingDetailsItem);
                          setMoveData(emptyMoveData(viewingDetailsItem));
                          setPurchaseQtyDraft('1');
                          setShowStockMoveModal(true);
                        }}
                        className="flex-1 h-10 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-2"
                      >
                        <ArrowUpRight size={16} /> Purchase
                      </button>
                    )}
                    {can('inventory.transfer') && (
                      <button
                        onClick={() => openTransferModal(viewingDetailsItem)}
                        className="flex-1 h-10 rounded-md text-sm font-medium border border-input bg-background hover:bg-accent flex items-center justify-center gap-2"
                      >
                        <ArrowRightLeft size={16} /> Transfer
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* ── SUPPLIERS TAB ── */}
              {detailTab === 'suppliers' && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Truck size={16} className="text-primary" />
                    <h4 className="text-sm font-bold">Sourced From</h4>
                  </div>
                  {itemSuppliers.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg">
                      <Truck size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No supplier purchases recorded for this SKU yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itemSuppliers.map((s) => {
                        const isCheapest = Math.abs(s.lastPrice - cheapestSupplierPrice) < 0.01;
                        const clickable = !!s.supplierId;
                        return (
                          <div
                            key={s.supplierId || s.name}
                            onClick={() => { if (s.supplierId) router.push(`/suppliers?open=${s.supplierId}`); }}
                            className={`p-3 rounded-lg border transition-colors ${clickable ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/30 group' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-sm font-semibold ${clickable ? 'group-hover:text-primary' : ''}`}>{s.name}</span>
                                  {clickable && <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                  {isCheapest && itemSuppliers.length > 1 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">
                                      <TrendingDown size={10} /> Cheapest
                                    </span>
                                  )}
                                  {s.rating != null && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-yellow-600">★ {s.rating}</span>
                                  )}
                                  {s.openIssues > 0 && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 border border-red-200">
                                      <AlertTriangle size={10} /> {s.openIssues} issue{s.openIssues !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span>{s.orders} order{s.orders !== 1 ? 's' : ''}</span>
                                  <span>{s.qty} {viewingDetailsItem.unitOfMeasure} bought</span>
                                  <span className="inline-flex items-center gap-1"><Clock size={10} /> last {s.lastDate}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold">
                                  &#8358;{Math.round(s.lastPrice).toLocaleString()}
                                  <span className="text-[10px] font-normal text-muted-foreground">/{viewingDetailsItem.unitOfMeasure}</span>
                                </p>
                                <p className="text-[11px] text-muted-foreground">spend &#8358;{Math.round(s.spend).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Tap a vendor to open its full profile, order history &amp; issues in the{' '}
                        <span className="font-medium">Suppliers</span> module.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ── SALES TAB ── */}
              {detailTab === 'sales' && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart4 size={16} className="text-primary" />
                    <h4 className="text-sm font-bold">Retail Performance</h4>
                  </div>
                  {!itemSalesPerf?.hasData ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg">
                      <BarChart4 size={28} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No retail sales recorded for this SKU yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border bg-muted/20">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Units Sold</p>
                          <p className="text-xl font-black">
                            {itemSalesPerf.units}{' '}
                            <span className="text-xs font-medium text-muted-foreground">{viewingDetailsItem.unitOfMeasure}</span>
                          </p>
                        </div>
                        <div className="p-3 rounded-xl border bg-muted/20">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</p>
                          <p className="text-xl font-black">&#8358;{Math.round(itemSalesPerf.revenue).toLocaleString()}</p>
                        </div>
                        <div className="p-3 rounded-xl border-2 border-green-200 bg-green-50/50">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Gross Profit</p>
                          <div className="flex items-baseline gap-1.5">
                            <p className="text-xl font-black text-green-700">&#8358;{Math.round(itemSalesPerf.profit).toLocaleString()}</p>
                            <span className="text-[10px] font-bold text-green-700">{itemSalesPerf.margin.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl border bg-muted/20">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground">Sales Count</p>
                          <p className="text-xl font-black">{itemSalesPerf.orders}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl border bg-muted/20">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <Activity size={11} /> Sell Velocity
                          </p>
                          <p className="text-lg font-black">
                            ≈{Math.round(itemSalesPerf.unitsPerMonth)}{' '}
                            <span className="text-xs font-medium text-muted-foreground">{viewingDetailsItem.unitOfMeasure}/mo</span>
                          </p>
                        </div>
                        <div className={`p-3 rounded-xl border ${itemSalesPerf.daysOfCover != null && itemSalesPerf.daysOfCover < 21 ? 'border-orange-300 bg-orange-50/60' : 'bg-muted/20'}`}>
                          <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <Clock size={11} /> Days of Cover
                          </p>
                          <p className={`text-lg font-black ${itemSalesPerf.daysOfCover != null && itemSalesPerf.daysOfCover < 21 ? 'text-orange-700' : ''}`}>
                            {itemSalesPerf.daysOfCover != null ? `≈${itemSalesPerf.daysOfCover}d` : '—'}
                          </p>
                          {itemSalesPerf.daysOfCover != null && itemSalesPerf.daysOfCover < 21 && itemSuppliers[0] && (
                            <p className="text-[10px] text-orange-700">Reorder soon — via {itemSuppliers[0].name}</p>
                          )}
                        </div>
                      </div>

                      {(itemSalesPerf.b2bRev > 0 || itemSalesPerf.b2cRev > 0) && (() => {
                        const tot = itemSalesPerf.b2bRev + itemSalesPerf.b2cRev;
                        const b2bPct = tot > 0 ? Math.round((itemSalesPerf.b2bRev / tot) * 100) : 0;
                        return (
                          <div>
                            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Buyer Mix</h4>
                            <div className="flex h-6 w-full rounded-md overflow-hidden border text-[10px] font-bold text-white">
                              {b2bPct > 0 && (
                                <div className="bg-blue-500 flex items-center justify-center" style={{ width: `${b2bPct}%` }}>
                                  {b2bPct >= 12 ? `B2B ${b2bPct}%` : ''}
                                </div>
                              )}
                              {100 - b2bPct > 0 && (
                                <div className="bg-primary flex items-center justify-center" style={{ width: `${100 - b2bPct}%` }}>
                                  {100 - b2bPct >= 12 ? `B2C ${100 - b2bPct}%` : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {itemSalesPerf.topSegments.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Bought Most By (Segments)</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {itemSalesPerf.topSegments.map((s) => (
                              <span key={s.name} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium bg-muted/40">
                                {s.name} <span className="text-muted-foreground">{s.pct}%</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {itemSalesPerf.trend.length > 1 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Monthly Revenue</h4>
                          <div className="space-y-1.5">
                            {(() => {
                              const max = Math.max(...itemSalesPerf.trend.map((t) => t.amount)) || 1;
                              return itemSalesPerf.trend.map((t) => (
                                <div key={t.month} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-10 shrink-0">{t.month}</span>
                                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (t.amount / max) * 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] font-medium w-16 text-right shrink-0">&#8358;{Math.round(t.amount).toLocaleString()}</span>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">
                          Top Buyers ({itemSalesPerf.byCustomer.length})
                        </h4>
                        <div className="space-y-1.5">
                          {itemSalesPerf.byCustomer.slice(0, 6).map((c) => {
                            const share = itemSalesPerf.revenue > 0 ? Math.round((c.revenue / itemSalesPerf.revenue) * 100) : 0;
                            const clickable = !!c.id;
                            return (
                              <div
                                key={`${c.id || c.name}-${c.last}`}
                                onClick={() => { if (c.id) router.push(`/customers?open=${c.id}`); }}
                                className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${clickable ? 'cursor-pointer hover:border-primary/40 hover:bg-muted/30 group' : ''}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`font-medium truncate ${clickable ? 'group-hover:text-primary' : ''}`}>{c.name}</span>
                                    {clickable && <ArrowUpRight size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {c.type && (
                                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-primary/10 text-primary'}`}>
                                        {c.type}
                                      </span>
                                    )}
                                    {c.topSegment && <span className="text-[10px] text-muted-foreground truncate">{c.topSegment}</span>}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs">
                                    <span className="font-semibold">&#8358;{Math.round(c.revenue).toLocaleString()}</span>{' '}
                                    <span className="text-muted-foreground">· {share}%</span>
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">{c.qty} {viewingDetailsItem.unitOfMeasure}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── BATCHES TAB ── */}
              {detailTab === 'batches' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Thermometer size={16} className="text-primary" />
                    <h4 className="text-sm font-bold">Active Batches (FEFO Order)</h4>
                  </div>
                  {itemBatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No active batches. Record a purchase or receive stock via transfer to create batches.</p>
                  ) : (
                    <div className="space-y-2">
                      {itemBatches.map((batch, idx) => (
                        <div key={batch.logId + '-' + idx} className={`p-4 rounded-md border ${batch.expiryDate ? getExpiryColor(batch.expiryDate).replace('text-', 'border-').split(' ')[0] : ''} bg-muted/10`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {batch.batchNumber ? (
                                <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded border font-mono">{batch.batchNumber}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No purchase SKU</span>
                              )}
                              <span className="text-xs text-muted-foreground">Received {batch.date}</span>
                            </div>
                            <span className="text-lg font-bold">{batch.quantityRemaining}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">Cost: <span className="font-bold text-foreground">&#8358;{fmtMoney(batch.unitCost)}</span></span>
                              {batch.supplier && <span className="text-muted-foreground">via <span className="font-medium">{batch.supplier}</span></span>}
                            </div>
                            {batch.expiryDate && (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getExpiryColor(batch.expiryDate)}`}>
                                {getExpiryLabel(batch.expiryDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── PRICE HISTORY TAB ── */}
              {detailTab === 'history' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-primary text-base font-bold">₦</span>
                    <h4 className="text-sm font-bold">Price History</h4>
                  </div>
                  {(!viewingDetailsItem.priceHistory || viewingDetailsItem.priceHistory.length === 0) ? (
                    <p className="text-sm text-muted-foreground italic">No price changes recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {[...viewingDetailsItem.priceHistory].reverse().map((entry, idx) => {
                        const margin = entry.price > 0 ? ((entry.price - entry.cost) / entry.price * 100) : 0;
                        return (
                          <div key={idx} className="p-4 rounded-md border bg-muted/10 flex items-center justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">{entry.date}</div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm">Cost: <span className="font-bold">&#8358;{fmtMoney(entry.cost)}</span></span>
                                <span className="text-sm">Price: <span className="font-bold">&#8358;{fmtMoney(entry.price)}</span></span>
                              </div>
                            </div>
                            <span className={`text-sm font-bold ${margin < 0 ? 'text-red-600' : margin < 15 ? 'text-amber-600' : 'text-green-600'}`}>
                              {margin.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {viewingDetailsItem.priceVersion && (
                    <p className="text-[10px] text-muted-foreground mt-3">Last price update: {viewingDetailsItem.priceVersion}</p>
                  )}
                </>
              )}

              {/* ── ACTIVITY TAB ── */}
              {detailTab === 'activity' && (
                <>
                  <h4 className="text-xs font-medium text-muted-foreground mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {itemLogs.slice(0, 30).map((log) => (
                      <div key={log.id} className="p-3 rounded-lg border bg-muted/10 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {log.quantity > 0 ? <ArrowUpRight size={14} className="text-green-600" /> : <ArrowDownRight size={14} className="text-red-600" />}
                            <span className="font-medium">{log.type}</span>
                            {log.batchNumber && <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded border">#{log.batchNumber}</span>}
                          </div>
                          <span className={`font-bold ${log.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {log.quantity > 0 ? '+' : ''}{log.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>{log.date}</span>
                          <span>&#8358;{fmtMoney(log.unitCost)}/unit</span>
                        </div>
                        {log.type === StockMovementType.TRANSFER && log.fromLocation && log.toLocation && (
                          <div className="text-xs text-purple-600 mt-1 font-medium">{log.fromLocation} → {log.toLocation}</div>
                        )}
                        {log.supplier && <div className="text-xs text-muted-foreground mt-0.5">Supplier: {log.supplier}</div>}
                        {(() => {
                          const desc = formatStockLogReference({ notes: log.notes, referenceId: log.referenceId });
                          return desc ? <div className="text-xs text-muted-foreground mt-0.5">{desc}</div> : null;
                        })()}
                        {log.uom ? <div className="text-[10px] text-muted-foreground mt-0.5">{Math.abs(log.quantity)} {log.uom}</div> : null}
                      </div>
                    ))}
                    {itemLogs.length === 0 && <p className="text-sm text-muted-foreground italic">No activity yet.</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CREATE SKU MODAL ══════════════════ */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Create New SKU</h2>
              <button onClick={() => setShowAddProductModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Product code</label>
                <input
                  type="text"
                  value="Auto-assigned on save"
                  disabled
                  className={`${inputCls} bg-muted/40 text-muted-foreground`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Format: SUPPLIER/LOCATION/CATEGORY-NNNN (supplier omitted if none). Based on supplier, location, and category.
                </p>
              </div>
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Product Name *</label>
                <input type="text" value={newProduct.name || ''} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Category</label>
                <select value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value as ProductCategory })} className={inputCls}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Unit of Measure</label>
                <select value={newProduct.unitOfMeasure} onChange={(e) => setNewProduct({ ...newProduct, unitOfMeasure: e.target.value as InventoryItem['unitOfMeasure'] })} className={inputCls}>
                  {ALL_UOMS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Min Stock Level</label>
                <input type="number" value={newProduct.minStockLevel || ''} onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Initial Stock</label>
                <input
                  type="number"
                  min={0}
                  step={newProduct.unitOfMeasure === 'Kg' ? '0.01' : 1}
                  value={
                    newProduct.unitOfMeasure === 'Kg'
                      ? initialStockDraft
                      : newProduct.currentStock || ''
                  }
                  onChange={(e) => {
                    if (newProduct.unitOfMeasure === 'Kg') {
                      const next = sanitizeKgQtyDraft(e.target.value);
                      if (next === null) return;
                      setInitialStockDraft(next);
                      setNewProduct({
                        ...newProduct,
                        currentStock: kgQtyDraftToNumber(next),
                      });
                      return;
                    }
                    setNewProduct({
                      ...newProduct,
                      currentStock: parseInt(e.target.value, 10) || 0,
                    });
                  }}
                  onBlur={() => {
                    if (newProduct.unitOfMeasure !== 'Kg') return;
                    const n = kgQtyDraftToNumber(initialStockDraft);
                    setInitialStockDraft(n > 0 ? String(n) : '');
                    setNewProduct((prev) => ({ ...prev, currentStock: n }));
                  }}
                  className={inputCls}
                />
                {newProduct.unitOfMeasure === 'Kg' ? (
                  <p className="text-[11px] text-muted-foreground">Up to 2 decimal places (Kg).</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Purchased date</label>
                <input
                  type="date"
                  value={newProduct.purchasedDate || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, purchasedDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Expiry date</label>
                <input
                  type="date"
                  value={newProduct.expiryDate || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, expiryDate: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>
                  {newProduct.unitOfMeasure === 'Cartons' ? 'Avg carton cost (₦)' : 'Avg Unit Cost (₦)'}
                </label>
                <input type="number" min={0} step="0.01" value={newProduct.avgUnitCost || ''} onChange={(e) => setNewProduct({ ...newProduct, avgUnitCost: parseMoneyInput(e.target.value) })} className={inputCls} />
                {newProduct.unitOfMeasure === 'Cartons' ? (
                  <p className="text-[11px] text-muted-foreground">Cost per carton (same unit as stock).</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>
                  {newProduct.unitOfMeasure === 'Cartons' ? 'Unit selling price (₦) *' : 'Selling Price (₦) *'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={newProduct.baseSellingPrice || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, baseSellingPrice: parseMoneyInput(e.target.value) })}
                  placeholder={newProduct.unitOfMeasure === 'Cartons' ? 'Price per Kg' : 'Required'}
                  className={inputCls}
                />
              </div>
              {newProduct.unitOfMeasure === 'Cartons' && (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Carton selling price (₦) *</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={newProduct.cartonPrice || ''}
                      onChange={(e) => setNewProduct({
                        ...newProduct,
                        cartonPrice: e.target.value.trim() === '' ? undefined : parseMoneyInput(e.target.value),
                      })}
                      placeholder="Required for Cartons"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Carton Weight (Kg) *</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={newProduct.cartonWeight || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, cartonWeight: parseFloat(e.target.value) || undefined })}
                      placeholder="Required for Cartons"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Supplier (optional)</label>
                <select
                  value={newProduct.supplierId || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, supplierId: e.target.value || undefined })}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}{s.businessName ? ` (${s.businessName})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Location Hub</label>
                {hubScope.canSwitchHubs ? (
                  <select
                    value={newProduct.hubId || ''}
                    onChange={(e) => {
                      const hub = hubScope.activeHubs.find((h) => h.id === e.target.value);
                      setNewProduct({ ...newProduct, hubId: hub?.id, location: hub?.name || '' });
                    }}
                    className={inputCls}
                  >
                    {hubScope.activeHubs.map((h) => (
                      <option key={h.id} value={h.id}>{hubOptionLabel(h)}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" readOnly disabled value={hubScope.hubName} className={`${inputCls} opacity-80 cursor-not-allowed`} />
                )}
              </div>
              <div className="col-span-2 space-y-3 rounded-lg border border-border/60 p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={!!newProduct.isExpensed}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        isExpensed: e.target.checked,
                        expenseMode: newProduct.expenseMode || 'percent',
                        expenseCountUnit: newProduct.expenseCountUnit || 'carton',
                        expenseMatchScope: newProduct.expenseMatchScope || 'hub',
                      })
                    }
                  />
                  Mark opening stock as expensed
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Deducts loss from initial stock (cost on remaining stays as entered). Attaches expense only to whole matching name+category sales (no stock log yet) whose quantities add up exactly to the expense — e.g. 2kg via one 2kg sale or 1kg+1kg. Stock logs show the sale description and date for lookup in Sales.
                </p>
                {newProduct.isExpensed ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <label className={labelCls}>Match sales scope *</label>
                      <select
                        value={newProduct.expenseMatchScope || 'hub'}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            expenseMatchScope: e.target.value as 'hub' | 'all',
                          })
                        }
                        className={inputCls}
                      >
                        <option value="hub">This hub only</option>
                        <option value="all">All hubs</option>
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Finds sales by product name + category (case-insensitive), oldest first.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className={labelCls}>Expense mode</label>
                      <select
                        value={newProduct.expenseMode || 'percent'}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            expenseMode: e.target.value as 'percent' | 'count',
                          })
                        }
                        className={inputCls}
                      >
                        <option value="percent">Percent of purchased</option>
                        <option value="count">Count</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={labelCls}>
                        {newProduct.expenseMode === 'count' ? 'Expense count *' : 'Expense percent *'}
                      </label>
                      <input
                        type="number"
                        min={0.01}
                        max={newProduct.expenseMode === 'percent' ? 100 : undefined}
                        step="0.01"
                        value={newProduct.expenseValue ?? ''}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            expenseValue: parseFloat(e.target.value) || undefined,
                          })
                        }
                        className={inputCls}
                        placeholder={newProduct.expenseMode === 'percent' ? 'e.g. 10' : 'e.g. 2'}
                      />
                    </div>
                    {newProduct.unitOfMeasure === 'Cartons' && newProduct.expenseMode === 'count' ? (
                      <div className="space-y-2 col-span-2">
                        <label className={labelCls}>Count unit *</label>
                        <select
                          value={newProduct.expenseCountUnit || 'carton'}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              expenseCountUnit: e.target.value as 'carton' | 'kg',
                            })
                          }
                          className={inputCls}
                        >
                          <option value="carton">Cartons</option>
                          <option value="kg">Kg</option>
                        </select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            {/* Margin warning */}
            {(newProduct.avgUnitCost ?? 0) > 0
              && sellingPriceForMargin(newProduct) > 0
              && (newProduct.avgUnitCost ?? 0) > sellingPriceForMargin(newProduct) ? (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-700">
                <ShieldAlert size={16} /> Cost exceeds selling price — negative margin!
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddProductModal(false)} className={btnSecondary}>Cancel</button>
              <SubmitButton onClick={handleSaveProduct} loading={createProduct.isPending} className={btnPrimary}>Create Product</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ EDIT SKU MODAL ══════════════════ */}
      {showEditModal && editProduct.id && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Edit SKU</h2>
              <button onClick={() => { setShowEditModal(false); setEditProduct({}); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Product code</label>
                <input type="text" value={editProduct.sku || 'N/A'} disabled className={`${inputCls} bg-muted cursor-not-allowed opacity-60 font-mono text-xs`} />
                <p className="text-[11px] text-muted-foreground">
                  Regenerates automatically if supplier, location, or category changes.
                </p>
              </div>
              <div className="space-y-2 col-span-2">
                <label className={labelCls}>Product Name</label>
                <input type="text" value={editProduct.name || ''} onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })} className={inputCls} />
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Category</label>
                <select value={editProduct.category} onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value as ProductCategory })} className={inputCls}>
                  {PRODUCT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Unit of Measure</label>
                <select value={editProduct.unitOfMeasure} onChange={(e) => setEditProduct({ ...editProduct, unitOfMeasure: e.target.value as InventoryItem['unitOfMeasure'] })} className={inputCls}>
                  {ALL_UOMS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Min Stock Level</label>
                <input type="number" value={editProduct.minStockLevel ?? ''} onChange={(e) => setEditProduct({ ...editProduct, minStockLevel: parseInt(e.target.value) || 0 })} className={inputCls} />
              </div>
              {canEditInitialStock ? (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Current stock</label>
                    <input
                      type="number"
                      min={0}
                      value={editProduct.currentStock ?? ''}
                      onChange={(e) => setEditProduct({ ...editProduct, currentStock: parseInt(e.target.value) || 0 })}
                      className={inputCls}
                    />
                    <p className="text-[11px] text-muted-foreground">Editable until the first sale is recorded.</p>
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Purchased date</label>
                    <input
                      type="date"
                      value={editProduct.purchasedDate || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, purchasedDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Expiry date</label>
                    <input
                      type="date"
                      value={editProduct.expiryDate || ''}
                      onChange={(e) => setEditProduct({ ...editProduct, expiryDate: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                </>
              ) : editProduct.id && !editSalesPerf.isLoading ? (
                <div className="space-y-2 col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Stock is locked after sales. Current stock: {editProduct.currentStock ?? '—'}. Use stock movements to adjust.
                  </p>
                </div>
              ) : null}
              <div className="space-y-2">
                <label className={labelCls}>Location Hub</label>
                {hubScope.canSwitchHubs ? (
                  <select value={editProduct.location} onChange={(e) => setEditProduct({ ...editProduct, location: e.target.value })} className={inputCls}>
                    {hubScope.activeHubs.map((h) => (
                      <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" readOnly disabled value={editProduct.location || hubScope.hubName} className={`${inputCls} opacity-80 cursor-not-allowed`} />
                )}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>
                  {editProduct.unitOfMeasure === 'Cartons' ? 'Avg carton cost (₦)' : 'Avg Unit Cost (₦)'}
                </label>
                <input type="number" min={0} step="0.01" value={editProduct.avgUnitCost ?? ''} onChange={(e) => setEditProduct({ ...editProduct, avgUnitCost: parseMoneyInput(e.target.value) })} className={inputCls} />
                {editProduct.unitOfMeasure === 'Cartons' ? (
                  <p className="text-[11px] text-muted-foreground">Cost per carton (same unit as stock).</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>
                  {editProduct.unitOfMeasure === 'Cartons' ? 'Unit selling price (₦) *' : 'Selling Price (₦) *'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={editProduct.baseSellingPrice ?? ''}
                  onChange={(e) => setEditProduct({ ...editProduct, baseSellingPrice: parseMoneyInput(e.target.value) })}
                  placeholder={editProduct.unitOfMeasure === 'Cartons' ? 'Price per Kg' : 'Required'}
                  className={inputCls}
                />
              </div>
              {editProduct.unitOfMeasure === 'Cartons' && (
                <>
                  <div className="space-y-2">
                    <label className={labelCls}>Carton selling price (₦) *</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={editProduct.cartonPrice ?? ''}
                      onChange={(e) => setEditProduct({
                        ...editProduct,
                        cartonPrice: e.target.value.trim() === '' ? undefined : parseMoneyInput(e.target.value),
                      })}
                      placeholder="Required for Cartons"
                      className={inputCls}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Carton Weight (Kg) *</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      value={editProduct.cartonWeight ?? ''}
                      onChange={(e) => setEditProduct({ ...editProduct, cartonWeight: parseFloat(e.target.value) || undefined })}
                      placeholder="Required for Cartons"
                      className={inputCls}
                    />
                  </div>
                </>
              )}
            </div>
            {/* Margin warning */}
            {(editProduct.avgUnitCost ?? 0) > 0
              && sellingPriceForMargin(editProduct) > 0
              && (editProduct.avgUnitCost ?? 0) > sellingPriceForMargin(editProduct) ? (
              <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-700">
                <ShieldAlert size={16} /> Warning: Cost exceeds selling price — negative margin!
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowEditModal(false); setEditProduct({}); }} className={btnSecondary}>Cancel</button>
              {can('inventory.edit') && <SubmitButton onClick={handleEditProduct} loading={updateProduct.isPending} className={btnPrimary}>Save Changes</SubmitButton>}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ PURCHASE MODAL ══════════════════ */}
      {showStockMoveModal && selectedProduct && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold">Record Purchase</h2>
                <p className="text-sm text-muted-foreground">{selectedProduct.name} <span className="font-mono text-xs">({selectedProduct.sku})</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Current stock: <span className="font-bold">{formatInventoryStockDisplay(selectedProduct)}</span> in {selectedProduct.location}</p>
                <p className="text-[11px] text-muted-foreground mt-1">Batch code is auto-assigned (001, 002, …). Product SKU stays unchanged.</p>
              </div>
              <button onClick={() => { setShowStockMoveModal(false); setSelectedProduct(null); }} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={labelCls}>Quantity *</label>
                <input
                  type="number"
                  min={0.01}
                  step={selectedProduct.unitOfMeasure === 'Kg' ? '0.01' : 'any'}
                  value={
                    selectedProduct.unitOfMeasure === 'Kg'
                      ? purchaseQtyDraft
                      : moveData.quantity
                  }
                  onChange={(e) => {
                    if (selectedProduct.unitOfMeasure === 'Kg') {
                      const next = sanitizeKgQtyDraft(e.target.value);
                      if (next === null) return;
                      setPurchaseQtyDraft(next);
                      setMoveData({
                        ...moveData,
                        quantity: kgQtyDraftToNumber(next),
                      });
                      return;
                    }
                    setMoveData({
                      ...moveData,
                      quantity: parseFloat(e.target.value) || 0,
                    });
                  }}
                  onBlur={() => {
                    if (selectedProduct.unitOfMeasure !== 'Kg') return;
                    const n = kgQtyDraftToNumber(purchaseQtyDraft);
                    setPurchaseQtyDraft(n > 0 ? String(n) : '');
                    setMoveData((prev) => ({ ...prev, quantity: n }));
                  }}
                  className={inputCls}
                />
                {selectedProduct.unitOfMeasure === 'Kg' ? (
                  <p className="text-[11px] text-muted-foreground">Up to 2 decimal places (Kg).</p>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>
                    {selectedProduct.unitOfMeasure === 'Cartons' ? 'Carton cost (₦)' : 'Unit Cost (₦)'}
                  </label>
                  <input type="number" min={0} step="0.01" value={moveData.unitCost} onChange={(e) => setMoveData({ ...moveData, unitCost: parseMoneyInput(e.target.value) })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>
                    {selectedProduct.unitOfMeasure === 'Cartons' ? 'Unit selling price (₦) *' : 'Selling Price (₦)'}
                  </label>
                  <input type="number" min={0} step="0.01" value={moveData.unitPrice} onChange={(e) => setMoveData({ ...moveData, unitPrice: parseMoneyInput(e.target.value) })} className={inputCls} />
                </div>
              </div>

              {selectedProduct.unitOfMeasure === 'Cartons' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className={labelCls}>Carton selling price (₦) *</label>
                    <input type="number" min={0} step="0.01" value={moveData.cartonPrice} onChange={(e) => setMoveData({ ...moveData, cartonPrice: parseMoneyInput(e.target.value) })} className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>Carton weight (kg) *</label>
                    <input type="number" value={moveData.cartonWeight} onChange={(e) => setMoveData({ ...moveData, cartonWeight: parseFloat(e.target.value) || 0 })} className={inputCls} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>Purchased date</label>
                  <input type="date" value={moveData.purchasedDate} onChange={(e) => setMoveData({ ...moveData, purchasedDate: e.target.value })} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Expiry date</label>
                  <input type="date" value={moveData.expiryDate} onChange={(e) => setMoveData({ ...moveData, expiryDate: e.target.value })} className={inputCls} />
                </div>
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Supplier (optional)</label>
                <select
                  value={moveData.supplierId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const match = activeSuppliers.find((s) => s.id === id);
                    setMoveData({
                      ...moveData,
                      supplierId: id,
                      supplier: match?.name || '',
                    });
                  }}
                  className={inputCls}
                >
                  <option value="">— None —</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {activeSuppliers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No registered suppliers yet. Add one under{' '}
                    <Link href="/suppliers" className="text-primary underline">Suppliers</Link>.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Notes</label>
                <input type="text" value={moveData.notes} onChange={(e) => setMoveData({ ...moveData, notes: e.target.value })} placeholder="Optional notes" className={inputCls} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowStockMoveModal(false); setSelectedProduct(null); }} className={btnSecondary}>Cancel</button>
              {can('inventory.adjust_stock') && (
                <SubmitButton onClick={handleStockMove} loading={recordStockMove.isPending} className={btnPrimary}>Confirm Purchase</SubmitButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ TRANSFER MODAL ══════════════════ */}
      {showTransferModal && transferProduct && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold">Transfer Stock</h2>
                <p className="text-sm text-muted-foreground">
                  {transferProduct.name}{' '}
                  <span className="font-mono text-xs">({transferProduct.sku})</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From: <span className="font-medium">{transferProduct.location}</span>
                </p>
              </div>
              <button onClick={closeTransferModal} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className={labelCls}>Batch *</label>
                <select
                  value={transferBatchNumber}
                  onChange={(e) => setTransferBatchNumber(e.target.value)}
                  className={inputCls}
                  disabled={transferBatchesLoading || transferBatches.length === 0}
                >
                  <option value="">
                    {transferBatchesLoading
                      ? 'Loading batches…'
                      : transferBatches.length === 0
                        ? 'No open batches — record a Purchase first'
                        : '-- Select batch --'}
                  </option>
                  {transferBatches.map((b) => (
                    <option key={b.batchNumber} value={b.batchNumber}>
                      {b.batchNumber} — {b.quantityRemaining} remaining
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Quantity *</label>
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  max={selectedTransferBatch?.quantityRemaining ?? undefined}
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(parseFloat(e.target.value) || 0)}
                  className={inputCls}
                />
                {selectedTransferBatch && (
                  <p className="text-xs text-muted-foreground">
                    Max for batch {transferBatchNumber}: {selectedTransferBatch.quantityRemaining}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className={labelCls}>To location *</label>
                <select
                  value={transferToHubId}
                  onChange={(e) => setTransferToHubId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select hub or RSP</option>
                  {transferDestinations.map((h) => (
                    <option key={h.id} value={h.id}>
                      {hubOptionLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className={labelCls}>Notes</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Optional notes"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={closeTransferModal} className={btnSecondary}>Cancel</button>
              {can('inventory.transfer') && (
                <SubmitButton
                  onClick={handleTransfer}
                  loading={transferStock.isPending}
                  className={btnPrimary}
                  disabled={!transferBatchNumber || !transferToHubId || transferBatches.length === 0}
                >
                  Confirm Transfer
                </SubmitButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ BATCH UPDATE MODAL ══════════════════ */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Batch Stock Update ({selectedIds.size} items)</h2>
              <button onClick={() => setShowBatchModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={labelCls}>Movement Type</label>
                  <select value={batchData.type} onChange={(e) => setBatchData({ ...batchData, type: e.target.value as StockMovementType })} className={inputCls}>
                    {Object.values(StockMovementType).map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className={labelCls}>Notes</label>
                  <input type="text" value={batchData.notes} onChange={(e) => setBatchData({ ...batchData, notes: e.target.value })} className={inputCls} />
                </div>
              </div>
              <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
                {Array.from(selectedIds).map((id) => {
                  const item = items.find((i) => i.id === id);
                  if (!item) return null;
                  const update = batchData.updates[id] || { quantity: 0 };
                  const isReduction = [StockMovementType.SALE, StockMovementType.TRANSFER].includes(batchData.type);
                  const wouldExceed = isReduction && update.quantity > item.currentStock;
                  return (
                    <div key={id} className={`p-3 flex items-center gap-4 ${wouldExceed ? 'bg-red-50' : ''}`}>
                      <div className="flex-1">
                        <span className="font-bold text-sm">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{item.sku}</span>
                        <span className="text-xs text-muted-foreground ml-2">(Stock: {item.currentStock})</span>
                      </div>
                      <input
                        type="number"
                        placeholder="Qty"
                        className={`w-20 h-8 rounded border text-sm text-center ${wouldExceed ? 'border-red-400 text-red-600' : ''}`}
                        value={update.quantity || ''}
                        onChange={(e) => setBatchData({ ...batchData, updates: { ...batchData.updates, [id]: { ...update, quantity: parseInt(e.target.value) || 0 } } })}
                      />
                      {batchData.type === StockMovementType.PURCHASE && (
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Cost"
                          className="w-24 h-8 rounded border text-sm text-center"
                          value={update.cost || ''}
                          onChange={(e) => setBatchData({
                            ...batchData,
                            updates: {
                              ...batchData.updates,
                              [id]: {
                                ...update,
                                cost: e.target.value.trim() === '' ? undefined : parseMoneyInput(e.target.value),
                              },
                            },
                          })}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowBatchModal(false)} className={btnSecondary}>Cancel</button>
              {can('inventory.adjust_stock') && <SubmitButton onClick={handleBatchUpdate} loading={batchStockUpdate.isPending} className={btnPrimary}>Apply Batch</SubmitButton>}
            </div>
          </div>
        </div>
      )}

      <InventoryImportModal
        show={showImportModal}
        onClose={closeImportModal}
        previewRows={importPreview}
        summary={importSummary}
        importing={importingMovements}
        validating={validateInventoryImport.isPending}
        importError={importError}
        onConfirm={handleInventoryImportConfirm}
        onDownloadTemplate={handleDownloadInventoryTemplate}
      />
    </div>
  );
}
