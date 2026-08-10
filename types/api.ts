/** API response shapes (snake_case from backend) */

import type { Customer, Sale, InventoryItem, Feedback, Enquiry } from '@/types';
import type { CreditCustomerSummary } from '@/types/credits';

export interface ApiUser {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  hub: { _id: string; name: string } | null;
  data_scope: 'all' | 'hub' | 'assigned';
  role: {
    label: string;
    name: string;
  };
  permissions: string[];
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  is_active: boolean;
  hubId: string | null;
  hubName: string | null;
  /** Hub display label for legacy pages during migration */
  location: string;
  dataScope: 'all' | 'hub' | 'assigned';
  role: string;
  roleName: string;
  permissions: string[];
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  message: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: T[];
}

export interface ApiCreditCustomerSummary {
  customer_id: string;
  customer_name: string;
  total_outstanding: number;
  open_credit_count: number;
  overdue_count: number;
  oldest_due_date: string | null;
  flagged_count?: number;
}

export interface ApiCreditPayment {
  id: string;
  date: string;
  amount: number;
  method?: string;
  recorded_by_name?: string;
  note?: string;
  reference_id?: string;
  balance_after: number;
}

export interface ApiDueDateExtension {
  previous_due_date: string;
  new_due_date: string;
  extended_at: string;
  extended_by_name: string;
  reason?: string;
}

export interface ApiLinkedSale {
  id: string;
  date: string;
  amount: number;
  payment_mode: string;
  product_details?: string;
  item?: {
    product_name?: string;
    quantity?: number;
    unit?: string;
  };
}

export interface ApiCreditRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  sale: ApiLinkedSale | null;
  original_amount: number;
  amount_owed: number;
  date_issued: string;
  due_date: string;
  last_payment_date?: string;
  status: 'Pending' | 'Overdue' | 'Clear' | 'Voided';
  payment_terms?: string;
  extension_count: number;
  flagged?: boolean;
  flag_reason?: string;
  payments: ApiCreditPayment[];
  due_date_extensions: ApiDueDateExtension[];
}

export interface ApiListResponse<T> {
  message: string;
  data: T;
}

export interface ApiHub {
  _id: string;
  hub_name: string;
  hub_address?: string;
  hub_phone?: string;
  hub_manager?: string | { _id: string; full_name?: string; email?: string };
  manager_name?: string;
  is_active?: boolean;
  createdAt?: string;
  location_type?: 'hub' | 'rsp';
  parent_hub?: string | { _id: string; hub_name?: string } | null;
  parent_hub_name?: string;
  child_rsp_count?: number;
  code?: string;
  ownership_type?: 'RO' | 'RF' | null;
}

export type InventoryRequestStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'fulfilled'
  | 'rejected'
  | 'cancelled';

export interface ApiInventoryRequestLine {
  product_id?: string;
  product_name: string;
  sku?: string;
  /** Quantity in the user-selected request unit (`uom`). */
  quantity: number;
  /** Selected request unit: Carton | Kg | or product catalog UOM. */
  uom: string;
  /** Catalog Kg-per-carton snapshot for carton products. */
  carton_weight_kg?: number;
  /** Normalized quantity in the product inventory unit. */
  stock_quantity?: number;
  notes?: string;
}

