'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  useUpdateCustomer, useCustomerCredits, useSales, useFeedback, useEnquiries, useCompensations, useHubs,
} from '@/hooks/use-queries';
import {
  Customer, CustomerType,
  CreditGrade,
  B2B_CATEGORIES, GENDERS, FAMILY_TYPES, MARITAL_STATUSES, AGE_GROUPS,
  LIFESTYLE_TAGS, EMPLOYMENT_STATUSES, RELIGIONS,
} from '@/types';
import { toast } from 'sonner';
import { isB2bCustomerType, customerPhoneForApi, customerEmailForApi, optionalStringForApi } from '@/lib/customer-helpers';
import { hubOptionLabel } from '@/lib/api-mappers';
import { deriveSegments, SEGMENT_GROUP_OF } from '@/lib/segmentation';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { SubmitButton } from '@/components/submit-button';
import { MetricValue } from '@/components/ui/metric-value';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  MapPin, Building2, User, Award, Crown, X,
  Phone, Mail, Calendar, Copy, Check,
  Edit3, Save, ShoppingCart, CreditCard, MessageSquare,
  Package, Truck, AlertTriangle,
  Clock, TrendingUp, TrendingDown,
  Heart, Briefcase, Home, Church, Cake, HeartPulse, Tag, Sparkles,
  Repeat, ChevronDown, Activity, Wallet, Flame, Timer, Boxes, Gauge,
} from 'lucide-react';

type DetailTab = 'overview' | 'purchases' | 'credit' | 'interactions';

const SEG_GROUP_COLORS: Record<string, string> = {
  Channel: 'bg-slate-100 text-slate-700 border-slate-200',
  Loyalty: 'bg-purple-50 text-purple-700 border-purple-200',
  Value: 'bg-amber-50 text-amber-700 border-amber-200',
  'Business Type': 'bg-blue-50 text-blue-700 border-blue-200',
  Household: 'bg-teal-50 text-teal-700 border-teal-200',
  'Life Stage': 'bg-pink-50 text-pink-700 border-pink-200',
  Lifestyle: 'bg-green-50 text-green-700 border-green-200',
  Occupation: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Dietary: 'bg-orange-50 text-orange-700 border-orange-200',
};
const segClass = (s: string) => SEG_GROUP_COLORS[SEGMENT_GROUP_OF[s]] || 'bg-muted text-muted-foreground border-border';

function prioritizeSegments(segments: string[], priorityNames: string[]) {
  if (!priorityNames.length) return segments;
  const priority = new Set(priorityNames);
  return [
    ...segments.filter((s) => priority.has(s)),
    ...segments.filter((s) => !priority.has(s)),
  ];
}

const pfCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const pfClsSm = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function ProfileFields({ type, data, onChange, dense = false }: {
  type: CustomerType;
  data: Partial<Customer>;
  onChange: (patch: Partial<Customer>) => void;
  dense?: boolean;
}) {
  const cls = dense ? pfClsSm : pfCls;
  const labelCls = dense ? 'text-xs font-medium text-muted-foreground' : 'text-sm font-medium';
  const opt = (v: string) => <option key={v} value={v}>{v}</option>;

  if (type === CustomerType.B2B) {
    return (
      <div className="space-y-1.5">
        <label className={labelCls}>Business Category</label>
        <select value={data.businessCategory || ''} onChange={(e) => onChange({ businessCategory: e.target.value })} className={cls}>
          <option value="">— Select category —</option>
          {B2B_CATEGORIES.map(opt)}
        </select>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="space-y-1.5"><label className={labelCls}>Gender</label><select value={data.gender || ''} onChange={(e) => onChange({ gender: e.target.value })} className={cls}><option value="">— Select —</option>{GENDERS.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Family Type</label><select value={data.familyType || ''} onChange={(e) => onChange({ familyType: e.target.value })} className={cls}><option value="">— Select —</option>{FAMILY_TYPES.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Marital Status</label><select value={data.maritalStatus || ''} onChange={(e) => onChange({ maritalStatus: e.target.value })} className={cls}><option value="">— Select —</option>{MARITAL_STATUSES.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Age Group</label><select value={data.ageGroup || ''} onChange={(e) => onChange({ ageGroup: e.target.value })} className={cls}><option value="">— Select —</option>{AGE_GROUPS.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Lifestyle &amp; Health</label><select value={data.lifestyle || ''} onChange={(e) => onChange({ lifestyle: e.target.value })} className={cls}><option value="">— Select —</option>{LIFESTYLE_TAGS.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Employment Status</label><select value={data.employmentStatus || ''} onChange={(e) => onChange({ employmentStatus: e.target.value })} className={cls}><option value="">— Select —</option>{EMPLOYMENT_STATUSES.map(opt)}</select></div>
      <div className="space-y-1.5"><label className={labelCls}>Job Type / Occupation</label><input type="text" value={data.jobType || ''} onChange={(e) => onChange({ jobType: e.target.value })} placeholder="e.g. Trader, Teacher" className={cls} /></div>
      <div className="space-y-1.5 sm:col-span-2"><label className={labelCls}>Religion</label><select value={data.religion || ''} onChange={(e) => onChange({ religion: e.target.value })} className={cls}><option value="">— Select —</option>{RELIGIONS.map(opt)}</select></div>
    </div>
  );
}

export function clearOppositeProfileFields(type: CustomerType): Partial<Customer> {
  if (type === CustomerType.B2B) {
    return {
      gender: undefined,
      familyType: undefined,
      maritalStatus: undefined,
      ageGroup: undefined,
      lifestyle: undefined,
      employmentStatus: undefined,
      jobType: undefined,
      religion: undefined,
    };
  }
  return { businessCategory: undefined };
}

export function prioritizeCustomerSegments(segments: string[], priorityNames: string[]) {
  return prioritizeSegments(segments, priorityNames);
}

export function segmentBadgeClass(s: string) {
  return segClass(s);
}

function getStatus(c: Customer) {
  return c.totalOrders > 1 ? 'Repeat' : 'New';
}

function getGrade(c: Customer) {
  if (c.totalOrders <= 1) return null;
  if (c.totalSpent >= 500000) return 'Gold';
  if (c.totalSpent >= 100000) return 'Silver';
  return 'Bronze';
}

function getGradeBadge(grade: string | null) {
  if (!grade) return null;
  if (grade === 'Gold') return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 border border-yellow-200"><Crown size={12} fill="currentColor" /> Gold</span>;
  if (grade === 'Silver') return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200"><Award size={12} /> Silver</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700 border border-orange-200"><Award size={12} /> Bronze</span>;
}

function getScoreBadge(grade: CreditGrade) {
  const colors: Record<string, string> = {
    A: 'bg-green-100 text-green-700 border-green-200',
    B: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    C: 'bg-blue-100 text-blue-700 border-blue-200',
    D: 'bg-orange-100 text-orange-700 border-orange-200',
    F: 'bg-red-100 text-red-700 border-red-200',
    'N/A': 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black border ${colors[grade] || colors['N/A']}`}>SCORE {grade}</span>;
}

export type CustomerDetailPanelProps = Readonly<{
  customer: Customer;
  onClose: () => void;
  onUpdated?: (customer: Customer) => void;
  prioritySegmentNames?: string[];
}>;

export function CustomerDetailPanel({
  customer,
  onClose,
  onUpdated,
  prioritySegmentNames = [],
}: CustomerDetailPanelProps) {
  const { can } = usePermissions();
  const hubScope = useHubScopeFilter();
  const updateCustomer = useUpdateCustomer();
  const { data: hubs = [] } = useHubs();
  const activeHubs = hubs.filter((h) => h.isActive);

  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  useEffect(() => {
    setDetailTab('overview');
    setIsEditing(false);
    setEditForm({});
    setCopiedField(null);
    setExpandedSaleId(null);
  }, [customer.id]);

  const { data: salesList } = useSales(
    { customer_id: customer.id, limit: 200, exclude_voided: true },
  );
  const sales = salesList?.items ?? [];
  const { data: feedback = [] } = useFeedback();
  const { data: enquiries = [] } = useEnquiries();
  const { data: compensations = [] } = useCompensations();
  const { data: customerCredits = [] } = useCustomerCredits(customer.id);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const calculateScore = (): CreditGrade => {
    if (customerCredits.length === 0) return 'N/A';
    if (customerCredits.some((c) => c.status === 'Overdue')) return 'F';
    return 'B';
  };

  const startEditing = () => {
    setEditForm({ ...customer });
    setIsEditing(true);
  };

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleUpdateCustomer = async () => {
    if (!editForm.name?.trim()) { toast.error('Name is required.'); return; }
    if (isB2bCustomerType(editForm.type) && !editForm.companyName?.trim()) {
      toast.error('Company name is required for B2B customers.');
      return;
    }
    const hub = activeHubs.find((h) => h.name === editForm.location);
    const isB2b = isB2bCustomerType(editForm.type);
    updateCustomer.mutate({
      id: customer.id,
      customer_name: editForm.name,
      customer_email: customerEmailForApi(editForm.email) ?? '',
      customer_phone: customerPhoneForApi(editForm.phone),
      customer_type: editForm.type,
      customer_location: hub?.id,
      company_name: editForm.companyName,
      business_category: isB2b ? optionalStringForApi(editForm.businessCategory) : undefined,
      gender: !isB2b ? optionalStringForApi(editForm.gender) : undefined,
      family_type: !isB2b ? optionalStringForApi(editForm.familyType) : undefined,
      marital_status: !isB2b ? optionalStringForApi(editForm.maritalStatus) : undefined,
      age_group: !isB2b ? optionalStringForApi(editForm.ageGroup) : undefined,
      lifestyle: !isB2b ? optionalStringForApi(editForm.lifestyle) : undefined,
      employment_status: !isB2b ? optionalStringForApi(editForm.employmentStatus) : undefined,
      job_type: !isB2b ? optionalStringForApi(editForm.jobType) : undefined,
      religion: !isB2b ? optionalStringForApi(editForm.religion) : undefined,
    }, {
      onSuccess: (updated) => {
        onUpdated?.(updated);
        setIsEditing(false);
        toast.success('Customer updated.');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const customerSales = useMemo(() => {
    return sales
      .filter((s) => s.customerId === customer.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customer.id, sales]);

  const customerCreditTotal = useMemo(() => {
    return customerCredits.reduce((sum, c) => sum + c.amountOwed, 0);
  }, [customerCredits]);

  const customerCreditOverdue = useMemo(() => {
    return customerCredits.some((c) => c.status === 'Overdue');
  }, [customerCredits]);

  const customerFeedback = useMemo(() => {
    return feedback.filter((f) => f.customerId === customer.id || f.customerName === customer.name);
  }, [customer.id, customer.name, feedback]);

  const customerEnquiries = useMemo(() => {
    return enquiries.filter((e) => e.email === customer.email || e.customerName === customer.name);
  }, [customer.email, customer.name, enquiries]);

  const customerCompensations = useMemo(() => {
    return compensations.filter((c) => c.customerId === customer.id || c.customerName === customer.name);
  }, [customer.id, customer.name, compensations]);

  const spendingTrend = useMemo(() => {
    if (customerSales.length === 0) return [];
    const byMonth: Record<string, number> = {};
    customerSales.forEach((s) => {
      const month = s.date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + s.amount;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
        amount,
      }));
  }, [customerSales]);

  const creditSaleStats = useMemo(() => {
    const creditSales = customerSales.filter((s) => s.isCredit);
    const cashSales = customerSales.filter((s) => !s.isCredit);
    return {
      creditCount: creditSales.length,
      creditTotal: creditSales.reduce((a, s) => a + s.amount, 0),
      cashCount: cashSales.length,
      cashTotal: cashSales.reduce((a, s) => a + s.amount, 0),
    };
  }, [customerSales]);

  const DAY = 86_400_000;
  const purchaseAnalytics = useMemo(() => {
    if (customerSales.length === 0) return null;
    const asc = [...customerSales].sort((a, b) => (a.date < b.date ? -1 : 1));
    const n = asc.length;
    const now = Date.now();
    const totalSpent = asc.reduce((a, s) => a + s.amount, 0);
    const totalProfit = asc.reduce((a, s) => a + (s.profitAmount || 0), 0);
    const aov = totalSpent / n;
    const avgMargin = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;
    const lastMs = new Date(asc[n - 1].date).getTime();
    const firstMs = new Date(asc[0].date).getTime();
    const daysSinceLast = Math.max(0, Math.floor((now - lastMs) / DAY));
    const tenureDays = Math.max(1, Math.floor((lastMs - firstMs) / DAY));

    const intervals: number[] = [];
    for (let i = 1; i < n; i++) intervals.push((new Date(asc[i].date).getTime() - new Date(asc[i - 1].date).getTime()) / DAY);
    const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0;
    let regularity = 'Single order';
    if (intervals.length === 1) regularity = 'New';
    else if (intervals.length >= 2) {
      const mean = avgInterval;
      const cv = mean > 0 ? Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length) / mean : 0;
      regularity = cv < 0.45 ? 'Regular' : cv < 0.85 ? 'Semi-regular' : 'Sporadic';
    }
    const ordersPerMonth = n / Math.max(1, tenureDays / 30);

    const recent = asc.filter((s) => now - new Date(s.date).getTime() <= 90 * DAY).reduce((a, s) => a + s.amount, 0);
    const prior = asc.filter((s) => { const d = now - new Date(s.date).getTime(); return d > 90 * DAY && d <= 180 * DAY; }).reduce((a, s) => a + s.amount, 0);
    let trend: 'Growing' | 'Stable' | 'Declining' = 'Stable';
    let trendPct = 0;
    if (prior > 0) { trendPct = Math.round(((recent - prior) / prior) * 100); trend = trendPct > 15 ? 'Growing' : trendPct < -15 ? 'Declining' : 'Stable'; }
    else if (recent > 0) { trend = 'Growing'; trendPct = 100; }

    let activity: 'Active' | 'At Risk' | 'Dormant' = 'Active';
    if (avgInterval > 0) { if (daysSinceLast > avgInterval * 3) activity = 'Dormant'; else if (daysSinceLast > avgInterval * 1.8) activity = 'At Risk'; }
    else if (daysSinceLast > 90) activity = 'Dormant';
    const nextExpected = avgInterval > 0 ? new Date(lastMs + avgInterval * DAY) : null;

    const channelCounts: Record<string, number> = {};
    asc.forEach((s) => { const ch = s.channel || 'Unspecified'; channelCounts[ch] = (channelCounts[ch] || 0) + 1; });
    const preferredChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const creditCount = asc.filter((s) => s.isCredit).length;
    const biggest = asc.reduce((m, s) => (s.amount > m.amount ? s : m), asc[0]);

    let rec = { tone: 'neutral' as 'good' | 'warn' | 'neutral', text: '' };
    const cadenceDays = Math.round(avgInterval);
    const hasCadence = cadenceDays > 0;
    if (activity === 'Dormant') {
      rec = {
        tone: 'warn',
        text: hasCadence
          ? `No order in ${daysSinceLast} days (usually every ~${cadenceDays}). Win-back outreach recommended.`
          : `No order in ${daysSinceLast} days. Win-back outreach recommended.`,
      };
    } else if (activity === 'At Risk') {
      rec = {
        tone: 'warn',
        text: hasCadence
          ? `Overdue for a reorder — ${daysSinceLast} days since last vs ~${cadenceDays}-day cadence. Follow up now.`
          : `No reorder in ${daysSinceLast} days. Follow up now.`,
      };
    }
    else if (trend === 'Growing' && totalSpent >= 200000) rec = { tone: 'good', text: `Spend up ${trendPct}% recently — strong account. Upsell higher-margin lines or offer priority delivery.` };
    else if (regularity === 'Regular') rec = { tone: 'good', text: `Predictable buyer (~every ${Math.round(avgInterval)} days). Good candidate for a standing order or subscription.` };
    else if (trend === 'Declining') rec = { tone: 'warn', text: `Spend down ${Math.abs(trendPct)}% vs prior quarter. Check satisfaction and re-engage.` };
    else rec = { tone: 'neutral', text: `${regularity} buyer, ${activity.toLowerCase()}. Nurture toward a regular cadence.` };

    return { n, totalSpent, totalProfit, aov, avgMargin, daysSinceLast, avgInterval, regularity, ordersPerMonth, trend, trendPct, activity, nextExpected, preferredChannel, creditCount, cashCount: n - creditCount, biggest, firstDate: asc[0].date, lastDate: asc[n - 1].date, rec };
  }, [customerSales]);

  const customerProducts = useMemo(() => {
    const map: Record<string, { itemName: string; uom: string; qty: number; revenue: number; orders: number }> = {};
    customerSales.forEach((s) => {
      const name = s.item?.productName || s.productDetails || 'Sale';
      const qty = s.item?.quantity ?? 1;
      const uom = s.item?.unit || s.item?.saleUnit || '';
      const e = map[name] || { itemName: name, uom, qty: 0, revenue: 0, orders: 0 };
      e.qty += qty;
      e.revenue += s.amount;
      e.orders += 1;
      if (!e.uom && uom) e.uom = uom;
      map[name] = e;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [customerSales]);

  const activeFilterSegmentNames = prioritySegmentNames;

  return (
<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end" onClick={handleClose}>
          <div className="w-full max-w-2xl bg-card border-l shadow-xl h-full overflow-y-auto animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>

            {/* Panel Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary border border-primary/20">
                    {customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{customer.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {customer.companyName && <span className="text-sm text-muted-foreground">{customer.companyName}</span>}
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${customer.type === CustomerType.B2B ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary'}`}>
                        {customer.type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && can('customers.edit') && (
                    <button onClick={startEditing} className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3">
                      <Edit3 size={12} /> Edit
                    </button>
                  )}
                  <button onClick={handleClose} className="text-muted-foreground hover:text-foreground p-1"><X size={20} /></button>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                {getGradeBadge(getGrade(customer))}
                {getScoreBadge(calculateScore())}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatus(customer) === 'Repeat' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                  {getStatus(customer)}
                </span>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 border-b -mb-6 -mx-6 px-6">
                {([
                  { key: 'overview', label: 'Overview', icon: User },
                  { key: 'purchases', label: 'Purchases', icon: ShoppingCart },
                  { key: 'credit', label: 'Credit', icon: CreditCard },
                  { key: 'interactions', label: 'Interactions', icon: MessageSquare },
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      detailTab === tab.key
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }`}
                  >
                    <tab.icon size={13} /> {tab.label}
                    {tab.key === 'purchases' && customerSales.length > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">{customerSales.length}</span>
                    )}
                    {tab.key === 'interactions' && (customerFeedback.length + customerEnquiries.length + customerCompensations.length) > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">{customerFeedback.length + customerEnquiries.length + customerCompensations.length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">

              {/* ===== OVERVIEW TAB ===== */}
              {detailTab === 'overview' && !isEditing && (
                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="space-y-3 text-sm">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Contact Information</h4>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" /> {customer.email || 'N/A'}</div>
                      {customer.email && <button onClick={() => copyToClipboard(customer.email!, 'email')} className="p-1 rounded hover:bg-accent">{copiedField === 'email' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-muted-foreground" />}</button>}
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" /> {customer.phone || 'N/A'}</div>
                      {customer.phone && <button onClick={() => copyToClipboard(customer.phone, 'phone')} className="p-1 rounded hover:bg-accent">{copiedField === 'phone' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-muted-foreground" />}</button>}
                    </div>
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /> {customer.location}</div>
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /> Joined: {customer.joinedDate}</div>
                    {customer.addedByAgentName && (
                      <div className="flex items-center gap-2"><User size={14} className="text-muted-foreground" /> Added by: {customer.addedByAgentName}</div>
                    )}
                  </div>

                  {/* Type-specific profile */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                      {customer.type === CustomerType.B2B ? <Building2 size={12} /> : <User size={12} />}
                      {customer.type === CustomerType.B2B ? 'Business Profile' : 'Consumer Profile'}
                    </h4>
                    {(() => {
                      const rows = customer.type === CustomerType.B2B
                        ? [{ icon: Tag, label: 'Category', value: customer.businessCategory }]
                        : [
                            { icon: User, label: 'Gender', value: customer.gender },
                            { icon: Home, label: 'Family Type', value: customer.familyType },
                            { icon: Heart, label: 'Marital Status', value: customer.maritalStatus },
                            { icon: Cake, label: 'Age Group', value: customer.ageGroup },
                            { icon: HeartPulse, label: 'Lifestyle & Health', value: customer.lifestyle },
                            { icon: Briefcase, label: 'Employment', value: customer.employmentStatus },
                            { icon: Briefcase, label: 'Job Type', value: customer.jobType },
                            { icon: Church, label: 'Religion', value: customer.religion },
                          ];
                      const filled = rows.filter((r) => r.value);
                      if (filled.length === 0) return <p className="text-xs text-muted-foreground/60 border rounded-lg p-3">No profile details captured yet — use Edit to add them.</p>;
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {filled.map((r) => {
                            const Icon = r.icon;
                            return (
                              <div key={r.label} className="flex items-center gap-2 p-2.5 rounded-lg border bg-muted/20">
                                <Icon size={14} className="text-muted-foreground shrink-0" />
                                <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">{r.label}</p><p className="text-sm font-medium truncate">{r.value}</p></div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Orders</p>
                      <MetricValue value={customer.totalOrders} />
                    </div>
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Spent</p>
                      <MetricValue value={`₦${customer.totalSpent.toLocaleString()}`} />
                    </div>
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Order Value</p>
                      <MetricValue value={`₦${customer.totalOrders > 0 ? Math.round(customer.totalSpent / customer.totalOrders).toLocaleString() : '0'}`} />
                    </div>
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Last Purchase</p>
                      <MetricValue value={customerSales.length > 0 ? customerSales[0].date : 'None'} className="text-lg" />
                    </div>
                  </div>

                  {/* Auto Segments — API/list payload (not client re-derive) */}
                  {(() => {
                    const segs = prioritizeSegments(
                      customer.segments ?? [],
                      activeFilterSegmentNames,
                    );
                    return (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Sparkles size={12} className="text-primary" /> Auto Segments <span className="font-normal normal-case text-muted-foreground/70">· from customer record</span></h4>
                        {segs.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {segs.map((seg) => (
                              <span key={seg} className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${segClass(seg)}`}>{seg}</span>
                            ))}
                          </div>
                        ) : <p className="text-xs text-muted-foreground/60">No segments yet — add profile details to generate them.</p>}
                      </div>
                    );
                  })()}

                  {/* Quick Spending Trend */}
                  {spendingTrend.length > 1 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Spending Trend</h4>
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spendingTrend}>
                            <defs>
                              <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                            <RechartsTooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Spent']} />
                            <Area type="monotone" dataKey="amount" stroke="var(--primary)" fill="url(#spendGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== EDIT MODE (overlays overview tab) ===== */}
              {detailTab === 'overview' && isEditing && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Edit Customer</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                      <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Email</label>
                      <input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Optional" className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Phone</label>
                      <input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Type</label>
                      <select value={editForm.type || CustomerType.B2C} onChange={(e) => { const type = e.target.value as CustomerType; setEditForm({ ...editForm, type, companyName: type === CustomerType.B2C ? '' : editForm.companyName, ...clearOppositeProfileFields(type) }); }} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                        <option value={CustomerType.B2C}>B2C</option><option value={CustomerType.B2B}>B2B</option>
                      </select>
                    </div>
                    {isB2bCustomerType(editForm.type) && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Company *</label>
                        <input type="text" value={editForm.companyName || ''} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Location</label>
                      <select value={editForm.location || hubScope.hubName || activeHubs[0]?.name} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                        {activeHubs.map((h) => (
                          <option key={h.id} value={h.name}>{hubOptionLabel(h)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 border-t pt-3">
                    <label className="text-xs font-semibold flex items-center gap-1.5">
                      {editForm.type === CustomerType.B2B ? <Building2 size={13} className="text-blue-600" /> : <User size={13} className="text-purple-600" />}
                      {editForm.type === CustomerType.B2B ? 'Business Profile' : 'Consumer Profile'}
                    </label>
                    <ProfileFields type={(editForm.type as CustomerType) || CustomerType.B2C} data={editForm} onChange={(patch) => setEditForm({ ...editForm, ...patch })} dense />
                  </div>
                  <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3">
                    <label className="text-xs font-medium flex items-center gap-1.5"><Sparkles size={12} className="text-primary" /> Auto Segments <span className="font-normal text-muted-foreground">— update as you edit the profile</span></label>
                    {(() => {
                      const preview = deriveSegments({ ...customer, ...editForm } as Customer);
                      return preview.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {preview.map((seg) => <span key={seg} className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${segClass(seg)}`}>{seg}</span>)}
                        </div>
                      ) : <p className="text-xs text-muted-foreground">Fill in the profile to generate segments.</p>;
                    })()}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsEditing(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
                    {can('customers.edit') && (
                      <SubmitButton onClick={handleUpdateCustomer} loading={updateCustomer.isPending} className="gap-1.5"><Save size={14} /> Save Changes</SubmitButton>
                    )}
                  </div>
                </div>
              )}

              {/* ===== PURCHASES TAB ===== */}
              {detailTab === 'purchases' && (
                customerSales.length === 0 || !purchaseAnalytics ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No purchases recorded yet.</p>
                  </div>
                ) : (() => {
                  const pa = purchaseAnalytics;
                  const actClr = pa.activity === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : pa.activity === 'At Risk' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200';
                  const recClr = pa.rec.tone === 'good' ? 'border-green-200 bg-green-50/60 text-green-800' : pa.rec.tone === 'warn' ? 'border-orange-200 bg-orange-50/60 text-orange-800' : 'border-border bg-muted/30 text-foreground';
                  const chIcon = (ch?: string) => ch === 'Delivery' ? <Truck size={11} /> : ch === 'Pre-Order' ? <Clock size={11} /> : <Package size={11} />;
                  return (
                  <div className="space-y-5">
                    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${recClr}`}>
                      <Sparkles size={16} className="mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">Recommended Action</p>
                        <p className="text-sm font-medium leading-snug">{pa.rec.text}</p>
                        {(pa.activity === 'At Risk' || pa.activity === 'Dormant') && (
                          <a
                            href={`/engagement?activity=${encodeURIComponent(pa.activity)}`}
                            className="mt-1.5 inline-flex text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
                          >
                            View on Engagement list
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Wallet size={11} /> Lifetime Value</p><p className="text-lg font-black">&#8358;{Math.round(pa.totalSpent).toLocaleString()}</p></div>
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><TrendingUp size={11} /> Profit</p><p className="text-lg font-black text-green-700">&#8358;{Math.round(pa.totalProfit).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{pa.avgMargin.toFixed(0)}% margin</p></div>
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><ShoppingCart size={11} /> Avg Order</p><p className="text-lg font-black">&#8358;{Math.round(pa.aov).toLocaleString()}</p><p className="text-[10px] text-muted-foreground">{pa.n} order{pa.n !== 1 ? 's' : ''}</p></div>
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Repeat size={11} /> Frequency</p><p className="text-lg font-black">{pa.avgInterval > 0 ? `~${Math.round(pa.avgInterval)}d` : '—'}</p><p className="text-[10px] text-muted-foreground">{pa.ordersPerMonth.toFixed(1)}/mo</p></div>
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Timer size={11} /> Recency</p><p className="text-lg font-black">{pa.daysSinceLast}d ago</p><span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold border ${actClr}`}>{pa.activity}</span></div>
                      <div className="p-3 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">{pa.trend === 'Declining' ? <TrendingDown size={11} /> : <TrendingUp size={11} />} Trend (90d)</p><p className={`text-lg font-black ${pa.trend === 'Growing' ? 'text-green-700' : pa.trend === 'Declining' ? 'text-red-600' : ''}`}>{pa.trend}</p><p className="text-[10px] text-muted-foreground">{pa.trendPct > 0 ? '+' : ''}{pa.trendPct}% vs prior</p></div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Activity size={12} /> Purchase Pattern</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center justify-between p-2.5 rounded-lg border"><span className="text-muted-foreground flex items-center gap-1.5"><Gauge size={13} /> Cadence</span><span className="font-semibold">{pa.regularity}</span></div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border"><span className="text-muted-foreground flex items-center gap-1.5">{chIcon(pa.preferredChannel)} Top Channel</span><span className="font-semibold">{pa.preferredChannel}</span></div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border"><span className="text-muted-foreground flex items-center gap-1.5"><CreditCard size={13} /> Cash / Credit</span><span className="font-semibold">{pa.cashCount} / {pa.creditCount}</span></div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border"><span className="text-muted-foreground flex items-center gap-1.5"><Calendar size={13} /> Next expected</span><span className="font-semibold">{pa.nextExpected ? pa.nextExpected.toISOString().slice(0, 10) : '—'}</span></div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg border col-span-2"><span className="text-muted-foreground flex items-center gap-1.5"><Flame size={13} /> Biggest order</span><span className="font-semibold">&#8358;{pa.biggest.amount.toLocaleString()} · {pa.biggest.date}</span></div>
                      </div>
                    </div>

                    {spendingTrend.length > 1 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Monthly Spending</h4>
                        <div className="h-36 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={spendingTrend}>
                              <defs><linearGradient id="spendGradPurchase" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} /><stop offset="95%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                              <RechartsTooltip formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Spent']} />
                              <Area type="monotone" dataKey="amount" stroke="var(--primary)" fill="url(#spendGradPurchase)" strokeWidth={2} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {customerProducts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Boxes size={12} /> Most Bought Products</h4>
                        <div className="space-y-1.5">
                          {customerProducts.slice(0, 5).map((p) => (
                            <div key={p.itemName} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                              <span className="font-medium">{p.itemName}</span>
                              <span className="text-muted-foreground text-xs">{p.qty}{p.uom ? ` ${p.uom}` : ''} · <span className="font-semibold text-foreground">&#8358;{Math.round(p.revenue).toLocaleString()}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase text-muted-foreground">All Purchases ({customerSales.length})</h4>
                        <span className="text-[10px] text-muted-foreground">Click a row to drill down</span>
                      </div>
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <th className="text-left font-semibold px-3 py-2">Date</th>
                              <th className="text-left font-semibold px-3 py-2">Order</th>
                              <th className="text-right font-semibold px-3 py-2">Amount</th>
                              <th className="text-center font-semibold px-3 py-2">Status</th>
                              <th className="w-8 px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerSales.map((sale) => {
                              const isOpen = expandedSaleId === sale.id;
                              return (
                                <Fragment key={sale.id}>
                                  <tr onClick={() => setExpandedSaleId(isOpen ? null : sale.id)} className={`border-b cursor-pointer transition-colors ${isOpen ? 'bg-muted/40' : 'hover:bg-muted/30'}`}>
                                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{sale.date}</td>
                                    <td className="px-3 py-2.5"><div className="flex items-center gap-1.5 max-w-[220px]"><span className="text-muted-foreground shrink-0">{chIcon(sale.channel)}</span><span className="truncate">{sale.productDetails || sale.item?.productName || 'Sale'}</span>{sale.isCredit && <CreditCard size={11} className="text-orange-500 shrink-0" />}</div></td>
                                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">&#8358;{sale.amount.toLocaleString()}</td>
                                    <td className="px-3 py-2.5 text-center"><span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${sale.status === 'Paid' ? 'bg-green-100 text-green-700' : sale.status === 'Approved' ? 'bg-blue-100 text-blue-700' : sale.status === 'Voided' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{sale.status}</span></td>
                                    <td className="px-2 py-2.5 text-muted-foreground"><ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="border-b bg-muted/10">
                                      <td colSpan={5} className="px-4 py-4">
                                        {sale.productDetails && <p className="text-sm font-medium mb-3">{sale.productDetails}</p>}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Channel</p><p className="text-sm font-medium">{sale.channel || '—'}</p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Profit</p><p className="text-sm font-medium text-green-700">&#8358;{(sale.profitAmount || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">{sale.profitMargin || 0}%</span></p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Payment</p><p className="text-sm font-medium">{sale.isCredit ? `Credit${sale.paymentTerms ? ` · ${sale.paymentTerms}` : ''}` : (sale.paymentType || 'Cash')}</p></div>
                                          {sale.amountPaid != null && <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Amount Paid</p><p className="text-sm font-medium">&#8358;{sale.amountPaid.toLocaleString()}</p></div>}
                                          {sale.deliveryStatus && sale.deliveryStatus !== 'N/A' && <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Delivery</p><p className="text-sm font-medium">{sale.deliveryStatus}</p></div>}
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground">Agent</p><p className="text-sm font-medium">{sale.agentName}</p></div>
                                        </div>
                                        {sale.item && (
                                          <div className="mt-3 pt-3 border-t">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5">Line Item</p>
                                            <div className="flex items-center justify-between text-xs">
                                              <span>{sale.item.productName || 'Item'}</span>
                                              <span className="text-muted-foreground">{sale.item.quantity}{sale.item.unit ? ` ${sale.item.unit}` : ''}</span>
                                            </div>
                                          </div>
                                        )}
                                        {sale.deliveryAddress && <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5"><MapPin size={11} /> {sale.deliveryAddress}</p>}
                                        {sale.notes && <p className="mt-3 pt-3 border-t text-xs text-muted-foreground italic">{sale.notes}</p>}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/20 border-t-2 border-dashed">
                              <td colSpan={2} className="px-3 py-2.5 text-sm font-medium text-muted-foreground">Total · {customerSales.length} order{customerSales.length !== 1 ? 's' : ''}</td>
                              <td className="px-3 py-2.5 text-right text-base font-black whitespace-nowrap">&#8358;{customerSales.reduce((a, s) => a + s.amount, 0).toLocaleString()}</td>
                              <td colSpan={2}></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                  );
                })()
              )}

              {/* ===== CREDIT & PAYMENTS TAB ===== */}
              {detailTab === 'credit' && (
                <div className="space-y-5">
                  {customerCredits.length > 0 ? (
                    <>
                      <div className={`p-4 rounded-xl border-2 ${
                        customerCreditOverdue ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase text-muted-foreground">Total Outstanding</p>
                            <p className="text-3xl font-black">&#8358;{customerCreditTotal.toLocaleString()}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
                            customerCreditOverdue ? 'bg-red-200 text-red-800' : 'bg-orange-200 text-orange-800'
                          }`}>
                            {customerCreditOverdue && <AlertTriangle size={14} />}
                            {customerCredits.length} open item{customerCredits.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {customerCredits.map((cr) => (
                          <div key={cr.id} className="p-3 rounded-lg border bg-muted/10 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{cr.sale?.productDetails || `Sale ${cr.sale?.date || cr.dateIssued}`}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cr.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{cr.status}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>Due: {cr.dueDate}</span>
                              <span className="font-bold text-foreground">&#8358;{cr.amountOwed.toLocaleString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 rounded-xl border bg-muted/20">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Credit Score</p>
                        {customer && getScoreBadge(calculateScore())}
                      </div>

                      {/* Credit vs Cash breakdown */}
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Payment Method Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-sm">Cash Sales</span></div>
                            <div className="text-right"><span className="text-sm font-bold">&#8358;{creditSaleStats.cashTotal.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-2">({creditSaleStats.cashCount})</span></div>
                          </div>
                          <div className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-sm">Credit Sales</span></div>
                            <div className="text-right"><span className="text-sm font-bold">&#8358;{creditSaleStats.creditTotal.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-2">({creditSaleStats.creditCount})</span></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-8 text-center text-muted-foreground border rounded-lg">
                        <CreditCard size={32} className="mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">No credit records</p>
                        <p className="text-xs mt-1">This customer has no outstanding credit.</p>
                      </div>

                      {/* Still show payment breakdown */}
                      {customerSales.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Payment Method Breakdown</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-sm">Cash Sales</span></div>
                              <div className="text-right"><span className="text-sm font-bold">&#8358;{creditSaleStats.cashTotal.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-2">({creditSaleStats.cashCount})</span></div>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-sm">Credit Sales</span></div>
                              <div className="text-right"><span className="text-sm font-bold">&#8358;{creditSaleStats.creditTotal.toLocaleString()}</span><span className="text-xs text-muted-foreground ml-2">({creditSaleStats.creditCount})</span></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Credit score badge */}
                      <div className="p-4 rounded-xl border bg-muted/20">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Credit Score</p>
                        {getScoreBadge(calculateScore())}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== INTERACTIONS TAB ===== */}
              {detailTab === 'interactions' && (
                <div className="space-y-5">
                  {/* Feedback */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground">Feedback ({customerFeedback.length})</h4>
                    </div>
                    {customerFeedback.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 border rounded-lg">No feedback recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerFeedback.map((f) => (
                          <div key={f.id} className="p-3 rounded-lg border text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  f.type === 'Complaint' ? 'bg-red-100 text-red-700' :
                                  f.type === 'Appreciation' ? 'bg-green-100 text-green-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>{f.type}</span>
                                {f.priority && <span className="text-[10px] text-muted-foreground">{f.priority}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">{f.date}</span>
                                <span className={`text-[10px] font-bold ${f.status === 'Open' ? 'text-blue-600' : 'text-gray-500'}`}>{f.status}</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground text-xs mt-1.5">{f.content}</p>
                            {f.resolutionNote && (
                              <div className="mt-2 p-2 rounded bg-green-50 border border-green-100">
                                <p className="text-[10px] font-bold text-green-700 uppercase">Resolution</p>
                                <p className="text-xs text-green-800">{f.resolutionNote}</p>
                                {f.resolvedByAgentName && <p className="text-[10px] text-green-600 mt-1">By {f.resolvedByAgentName} on {f.resolvedDate}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Enquiries */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Enquiries ({customerEnquiries.length})</h4>
                    {customerEnquiries.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 border rounded-lg">No enquiries recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerEnquiries.map((e) => (
                          <div key={e.id} className="p-3 rounded-lg border text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{e.subject}</span>
                                {e.category && <span className="inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{e.category}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground">{e.date}</span>
                                <span className={`text-[10px] font-bold ${e.status === 'Open' ? 'text-blue-600' : 'text-gray-500'}`}>{e.status}</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground text-xs mt-1.5">{e.message}</p>
                            {e.resolution && (
                              <div className="mt-2 p-2 rounded bg-green-50 border border-green-100">
                                <p className="text-[10px] font-bold text-green-700 uppercase">Resolution</p>
                                <p className="text-xs text-green-800">{e.resolution}</p>
                                {e.managedByAgentName && <p className="text-[10px] text-green-600 mt-1">By {e.managedByAgentName}</p>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Compensations */}
                  <div>
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Compensations ({customerCompensations.length})</h4>
                    {customerCompensations.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 border rounded-lg">No compensations recorded.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerCompensations.map((c) => (
                          <div key={c.id} className="p-3 rounded-lg border text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  c.category === 'Refund' ? 'bg-red-100 text-red-700' :
                                  c.category === 'Voucher' ? 'bg-purple-100 text-purple-700' :
                                  c.category === 'Product' ? 'bg-blue-100 text-blue-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>{c.category}</span>
                                <span className="text-sm font-medium">{c.reason}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold">&#8358;{c.amount.toLocaleString()}</span>
                                <span className={`text-[10px] font-bold ${
                                  c.status === 'Paid' ? 'text-green-600' : c.status === 'Approved' ? 'text-blue-600' : 'text-yellow-600'
                                }`}>{c.status}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{c.date}</span>
                              {c.recordedByAgentName && <span>by {c.recordedByAgentName}</span>}
                            </div>
                          </div>
                        ))}
                        <div className="p-3 rounded-lg border-2 border-dashed bg-muted/10 flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Total compensations</span>
                          <span className="text-lg font-black">&#8358;{customerCompensations.reduce((a, c) => a + c.amount, 0).toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Summary if everything is empty */}
                  {customerFeedback.length === 0 && customerEnquiries.length === 0 && customerCompensations.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No interactions recorded for this customer yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
  );
}
