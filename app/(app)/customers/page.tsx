'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  useCustomers, useCreateCustomer, useAgents, useHubs,
  useDownloadCustomerImportTemplate, useValidateCustomerImport, useImportCustomers, useSegments,
  useCustomer, useExportCustomers,
} from '@/hooks/use-queries';
import {
  Customer, CustomerType,
  CreditGrade,
} from '@/types';
import {
  CustomerImportPreviewRow,
  CustomerImportResult,
  CustomerImportSummaryRow,
  CustomerImportRowStatus,
} from '@/types/api';
import { CustomerImportModal } from './customer-import-modal';
import {
  CustomerDetailPanel,
  ProfileFields,
  clearOppositeProfileFields,
  prioritizeCustomerSegments,
  segmentBadgeClass,
} from './customer-detail-panel';
import { toast } from 'sonner';
import { isB2bCustomerType, customerPhoneForApi, customerEmailForApi, optionalStringForApi } from '@/lib/customer-helpers';
import { hubOptionLabel } from '@/lib/api-mappers';
import { deriveSegments, SEGMENT_TAXONOMY } from '@/lib/segmentation';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { HubScopeFilterBar } from '@/components/hub-scope-filter';
import { FilterSelect } from '@/components/filter-select';
import { MetricsPeriodBar, useMetricsPeriod } from '@/components/metrics-period-bar';
import { SubmitButton } from '@/components/submit-button';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { MetricValue } from '@/components/ui/metric-value';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';
import {
  Plus, Search, MapPin, Building2, User, Award, Crown, X,
  Filter, ChevronRight, Users, Upload, Download, Sparkles,
  ArrowUp, ArrowDown, ArrowUpDown,
  Calendar, Heart, RefreshCw, BarChart3, ShoppingCart, ChevronDown,
} from 'lucide-react';

type OrdersFilterMode = 'all' | 'once' | 'exact' | 'min';

function buildCustomerImportSummaryRows(
  validationRows: CustomerImportPreviewRow[],
  importResults?: CustomerImportResult['results'],
): CustomerImportSummaryRow[] {
  const resultsByLine = new Map((importResults ?? []).map((result) => [result.lineNo, result]));

  return validationRows.map((row) => {
    const result = resultsByLine.get(row.lineNo);
    let status: CustomerImportRowStatus;
    const reasons: string[] = [];

    if (!row.valid) {
      status = 'invalid';
      reasons.push(...row.errors);
    } else if (result) {
      if (!result.success) {
        status = 'failed';
        if (result.error) reasons.push(result.error);
      } else {
        status = 'imported';
        if (row.warnings.length > 0) reasons.push(...row.warnings);
      }
    } else {
      status = 'failed';
      reasons.push('Row was not imported.');
    }

    return {
      lineNo: row.lineNo,
      customer_name: row.customer_name,
      hub_name: row.hub_name,
      status,
      reasons,
    };
  });
}