export interface ApiInventoryRequest {
  _id: string;
  requesting_location: string | { _id: string; hub_name?: string; location_type?: string };
  fulfilling_hub: string | { _id: string; hub_name?: string; location_type?: string };
  status: InventoryRequestStatus;
  lines: ApiInventoryRequestLine[];
  requested_by: string;
  requested_by_name?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  fulfilled_by?: string;
  fulfilled_by_name?: string;
  notes?: string;
  rejection_reason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiSegment {
  _id: string;
  name: string;
  slug?: string;
  is_deleted?: boolean;
}

export interface ApiCustomer {
  _id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  customer_type: string;
  customer_location: string | { _id: string; hub_name?: string };
  company_name?: string;
  joined_date?: string;
  segments?: Array<string | ApiSegment>;
  total_orders?: number;
  total_spent?: number;
  assigned_agent?: string | { _id?: string; full_name?: string };
  added_by?: string | { _id?: string; full_name?: string };
  business_category?: string;
  gender?: string;
  family_type?: string;
  marital_status?: string;
  age_group?: string;
  lifestyle?: string;
  employment_status?: string;
  job_type?: string;
  religion?: string;
}

export interface ApiCustomerListSummary {
  total: number;
  b2b: number;
  b2c: number;
  repeat: number;
  totalRevenue: number;
  avgValue: number;
  ytdCustomers?: number;
  newThisMonth?: number;
  newLastMonth?: number;
  newCustomersMomPct?: number;
  retentionRate?: number;
}

export interface ApiCustomerListResponse {
  data: ApiCustomer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: ApiCustomerListSummary;
}

export interface ApiSaleItem {
  product?: string;
  product_id?: string;
  product_name?: string;
  quantity: number;
  unit?: string;
  sale_unit?: 'Carton' | 'Kg';
  stock_quantity?: number;
  category?: string;
}

export interface ApiSale {
  _id?: string;
  id?: string;
  customer: string;
  customer_name: string;
  amount: number;
  profit_margin?: number;
  profit_amount?: number;
  date: string;
  agent: string;
  agent_name: string;
  hub?: string;
  hub_name?: string;
  status: string;
  product_details?: string;
  payment_terms?: string;
  notes?: string;
  channel?: string;
  delivery_status?: string;
  delivery_address?: string;
  payment_type?: string;
  payment_mode?: string;
  amount_paid?: number;
  due_date?: string;
  item?: ApiSaleItem;
  items?: ApiSaleItem[];
  credit_record?: string | ApiCreditRecord;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProduct {
  _id: string;
  sku: string;
  name: string;
  category: string;
  unit_of_measure: string;
  min_stock_level: number;
  current_stock: number;
  avg_unit_cost: number;
  base_selling_price: number;
  carton_price?: number;
  carton_weight?: number;
  last_stock_update?: string;
  hub: string | { _id: string; hub_name?: string };
  is_active?: boolean;
  price_version?: string;
  supplier?: string;
  supplier_id?: string;
  last_purchase_price?: number;
  price_history?: { date: string; cost: number; price: number }[];
}

export interface ApiStockLog {
  _id: string;
  item: string | { _id?: string; sku?: string; name?: string; category?: string; unit_of_measure?: string; base_selling_price?: number };
  item_name: string;
  type: string;
  quantity: number;
  uom: string;
  unit_cost: number;
  unit_price: number;
  reference_id?: string;
  notes?: string;
  agent: string | { _id?: string; full_name?: string };
  batch_number?: string;
  expiry_date?: string;
  supplier?: string;
  supplier_id?: string;
  from_hub?: string;
  to_hub?: string;
  reason?: string;
  date: string;
}

export interface ApiSupplier {
  _id: string;
  code?: string;
  name: string;
  business_name?: string;
  business_type?: string;
  hub?: string | { _id: string; hub_name?: string };
  address?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  categories?: string[];
  payment_terms?: string;
  lead_time_days?: number;
  rating?: number;
  is_active?: boolean;
  notes?: string;
  total_spend?: number;
  createdAt?: string;
  added_by?: string | { _id?: string; full_name?: string };
}

export interface ApiSupplierIssue {
  _id: string;
  supplier: string | { _id?: string };
  supplier_name: string;
  type: string;
  severity: string;
  description: string;
  date: string;
  status: string;
  resolution_note?: string;
  resolved_date?: string;
  reported_by?: string | { _id?: string; full_name?: string };
  reported_by_name?: string;
  related_item?: string | { _id?: string; sku?: string; name?: string };
  related_stock_log?: string;
}

export interface ApiAgentUser {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active?: boolean;
  createdAt?: string;
  role?: { label: string; name: string } | string;
  hub?: { _id: string; hub_name?: string; name?: string } | null;
}

export interface ApiUsersListResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  users: ApiAgentUser[];
}

export interface ApiRole {
  _id: string;
  name: string;
  label: string;
  description?: string;
  is_system?: boolean;
  permissions?: unknown[];
}

export interface ApiFeedback {
  _id: string;
  customer: string | ApiCustomer;
  type: string;
  content: string;
  sentiment?: string;
  status: string;
  resolution?: string;
  resolution_date?: string;
  priority?: string;
  resolved_by?: string | { _id?: string; full_name?: string };
  resolved_by_name?: string;
  createdAt?: string;
}

export interface ApiEnquiry {
  _id: string;
  customer_name: string;
  email?: string;
  subject?: string;
  message: string;
  date?: string;
  createdAt?: string;
  status: string;
  category?: string;
  resolution?: string;
  managed_by_agent?: string;
  managed_by_agent_name?: string;
}

export interface ApiCompensation {
  _id: string;
  customer: string | ApiCustomer;
  customer_name?: string;
  reason?: string;
  amount: number;
  date?: string;
  createdAt?: string;
  status: string;
  category?: string;
  recorded_by_agent?: string;
  recorded_by_agent_name?: string;
}

export interface ApiAuditLog {
  _id: string;
  timestamp: string;
  user?: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  category?: string;
  bulk_upload?: {
    domain?: string;
    import_type?: string;
    file_name?: string;
    stage?: string;
    summary?: Record<string, unknown>;
    rows?: unknown[];
    results?: unknown[];
    row_count?: number;
    result_count?: number;
    rows_truncated?: boolean;
    results_truncated?: boolean;
  };
  hub?: string | { hub_name?: string };
}

export interface ApiTask {
  _id: string;
  title: string;
  description?: string;
  assigned_to: string;
  assigned_to_name?: string;
  due_date?: string;
  priority: string;
  status: string;
  created_by?: string;
}

export interface ApiDashboardMetricsRaw {
  totalCustomers?: number;
  activeLeads?: number;
  pipelineValue?: number;
  openComplaints?: number;
  customersByLocation?: { name: string; customers: number }[];
  feedbackBreakdown?: { name: string; value: number }[];
  sales_today?: number;
  revenue_today?: number;
  pending_credits_count?: number;
  overdue_credits_count?: number;
  low_stock_count?: number;
  open_interactions?: number;
  revenue_trend?: { date: string; amount: number }[];
}

export type DashboardPeriod = 'today' | 'week' | 'month' | 'all';

/** Sales chart granularity tabs on the Dashboard. */
export type DashboardTrendGranularity = 'day' | 'week' | 'month' | 'all';

export interface DashboardSalesSummary {
  revenue: number;
  orders: number;
  profit?: number;
  aov: number;
  cashRevenue: number;
  creditRevenue: number;
  walkInRevenue: number;
  deliveryRevenue: number;
  /** Resolved rollup unit returned by the API when granularity was requested. */
  granularity?: 'day' | 'week' | 'month';
  trend: { date: string; revenue: number }[];
}

export interface DashboardCategoryRevenueRow {
  name: string;
  revenue: number;
  orders: number;
  percentage: number;
  fill: string;
}

export interface DashboardCategoryRevenue {
  totalRevenue: number;
  categories: DashboardCategoryRevenueRow[];
}

export const EMPTY_DASHBOARD_SALES_SUMMARY: DashboardSalesSummary = {
  revenue: 0,
  orders: 0,
  aov: 0,
  cashRevenue: 0,
  creditRevenue: 0,
  walkInRevenue: 0,
  deliveryRevenue: 0,
  trend: [],
};

export const EMPTY_DASHBOARD_CATEGORY_REVENUE: DashboardCategoryRevenue = {
  totalRevenue: 0,
  categories: [],
};

export interface DashboardMetricsData {
  totalCustomers: number;
  revenueToday: number;
  salesToday: number;
  totalOutstanding: number;
  overdueCreditsCount: number;
  overdueAmount: number;
  pendingCreditsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  openFeedback: number;
  openEnquiries: number;
  openTickets: number;
  newCustomersThisMonth: number;
  activeLeads: number;
  pipelineValue: number;
  openComplaints: number;
  revenueTrend: { date: string; amount: number }[];
  /** Chart/list payloads bundled by useDashboardMetrics */
  customers: Customer[];
  inventory: InventoryItem[];
  feedbacks: Feedback[];
  enquiries: Enquiry[];
  creditSummaries: CreditCustomerSummary[];
}

export interface AnalyticsOverviewData {
  sales: {
    monthlyTrend: { key?: string; month: string; revenue: number; orders: number }[];
    weeklyTrend: { key?: string; month: string; revenue: number; orders: number }[];
    dailyTrend: { key?: string; month: string; revenue: number; orders: number }[];
    growth: {
      revGrowth: number;
      orderGrowth: number;
      currMonth: string;
      prevMonth: string;
    } | null;
    dayOfWeekPattern: { day: string; revenue: number; avgRevenue: number; orders: number }[];
    channelBreakdown: { name: string; revenue: number; count: number }[];
    paymentModeSplit: { name: string; value: number; count: number }[];
    paymentTypeSplit: { name: string; value: number; count: number }[];
    collectedVsOutstanding: { collected: number; outstanding: number; total: number };
    aovTrend: { key?: string; month: string; aov: number }[];
    aovWeeklyTrend: { key?: string; month: string; aov: number }[];
    totalRevenue: number;
  };
  products: {
    productRevenue: { name: string; category: string; revenue: number; count: number }[];
    categoryRevenue: { name: string; revenue: number; orders: number; fill: string }[];
    stockTurnover: {
      name: string;
      category: string;
      unitsSold: number;
      currentStock: number;
      turnover: number;
      fill: string;
    }[];
    deadStock: { id: string; name: string; category: string; currentStock: number }[];
  };
  customers: {
    kpis: { totalCustomers: number; avgLifetimeValue: number; repeatRate: number };
    acquisitionTrend: { key?: string; month: string; new: number; total: number }[];
    acquisitionWeeklyTrend: { key?: string; month: string; new: number; total: number }[];
    clvDistribution: { label: string; min: number; max: number; count: number; revenue: number }[];
    segmentData: { name: string; customers: number; revenue: number; value?: number }[];
    buyerAnalysis: { name: string; value: number; fill: string }[];
    topSpenders: { id: string; name: string; type: string; totalSpent: number; totalOrders: number }[];
    repeatCustomers: { id: string; name: string; type: string; totalOrders: number; totalSpent: number }[];
    concentration: { top20Pct: number; top20Count: number; total: number; totalRev: number };
    feedback: { sentiments: { name: string; value: number }[]; complaintsBySegment: { name: string; value: number }[] };
  };
  credit: {
    kpis: { totalOutstanding: number; totalOverdue: number; totalCleared: number; collectionRate: number };
    agingReport: { label: string; min: number; max: number; amount: number; count: number }[];
    topDebtors: { id: string; customerId: string; customerName: string; amountOwed: number; dateIssued: string; status: string }[];
    customerRisk: {
      name: string;
      type: string;
      totalSpent: number;
      totalOwed: number;
      overdueAmount: number;
      creditRatio: number;
      overdueCount: number;
    }[];
    collectionTrend: { key?: string; month: string; issued: number; cleared: number; rate: number }[];
    collectionWeeklyTrend: { key?: string; month: string; issued: number; cleared: number; rate: number }[];
  };
}

export const EMPTY_ANALYTICS_OVERVIEW: AnalyticsOverviewData = {
  sales: {
    monthlyTrend: [],
    weeklyTrend: [],
    dailyTrend: [],
    growth: null,
    dayOfWeekPattern: [],
    channelBreakdown: [],
    paymentModeSplit: [],
    paymentTypeSplit: [],
    collectedVsOutstanding: { collected: 0, outstanding: 0, total: 0 },
    aovTrend: [],
    aovWeeklyTrend: [],
    totalRevenue: 0,
  },
  products: {
    productRevenue: [],
    categoryRevenue: [],
    stockTurnover: [],
    deadStock: [],
  },
  customers: {
    kpis: { totalCustomers: 0, avgLifetimeValue: 0, repeatRate: 0 },
    acquisitionTrend: [],
    acquisitionWeeklyTrend: [],
    clvDistribution: [],
    segmentData: [],
    buyerAnalysis: [],
    topSpenders: [],
    repeatCustomers: [],
    concentration: { top20Pct: 0, top20Count: 0, total: 0, totalRev: 0 },
    feedback: { sentiments: [], complaintsBySegment: [] },
  },
  credit: {
    kpis: { totalOutstanding: 0, totalOverdue: 0, totalCleared: 0, collectionRate: 0 },
    agingReport: [],
    topDebtors: [],
    customerRisk: [],
    collectionTrend: [],
    collectionWeeklyTrend: [],
  },
};

export interface ApiBulkImportSaleRow {
  lineNo: number;
  customer_id: string;
  hub_id: string;
  product_id?: string;
  quantity?: number;
  amount: number;
  unit_price?: number;
  payment_mode: string;
  amount_paid?: number;
  due_date?: string;
  payment_type?: string;
  channel?: string;
  delivery_status?: string;
  delivery_address?: string;
  notes?: string;
  date?: string;
  product_details?: string;
  historical?: boolean;
  import_mode?: 'catalog' | 'custom';
  profit_margin?: number;
  profit_amount?: number;
}

export interface SalesImportPreviewRow {
  lineNo: number;
  date_sold: string;
  customer_name: string;
  hub_name: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit?: string;
  payment_mode: string;
  amount_paid?: number;
  due_date?: string;
  payment_type?: string;
  channel?: string;
  delivery_status?: string;
  delivery_address?: string;
  notes?: string;
  margin_percent?: number;
  amount?: number;
  historical?: boolean;
  import_mode?: 'catalog' | 'custom';
  valid: boolean;
  errors: string[];
  resolved?: ApiBulkImportSaleRow;
}

export interface SalesImportValidateResponse {
  rows: SalesImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number };
  validate_audit_id?: string;
}

