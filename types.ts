import type { AppUser } from './types/api';

export enum CustomerType {
  B2C = 'B2C',
  B2B = 'B2B',
}

export const B2B_CATEGORIES = [
  'Roadside Business & Food Vendors',
  'Hospitality',
  'Schools',
  'Religious Bodies',
  'NGOs & Associations',
  'Retailers',
  'Education Institutions',
  'Event Planners',
  'Restaurants & Bars',
  'Hotels',
  'Catering Services',
  'Supermarkets',
  'Corporate / Offices',
] as const;

export const GENDERS = ['Male', 'Female'] as const;
export const FAMILY_TYPES = ['Monogamy', 'Polygamy', 'Nuclear', 'Extended'] as const;
export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'] as const;
export const AGE_GROUPS = ['18-25', '26-35', '36-45', '46-60', '60+'] as const;
export const LIFESTYLE_TAGS = [
  'Health-Conscious',
  'Fitness-Oriented',
  'Diet-Restricted',
  'Organic Preference',
  'Convenience-Seeker',
  'Budget-Conscious',
] as const;
export const EMPLOYMENT_STATUSES = [
  'Self-Employed',
  'Privately Employed',
  'Civil Servant',
  'Business Owner',
  'Student',
  'Unemployed',
  'Retired',
] as const;
export const RELIGIONS = ['Christian', 'Muslim', 'Traditional', 'Other'] as const;

export enum Location {
  LAGOS = 'Lagos',
  IFE = 'Ife',
  NASARAWA = 'Nasarawa',
}

export type LocationType = 'hub' | 'rsp';
export type OwnershipType = 'RO' | 'RF';

export interface Hub {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  hubManagerId?: string;
  managerName?: string;
  isActive: boolean;
  createdDate: string;
  locationType: LocationType;
  parentHubId?: string | null;
  parentHubName?: string;
  childRspCount?: number;
  code?: string;
  ownershipType?: OwnershipType | null;
}

export enum SalesChannel {
  WALK_IN = 'Walk-In',
  DELIVERY = 'Delivery',
  PRE_ORDER = 'Pre-Order',
}

export enum DeliveryStatus {
  NOT_APPLICABLE = 'N/A',
  PENDING = 'Pending Dispatch',
  IN_TRANSIT = 'In Transit',
  DELIVERED = 'Delivered',
  CONFIRMED = 'Confirmed by Customer',
}


export enum FeedbackType {
  COMPLAINT = 'Complaint',
  SUGGESTION = 'Suggestion',
  APPRECIATION = 'Appreciation',
}

export enum Sentiment {
  POSITIVE = 'Positive',
  NEUTRAL = 'Neutral',
  NEGATIVE = 'Negative',
}

export enum CompensationCategory {
  PRODUCT = 'Product',
  MERCH = 'Merch',
  VOUCHER = 'Voucher',
  REFUND = 'Refund',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export enum TaskStatus {
  TODO = 'To Do',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done',
}


export enum FeedbackPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export enum PaymentTerms {
  COD = 'Cash on Delivery',
  NET_7 = 'Net 7 Days',
  NET_14 = 'Net 14 Days',
  NET_30 = 'Net 30 Days',
}

export enum PaymentType {
  CASH = 'Cash',
  TRANSFER = 'Transfer',
  POS = 'POS',
}

export enum PaymentMode {
  FULL_PAYMENT = 'Full Payment',
  FULL_CREDIT = 'Full Credit',
  PARTIAL_CREDIT = 'Partial Credit',
}

export enum StockMovementType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER = 'TRANSFER',
  RETURN = 'RETURN',
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  entityType: 'Inventory' | 'Sale' | 'Customer' | 'BulkUpload' | 'System';
  entityId?: string;
  details: string;
  location: string;
  category?: string;
  bulkUpload?: {
    domain?: string;
    importType?: string;
    fileName?: string;
    stage?: string;
    summary?: Record<string, unknown>;
    rows?: unknown[];
    results?: unknown[];
    rowCount?: number;
    resultCount?: number;
    rowsTruncated?: boolean;
    resultsTruncated?: boolean;
  };
}

