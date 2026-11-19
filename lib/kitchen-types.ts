// API shapes for /kitchen (fud-farmer-crm-be src/kitchen). Field names match the API (snake_case).
import type { CostingResult, KitchenMode, PricingMethod, RunningCosts } from '@/lib/kitchen-costing';

export type KitchenStage =
  | 'draft' | 'quoted' | 'new' | 'accepted' | 'cooking' | 'ready'
  | 'completed' | 'declined' | 'expired' | 'cancelled';

export const STAGE_LABELS: Record<KitchenStage, string> = {
  draft: 'Draft',
  quoted: 'Quoted',
  new: 'New',
  accepted: 'Accepted',
  cooking: 'In the kitchen',
  ready: 'Ready',
  completed: 'Completed',
  declined: 'Declined',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

export const BOARD_STAGES: KitchenStage[] = ['new', 'accepted', 'cooking', 'ready'];
export const QUOTE_STAGES: KitchenStage[] = ['draft', 'quoted'];
export const FINAL_STAGES: KitchenStage[] = ['completed', 'declined', 'expired', 'cancelled'];
export const ADVANCE_LABELS: Partial<Record<KitchenStage, string>> = {
  new: 'Accept job',
  accepted: 'Start cooking',
  cooking: 'Mark ready',
  ready: 'Complete',
};
export const isEditableStage = (s: KitchenStage) => ['draft', 'quoted', 'new', 'accepted'].includes(s);

export const KITCHEN_CHANNELS = ['Walk-in', 'Phone', 'WhatsApp', 'Instagram', 'Website', 'Corporate'] as const;
export type KitchenChannel = (typeof KITCHEN_CHANNELS)[number];
export const KITCHEN_PAYMENT_METHODS = ['Cash', 'Transfer', 'POS'] as const;
export type KitchenPaymentMethod = (typeof KITCHEN_PAYMENT_METHODS)[number];

export const MODE_LABELS: Record<KitchenMode, { label: string; unit: string; per: string }> = {
  packs: { label: 'Food packs', unit: 'Packs', per: 'per pack' },
  buffet: { label: 'Buffet', unit: 'Guests', per: 'per guest' },
  trays: { label: 'Trays & bowls', unit: 'Trays', per: 'per tray' },
  chef: { label: 'Private chef', unit: 'Guests', per: 'per guest' },
};

export interface KitchenMenuLine { recipe: string; per_unit: number }
export interface KitchenOverheadLine { name: string; qty: number; unit_cost?: number; per: 'unit' | 'job' }
export interface KitchenLabourLine { role: string; people: number; days: number; rate?: number }
export interface KitchenBillLine { desc: string; qty: number; unit_price: number; recipe?: string | null }
export interface KitchenPayment { _id: string; amount: number; method: KitchenPaymentMethod; at: string; by: string; by_name: string; note?: string }

/** Full costing snapshot (users with view_kitchen_costs), or the price-only subset otherwise. */
export type KitchenCostingSnapshot = Partial<CostingResult> & {
  price?: number;
  price_per_unit?: number;
  pricing_method?: CostingResult['pricing_method'];
  computed_at?: string;
  running_costs_source?: 'hub' | 'company';
};

export interface KitchenJob {
  _id: string;
  code: string;
  hub: string | { _id: string; hub_name: string };
  stage: KitchenStage;
  title: string;
  mode: KitchenMode;
  count: number;
  customer: string | { _id: string; customer_name: string; customer_phone: string; total_orders?: number; total_spent?: number } | null;
  customer_name: string;
  phone: string;
  channel: KitchenChannel;
  fulfilment: 'pickup' | 'delivery';
  address: string;
  due_at: string | null;
  notes: string;
  menu: KitchenMenuLine[];
  overheads: KitchenOverheadLine[];
  labour: KitchenLabourLine[];
  include_running_costs: boolean;
  ops_days: number;
  pricing_method: PricingMethod;
  markup_override: number | null;
  test_price: number | null;
  custom_bill: boolean;
  bill_lines: KitchenBillLine[];
  total: number;
  payments: KitchenPayment[];
  paid: number;
  costing: KitchenCostingSnapshot | null;
  costs_hidden?: boolean;
  quoted_at: string | null;
  confirmed_at: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  expires_at: string | null;
  created_by: string;
  created_by_name: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type KitchenStageCounts = Partial<Record<KitchenStage, number>> & { completed_today?: number };

export interface KitchenJobList {
  data: KitchenJob[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  counts: KitchenStageCounts;
  /** Totals over every job matching the filters (profit only with view_kitchen_costs). */
  summary: { count: number; value: number; average: number; collected: number; owed: number; profit?: number; costed_jobs?: number };
}

export interface KitchenJobEvent {
  _id: string;
  job: string;
  at: string;
  by: string | null;
  by_name: string;
  type: string;
  text: string;
  data: Record<string, unknown> | null;
}

/** Fields the job form sends (create, update, preview). */
export interface KitchenJobInput {
  hub_id?: string;
  confirm?: boolean;
  title?: string;
  mode?: KitchenMode;
  count?: number;
  customer_id?: string | null;
  customer_name?: string;
  phone?: string;
  channel?: KitchenChannel;
  fulfilment?: 'pickup' | 'delivery';
  address?: string;
  due_at?: string | null;
  notes?: string;
  menu?: KitchenMenuLine[];
  overheads?: KitchenOverheadLine[];
  labour?: KitchenLabourLine[];
  include_running_costs?: boolean;
  ops_days?: number;
  pricing_method?: PricingMethod;
  markup_override?: number | null;
  test_price?: number | null;
  custom_bill?: boolean;
  bill_lines?: KitchenBillLine[];
}

export interface KitchenIngredient {
  _id: string;
  name: string;
  category: string;
  pack_label: string;
  pack_qty: number;
  unit: 'kg' | 'L' | 'pc' | 'pack' | 'g' | 'ml';
  pack_price: number;
  price_date: string | null;
  source: string;
  from_fudfarmer_stock: boolean;
  retail_per_unit: number | null;
  price_history: { pack_price: number; at: string; source: string }[];
  unit_cost: number | null;
  archived: boolean;
}

export interface KitchenRecipe {
  _id: string;
  name: string;
  category: string;
  yield_qty: number;
  yield_unit: string;
  lines: { ingredient: string | { _id: string; name: string; unit: string; pack_qty: number; pack_price: number }; qty: number }[];
  notes: string;
  archived: boolean;
  batch_cost?: number;
  cost_per_portion?: number | null;
  price_at_food_cost?: number | null;
  price_at_100_markup?: number | null;
  unpriced_ingredients?: string[];
  open_jobs?: number;
}

export interface KitchenDefaults {
  markup_packs: number;
  markup_buffet: number;
  markup_trays: number;
  food_cost_pct: number;
  round_to: number;
  buffer_pct: number;
  service_charge_pct: number;
  protein_basis: 'cost' | 'retail';
  min_profit_job: number;
  ack_minutes: number;
  due_soon_minutes: number;
  quote_expiry_days: number;
  escalate_after_reminders: number;
}

export type KitchenAlertType = 'job_confirmed' | 'not_accepted' | 'due_soon' | 'overdue' | 'quote_confirmed' | 'completed_with_balance';
export interface KitchenAlertRecipient {
  kind: 'kitchen_staff' | 'kitchen_managers' | 'outlet_admins' | 'outlet_role' | 'company_role' | 'user' | 'creator' | 'quote_author';
  role?: string;
  user?: string;
}
export interface KitchenAlertRule { type: KitchenAlertType; enabled: boolean; recipients: KitchenAlertRecipient[]; exclude_actor: boolean }

export interface KitchenSettingsView {
  defaults: KitchenDefaults;
  alert_rules: KitchenAlertRule[];
  running_costs: RunningCosts | null;
  running_costs_source: 'hub' | 'company';
  hubs_with_override: string[];
  can_edit: boolean;
}

export interface KitchenCustomerOption {
  _id: string;
  customer_name: string;
  customer_phone: string;
  company_name?: string;
  customer_type?: string;
}

export interface KitchenPreview {
  costing: KitchenCostingSnapshot;
  bill_lines: KitchenBillLine[];
  total: number;
}

export interface CrmNotification {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  critical: boolean;
  readAt: string | null;
  createdAt: string;
  source?: { kind: string; id: string; code?: string };
}

// ---- helpers ------------------------------------------------------------------

export const hubIdOf = (hub: KitchenJob['hub']) => (typeof hub === 'string' ? hub : hub?._id);
export const hubNameOf = (hub: KitchenJob['hub']) => (typeof hub === 'string' ? '' : hub?.hub_name ?? '');

export function paymentState(job: Pick<KitchenJob, 'total' | 'paid'>): { label: string; className: string } {
  const balance = job.total - job.paid;
  if (!(job.total > 0)) return { label: 'No total', className: 'bg-muted text-muted-foreground' };
  if (balance <= 0.009) return { label: 'Paid', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
  if (job.paid > 0) return { label: 'Part paid', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
  return { label: 'Unpaid', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' };
}

export const STAGE_BADGE: Record<KitchenStage, string> = {
  draft: 'bg-muted text-muted-foreground',
  quoted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  new: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  accepted: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  cooking: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  declined: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const naira0 = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
const naira2 = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** ₦1,234 (whole naira) or ₦12.50 below ₦100. */
export function naira(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—';
  return Math.abs(v) < 100 && v % 1 !== 0 ? naira2.format(v) : naira0.format(v);
}
export const pct = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '—' : `${(v * 100).toFixed(1)}%`);

const LAGOS = 'Africa/Lagos';
export function formatDue(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'No due time';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No due time';
  const day = (x: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: LAGOS }).format(x);
  const time = d.toLocaleTimeString('en-NG', { timeZone: LAGOS, hour: 'numeric', minute: '2-digit', hour12: true });
  const today = day(new Date(now));
  const tomorrow = day(new Date(now + 864e5));
  if (day(d) === today) return `Today ${time}`;
  if (day(d) === tomorrow) return `Tomorrow ${time}`;
  return `${d.toLocaleDateString('en-NG', { timeZone: LAGOS, weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`;
}

export function formatDuration(ms: number): string {
  const m = Math.round(Math.abs(ms) / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 48) return `${h}h${r ? ` ${r}m` : ''}`;
  return `${Math.round(h / 24)} days`;
}

/** "Overdue 25 min" / "Due in 1h 10m" / null when not urgent. */
export function dueState(job: Pick<KitchenJob, 'due_at' | 'stage'>, dueSoonMinutes: number, now = Date.now()): { label: string; tone: 'overdue' | 'soon' | 'normal' } | null {
  if (!job.due_at || FINAL_STAGES.includes(job.stage)) return null;
  const ms = Date.parse(job.due_at) - now;
  if (!Number.isFinite(ms)) return null;
  if (ms < 0 && job.stage !== 'ready') return { label: `Overdue ${formatDuration(ms)}`, tone: 'overdue' };
  if (ms >= 0 && ms < dueSoonMinutes * 60_000 && job.stage !== 'ready') return { label: `Due in ${formatDuration(ms)}`, tone: 'soon' };
  return { label: formatDue(job.due_at, now), tone: 'normal' };
}

export function waitingMinutes(job: Pick<KitchenJob, 'stage' | 'confirmed_at'>, now = Date.now()): number {
  if (job.stage !== 'new' || !job.confirmed_at) return 0;
  return (now - Date.parse(job.confirmed_at)) / 60_000;
}

/** Thousand separators while typing in money inputs. */
export function parseMoney(text: string): number {
  const n = parseFloat(String(text).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
export function formatMoneyInput(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v === 0) return '';
  return v.toLocaleString('en-NG', { maximumFractionDigits: 2 });
}