export interface SalesImportResult {
  imported: number;
  failed: number;
  results: { lineNo: number; success: boolean; error?: string }[];
}

export interface SalesImportChunkResult extends SalesImportResult {
  offset: number;
  next_offset: number;
  total: number;
  done: boolean;
  imported_so_far: number;
  failed_so_far: number;
  imported_in_chunk: number;
  failed_in_chunk: number;
}

export interface ApiBulkImportMovementRow {
  lineNo: number;
  hub_id: string;
  product_id?: string;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  movement_date: string;
  product_name?: string;
  notes?: string;
  historical?: boolean;
}

export interface InventoryImportPreviewRow {
  lineNo: number;
  movement_date: string;
  hub_name: string;
  product_name: string;
  movement_type: string;
  quantity: number;
  unit_cost?: number;
  notes?: string;
  historical?: boolean;
  valid: boolean;
  errors: string[];
  resolved?: ApiBulkImportMovementRow;
}

export interface InventoryImportValidateResponse {
  rows: InventoryImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number };
}

export interface InventoryImportResult {
  imported: number;
  failed: number;
  results: { lineNo: number; success: boolean; error?: string }[];
}

export interface CustomerImportPreviewRow {
  lineNo: number;
  customer_name: string;
  hub_name?: string;
  valid: boolean;
  skipped?: boolean;
  errors: string[];
  warnings: string[];
  resolved?: {
    lineNo: number;
    customer_name: string;
    hub_name?: string;
    customer_type: string;
    customer_location: string;
    customer_phone: string;
  };
}