export const PREDEFINED_SEGMENTS = [
  'Retail Household',
  'Regular Repeater',
  'Institutional/Canteen',
  'Wholesale Carton',
  'Restaurant',
  'Hotel',
  'Catering',
  'VIP',
  'Staff',
];

export type ProductCategory =
  | 'Fish'
  | 'Seafood'
  | 'Chicken'
  | 'Turkey'
  | 'Goat'
  | 'Cow'
  | 'Ram'
  | 'Sheep'
  | 'Beef & Exotic'
  | 'Sausage'
  | 'Palm Oil'
  | 'Oil and Spice'
  | 'Grain'
  | 'Flour'
  | 'Tuber'
  | 'Grains & Staples'
  | 'Honey'
  | 'Kitchen'
  | 'Snacks';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  unitOfMeasure: 'Cartons' | 'Units' | 'Kg' | 'Liters';
  minStockLevel: number;
  currentStock: number;
  avgUnitCost: number;
  baseSellingPrice: number;
  cartonPrice?: number;
  cartonWeight?: number;
  lastStockUpdate: string;
  location: string;
  priceVersion?: string;
  supplier?: string;
  supplierId?: string;
  lastPurchasePrice?: number;
  isActive?: boolean;
  priceHistory?: { date: string; cost: number; price: number }[];
  isExpensed?: boolean;
  expenseMode?: 'percent' | 'count';
  expenseValue?: number;
  expenseCountUnit?: 'carton' | 'kg';
  expenseQty?: number;
  expenseValueAmount?: number;
}

export interface StockLog {
  id: string;
  date: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  uom: string;
  unitCost: number;
  unitPrice: number;
  referenceId?: string;
  notes?: string;
  agentId: string;
  agentName?: string;
  batchNumber?: string;
  expiryDate?: string;
  supplier?: string;
  supplierId?: string;
  fromLocation?: string;
  toLocation?: string;
  reason?: string;
  itemSku?: string;
}

export type CreditGrade = 'A' | 'B' | 'C' | 'D' | 'F' | 'N/A';

export interface CreditPayment {
  id: string;
  date: string;
  amount: number;
  method?: 'Cash' | 'Transfer' | 'POS';
  recordedBy: string;
  recordedByName?: string;
  note?: string;
  referenceId?: string;
  balanceAfter: number;
}

export interface CreditRecord {
  id: string;
  customerId: string;
  customerName: string;
  amountOwed: number;
  originalAmount?: number;
  creditLimit?: number;
  dateIssued: string;
  dueDate?: string;
  lastPaymentDate?: string;
  status: 'Clear' | 'Pending' | 'Overdue' | 'Voided';
  repaymentTimelines?: number[];
  paymentTerms?: PaymentTerms;
  payments?: CreditPayment[];
  saleIds?: string[];
  customerType?: string;
  flagged?: boolean;
  flagReason?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  location: string;
  joinedDate: string;
  avatar?: string;
  password?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedToId: string;
  assignedToName: string;
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone: string;
  type: CustomerType;
  location: string;
  companyName?: string;
  joinedDate: string;
  segments?: string[];
  totalOrders: number;
  totalSpent: number;
  addedByAgentId?: string;
  addedByAgentName?: string;
  businessCategory?: string;
  gender?: string;
  familyType?: string;
  maritalStatus?: string;
  ageGroup?: string;
  lifestyle?: string;
  employmentStatus?: string;
  jobType?: string;
  religion?: string;
}

export interface CustomerListSummary {
  total: number;
  b2b: number;
  b2c: number;
  repeat: number;
  totalRevenue: number;
  avgValue: number;
  ytdCustomers: number;
  newThisMonth: number;
  newLastMonth: number;
  newCustomersMomPct: number;
  retentionRate: number;
}

export interface CustomerListResult {
  items: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: CustomerListSummary;
}