const customerImportStatusStyles: Record<CustomerImportRowStatus, string> = {
  imported: 'bg-green-100 text-green-700',
  skipped: 'bg-orange-100 text-orange-700',
  invalid: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

const CUSTOMERS_PAGE_SIZE = 20;

export default function CustomersPage() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();
  const hubScope = useHubScopeFilter();
  const metricsPeriod = useMetricsPeriod('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<CustomerType | 'All'>('All');
  const [filterSegmentIds, setFilterSegmentIds] = useState<string[]>([]);
  const [segmentFilterOpen, setSegmentFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'total_orders' | 'total_spent' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [ordersFilterMode, setOrdersFilterMode] = useState<OrdersFilterMode>('all');
  const [ordersFilterCount, setOrdersFilterCount] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: segments = [] } = useSegments();
  const segmentByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of segments) map.set(s.name, s.id);
    return map;
  }, [segments]);
  const segmentIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of segments) map.set(s.id, s.name);
    return map;
  }, [segments]);
  const activeFilterSegmentNames = useMemo(
    () =>
      filterSegmentIds
        .map((id) => segmentIdToName.get(id))
        .filter((name): name is string => Boolean(name)),
    [filterSegmentIds, segmentIdToName],
  );

  const ordersFilterParams = useMemo(() => {
    if (ordersFilterMode === 'once') return { min_orders: 1, max_orders: 1 };
    if (ordersFilterMode === 'exact') {
      const n = Math.max(0, Math.floor(ordersFilterCount) || 0);
      return { min_orders: n, max_orders: n };
    }
    if (ordersFilterMode === 'min') {
      const n = Math.max(0, Math.floor(ordersFilterCount) || 0);
      return { min_orders: n };
    }
    return {};
  }, [ordersFilterMode, ordersFilterCount]);

  const periodScoped = metricsPeriod.isCustom || metricsPeriod.preset !== 'all';

  const listFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: filterType === 'All' ? undefined : filterType,
      hub_id: hubScope.hubIdForApi,
      segment_ids: filterSegmentIds.length ? filterSegmentIds : undefined,
      page,
      limit: CUSTOMERS_PAGE_SIZE,
      sort_by: sortBy ?? undefined,
      sort_dir: sortBy ? sortDir : undefined,
      ...ordersFilterParams,
      ...metricsPeriod.apiParams,
    }),
    [
      debouncedSearch,
      filterType,
      hubScope.hubIdForApi,
      filterSegmentIds,
      page,
      sortBy,
      sortDir,
      ordersFilterParams,
      metricsPeriod.apiParams,
    ],
  );

  const exportFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      type: filterType === 'All' ? undefined : filterType,
      hub_id: hubScope.hubIdForApi,
      segment_ids: filterSegmentIds.length ? filterSegmentIds : undefined,
      sort_by: sortBy ?? undefined,
      sort_dir: sortBy ? sortDir : undefined,
      ...ordersFilterParams,
      ...metricsPeriod.apiParams,
    }),
    [
      debouncedSearch,
      filterType,
      hubScope.hubIdForApi,
      filterSegmentIds,
      sortBy,
      sortDir,
      ordersFilterParams,
      metricsPeriod.apiParams,
    ],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filterType,
    filterSegmentIds,
    sortBy,
    sortDir,
    hubScope.hubIdForApi,
    metricsPeriod.apiParams,
    ordersFilterMode,
    ordersFilterCount,
  ]);

  const { data: customerList, isLoading: customersLoading, isFetching: customersFetching } = useCustomers(listFilters);
  const customers = customerList?.items ?? [];
  const tableLoading = customersLoading || customersFetching;
  const customerMeta = customerList?.meta ?? { page: 1, limit: CUSTOMERS_PAGE_SIZE, total: 0, totalPages: 1 };
  const kpis = customerList?.summary ?? {
    total: 0,
    b2b: 0,
    b2c: 0,
    repeat: 0,
    totalRevenue: 0,
    avgValue: 0,
    ytdCustomers: 0,
    newThisMonth: 0,
    newLastMonth: 0,
    newCustomersMomPct: 0,
    retentionRate: 0,
  };
  const { data: agents = [] } = useAgents(undefined, { enabled: showAddModal && isAdmin });
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter(h => h.isActive);
  const createCustomer = useCreateCustomer();
  const downloadCustomerImportTemplate = useDownloadCustomerImportTemplate();
  const exportCustomers = useExportCustomers();
  const validateCustomerImport = useValidateCustomerImport();
  const importCustomers = useImportCustomers();
  const customerImportInputRef = useRef<HTMLInputElement | null>(null);

  const [customerImportPreview, setCustomerImportPreview] = useState<CustomerImportPreviewRow[]>([]);
  const [customerImportValidateSummary, setCustomerImportValidateSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  } | null>(null);
  const [showCustomerImportModal, setShowCustomerImportModal] = useState(false);
  const [customerImportFileName, setCustomerImportFileName] = useState('');
  const [customerImporting, setCustomerImporting] = useState(false);
  const [customerImportError, setCustomerImportError] = useState<string | null>(null);
  const [customerImportSummary, setCustomerImportSummary] = useState<{
    fileName: string;
    total: number;
    imported: number;
    warnings: number;
    invalid: number;
    failed: number;
    rows: CustomerImportSummaryRow[];
  } | null>(null);

  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '', email: '', phone: '', companyName: '', type: CustomerType.B2C,
    location: hubScope.hubName || hubScope.defaultHubName || 'Lagos', totalOrders: 0, totalSpent: 0,
  });

  // --- Helpers ---
  const calculateScore = (_customerId: string): CreditGrade => 'N/A';

  const getStatus = (c: Customer) => c.totalOrders > 1 ? 'Repeat' : 'New';

  const toggleSort = (field: 'total_orders' | 'total_spent') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'total_orders' | 'total_spent' }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary" />
      : <ArrowDown size={12} className="text-primary" />;
  };
  const getGrade = (c: Customer) => {
    if (c.totalOrders <= 1) return null;
    if (c.totalSpent >= 500000) return 'Gold';
    if (c.totalSpent >= 100000) return 'Silver';
    return 'Bronze';
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;
    if (grade === 'Gold') return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 border border-yellow-200"><Crown size={12} fill="currentColor" /> Gold</span>;
    if (grade === 'Silver') return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200"><Award size={12} /> Silver</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700 border border-orange-200"><Award size={12} /> Bronze</span>;
  };

  const getScoreBadge = (grade: CreditGrade) => {
    const colors: Record<string, string> = {
      A: 'bg-green-100 text-green-700 border-green-200',
      B: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      C: 'bg-blue-100 text-blue-700 border-blue-200',
      D: 'bg-orange-100 text-orange-700 border-orange-200',
      F: 'bg-red-100 text-red-700 border-red-200',
      'N/A': 'bg-gray-100 text-gray-500 border-gray-200',
    };
    return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border ${colors[grade] || colors['N/A']}`}>SCORE {grade}</span>;
  };

  // --- KPI calculations (from API summary for current filters) ---
  // kpis comes from customerList.summary above

  // --- Add Customer ---
  const handleSaveCustomer = async () => {
    if (!newCustomer.name?.trim()) { toast.error('Please enter a name.'); return; }
    if (isB2bCustomerType(newCustomer.type) && !newCustomer.companyName?.trim()) {
      toast.error('Company name is required for B2B customers.');
      return;
    }
    const email = customerEmailForApi(newCustomer.email);
    if (email) {
      const dup = customers.find((c) => c.email && c.email.toLowerCase() === email);
      if (dup) { toast.error(`A customer with email "${email}" already exists.`); return; }
    }
    const hub = activeHubs.find((h) => h.name === (newCustomer.location || activeHubs[0]?.name));
    const isB2b = isB2bCustomerType(newCustomer.type);
    createCustomer.mutate({
      customer_name: newCustomer.name!,
      ...(email ? { customer_email: email } : {}),
      customer_phone: customerPhoneForApi(newCustomer.phone),
      customer_type: newCustomer.type as CustomerType,
      customer_location: hub?.id || activeHubs[0]?.id || '',
      company_name: newCustomer.companyName,
      ...(isAdmin
        ? { assigned_agent: optionalStringForApi(newCustomer.addedByAgentId) }
        : {}),
      business_category: isB2b ? optionalStringForApi(newCustomer.businessCategory) : undefined,
      gender: !isB2b ? optionalStringForApi(newCustomer.gender) : undefined,
      family_type: !isB2b ? optionalStringForApi(newCustomer.familyType) : undefined,
      marital_status: !isB2b ? optionalStringForApi(newCustomer.maritalStatus) : undefined,
      age_group: !isB2b ? optionalStringForApi(newCustomer.ageGroup) : undefined,
      lifestyle: !isB2b ? optionalStringForApi(newCustomer.lifestyle) : undefined,
      employment_status: !isB2b ? optionalStringForApi(newCustomer.employmentStatus) : undefined,
      job_type: !isB2b ? optionalStringForApi(newCustomer.jobType) : undefined,
      religion: !isB2b ? optionalStringForApi(newCustomer.religion) : undefined,
    }, {
      onSuccess: () => {
        setShowAddModal(false);
        setNewCustomer({ name: '', email: '', phone: '', companyName: '', type: CustomerType.B2C, location: hubScope.hubName || hubScope.defaultHubName || activeHubs[0]?.name || 'Lagos', totalOrders: 0, totalSpent: 0 });
        toast.success('Customer added.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
  };;

  // Deep-link: open a customer from ?open=<id> (e.g. inventory Sales top buyers)
  const deepLinkOpenId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('open');
  }, []);
  const { data: deepLinkCustomer } = useCustomer(deepLinkOpenId);
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !deepLinkOpenId) return;
    const fromList = customers.find((c) => c.id === deepLinkOpenId);
    if (fromList) {
      deepLinkHandled.current = true;
      handleViewDetails(fromList);
      return;
    }
    if (deepLinkCustomer) {
      deepLinkHandled.current = true;
      handleViewDetails(deepLinkCustomer);
    }
  }, [customers, deepLinkOpenId, deepLinkCustomer]);

  const handleCustomerImportFile = (file?: File) => {
    if (!file) return;
    setCustomerImportSummary(null);
    setCustomerImportPreview([]);
    setCustomerImportValidateSummary(null);
    setCustomerImportError(null);
    setCustomerImportFileName(file.name);
    setShowCustomerImportModal(true);
    validateCustomerImport.mutate(file, {
      onSuccess: (validation) => {
        setCustomerImportPreview(validation.rows);
        setCustomerImportValidateSummary(validation.summary);
        if (validation.summary.total === 0) {
          toast.error('No customer rows found in the workbook.');
          setShowCustomerImportModal(false);
        }
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Customer import validation failed.');
        setShowCustomerImportModal(false);
      },
      onSettled: () => {
        if (customerImportInputRef.current) customerImportInputRef.current.value = '';
      },
    });
  };

  const handleCustomerImportConfirm = async () => {
    const previewSnapshot = customerImportPreview;
    const rows = previewSnapshot
      .filter((row) => row.valid && row.resolved)
      .map((row) => row.resolved!);
    if (rows.length === 0) {
      toast.error('No valid rows to import.');
      return;
    }
    setCustomerImporting(true);
    setCustomerImportError(null);
    try {
      const result = await importCustomers.mutateAsync(rows);
      const imported = result.imported ?? 0;
      const warnings = customerImportValidateSummary?.warnings ?? 0;
      const invalid = customerImportValidateSummary?.invalid ?? 0;
      const total = customerImportValidateSummary?.total ?? previewSnapshot.length;
      setShowCustomerImportModal(false);
      setCustomerImportPreview([]);
      setCustomerImportValidateSummary(null);
      setCustomerImportError(null);
      setCustomerImportSummary({
        fileName: customerImportFileName,
        total,
        imported,
        warnings,
        invalid,
        failed: 0,
        rows: buildCustomerImportSummaryRows(previewSnapshot, result.results),
      });
      if (warnings > 0 || invalid > 0) {
        toast.warning(`${warnings} row(s) had warnings, ${invalid} invalid (skipped).`);
      }
      toast.success(`Imported ${imported} customer(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Customer import failed.';
      setCustomerImportError(message);
      toast.error(message);
    } finally {
      setCustomerImporting(false);
    }
  };

  const closeCustomerImportModal = () => {
    if (customerImporting) return;
    setShowCustomerImportModal(false);
    setCustomerImportPreview([]);
    setCustomerImportValidateSummary(null);
    setCustomerImportError(null);
  };

  // --- Render ---
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">Manage your client base, segments, and loyalty tiers.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('customers.view') && (
            <button
              type="button"
              disabled={exportCustomers.isPending}
              onClick={() => {
                exportCustomers.mutate(exportFilters, {
                  onError: (err) => toast.error(err instanceof Error ? err.message : 'Export failed'),
                  onSuccess: () => toast.success('Customer export downloaded'),
                });
              }}
              className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2 disabled:opacity-50"
            >
              <Download size={16} className="mr-2" />
              {exportCustomers.isPending ? 'Exporting…' : 'Export'}
            </button>
          )}
          {can('customers.create') && (
            <>
            <input
              ref={customerImportInputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => handleCustomerImportFile(event.target.files?.[0])}
            />
            <button onClick={() => downloadCustomerImportTemplate.mutate()} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
              <Download size={16} className="mr-2" /> Template
            </button>
            <button onClick={() => customerImportInputRef.current?.click()} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-10 px-4 py-2">
              <Upload size={16} className="mr-2" /> Import
            </button>
            <button onClick={() => setShowAddModal(true)} className="inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
              <Plus size={16} className="mr-2" /> Add Customer
            </button>
            </>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="space-y-3">
        <MetricsPeriodBar
          period={metricsPeriod}
          hint={
            periodScoped
              ? 'List shows customers who transacted in the selected range. “New in Period” counts customers whose first purchase falls in that range.'
              : 'All time lists every matching customer. “New This Month” counts customers whose first purchase is in the current calendar month.'
          }
        />
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {customersFetching ? (
          Array.from({ length: 9 }, (_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Users size={14} className="text-muted-foreground" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Total</span></div>
          <MetricValue value={kpis.total} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Calendar size={14} className="text-sky-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">{periodScoped ? 'Active in Period' : 'YTD Created'}</span></div>
          <MetricValue value={kpis.ytdCustomers} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Plus size={14} className="text-teal-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">{periodScoped ? 'New in Period' : 'New This Month'}</span></div>
          <MetricValue value={kpis.newThisMonth} />
          <p className={`mt-1 text-[10px] font-semibold ${kpis.newCustomersMomPct > 0 ? 'text-emerald-600' : kpis.newCustomersMomPct < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
            {kpis.newCustomersMomPct > 0 ? '+' : ''}{kpis.newCustomersMomPct.toFixed(1)}% vs prior
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Heart size={14} className="text-rose-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Retention</span></div>
          <MetricValue value={`${kpis.retentionRate.toFixed(1)}%`} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Building2 size={14} className="text-blue-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">B2B</span></div>
          <MetricValue value={kpis.b2b} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><User size={14} className="text-green-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">B2C</span></div>
          <MetricValue value={kpis.b2c} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><RefreshCw size={14} className="text-purple-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Repeat</span></div>
          <MetricValue value={kpis.repeat} />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><span className="text-emerald-600 text-sm font-bold">₦</span><span className="text-[10px] font-bold uppercase text-muted-foreground">Revenue</span></div>
          <MetricValue value={`₦${kpis.totalRevenue.toLocaleString()}`} className="text-lg" />
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><BarChart3 size={14} className="text-orange-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Avg Value</span></div>
          <MetricValue value={`₦${Math.round(kpis.avgValue).toLocaleString()}`} className="text-lg" />
        </div>
          </>
        )}
      </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search name, email, company..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <FilterSelect
            ariaLabel="Customer type"
            value={filterType}
            onChange={(value) => setFilterType(value as CustomerType | 'All')}
            icon={<Filter size={14} className="text-muted-foreground" />}
            className="w-fit"
            options={[
              { value: 'All', label: 'All Types' },
              { value: CustomerType.B2C, label: 'B2C' },
              { value: CustomerType.B2B, label: 'B2B' },
            ]}
          />
          <HubScopeFilterBar scope={hubScope} />
          <div className="flex items-center gap-2">
            <FilterSelect
              ariaLabel="Orders"
              value={ordersFilterMode}
              onChange={(value) => setOrdersFilterMode(value as OrdersFilterMode)}
              icon={<ShoppingCart size={14} className="text-muted-foreground" />}
              className="w-fit"
              options={[
                { value: 'all', label: 'All orders' },
                { value: 'once', label: 'Purchased once' },
                { value: 'exact', label: 'Exact count…' },
                { value: 'min', label: 'At least…' },
              ]}
            />
            {(ordersFilterMode === 'exact' || ordersFilterMode === 'min') && (
              <input
                type="number"
                min={0}
                step={1}
                value={ordersFilterCount}
                onChange={(e) => setOrdersFilterCount(Number(e.target.value))}
                className="w-16 h-7 rounded border border-input bg-background px-2 text-sm"
                aria-label={ordersFilterMode === 'exact' ? 'Exact order count' : 'Minimum order count'}
              />
            )}
          </div>
          {segments.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setSegmentFilterOpen((o) => !o)}
                className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background text-sm font-medium"
              >
                <Heart size={14} className="text-muted-foreground" />
                {filterSegmentIds.length === 0
                  ? 'All Segments'
                  : `${filterSegmentIds.length} segment${filterSegmentIds.length === 1 ? '' : 's'}`}
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
              {segmentFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSegmentFilterOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 w-72 max-h-80 overflow-auto rounded-md border bg-background shadow-lg p-2">
                    <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Match all selected</span>
                      {filterSegmentIds.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setFilterSegmentIds([])}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {periodScoped && (
                      <p className="px-2 pb-2 text-[11px] text-muted-foreground leading-snug">
                        Segments based on activity in the selected period (not lifetime).
                      </p>
                    )}
                    {SEGMENT_TAXONOMY.map((group) => {
                      const options = group.segments
                        .map((name) => ({ name, id: segmentByName.get(name) }))
                        .filter((o): o is { name: string; id: string } => !!o.id);
                      if (options.length === 0) return null;
                      return (
                        <div key={group.group} className="mb-2">
                          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {group.group}
                          </p>
                          {options.map((opt) => {
                            const checked = filterSegmentIds.includes(opt.id);
                            return (
                              <label
                                key={opt.id}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => {
                                    setFilterSegmentIds((prev) =>
                                      checked
                                        ? prev.filter((id) => id !== opt.id)
                                        : [...prev, opt.id],
                                    );
                                  }}
                                  className="rounded border-input"
                                />
                                <span className="truncate">{opt.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
          {customerMeta.total} customer{customerMeta.total !== 1 ? 's' : ''}
          {customersFetching && !customersLoading && ' · Updating…'}
        </span>
      </div>

      {/* Customer Table */}
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b hover:bg-muted/50">
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Customer</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Contact</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Segments</th>
                <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort('total_orders')}
                    className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                  >
                    Orders
                    <SortIcon field="total_orders" />
                  </button>
                </th>
                <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort('total_spent')}
                    className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                  >
                    Revenue
                    <SortIcon field="total_spent" />
                  </button>
                </th>
                <th className="h-12 px-4 text-center font-medium text-muted-foreground">Score</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground w-8"></th>
              </tr>
            </thead>
            <tbody>
              {!customersFetching && customers.map((customer) => {
                const status = getStatus(customer);
                const grade = getGrade(customer);
                const creditGrade = calculateScore(customer.id);
                return (
                  <tr key={customer.id} onClick={() => handleViewDetails(customer)} className="border-b hover:bg-muted/50 cursor-pointer group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20 shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          {customer.companyName && <span className="text-xs text-muted-foreground">{customer.companyName}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground truncate max-w-[180px]">{customer.email || '—'}</span>
                        <span className="text-xs text-muted-foreground">{customer.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${customer.type === CustomerType.B2B ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                          {customer.type === CustomerType.B2B ? <Building2 size={12} /> : <User size={12} />} {customer.type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={10} /> {customer.location}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(() => {
                          const ordered = prioritizeCustomerSegments(
                            customer.segments ?? [],
                            activeFilterSegmentNames,
                          );
                          return (
                            <>
                              {ordered.slice(0, 3).map((seg) => (
                                <span key={seg} className="inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{seg}</span>
                              ))}
                              {ordered.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{ordered.length - 3}</span>
                              )}
                              {ordered.length === 0 && (
                                <span className="text-xs text-muted-foreground/50">—</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">{customer.totalOrders}</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-medium">&#8358;{customer.totalSpent.toLocaleString()}</span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === 'Repeat' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>{status}</span>
                        {getScoreBadge(creditGrade)}
                      </div>
                    </td>
                    <td className="p-4">
                      <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                );
              })}
              {!customersFetching && customers.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No customers found matching your filters.</td></tr>}
              {customersFetching && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <TableSkeleton rows={8} cols={8} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {customerMeta.total === 0
              ? 'No customers to show'
              : `Showing ${(customerMeta.page - 1) * customerMeta.limit + 1}–${Math.min(customerMeta.page * customerMeta.limit, customerMeta.total)} of ${customerMeta.total}`}
          </p>
          <PaginationControls
            page={customerMeta.page}
            totalPages={customerMeta.totalPages}
            onPageChange={setPage}
            disabled={tableLoading}
          />
        </div>
      </div>

      {/* ====== ADD CUSTOMER MODAL ====== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-lg border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Add New Customer</h2><button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-sm font-medium">Full Name *</label><input type="text" value={newCustomer.name} onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Email</label><input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} placeholder="Optional" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Phone</label><input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Type</label><select value={newCustomer.type} onChange={(e) => { const type = e.target.value as CustomerType; setNewCustomer({ ...newCustomer, type, companyName: type === CustomerType.B2C ? '' : newCustomer.companyName, ...clearOppositeProfileFields(type) }); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value={CustomerType.B2C}>B2C</option><option value={CustomerType.B2B}>B2B</option></select></div>
              {isB2bCustomerType(newCustomer.type) && (
                <div className="space-y-2"><label className="text-sm font-medium">Company *</label><input type="text" value={newCustomer.companyName} onChange={(e) => setNewCustomer({ ...newCustomer, companyName: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              )}
              <div className="space-y-2"><label className="text-sm font-medium">Location</label>
                <select value={newCustomer.location} onChange={(e) => setNewCustomer({ ...newCustomer, location: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {activeHubs.map((h) => (
                    <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <div className="space-y-2"><label className="text-sm font-medium">Assigned Agent</label><select value={newCustomer.addedByAgentId || ''} onChange={(e) => setNewCustomer({ ...newCustomer, addedByAgentId: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">-- Select --</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              )}
            </div>
            <div className="mt-4 space-y-3 border-t pt-4">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                {newCustomer.type === CustomerType.B2B ? <Building2 size={15} className="text-blue-600" /> : <User size={15} className="text-purple-600" />}
                {newCustomer.type === CustomerType.B2B ? 'Business Profile' : 'Consumer Profile'}
              </label>
              <ProfileFields type={(newCustomer.type as CustomerType) || CustomerType.B2C} data={newCustomer} onChange={(patch) => setNewCustomer({ ...newCustomer, ...patch })} />
            </div>
            <div className="mt-4 space-y-2 rounded-lg border bg-muted/20 p-3">
              <label className="text-sm font-medium flex items-center gap-1.5"><Sparkles size={14} className="text-primary" /> Auto Segments <span className="text-[11px] font-normal text-muted-foreground">— generated from the profile above</span></label>
              {(() => {
                const preview = deriveSegments({ ...newCustomer, id: 'preview', segments: [], totalOrders: newCustomer.totalOrders || 0, totalSpent: newCustomer.totalSpent || 0 } as Customer);
                return preview.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preview.map((seg) => <span key={seg} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${segmentBadgeClass(seg)}`}>{seg}</span>)}
                  </div>
                ) : <p className="text-xs text-muted-foreground">Fill in the profile to generate segments.</p>;
              })()}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
              <SubmitButton onClick={handleSaveCustomer} loading={createCustomer.isPending}>Save Customer</SubmitButton>
            </div>
          </div>
        </div>
      )}

      <CustomerImportModal
        show={showCustomerImportModal}
        onClose={closeCustomerImportModal}
        previewRows={customerImportPreview}
        summary={customerImportValidateSummary}
        importing={customerImporting}
        validating={validateCustomerImport.isPending}
        importError={customerImportError}
        onConfirm={handleCustomerImportConfirm}
        onDownloadTemplate={() => downloadCustomerImportTemplate.mutate()}
      />

      {customerImportSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">Customer Upload Summary</h2>
                <p className="mt-1 text-sm text-muted-foreground truncate">
                  {customerImportSummary.fileName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerImportSummary(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>
            {customerImportSummary.imported === 0 && (
              <div className="mt-4 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
                No rows were importable. Review the reasons below.
              </div>
            )}
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground">Total rows</span>
                <p className="text-xl font-bold">{customerImportSummary.total}</p>
              </div>
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground">Imported</span>
                <p className="text-xl font-bold text-green-600">{customerImportSummary.imported}</p>
              </div>
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground">Warnings</span>
                <p className="text-xl font-bold text-amber-600">{customerImportSummary.warnings}</p>
              </div>
              <div className="rounded-md border p-3">
                <span className="text-xs text-muted-foreground">Invalid / failed</span>
                <p className="text-xl font-bold text-red-600">
                  {customerImportSummary.invalid + customerImportSummary.failed}
                </p>
              </div>
            </div>
            {customerImportSummary.rows.length > 0 && (
              <div className="mt-5 overflow-hidden rounded-md border">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="p-3 font-medium">Row</th>
                        <th className="p-3 font-medium">Customer</th>
                        <th className="p-3 font-medium">Hub</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerImportSummary.rows.map((row) => (
                        <tr key={row.lineNo} className="border-b last:border-b-0">
                          <td className="p-3 align-top">{row.lineNo}</td>
                          <td className="p-3 align-top font-medium">{row.customer_name}</td>
                          <td className="p-3 align-top">{row.hub_name || '—'}</td>
                          <td className="p-3 align-top">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${customerImportStatusStyles[row.status]}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="p-3 align-top text-muted-foreground">
                            {row.reasons.length > 0 ? row.reasons.join('; ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCustomerImportSummary(null)}
              className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <CustomerDetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdated={setSelectedCustomer}
          prioritySegmentNames={activeFilterSegmentNames}
        />
      )}
    </div>
  );
}