export interface CustomerImportValidateResponse {
  rows: CustomerImportPreviewRow[];
  summary: { total: number; valid: number; invalid: number; warnings: number; skipped?: number };
}

export interface InventorySalesMetrics {
  volumeByUnit: { Kg: number; Litres: number; Units: number };
  topSellers: { productName: string; quantity: number; revenue: number }[];
  mostVolatile: {
    productName: string;
    volatilityPct: number;
    lastChangeDate: string | null;
    minPrice: number;
    maxPrice: number;
  }[];
  mealsServed: number;
}

export interface ApiProductSupplierRow {
  supplier_id?: string | null;
  name: string;
  rating?: number | null;
  open_issues: number;
  orders: number;
  qty: number;
  spend: number;
  last_price: number;
  last_date?: string | Date | null;
}

export interface ApiProductSalesPerformance {
  has_data: boolean;
  units: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  orders: number;
  trend: { month: string; amount: number }[];
  b2b_rev: number;
  b2c_rev: number;
  top_segments: { name: string; pct: number }[];
  channel_mix: { name: string; pct: number }[];
  by_customer: {
    id: string;
    name: string;
    type: string;
    top_segment?: string | null;
    qty: number;
    revenue: number;
    last?: string | Date | null;
  }[];
  units_per_month: number;
  days_of_cover: number | null;
}

export interface ProductSupplierRow {
  supplierId?: string;
  name: string;
  rating?: number;
  openIssues: number;
  orders: number;
  qty: number;
  spend: number;
  lastPrice: number;
  lastDate: string;
}

export interface ProductSalesPerformance {
  hasData: boolean;
  units: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
  orders: number;
  trend: { month: string; amount: number }[];
  b2bRev: number;
  b2cRev: number;
  topSegments: { name: string; pct: number }[];
  channelMix: { name: string; pct: number }[];
  byCustomer: {
    id: string | null;
    name: string;
    type: string | null;
    topSegment: string | null;
    qty: number;
    revenue: number;
    last: string;
  }[];
  unitsPerMonth: number;
  daysOfCover: number | null;
}

export interface CustomerImportResult {
  processed?: number;
  imported: number;
  skipped: number;
  failed: number;
  results: { lineNo: number; success: boolean; skipped?: boolean; error?: string }[];
}

export type CustomerImportRowStatus = 'imported' | 'skipped' | 'invalid' | 'failed';

export interface CustomerImportSummaryRow {
  lineNo: number;
  customer_name: string;
  hub_name?: string;
  status: CustomerImportRowStatus;
  reasons: string[];
}