export interface SalesListSummary {
  revenue: number;
  profit?: number;
  count: number;
  avgOrder: number;
  creditCount: number;
  creditAmount: number;
  deliveryCount: number;
  revenueChange: number;
  profitChange: number;
}

export interface SalesListResult {
  items: Sale[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: SalesListSummary;
}

export interface AuditLogListSummary {
  total: number;
  bulk: number;
  sales: number;
  inventory: number;
  customers: number;
}

export interface AuditLogListResult {
  items: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: AuditLogListSummary;
}


export interface Sale {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  profitMargin: number;
  profitAmount: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  agentId: string;
  agentName: string;
  hubId?: string;
  hubName?: string;
  status: 'Pending' | 'Approved' | 'Paid' | 'Voided';
  item?: {
    productId?: string;
    productName?: string;
    quantity: number;
    unit?: string;
    saleUnit?: 'Carton' | 'Kg';
    stockQuantity?: number;
    category?: string;
    batchNumber?: string;
  };
  productDetails?: string;
  isCredit?: boolean;
  paymentTerms?: PaymentTerms;
  notes?: string;
  channel?: SalesChannel;
  deliveryStatus?: DeliveryStatus;
  deliveryAddress?: string;
  customerPhone?: string;
  acceptanceConfirmed?: boolean;
  paymentType?: string;
  paymentMode?: string;
  amountPaid?: number;
}

export interface Feedback {
  id: string;
  customerId: string;
  customerName: string;
  type: FeedbackType;
  content: string;
  date: string;
  status: 'Open' | 'Resolved';
  sentiment?: Sentiment;
  priority?: FeedbackPriority;
  resolutionNote?: string;
  resolvedDate?: string;
  resolvedByAgentId?: string;
  resolvedByAgentName?: string;
}

export interface Compensation {
  id: string;
  customerId: string;
  customerName: string;
  reason: string;
  amount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Paid';
  category: CompensationCategory;
  recordedByAgentId?: string;
  recordedByAgentName?: string;
}

export type EnquiryCategory = 'Product Info' | 'Pricing' | 'Support' | 'Delivery' | 'Other';

export interface Enquiry {
  id: string;
  customerName: string;
  email: string;
  subject: string;
  message: string;
  date: string;
  status: 'Open' | 'Closed';
  category?: EnquiryCategory;
  resolution?: string;
  managedByAgentId?: string;
  managedByAgentName?: string;
}

export interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export enum SupplierBusinessType {
  FARM = 'Farm',
  DISTRIBUTOR = 'Distributor',
  WHOLESALER = 'Wholesaler',
  IMPORTER = 'Importer',
  ABATTOIR = 'Abattoir',
  MILL = 'Mill',
  MARKET = 'Market',
  OTHER = 'Other',
}

export enum SupplierIssueType {
  QUALITY = 'Quality',
  LATE_DELIVERY = 'Late Delivery',
  SHORT_DELIVERY = 'Short Delivery',
  WRONG_ITEM = 'Wrong Item',
  PRICING = 'Pricing',
  PACKAGING = 'Packaging',
  OTHER = 'Other',
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  businessName?: string;
  businessType?: SupplierBusinessType;
  location?: string;
  hubId?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  categories?: ProductCategory[];
  paymentTerms?: PaymentTerms;
  leadTimeDays?: number;
  rating?: number;
  totalSpend?: number;
  isActive: boolean;
  notes?: string;
  createdDate: string;
  addedByAgentId?: string;
  addedByAgentName?: string;
}

export interface SupplierIssue {
  id: string;
  supplierId: string;
  supplierName: string;
  type: SupplierIssueType;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  date: string;
  status: 'Open' | 'Resolved';
  resolutionNote?: string;
  resolvedDate?: string;
  reportedByAgentId?: string;
  reportedByAgentName?: string;
  relatedItemId?: string;
  relatedStockLogId?: string;
}

export interface SupplierPurchasesResult {
  items: StockLog[];
  summary: {
    orderCount: number;
    totalSpend: number;
    avgOrder: number;
  };
}

