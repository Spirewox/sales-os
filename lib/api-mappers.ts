import {
  ApiHub,
  ApiCustomer,
  ApiSale,
  ApiProduct,
  ApiStockLog,
  ApiSupplier,
  ApiSupplierIssue,
  ApiAgentUser,
  ApiFeedback,
  ApiEnquiry,
  ApiCompensation,
  ApiAuditLog,
  ApiTask,
  ApiSegment,
  ApiCreditCustomerSummary,
  ApiDashboardMetricsRaw,
  DashboardMetricsData,
  ApiProductSupplierRow,
  ApiProductSalesPerformance,
  ProductSupplierRow,
  ProductSalesPerformance,
} from '@/types/api';
import { customerTypeFromApi } from '@/lib/customer-helpers';
import {
  Hub,
  Customer,
  CustomerType,
  Sale,
  InventoryItem,
  StockLog,
  StockMovementType,
  Supplier,
  SupplierIssue,
  Agent,
  Feedback,
  FeedbackType,
  Sentiment,
  FeedbackPriority,
  Enquiry,
  EnquiryCategory,
  Compensation,
  CompensationCategory,
  AuditLog,
  Task,
  TaskPriority,
  TaskStatus,
  PaymentTerms,
  SalesChannel,
  DeliveryStatus,
} from '@/types';
import { mapCreditCustomerSummary } from '@/lib/credit-mappers';

export function toDateStr(value: string | Date | undefined | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.split('T')[0];
  return new Date(value).toISOString().split('T')[0];
}

export function getId(obj: { _id?: string; id?: string } | string | undefined): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj._id || obj.id || '';
}

function refId(value: string | { _id?: string; id?: string } | null | undefined): string {
  return getId(value ?? undefined);
}

function customerRefId(customer: string | ApiCustomer | null | undefined): string {
  if (typeof customer === 'object' && customer !== null) return customer._id;
  if (typeof customer === 'string') return customer;
  return '';
}

function resolvedByAgentId(
  resolvedBy: string | { _id?: string; full_name?: string } | null | undefined,
): string | undefined {
  if (typeof resolvedBy === 'string') return resolvedBy;
  if (resolvedBy && typeof resolvedBy === 'object') return resolvedBy._id;
  return undefined;
}

function resolvedByAgentName(
  resolvedBy: string | { _id?: string; full_name?: string } | null | undefined,
  resolvedByName?: string,
): string | undefined {
  if (resolvedByName) return resolvedByName;
  if (resolvedBy && typeof resolvedBy === 'object') return resolvedBy.full_name;
  return undefined;
}

export function buildHubMap(hubs: Hub[]): Record<string, string> {
  return Object.fromEntries(hubs.map((h) => [h.id, h.name]));
}

/** Native <option> label: "Lagos (Hub · HB-001)" / "Ife (RSP · RO-0001)". Value stays hub.name or hub.id. */
export function hubOptionLabel(
  hub: Pick<Hub, 'name' | 'locationType' | 'code'> | { name: string; locationType?: string; code?: string },
  extras?: string,
): string {
  const typeLabel = hub.locationType === 'rsp' ? 'RSP' : 'Hub';
  const codePart = hub.code ? ` · ${hub.code}` : '';
  const base = `${hub.name} (${typeLabel}${codePart})`;
  return extras ? `${base} ${extras}` : base;
}

function resolveHubName(
  location: ApiCustomer['customer_location'] | ApiProduct['hub'],
  hubMap?: Record<string, string>,
): string {
  if (typeof location === 'object' && location !== null) {
    if ('hub_name' in location && location.hub_name) return location.hub_name;
    const id = getId(location);
    if (id && hubMap?.[id]) return hubMap[id];
  }
  if (typeof location === 'string') {
    return hubMap?.[location] || location;
  }
  return 'Unknown';
}

function capitalizeWords(s: string): string {
  return s
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function titleCaseStatus(s: string): 'Open' | 'Resolved' | 'Closed' {
  const lower = s.toLowerCase();
  if (lower === 'resolved') return 'Resolved';
  if (lower === 'closed') return 'Closed';
  return 'Open';
}

export function mapHub(h: ApiHub): Hub {
  const hubManager =
    typeof h.hub_manager === 'object' && h.hub_manager
      ? h.hub_manager
      : null;
  const parentHub =
    typeof h.parent_hub === 'object' && h.parent_hub ? h.parent_hub : null;
  return {
    id: h._id,
    name: h.hub_name,
    address: h.hub_address,
    phone: h.hub_phone,
    hubManagerId:
      hubManager?._id ??
      (typeof h.hub_manager === 'string' ? h.hub_manager : undefined),
    managerName: hubManager?.full_name ?? h.manager_name,
    isActive: h.is_active !== false,
    createdDate: toDateStr(h.createdAt) || new Date().toISOString().split('T')[0],
    locationType: h.location_type === 'rsp' ? 'rsp' : 'hub',
    parentHubId:
      parentHub?._id ??
      (typeof h.parent_hub === 'string' ? h.parent_hub : undefined),
    parentHubName: parentHub?.hub_name ?? h.parent_hub_name,
    childRspCount: h.child_rsp_count ?? 0,
    code: h.code,
    ownershipType: h.ownership_type === 'RO' || h.ownership_type === 'RF' ? h.ownership_type : null,
  };
}

export function mapSegment(s: ApiSegment): { id: string; name: string } {
  return { id: s._id, name: s.name };
}

export function mapCustomer(c: ApiCustomer, hubMap?: Record<string, string>): Customer {
  const segments = (c.segments ?? []).map((s) =>
    typeof s === 'string' ? s : s.name,
  );
  const assigned =
    typeof c.assigned_agent === 'object' && c.assigned_agent
      ? c.assigned_agent
      : null;
  const addedBy =
    typeof c.added_by === 'object' && c.added_by ? c.added_by : null;
  return {
    id: c._id,
    name: c.customer_name,
    email: c.customer_email || '',
    phone: c.customer_phone || '',
    type: customerTypeFromApi(c.customer_type) as CustomerType,
    location: resolveHubName(c.customer_location, hubMap),
    companyName: c.company_name,
    joinedDate: toDateStr(c.joined_date) || new Date().toISOString().split('T')[0],
    segments,
    totalOrders: c.total_orders ?? 0,
    totalSpent: c.total_spent ?? 0,
    addedByAgentId: assigned?._id || refId(c.assigned_agent) || undefined,
    addedByAgentName: assigned?.full_name || addedBy?.full_name || undefined,
    businessCategory: c.business_category,
    gender: c.gender,
    familyType: c.family_type,
    maritalStatus: c.marital_status,
    ageGroup: c.age_group,
    lifestyle: c.lifestyle,
    employmentStatus: c.employment_status,
    jobType: c.job_type,
    religion: c.religion,
  };
}

export function mapSale(s: ApiSale, hubMap?: Record<string, string>): Sale {
  const paymentMode = s.payment_mode || 'Full Payment';
  const item = s.item ?? s.items?.[0];
  const itemQuantity = item?.quantity;
  const itemUnit = item?.unit;
  const itemName = item?.product_name;
  const derivedProductDetails =
    itemQuantity && itemName
      ? `${itemQuantity}${itemUnit ? ` ${itemUnit}` : ''} of ${itemName}`
      : itemName;

  return {
    id: s.id || s._id || '',
    customerId: refId(s.customer),
    customerName: s.customer_name,
    amount: s.amount,
    profitMargin: s.profit_margin ?? 0,
    profitAmount: s.profit_amount ?? 0,
    date: toDateStr(s.date),
    createdAt: toDateStr(s.createdAt),
    updatedAt: toDateStr(s.updatedAt),
    agentId: refId(s.agent),
    agentName: s.agent_name,
    hubId: refId(s.hub),
    hubName: s.hub_name ?? (s.hub ? resolveHubName(s.hub, hubMap) : ''),
    status: s.status as Sale['status'],
    item: item
      ? {
          productId: item.product_id || item.product,
          productName: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          saleUnit: item.sale_unit,
          stockQuantity: item.stock_quantity,
          category: item.category,
          batchNumber: item.batch_number,
        }
      : undefined,
    productDetails: s.product_details ?? derivedProductDetails,
    isCredit: paymentMode !== 'Full Payment',
    paymentTerms: s.payment_terms as PaymentTerms | undefined,
    notes: s.notes,
    channel: s.channel as SalesChannel | undefined,
    deliveryStatus: s.delivery_status as DeliveryStatus | undefined,
    deliveryAddress: s.delivery_address,
    paymentType: s.payment_type,
    paymentMode,
    amountPaid: s.amount_paid,
  };
}

export function mapInventoryItem(p: ApiProduct, hubMap?: Record<string, string>): InventoryItem {
  return {
    id: p._id,
    sku: p.sku,
    name: p.name,
    category: p.category as InventoryItem['category'],
    unitOfMeasure: p.unit_of_measure as InventoryItem['unitOfMeasure'],
    minStockLevel: p.min_stock_level ?? 5,
    currentStock: p.current_stock ?? 0,
    avgUnitCost: p.avg_unit_cost ?? 0,
    baseSellingPrice: p.base_selling_price ?? 0,
    cartonPrice: p.carton_price,
    cartonWeight: p.carton_weight,
    lastStockUpdate: toDateStr(p.last_stock_update) || new Date().toISOString().split('T')[0],
    location: resolveHubName(p.hub, hubMap),
    isActive: p.is_active !== false,
    priceVersion: p.price_version,
    supplier: p.supplier,
    supplierId: typeof p.supplier_id === 'string' ? p.supplier_id : refId(p.supplier_id),
    lastPurchasePrice: p.last_purchase_price,
    priceHistory: p.price_history,
    isExpensed: p.is_expensed === true,
    expenseMode: p.expense_mode,
    expenseValue: p.expense_value,
    expenseCountUnit: p.expense_count_unit,
    expenseQty: p.expense_qty,
    expenseValueAmount: p.expense_value_amount,
  };
}

export function mapStockLog(l: ApiStockLog): StockLog {
  const itemObj = typeof l.item === 'object' && l.item ? l.item : null;
  const agentObj = typeof l.agent === 'object' && l.agent ? l.agent : null;
  return {
    id: l._id,
    date: toDateStr(l.date),
    itemId: refId(l.item),
    itemName: l.item_name,
    type: l.type as StockMovementType,
    quantity: l.quantity,
    uom: l.uom,
    unitCost: l.unit_cost ?? 0,
    unitPrice: l.unit_price ?? 0,
    referenceId: l.reference_id,
    notes: l.notes,
    agentId: refId(l.agent),
    agentName: agentObj?.full_name,
    batchNumber: l.batch_number,
    expiryDate: l.expiry_date ? toDateStr(l.expiry_date) : undefined,
    supplier: l.supplier,
    supplierId: typeof l.supplier_id === 'string' ? l.supplier_id : refId(l.supplier_id),
    fromLocation: l.from_hub,
    toLocation: l.to_hub,
    reason: l.reason,
    itemSku: itemObj?.sku,
  };
}

export function mapSupplier(s: ApiSupplier, hubMap?: Record<string, string>): Supplier {
  const addedBy = typeof s.added_by === 'object' && s.added_by ? s.added_by : null;
  return {
    id: s._id,
    code: s.code || '',
    name: s.name,
    businessName: s.business_name,
    businessType: s.business_type as Supplier['businessType'],
    hubId: refId(s.hub) || undefined,
    location: s.hub ? resolveHubName(s.hub, hubMap) : undefined,
    address: s.address,
    contactPerson: s.contact_person,
    phone: s.phone,
    email: s.email,
    categories: s.categories as Supplier['categories'],
    paymentTerms: s.payment_terms as Supplier['paymentTerms'],
    leadTimeDays: s.lead_time_days,
    rating: s.rating,
    totalSpend: typeof s.total_spend === 'number' ? s.total_spend : undefined,
    isActive: s.is_active !== false,
    notes: s.notes,
    createdDate: toDateStr(s.createdAt) || new Date().toISOString().split('T')[0],
    addedByAgentId: addedBy?._id || (typeof s.added_by === 'string' ? s.added_by : undefined),
    addedByAgentName: addedBy?.full_name,
  };
}

export function mapSupplierIssue(i: ApiSupplierIssue): SupplierIssue {
  const reported = typeof i.reported_by === 'object' && i.reported_by ? i.reported_by : null;
  return {
    id: i._id,
    supplierId: refId(i.supplier),
    supplierName: i.supplier_name,
    type: i.type as SupplierIssue['type'],
    severity: i.severity as SupplierIssue['severity'],
    description: i.description,
    date: toDateStr(i.date),
    status: i.status as SupplierIssue['status'],
    resolutionNote: i.resolution_note,
    resolvedDate: i.resolved_date ? toDateStr(i.resolved_date) : undefined,
    reportedByAgentId: reported?._id || (typeof i.reported_by === 'string' ? i.reported_by : undefined),
    reportedByAgentName: i.reported_by_name || reported?.full_name,
    relatedItemId: refId(i.related_item) || undefined,
    relatedStockLogId: typeof i.related_stock_log === 'string' ? i.related_stock_log : undefined,
  };
}

export function mapProductSupplierRow(row: ApiProductSupplierRow): ProductSupplierRow {
  return {
    supplierId: row.supplier_id || undefined,
    name: row.name,
    rating: row.rating ?? undefined,
    openIssues: row.open_issues ?? 0,
    orders: row.orders ?? 0,
    qty: row.qty ?? 0,
    spend: row.spend ?? 0,
    lastPrice: row.last_price ?? 0,
    lastDate: toDateStr(row.last_date),
  };
}

export function mapProductSalesPerformance(
  data: ApiProductSalesPerformance | null | undefined,
): ProductSalesPerformance | null {
  if (!data) return null;
  return {
    hasData: Boolean(data.has_data),
    units: data.units ?? 0,
    revenue: data.revenue ?? 0,
    cogs: data.cogs ?? 0,
    profit: data.profit ?? 0,
    margin: data.margin ?? 0,
    orders: data.orders ?? 0,
    trend: data.trend ?? [],
    b2bRev: data.b2b_rev ?? 0,
    b2cRev: data.b2c_rev ?? 0,
    topSegments: data.top_segments ?? [],
    channelMix: data.channel_mix ?? [],
    byCustomer: (data.by_customer ?? []).map((c) => {
      const typeRaw = String(c.type || '').toLowerCase();
      const type =
        typeRaw === 'b2b' ? 'B2B' : typeRaw === 'b2c' ? 'B2C' : c.type || null;
      return {
        id: c.id || null,
        name: c.name,
        type,
        topSegment: c.top_segment ?? null,
        qty: c.qty ?? 0,
        revenue: c.revenue ?? 0,
        last: toDateStr(c.last),
      };
    }),
    unitsPerMonth: data.units_per_month ?? 0,
    daysOfCover: data.days_of_cover ?? null,
  };
}

export function mapAgent(u: ApiAgentUser): Agent {
  const roleLabel =
    typeof u.role === 'object' && u.role ? u.role.label : 'Hub Manager';
  const hubName =
    u.hub?.hub_name || u.hub?.name || null;
  return {
    id: u._id,
    name: u.full_name,
    email: u.email,
    phone: u.phone,
    role: roleLabel as Agent['role'],
    location: hubName || 'All Hubs',
    joinedDate: toDateStr(u.createdAt) || new Date().toISOString().split('T')[0],
  };
}

export function mapFeedback(f: ApiFeedback): Feedback {
  const customer =
    typeof f.customer === 'object' && f.customer !== null ? f.customer : null;
  const typeMap: Record<string, FeedbackType> = {
    complaint: FeedbackType.COMPLAINT,
    suggestion: FeedbackType.SUGGESTION,
    appreciation: FeedbackType.APPRECIATION,
  };
  const sentimentMap: Record<string, Sentiment> = {
    positive: Sentiment.POSITIVE,
    negative: Sentiment.NEGATIVE,
    neutral: Sentiment.NEUTRAL,
  };
  return {
    id: f._id,
    customerId: customerRefId(f.customer),
    customerName: customer?.customer_name || 'Unknown',
    type: typeMap[f.type?.toLowerCase()] || FeedbackType.COMPLAINT,
    content: f.content,
    date: toDateStr(f.createdAt) || new Date().toISOString().split('T')[0],
    status: titleCaseStatus(f.status) as Feedback['status'],
    sentiment: f.sentiment ? sentimentMap[f.sentiment.toLowerCase()] : Sentiment.NEUTRAL,
    priority: (f.priority as FeedbackPriority) || FeedbackPriority.MEDIUM,
    resolutionNote: f.resolution,
    resolvedDate: f.resolution_date ? toDateStr(f.resolution_date) : undefined,
    resolvedByAgentId: resolvedByAgentId(f.resolved_by),
    resolvedByAgentName: resolvedByAgentName(f.resolved_by, f.resolved_by_name),
  };
}

export function mapEnquiry(e: ApiEnquiry): Enquiry {
  return {
    id: e._id,
    customerName: e.customer_name,
    email: e.email || '',
    subject: e.subject || 'General Enquiry',
    message: e.message,
    date: toDateStr(e.date || e.createdAt) || new Date().toISOString().split('T')[0],
    status: titleCaseStatus(e.status) === 'Closed' ? 'Closed' : 'Open',
    category: (e.category as EnquiryCategory) || 'Other',
    resolution: e.resolution,
    managedByAgentId: e.managed_by_agent,
    managedByAgentName: e.managed_by_agent_name,
  };
}

function mapCompensationStatus(status: string): Compensation['status'] {
  const lower = status.toLowerCase();
  if (lower === 'approved') return 'Approved';
  if (lower.includes('paid')) return 'Paid';
  return 'Pending';
}

function mapCompensationCategory(cat?: string): CompensationCategory {
  const map: Record<string, CompensationCategory> = {
    product: CompensationCategory.PRODUCT,
    merch: CompensationCategory.MERCH,
    voucher: CompensationCategory.VOUCHER,
    refund: CompensationCategory.REFUND,
  };
  return map[cat?.toLowerCase() ?? ''] ?? CompensationCategory.PRODUCT;
}

export function mapCompensation(c: ApiCompensation & { value?: number }): Compensation {
  const customer =
    typeof c.customer === 'object' && c.customer !== null ? c.customer : null;
  return {
    id: c._id,
    customerId: customerRefId(c.customer),
    customerName: c.customer_name || customer?.customer_name || 'Unknown',
    reason: c.reason || '',
    amount: c.amount ?? c.value ?? 0,
    date: toDateStr(c.date || c.createdAt) || new Date().toISOString().split('T')[0],
    status: mapCompensationStatus(c.status),
    category: mapCompensationCategory(c.category),
    recordedByAgentId: c.recorded_by_agent,
    recordedByAgentName: c.recorded_by_agent_name,
  };
}

export function mapAuditLog(l: ApiAuditLog, hubMap?: Record<string, string>): AuditLog {
  const hubRef = l.hub;
  let location = 'System';
  if (typeof hubRef === 'object' && hubRef?.hub_name) {
    location = hubRef.hub_name;
  } else if (typeof hubRef === 'string' && hubMap?.[hubRef]) {
    location = hubMap[hubRef];
  }
  return {
    id: l._id,
    timestamp: l.timestamp,
    userId: refId(l.user),
    userName: l.user_name,
    action: l.action,
    entityType: capitalizeWords(l.entity_type) as AuditLog['entityType'],
    entityId: l.entity_id,
    details: l.details,
    location,
    category: l.category,
    bulkUpload: l.bulk_upload
      ? {
          domain: l.bulk_upload.domain,
          importType: l.bulk_upload.import_type,
          fileName: l.bulk_upload.file_name,
          stage: l.bulk_upload.stage,
          summary: l.bulk_upload.summary,
          rows: l.bulk_upload.rows,
          results: l.bulk_upload.results,
          rowCount: l.bulk_upload.row_count,
          resultCount: l.bulk_upload.result_count,
          rowsTruncated: l.bulk_upload.rows_truncated,
          resultsTruncated: l.bulk_upload.results_truncated,
        }
      : undefined,
  };
}

export function mapTask(t: ApiTask): Task {
  const priorityMap: Record<string, TaskPriority> = {
    low: TaskPriority.LOW,
    medium: TaskPriority.MEDIUM,
    high: TaskPriority.HIGH,
  };
  const statusMap: Record<string, TaskStatus> = {
    'to do': TaskStatus.TODO,
    todo: TaskStatus.TODO,
    'in progress': TaskStatus.IN_PROGRESS,
    done: TaskStatus.DONE,
  };
  return {
    id: t._id,
    title: t.title,
    description: t.description || '',
    assignedToId: refId(t.assigned_to),
    assignedToName: t.assigned_to_name || '',
    dueDate: toDateStr(t.due_date),
    priority: priorityMap[t.priority?.toLowerCase()] || TaskPriority.MEDIUM,
    status: statusMap[t.status?.toLowerCase()] || TaskStatus.TODO,
    createdBy: t.created_by || '',
  };
}

export function normalizeDashboardMetrics(
  raw: ApiDashboardMetricsRaw,
  extras: {
    creditSummary?: ApiCreditCustomerSummary[];
    inventory?: InventoryItem[];
    feedbacks?: Feedback[];
    enquiries?: Enquiry[];
    customers?: Customer[];
  } = {},
): DashboardMetricsData {
  const creditRows = extras.creditSummary ?? [];
  const creditSummaries = creditRows.map(mapCreditCustomerSummary);
  const inventory = extras.inventory ?? [];
  const feedbacks = extras.feedbacks ?? [];
  const enquiries = extras.enquiries ?? [];
  const customers = extras.customers ?? [];

  const totalOutstanding = creditSummaries.reduce((s, r) => s + r.totalOutstanding, 0);
  const overdueCreditsCount = creditSummaries.reduce((s, r) => s + r.overdueCount, 0);
  const pendingCreditsCount = creditSummaries.reduce((s, r) => s + r.openCreditCount, 0);
  const overdueAmount = creditSummaries
    .filter((r) => r.overdueCount > 0)
    .reduce((s, r) => s + r.totalOutstanding, 0);

  const lowStockCount = inventory.filter(
    (i) => i.currentStock <= i.minStockLevel && i.currentStock > 0,
  ).length;
  const outOfStockCount = inventory.filter((i) => i.currentStock <= 0).length;

  const openFeedback = feedbacks.filter((f) => f.status === 'Open').length;
  const openEnquiries = enquiries.filter((e) => e.status === 'Open').length;

  const thisMonthStart = new Date();
  thisMonthStart.setDate(1);
  thisMonthStart.setHours(0, 0, 0, 0);
  const newCustomersThisMonth = customers.filter(
    (c) => new Date(c.joinedDate) >= thisMonthStart,
  ).length;

  return {
    totalCustomers: raw.totalCustomers ?? customers.length,
    revenueToday: raw.revenue_today ?? 0,
    salesToday: raw.sales_today ?? 0,
    totalOutstanding,
    overdueCreditsCount: raw.overdue_credits_count ?? overdueCreditsCount,
    overdueAmount,
    pendingCreditsCount: raw.pending_credits_count ?? pendingCreditsCount,
    lowStockCount: raw.low_stock_count ?? lowStockCount,
    outOfStockCount,
    openFeedback,
    openEnquiries,
    openTickets: raw.open_interactions ?? openFeedback + openEnquiries,
    newCustomersThisMonth,
    activeLeads: raw.activeLeads ?? 0,
    pipelineValue: raw.pipelineValue ?? 0,
    openComplaints: raw.openComplaints ?? 0,
    revenueTrend: raw.revenue_trend ?? [],
    customers,
    inventory,
    feedbacks,
    enquiries,
    creditSummaries,
  };
}
