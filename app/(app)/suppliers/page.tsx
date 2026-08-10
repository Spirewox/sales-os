'use client';

import { useState, useMemo, useEffect, useRef, Fragment } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useSuppliers, useCreateSupplier, useUpdateSupplier, useSupplierPurchases,
  useSupplierIssues, useCreateSupplierIssue, useUpdateSupplierIssue,
  useStockLogs, useInventory, useHubs, useAgents,
} from '@/hooks/use-queries';
import {
  Supplier, SupplierIssue, SupplierBusinessType, SupplierIssueType,
  ProductCategory, PaymentTerms, StockMovementType,
} from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/product-categories';
import { toast } from 'sonner';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  Plus, Search, MapPin, Truck, Building2, User, X, Filter, Phone, Mail,
  Calendar, Copy, Check, Edit3, Save, Package, ChevronRight, AlertTriangle,
  Star, ShoppingCart, ClipboardList, Boxes, TrendingDown, TrendingUp,
  CircleDollarSign, Clock, ShieldCheck, Ban, CheckCircle2, Tag,
  ChevronDown, Package2, CalendarClock, Percent, FileText,
  BarChart3, Activity, Flame, Repeat, Wallet, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';

const BUSINESS_TYPES = Object.values(SupplierBusinessType);
const PAYMENT_TERMS = Object.values(PaymentTerms);
const ISSUE_TYPES = Object.values(SupplierIssueType);
const SEVERITIES: SupplierIssue['severity'][] = ['Low', 'Medium', 'High'];

const fmt = (n: number) => '₦' + Math.round(n).toLocaleString();

type DetailTab = 'overview' | 'orders' | 'products' | 'performance' | 'issues';

function StarRating({ value, size = 12 }: { value?: number; size?: number }) {
  const v = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= v ? 'text-yellow-500' : 'text-muted-foreground/30'} fill={i <= v ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

function StarRatingInput({
  value,
  onChange,
  size = 20,
}: {
  value?: number;
  onChange: (rating: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const selected = value ?? 0;
  const display = hovered || selected;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= display;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(0)}
            className="rounded p-0.5 transition-colors hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              size={size}
              className={active ? 'text-yellow-500' : 'text-muted-foreground/30'}
              fill={active ? 'currentColor' : 'none'}
            />
          </button>
        );
      })}
    </div>
  );
}

const severityBadge = (s: SupplierIssue['severity']) => {
  const c = s === 'High' ? 'bg-red-100 text-red-700 border-red-200' : s === 'Medium' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-slate-100 text-slate-600 border-slate-200';
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border ${c}`}>{s}</span>;
};

export default function SuppliersPage() {
  const { can } = usePermissions();
  const [sortBy, setSortBy] = useState<'rating' | 'total_spend' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterLocation, setFilterLocation] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [codeFrom, setCodeFrom] = useState('');
  const [codeTo, setCodeTo] = useState('');
  const { data: supplierList } = useSuppliers({
    limit: 200,
    sort_by: sortBy ?? undefined,
    sort_dir: sortBy ? sortDir : undefined,
    code_from: codeFrom.trim() || undefined,
    code_to: codeTo.trim() || undefined,
  });
  const suppliers = supplierList?.items ?? [];
  const { data: purchaseStockLogs = [] } = useStockLogs({ type: 'PURCHASE' });
  const { data: stockLogs = [] } = useStockLogs();
  const { data: inventory = [] } = useInventory();
  const { data: hubs = [] } = useHubs();
  const { data: agents = [] } = useAgents();
  const activeHubs = hubs.filter((h) => h.isActive);
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const createIssue = useCreateSupplierIssue();
  const updateIssue = useUpdateSupplierIssue();

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Supplier>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState<Partial<SupplierIssue>>({ type: SupplierIssueType.QUALITY, severity: 'Medium', description: '', relatedItemId: '' });
  const [resolvingIssueId, setResolvingIssueId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const { data: purchaseData } = useSupplierPurchases(selectedSupplier?.id ?? null);
  const supplierPurchases = purchaseData?.items ?? [];
  const { data: supplierIssueList = [] } = useSupplierIssues(selectedSupplier?.id ?? null);

  const agentName = (id?: string) => agents.find((a) => a.id === id)?.name || id || '—';

  const emptySupplier = (): Partial<Supplier> => ({
    name: '', businessName: '', businessType: SupplierBusinessType.DISTRIBUTOR,
    location: activeHubs[0]?.name || 'Lagos', address: '', contactPerson: '',
    phone: '', email: '', categories: [], paymentTerms: PaymentTerms.COD,
    leadTimeDays: 3, rating: 3, notes: '',
  });
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>(emptySupplier());

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSort = (field: 'rating' | 'total_spend') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: 'rating' | 'total_spend' }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary" />
      : <ArrowDown size={12} className="text-primary" />;
  };

  // --- Purchase spend per supplier (from stock logs) ---
  const spendBySupplier = useMemo(() => {
    const map: Record<string, { spend: number; orders: number; last: string }> = {};
    purchaseStockLogs.forEach((l) => {
      if (l.supplierId) {
        const e = map[l.supplierId] || { spend: 0, orders: 0, last: '' };
        e.spend += Math.abs(l.quantity) * l.unitCost;
        e.orders += 1;
        if (l.date > e.last) e.last = l.date;
        map[l.supplierId] = e;
      }
    });
    return map;
  }, [purchaseStockLogs]);

  const openIssuesBySupplier = useMemo(() => {
    const map: Record<string, number> = {};
    supplierIssueList.forEach((i) => {
      if (i.status === 'Open') map[i.supplierId] = (map[i.supplierId] || 0) + 1;
    });
    return map;
  }, [supplierIssueList]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    const total = supplierList?.summary.total ?? 0;
    const active = supplierList?.summary.active ?? 0;
    const totalSpend = Object.values(spendBySupplier).reduce((a, e) => a + e.spend, 0);
    const openIssues = supplierList?.summary.openIssues ?? 0;
    const rated = suppliers.filter((s) => s.leadTimeDays != null);
    const avgLead = rated.length ? Math.round(rated.reduce((a, s) => a + (s.leadTimeDays || 0), 0) / rated.length) : 0;
    return { total, active, totalSpend, openIssues, avgLead };
  }, [supplierList, suppliers, spendBySupplier]);

  // --- Top suppliers by spend ---
  const topBySpend = useMemo(() => {
    return suppliers
      .map((s) => ({ s, spend: spendBySupplier[s.id]?.spend || 0 }))
      .filter((x) => x.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);
  }, [suppliers, spendBySupplier]);
  const maxSpend = topBySpend[0]?.spend || 1;

  // --- Filtering ---
  const parseSupplierCodeNum = (raw?: string): number | null => {
    if (!raw?.trim()) return null;
    const t = raw.trim().toUpperCase();
    const withPrefix = t.match(/^SUP-(\d+)$/);
    if (withPrefix) return parseInt(withPrefix[1], 10);
    const digitsOnly = t.match(/^(\d+)$/);
    if (digitsOnly) return parseInt(digitsOnly[1], 10);
    return null;
  };

  const filtered = useMemo(() => {
    const fromNum = parseSupplierCodeNum(codeFrom);
    const toNum = parseSupplierCodeNum(codeTo);
    return suppliers.filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(q) ||
        (s.businessName || '').toLowerCase().includes(q) ||
        (s.contactPerson || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.code || '').toLowerCase().includes(q);
      const matchType = filterType === 'All' || s.businessType === filterType;
      const matchLoc = filterLocation === 'All' || s.location === filterLocation;
      const matchCat = filterCategory === 'All' || s.categories?.includes(filterCategory as ProductCategory);
      const matchStatus = filterStatus === 'All' || (filterStatus === 'Active' ? s.isActive : !s.isActive);
      const codeNum = parseSupplierCodeNum(s.code);
      const matchCodeRange =
        (fromNum === null || (codeNum !== null && codeNum >= fromNum)) &&
        (toNum === null || (codeNum !== null && codeNum <= toNum));
      return matchSearch && matchType && matchLoc && matchCat && matchStatus && matchCodeRange;
    });
  }, [suppliers, searchTerm, filterType, filterLocation, filterCategory, filterStatus, codeFrom, codeTo]);

  // --- Products supplied (derived from purchases) ---
  const productsSupplied = useMemo(() => {
    if (!selectedSupplier) return [];
    const map: Record<string, { itemId: string; itemName: string; totalQty: number; uom: string; lastPrice: number; lastDate: string; orders: number }> = {};
    supplierPurchases.forEach((l) => {
      const e = map[l.itemId] || { itemId: l.itemId, itemName: l.itemName, totalQty: 0, uom: l.uom, lastPrice: l.unitCost, lastDate: l.date, orders: 0 };
      e.totalQty += Math.abs(l.quantity);
      e.orders += 1;
      if (l.date >= e.lastDate) { e.lastDate = l.date; e.lastPrice = l.unitCost; }
      map[l.itemId] = e;
    });
    return Object.values(map).sort((a, b) => b.totalQty - a.totalQty);
  }, [selectedSupplier, supplierPurchases]);

  // --- Retail performance: sales of this supplier's products (via SALE stock logs) ---
  const retailPerf = useMemo(() => {
    const itemIds = new Set(productsSupplied.map((p) => p.itemId));
    const purchasedByItem: Record<string, number> = {};
    productsSupplied.forEach((p) => { purchasedByItem[p.itemId] = p.totalQty; });
    const saleLogs = itemIds.size > 0
      ? stockLogs.filter((l) => l.type === StockMovementType.SALE && itemIds.has(l.itemId))
      : [];
    let unitsSold = 0, revenue = 0, cogs = 0, lastSold = '';
    const monthSet = new Set<string>();
    const byMonth: Record<string, number> = {};
    const prodMap: Record<string, { itemId: string; itemName: string; uom: string; units: number; revenue: number; cogs: number; txns: number; lastSold: string }> = {};
    saleLogs.forEach((l) => {
      const q = Math.abs(l.quantity);
      const rev = q * l.unitPrice;
      const cost = q * l.unitCost;
      const m = l.date.substring(0, 7);
      unitsSold += q; revenue += rev; cogs += cost;
      monthSet.add(m); byMonth[m] = (byMonth[m] || 0) + rev;
      if (l.date > lastSold) lastSold = l.date;
      const e = prodMap[l.itemId] || { itemId: l.itemId, itemName: l.itemName, uom: l.uom, units: 0, revenue: 0, cogs: 0, txns: 0, lastSold: '' };
      e.units += q; e.revenue += rev; e.cogs += cost; e.txns += 1;
      if (l.date > e.lastSold) e.lastSold = l.date;
      prodMap[l.itemId] = e;
    });
    const byProduct = Object.values(prodMap).map((p) => ({
      ...p,
      profit: p.revenue - p.cogs,
      margin: p.revenue > 0 ? ((p.revenue - p.cogs) / p.revenue) * 100 : 0,
      purchased: purchasedByItem[p.itemId] || 0,
      sellThrough: purchasedByItem[p.itemId] ? Math.min(100, Math.round((p.units / purchasedByItem[p.itemId]) * 100)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
    const totalPurchased = productsSupplied.reduce((a, p) => a + p.totalQty, 0);
    const trend = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
      .map(([m, amount]) => ({ month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount }));
    return {
      hasData: saleLogs.length > 0,
      unitsSold, revenue, cogs, profit: revenue - cogs,
      margin: revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0,
      txns: saleLogs.length,
      months: monthSet.size,
      avgPerMonth: monthSet.size ? saleLogs.length / monthSet.size : 0,
      lastSold,
      sellThrough: totalPurchased ? Math.min(100, Math.round((unitsSold / totalPurchased) * 100)) : 0,
      bestSeller: byProduct[0] || null,
      byProduct, trend,
    };
  }, [productsSupplied, stockLogs]);

  // --- Price comparison: cheapest supplier's latest cost per item ---
  const bestCostByItem = useMemo(() => {
    const latest: Record<string, Record<string, { cost: number; date: string; name: string }>> = {};
    purchaseStockLogs.forEach((l) => {
      if (!l.supplierId) return;
      const perItem = latest[l.itemId] || {};
      const cur = perItem[l.supplierId];
      if (!cur || l.date >= cur.date) {
        perItem[l.supplierId] = { cost: l.unitCost, date: l.date, name: l.supplier || '' };
      }
      latest[l.itemId] = perItem;
    });
    const best: Record<string, { cost: number; name: string }> = {};
    Object.entries(latest).forEach(([itemId, bySup]) => {
      const entries = Object.values(bySup);
      const min = entries.reduce((m, e) => (e.cost < m.cost ? e : m), entries[0]);
      best[itemId] = { cost: min.cost, name: min.name };
    });
    return best;
  }, [purchaseStockLogs]);

  // --- Spend trend for selected supplier ---
  const spendTrend = useMemo(() => {
    if (supplierPurchases.length === 0) return [];
    const byMonth: Record<string, number> = {};
    supplierPurchases.forEach((l) => {
      const month = l.date.substring(0, 7);
      byMonth[month] = (byMonth[month] || 0) + Math.abs(l.quantity) * l.unitCost;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), amount }));
  }, [supplierPurchases]);

  const selectedSpend = selectedSupplier ? (spendBySupplier[selectedSupplier.id]?.spend || 0) : 0;
  const selectedOrders = selectedSupplier ? (spendBySupplier[selectedSupplier.id]?.orders || 0) : 0;
  const selectedLast = selectedSupplier ? (spendBySupplier[selectedSupplier.id]?.last || '') : '';

  // --- Add supplier ---
  const toggleCategory = (list: ProductCategory[] | undefined, cat: ProductCategory) =>
    (list || []).includes(cat) ? (list || []).filter((c) => c !== cat) : [...(list || []), cat];

  const supplierPayload = (form: Partial<Supplier>) => ({
    name: form.name?.trim(),
    business_name: form.businessName?.trim() || undefined,
    business_type: form.businessType,
    hub_id: hubs.find((h) => h.name === form.location)?.id,
    address: form.address?.trim() || undefined,
    contact_person: form.contactPerson?.trim() || undefined,
    phone: form.phone?.trim() || undefined,
    email: form.email?.trim() || undefined,
    categories: form.categories ?? [],
    payment_terms: form.paymentTerms,
    lead_time_days: form.leadTimeDays,
    rating: form.rating,
    notes: form.notes?.trim() || undefined,
  });

  const handleSaveSupplier = () => {
    if (createSupplier.isPending) return;
    if (!newSupplier.name?.trim()) { toast.error('Supplier name is required.'); return; }
    if (suppliers.some((s) => s.name.toLowerCase() === newSupplier.name!.trim().toLowerCase())) {
      toast.error(`A supplier named "${newSupplier.name}" already exists.`); return;
    }
    createSupplier.mutate(supplierPayload(newSupplier), {
      onSuccess: () => {
        setShowAddModal(false);
        setNewSupplier(emptySupplier());
        toast.success('Supplier added.');
      },
      onError: () => toast.error('Unable to add supplier.'),
    });
  };

  // --- Edit supplier ---
  const startEditing = () => {
    if (!selectedSupplier) return;
    setEditForm({ ...selectedSupplier });
    setIsEditing(true);
  };
  const handleUpdateSupplier = () => {
    if (!selectedSupplier) return;
    if (!editForm.name?.trim()) { toast.error('Supplier name is required.'); return; }
    updateSupplier.mutate({ id: selectedSupplier.id, ...supplierPayload(editForm) }, {
      onSuccess: (updated) => {
        setSelectedSupplier(updated);
        setIsEditing(false);
        toast.success('Supplier updated.');
      },
      onError: () => toast.error('Unable to update supplier.'),
    });
  };

  const toggleActive = (s: Supplier) => {
    updateSupplier.mutate({ id: s.id, is_active: !s.isActive }, {
      onSuccess: (updated) => {
        if (selectedSupplier?.id === s.id) setSelectedSupplier(updated);
        toast.success(`${s.name} ${s.isActive ? 'deactivated' : 'reactivated'}.`);
      },
      onError: () => toast.error(`Unable to update ${s.name}.`),
    });
  };

  // --- Issues ---
  const handleLogIssue = () => {
    if (!selectedSupplier) return;
    if (!issueForm.description?.trim()) { toast.error('Please describe the issue.'); return; }
    createIssue.mutate({
      supplierId: selectedSupplier.id,
      type: issueForm.type as SupplierIssueType,
      severity: issueForm.severity as SupplierIssue['severity'],
      description: issueForm.description!.trim(),
      ...(issueForm.relatedItemId ? { related_item_id: issueForm.relatedItemId } : {}),
    }, {
      onSuccess: () => {
        setShowIssueForm(false);
        setIssueForm({ type: SupplierIssueType.QUALITY, severity: 'Medium', description: '', relatedItemId: '' });
        toast.success('Issue logged.');
      },
      onError: () => toast.error('Unable to log issue.'),
    });
  };

  const handleResolveIssue = (issue: SupplierIssue) => {
    updateIssue.mutate({
      supplierId: issue.supplierId,
      issueId: issue.id,
      status: 'Resolved',
      ...(resolutionText.trim() ? { resolution_note: resolutionText.trim() } : {}),
    }, {
      onSuccess: () => {
        setResolvingIssueId(null);
        setResolutionText('');
        toast.success('Issue resolved.');
      },
      onError: () => toast.error('Unable to resolve issue.'),
    });
  };

  const handleViewDetails = (s: Supplier) => {
    setSelectedSupplier(s);
    setDetailTab('overview');
    setIsEditing(false);
    setShowIssueForm(false);
    setResolvingIssueId(null);
    setExpandedOrderId(null);
  };

  // Deep-link: open a supplier from ?open=<id> (e.g. clicked from Inventory)
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || suppliers.length === 0) return;
    const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('open') : null;
    deepLinkHandled.current = true;
    if (!id) return;
    const s = suppliers.find((x) => x.id === id);
    if (s) handleViewDetails(s);
  }, [suppliers]);

  const inputCls = 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';
  const editInputCls = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground text-sm">Manage vendors, procurement spend, products supplied, and supplier issues.</p>
        </div>
        {can('suppliers.create') && (
          <button onClick={() => { setNewSupplier(emptySupplier()); setShowAddModal(true); }} className="inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
            <Plus size={16} className="mr-2" /> Add Supplier
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Truck size={14} className="text-muted-foreground" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Suppliers</span></div>
          <p className="text-2xl font-black">{kpis.total}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><ShieldCheck size={14} className="text-green-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Active</span></div>
          <p className="text-2xl font-black">{kpis.active}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><CircleDollarSign size={14} className="text-emerald-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Total Spend</span></div>
          <p className="text-lg font-black">{fmt(kpis.totalSpend)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Open Issues</span></div>
          <p className="text-2xl font-black">{kpis.openIssues}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Clock size={14} className="text-blue-600" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Avg Lead</span></div>
          <p className="text-2xl font-black">{kpis.avgLead}<span className="text-sm font-medium text-muted-foreground">d</span></p>
        </div>
      </div>

      {/* Top suppliers by spend */}
      {topBySpend.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-3"><TrendingUp size={15} className="text-primary" /><h3 className="text-sm font-semibold">Top Suppliers by Spend</h3></div>
          <div className="space-y-2.5">
            {topBySpend.map(({ s, spend }) => (
              <button key={s.id} onClick={() => handleViewDetails(s)} className="w-full group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium group-hover:text-primary transition-colors">{s.name}</span>
                  <span className="font-bold">{fmt(spend)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(4, (spend / maxSpend) * 100)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center bg-card p-4 rounded-lg border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input type="text" placeholder="Search name, code, contact..." className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 border rounded-md px-2 py-1.5 bg-background">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase whitespace-nowrap">Code</span>
            <input
              type="text"
              placeholder="SUP-001"
              value={codeFrom}
              onChange={(e) => setCodeFrom(e.target.value)}
              className="w-[5.5rem] bg-transparent border-none text-sm font-medium focus:outline-none"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <input
              type="text"
              placeholder="SUP-005"
              value={codeTo}
              onChange={(e) => setCodeTo(e.target.value)}
              className="w-[5.5rem] bg-transparent border-none text-sm font-medium focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
            <Filter size={14} className="text-muted-foreground" />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:outline-none">
              <option value="All">All Types</option>
              {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
            <MapPin size={14} className="text-muted-foreground" />
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:outline-none">
              <option value="All">All Locations</option>
              {activeHubs.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
            <Tag size={14} className="text-muted-foreground" />
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:outline-none">
              <option value="All">All Categories</option>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
            <ShieldCheck size={14} className="text-muted-foreground" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'All' | 'Active' | 'Inactive')} className="bg-transparent border-none text-sm font-medium focus:outline-none">
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
        <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{filtered.length} supplier{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b">
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Code</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Supplier</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Contact</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type / Location</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground">Supplies</th>
                <th className="h-12 px-4 text-right font-medium text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort('total_spend')}
                    className="inline-flex items-center gap-1 ml-auto hover:text-foreground"
                  >
                    Spend
                    <SortIcon field="total_spend" />
                  </button>
                </th>
                <th className="h-12 px-4 text-center font-medium text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => toggleSort('rating')}
                    className="inline-flex items-center gap-1 mx-auto hover:text-foreground"
                  >
                    Rating
                    <SortIcon field="rating" />
                  </button>
                </th>
                <th className="h-12 px-4 text-center font-medium text-muted-foreground">Issues</th>
                <th className="h-12 px-4 text-left font-medium text-muted-foreground w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const spend = typeof s.totalSpend === 'number' ? s.totalSpend : (spendBySupplier[s.id]?.spend || 0);
                const open = openIssuesBySupplier[s.id] || 0;
                return (
                  <tr key={s.id} onClick={() => handleViewDetails(s)} className={`border-b hover:bg-muted/50 cursor-pointer group ${!s.isActive ? 'opacity-60' : ''}`}>
                    <td className="p-4">
                      <span className="font-mono text-xs font-semibold text-muted-foreground">{s.code || '—'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
                          <Truck size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium flex items-center gap-1.5">{s.name}{!s.isActive && <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">INACTIVE</span>}</span>
                          {s.businessName && <span className="text-xs text-muted-foreground">{s.businessName}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col text-sm">
                        <span className="text-muted-foreground">{s.contactPerson || 'ΓÇö'}</span>
                        <span className="text-xs text-muted-foreground">{s.phone || s.email || ''}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-xs font-medium"><Building2 size={11} className="text-muted-foreground" /> {s.businessType || 'ΓÇö'}</span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={10} /> {s.location || 'ΓÇö'}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {s.categories?.slice(0, 3).map((c) => (
                          <span key={c} className="inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{c}</span>
                        ))}
                        {(s.categories?.length || 0) > 3 && <span className="text-[10px] text-muted-foreground">+{s.categories!.length - 3}</span>}
                        {(!s.categories || s.categories.length === 0) && <span className="text-xs text-muted-foreground/50">ΓÇö</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right"><span className="font-medium">{spend > 0 ? fmt(spend) : 'ΓÇö'}</span></td>
                    <td className="p-4 text-center"><StarRating value={s.rating} /></td>
                    <td className="p-4 text-center">
                      {open > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200"><AlertTriangle size={10} /> {open}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-green-600"><CheckCircle2 size={12} /> Clear</span>
                      )}
                    </td>
                    <td className="p-4"><ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No suppliers found matching your filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====== ADD SUPPLIER MODAL ====== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Add New Supplier</h2><button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Supplier Code</label>
                <input type="text" value="Auto-assigned (SUP-001, SUP-002, …)" disabled className={`${inputCls} opacity-70 cursor-not-allowed`} />
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Supplier Name *</label><input type="text" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Business Name</label><input type="text" value={newSupplier.businessName} onChange={(e) => setNewSupplier({ ...newSupplier, businessName: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Business Type</label><select value={newSupplier.businessType} onChange={(e) => setNewSupplier({ ...newSupplier, businessType: e.target.value as SupplierBusinessType })} className={inputCls}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Location</label><select value={newSupplier.location} onChange={(e) => setNewSupplier({ ...newSupplier, location: e.target.value })} className={inputCls}>{activeHubs.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Contact Person</label><input type="text" value={newSupplier.contactPerson} onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Phone</label><input type="text" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Email</label><input type="email" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Address</label><input type="text" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} className={inputCls} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Payment Terms</label><select value={newSupplier.paymentTerms} onChange={(e) => setNewSupplier({ ...newSupplier, paymentTerms: e.target.value as PaymentTerms })} className={inputCls}>{PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><label className="text-sm font-medium">Lead Time (days)</label><input type="number" min={0} value={newSupplier.leadTimeDays ?? 0} onChange={(e) => setNewSupplier({ ...newSupplier, leadTimeDays: Number(e.target.value) })} className={inputCls} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Rating</label><div className="flex h-10 items-center"><StarRatingInput value={newSupplier.rating ?? 3} onChange={(rating) => setNewSupplier({ ...newSupplier, rating })} /></div></div>
              </div>
              <div className="space-y-2 md:col-span-2"><label className="text-sm font-medium">Assigned Agent</label><select value={newSupplier.addedByAgentId || ''} onChange={(e) => setNewSupplier({ ...newSupplier, addedByAgentId: e.target.value })} className={inputCls}><option value="">-- Select --</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium">Products Supplied (Categories)</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_CATEGORIES.map((c) => {
                  const on = newSupplier.categories?.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => setNewSupplier({ ...newSupplier, categories: toggleCategory(newSupplier.categories, c) })} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:bg-accent'}`}>
                      {on && <Check size={11} />} {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 space-y-2"><label className="text-sm font-medium">Notes</label><textarea value={newSupplier.notes} onChange={(e) => setNewSupplier({ ...newSupplier, notes: e.target.value })} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} disabled={createSupplier.isPending} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2 disabled:opacity-50">Cancel</button>
              <button
                onClick={handleSaveSupplier}
                disabled={createSupplier.isPending}
                className="inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSupplier.isPending ? 'Submitting…' : 'Save Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SUPPLIER DETAIL PANEL ====== */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end" onClick={() => { setSelectedSupplier(null); setIsEditing(false); }}>
          <div className="w-full max-w-2xl bg-card border-l shadow-xl h-full overflow-y-auto animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20"><Truck size={22} /></div>
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">{selectedSupplier.name}{!selectedSupplier.isActive && <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">INACTIVE</span>}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedSupplier.code && <span className="font-mono text-xs font-semibold text-primary">{selectedSupplier.code}</span>}
                      {selectedSupplier.businessName && <span className="text-sm text-muted-foreground">{selectedSupplier.businessName}</span>}
                      {selectedSupplier.businessType && <span className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-semibold">{selectedSupplier.businessType}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing && can('suppliers.deactivate') && (
                    <button onClick={() => toggleActive(selectedSupplier)} className={`inline-flex items-center gap-1.5 rounded-md text-xs font-medium border h-8 px-3 ${selectedSupplier.isActive ? 'border-input bg-background hover:bg-accent text-muted-foreground' : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {selectedSupplier.isActive ? <><Ban size={12} /> Deactivate</> : <><CheckCircle2 size={12} /> Reactivate</>}
                    </button>
                  )}
                  {!isEditing && can('suppliers.edit') && (
                    <button onClick={startEditing} className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3"><Edit3 size={12} /> Edit</button>
                  )}
                  <button onClick={() => { setSelectedSupplier(null); setIsEditing(false); }} className="text-muted-foreground hover:text-foreground p-1"><X size={20} /></button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <StarRating value={selectedSupplier.rating} size={14} />
                {selectedSupplier.paymentTerms && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CircleDollarSign size={12} /> {selectedSupplier.paymentTerms}</span>}
                {selectedSupplier.leadTimeDays != null && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock size={12} /> {selectedSupplier.leadTimeDays}d lead</span>}
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 border-b -mb-6 -mx-6 px-6">
                {([
                  { key: 'overview', label: 'Overview', icon: User },
                  { key: 'orders', label: 'Order History', icon: ShoppingCart },
                  { key: 'products', label: 'Products', icon: Boxes },
                  { key: 'performance', label: 'Performance', icon: BarChart3 },
                  { key: 'issues', label: 'Issues', icon: ClipboardList },
                ] as const).map((tab) => {
                  const openForTab = tab.key === 'issues' ? supplierIssueList.filter((i) => i.status === 'Open').length : 0;
                  return (
                    <button key={tab.key} onClick={() => setDetailTab(tab.key)} className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${detailTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'}`}>
                      <tab.icon size={13} /> {tab.label}
                      {tab.key === 'orders' && supplierPurchases.length > 0 && <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">{supplierPurchases.length}</span>}
                      {tab.key === 'products' && productsSupplied.length > 0 && <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">{productsSupplied.length}</span>}
                      {tab.key === 'issues' && openForTab > 0 && <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700">{openForTab}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6">
              {/* ===== OVERVIEW ===== */}
              {detailTab === 'overview' && !isEditing && (
                <div className="space-y-6">
                  <div className="space-y-3 text-sm">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Contact Information</h4>
                    {selectedSupplier.contactPerson && <div className="flex items-center gap-2"><User size={14} className="text-muted-foreground" /> {selectedSupplier.contactPerson}</div>}
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2"><Phone size={14} className="text-muted-foreground" /> {selectedSupplier.phone || 'N/A'}</div>
                      {selectedSupplier.phone && <button onClick={() => copyToClipboard(selectedSupplier.phone!, 'phone')} className="p-1 rounded hover:bg-accent">{copiedField === 'phone' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-muted-foreground" />}</button>}
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2"><Mail size={14} className="text-muted-foreground" /> {selectedSupplier.email || 'N/A'}</div>
                      {selectedSupplier.email && <button onClick={() => copyToClipboard(selectedSupplier.email!, 'email')} className="p-1 rounded hover:bg-accent">{copiedField === 'email' ? <Check size={14} className="text-green-600" /> : <Copy size={14} className="text-muted-foreground" />}</button>}
                    </div>
                    <div className="flex items-center gap-2"><MapPin size={14} className="text-muted-foreground" /> {selectedSupplier.location}{selectedSupplier.address ? ` ΓÇö ${selectedSupplier.address}` : ''}</div>
                    <div className="flex items-center gap-2"><Calendar size={14} className="text-muted-foreground" /> Added: {selectedSupplier.createdDate}{selectedSupplier.addedByAgentName ? ` by ${selectedSupplier.addedByAgentName}` : ''}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground">Total Spend</p><p className="text-2xl font-black">{fmt(selectedSpend)}</p></div>
                    <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground">Purchase Orders</p><p className="text-2xl font-black">{selectedOrders}</p></div>
                    <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground">Products Supplied</p><p className="text-2xl font-black">{productsSupplied.length}</p></div>
                    <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground">Last Order</p><p className="text-lg font-black">{selectedLast || 'None'}</p></div>
                  </div>

                  {selectedSupplier.categories && selectedSupplier.categories.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Product Categories</h4>
                      <div className="flex flex-wrap gap-2">{selectedSupplier.categories.map((c) => <span key={c} className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">{c}</span>)}</div>
                    </div>
                  )}

                  {selectedSupplier.notes && (
                    <div><h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Notes</h4><p className="text-sm text-muted-foreground p-3 rounded-lg border bg-muted/20">{selectedSupplier.notes}</p></div>
                  )}

                  {spendTrend.length > 1 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Spend Trend</h4>
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={spendTrend}>
                            <defs><linearGradient id="supSpendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                            <RechartsTooltip formatter={(value) => [fmt(Number(value)), 'Spent']} />
                            <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#supSpendGrad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== EDIT ===== */}
              {detailTab === 'overview' && isEditing && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Edit Supplier</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Supplier Name *</label><input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Business Name</label><input type="text" value={editForm.businessName || ''} onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Business Type</label><select value={editForm.businessType} onChange={(e) => setEditForm({ ...editForm, businessType: e.target.value as SupplierBusinessType })} className={editInputCls}>{BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Location</label><select value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className={editInputCls}>{activeHubs.map((h) => <option key={h.id} value={h.name}>{h.name}</option>)}</select></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Contact Person</label><input type="text" value={editForm.contactPerson || ''} onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Phone</label><input type="text" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Email</label><input type="email" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Address</label><input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className={editInputCls} /></div>
                    <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Payment Terms</label><select value={editForm.paymentTerms} onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value as PaymentTerms })} className={editInputCls}>{PAYMENT_TERMS.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Lead Time (d)</label><input type="number" min={0} value={editForm.leadTimeDays ?? 0} onChange={(e) => setEditForm({ ...editForm, leadTimeDays: Number(e.target.value) })} className={editInputCls} /></div>
                      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Rating</label><div className="flex h-9 items-center"><StarRatingInput value={editForm.rating ?? 3} onChange={(rating) => setEditForm({ ...editForm, rating })} size={18} /></div></div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Products Supplied (Categories)</label>
                    <div className="flex flex-wrap gap-2">
                      {PRODUCT_CATEGORIES.map((c) => {
                        const on = editForm.categories?.includes(c);
                        return <button key={c} type="button" onClick={() => setEditForm({ ...editForm, categories: toggleCategory(editForm.categories, c) })} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground hover:bg-accent'}`}>{on && <Check size={11} />} {c}</button>;
                      })}
                    </div>
                  </div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Notes</label><textarea value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setIsEditing(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
                    <button onClick={handleUpdateSupplier} className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"><Save size={14} /> Save Changes</button>
                  </div>
                </div>
              )}

              {/* ===== ORDER HISTORY ===== */}
              {detailTab === 'orders' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Orders</p><p className="text-xl font-black">{supplierPurchases.length}</p></div>
                    <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Total Spend</p><p className="text-lg font-black">{fmt(selectedSpend)}</p></div>
                    <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Avg Order</p><p className="text-lg font-black">{fmt(supplierPurchases.length ? selectedSpend / supplierPurchases.length : 0)}</p></div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground">Purchase Orders ({supplierPurchases.length})</h4>
                      {supplierPurchases.length > 0 && <span className="text-[10px] text-muted-foreground">Click a row to drill down</span>}
                    </div>
                    {supplierPurchases.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground border rounded-lg"><ShoppingCart size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No purchase orders recorded from this supplier yet.</p></div>
                    ) : (
                      <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <th className="text-left font-semibold px-3 py-2">Date</th>
                              <th className="text-left font-semibold px-3 py-2">Product</th>
                              <th className="text-right font-semibold px-3 py-2">Qty</th>
                              <th className="text-right font-semibold px-3 py-2">Unit Cost</th>
                              <th className="text-right font-semibold px-3 py-2">Total</th>
                              <th className="w-8 px-2 py-2"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {supplierPurchases.map((l) => {
                              const isOpen = expandedOrderId === l.id;
                              const item = inventory.find((i) => i.id === l.itemId);
                              const qty = Math.abs(l.quantity);
                              const total = qty * l.unitCost;
                              const margin = l.unitCost > 0 ? Math.round(((l.unitPrice - l.unitCost) / l.unitCost) * 100) : 0;
                              return (
                                <Fragment key={l.id}>
                                  <tr onClick={() => setExpandedOrderId(isOpen ? null : l.id)} className={`border-b cursor-pointer transition-colors ${isOpen ? 'bg-muted/40' : 'hover:bg-muted/30'}`}>
                                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">{l.date}</td>
                                    <td className="px-3 py-2.5 font-medium">{l.itemName}</td>
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{qty} {l.uom}</td>
                                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(l.unitCost)}</td>
                                    <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">{fmt(total)}</td>
                                    <td className="px-2 py-2.5 text-muted-foreground"><ChevronDown size={15} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></td>
                                  </tr>
                                  {isOpen && (
                                    <tr className="border-b bg-muted/10">
                                      <td colSpan={6} className="px-4 py-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Tag size={10} /> SKU</p><p className="text-sm font-medium">{item?.sku || 'ΓÇö'}</p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Package2 size={10} /> Batch No.</p><p className="text-sm font-medium">{l.batchNumber || 'ΓÇö'}</p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><CalendarClock size={10} /> Expiry</p><p className="text-sm font-medium">{l.expiryDate || 'ΓÇö'}</p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><CircleDollarSign size={10} /> Sell Price</p><p className="text-sm font-medium">{fmt(l.unitPrice)}<span className="text-[10px] text-muted-foreground">/{l.uom}</span></p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Percent size={10} /> Markup</p><p className={`text-sm font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margin}%</p></div>
                                          <div><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><User size={10} /> Recorded By</p><p className="text-sm font-medium">{agentName(l.agentId)}</p></div>
                                        </div>
                                        {l.notes && (
                                          <div className="mt-3 pt-3 border-t flex items-start gap-2 text-xs text-muted-foreground">
                                            <FileText size={12} className="mt-0.5 shrink-0" /><span className="italic">{l.notes}</span>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-muted/20 border-t-2 border-dashed">
                              <td colSpan={4} className="px-3 py-2.5 text-sm font-medium text-muted-foreground">Total across {supplierPurchases.length} order{supplierPurchases.length !== 1 ? 's' : ''}</td>
                              <td className="px-3 py-2.5 text-right text-base font-black whitespace-nowrap">{fmt(selectedSpend)}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ===== PRODUCTS + PRICE COMPARISON ===== */}
              {detailTab === 'products' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase text-muted-foreground">Products Supplied &amp; Price Position</h4>
                  {productsSupplied.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg"><Boxes size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No products delivered by this supplier yet.</p><p className="text-xs mt-1">Record a purchase from this supplier in Inventory to populate this.</p></div>
                  ) : (
                    <div className="space-y-2">
                      {productsSupplied.map((p) => {
                        const best = bestCostByItem[p.itemId];
                        const isCheapest = best && Math.abs(best.cost - p.lastPrice) < 0.01;
                        const diffPct = best && best.cost > 0 ? Math.round(((p.lastPrice - best.cost) / best.cost) * 100) : 0;
                        const item = inventory.find((i) => i.id === p.itemId);
                        return (
                          <div key={p.itemId} className="p-3 rounded-lg border">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{p.itemName}</span>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span>{p.orders} order{p.orders !== 1 ? 's' : ''}</span>
                                  <span>{p.totalQty} {p.uom} total</span>
                                  {item && <span className="inline-flex items-center gap-1"><Tag size={10} /> {item.sku}</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold">{fmt(p.lastPrice)}<span className="text-[10px] font-normal text-muted-foreground">/{p.uom}</span></p>
                                {isCheapest ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-200"><TrendingDown size={10} /> Best price</span>
                                ) : diffPct > 0 ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 border border-orange-200" title={best ? `Cheapest: ${best.name} at ${fmt(best.cost)}` : ''}><TrendingUp size={10} /> +{diffPct}% vs best</span>
                                ) : null}
                              </div>
                            </div>
                            {!isCheapest && best && (
                              <p className="text-[11px] text-muted-foreground mt-2 border-t pt-2">Cheapest source: <span className="font-medium">{best.name || 'ΓÇö'}</span> at {fmt(best.cost)}/{p.uom}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ===== RETAIL PERFORMANCE ===== */}
              {detailTab === 'performance' && (
                <div className="space-y-5">
                  <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/30 rounded-lg p-2.5 border">
                    <Activity size={13} className="mt-0.5 shrink-0" />
                    <span>How this supplier&apos;s products perform in retail. Sales are attributed via the products this supplier delivers.</span>
                  </div>

                  {!retailPerf.hasData ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg"><BarChart3 size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No retail sales recorded yet for this supplier&apos;s products.</p></div>
                  ) : (
                    <>
                      {/* Headline KPIs */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Boxes size={11} /> Units Sold</p><p className="text-2xl font-black">{retailPerf.unitsSold.toLocaleString()}</p></div>
                        <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><CircleDollarSign size={11} /> Retail Revenue</p><p className="text-2xl font-black">{fmt(retailPerf.revenue)}</p></div>
                        <div className="p-4 rounded-xl border-2 border-green-200 bg-green-50/50">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Wallet size={11} /> Gross Profit</p>
                          <div className="flex items-baseline gap-2"><p className="text-2xl font-black text-green-700">{fmt(retailPerf.profit)}</p><span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 border border-green-200">{retailPerf.margin.toFixed(0)}%</span></div>
                        </div>
                        <div className="p-4 rounded-xl border bg-muted/20"><p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1"><Repeat size={11} /> Sales Frequency</p><p className="text-2xl font-black">{retailPerf.txns}</p><p className="text-[10px] text-muted-foreground">{retailPerf.avgPerMonth.toFixed(1)}/mo ┬╖ across {retailPerf.months} month{retailPerf.months !== 1 ? 's' : ''}</p></div>
                      </div>

                      {/* Secondary metrics */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Sell-through</p><p className="text-lg font-black">{retailPerf.sellThrough}%</p><p className="text-[9px] text-muted-foreground">of purchased</p></div>
                        <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">COGS</p><p className="text-lg font-black">{fmt(retailPerf.cogs)}</p></div>
                        <div className="p-3 rounded-lg border bg-muted/20 text-center"><p className="text-[10px] font-bold uppercase text-muted-foreground">Last Sold</p><p className="text-sm font-black">{retailPerf.lastSold || 'ΓÇö'}</p></div>
                      </div>

                      {/* Best seller callout */}
                      {retailPerf.bestSeller && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50/50">
                          <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0"><Flame size={17} /></div>
                          <div className="flex-1 min-w-0"><p className="text-[10px] font-bold uppercase text-muted-foreground">Best Seller</p><p className="text-sm font-semibold truncate">{retailPerf.bestSeller.itemName}</p></div>
                          <div className="text-right shrink-0"><p className="text-sm font-black">{fmt(retailPerf.bestSeller.revenue)}</p><p className="text-[10px] text-muted-foreground">{retailPerf.bestSeller.units} {retailPerf.bestSeller.uom} sold</p></div>
                        </div>
                      )}

                      {/* Monthly revenue trend */}
                      {retailPerf.trend.length > 1 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Monthly Retail Revenue</h4>
                          <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={retailPerf.trend}>
                                <defs><linearGradient id="supRetailGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                                <RechartsTooltip formatter={(value) => [fmt(Number(value)), 'Revenue']} />
                                <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#supRetailGrad)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {/* Per-product performance table */}
                      <div>
                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Product Performance ({retailPerf.byProduct.length})</h4>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                                <th className="text-left font-semibold px-3 py-2">Product</th>
                                <th className="text-right font-semibold px-3 py-2">Sold</th>
                                <th className="text-right font-semibold px-3 py-2">Revenue</th>
                                <th className="text-right font-semibold px-3 py-2">Profit</th>
                                <th className="text-right font-semibold px-3 py-2">Sell-thru</th>
                              </tr>
                            </thead>
                            <tbody>
                              {retailPerf.byProduct.map((p) => (
                                <tr key={p.itemId} className="border-b last:border-0">
                                  <td className="px-3 py-2.5 font-medium">{p.itemName}</td>
                                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{p.units} {p.uom}</td>
                                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{fmt(p.revenue)}</td>
                                  <td className="px-3 py-2.5 text-right whitespace-nowrap"><span className="font-semibold text-green-700">{fmt(p.profit)}</span><span className="ml-1 text-[10px] text-muted-foreground">{p.margin.toFixed(0)}%</span></td>
                                  <td className="px-3 py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <div className="h-1.5 w-10 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${p.sellThrough}%` }} /></div>
                                      <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{p.sellThrough}%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ===== ISSUES ===== */}
              {detailTab === 'issues' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground">Issues &amp; Complaints ({supplierIssueList.length})</h4>
                    {can('suppliers.log_issue') && !showIssueForm && (
                      <button onClick={() => setShowIssueForm(true)} className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3"><Plus size={12} /> Log Issue</button>
                    )}
                  </div>

                  {showIssueForm && (
                    <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Type</label><select value={issueForm.type} onChange={(e) => setIssueForm({ ...issueForm, type: e.target.value as SupplierIssueType })} className={editInputCls}>{ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                        <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Severity</label><select value={issueForm.severity} onChange={(e) => setIssueForm({ ...issueForm, severity: e.target.value as SupplierIssue['severity'] })} className={editInputCls}>{SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                      </div>
                      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Related Product (optional)</label><select value={issueForm.relatedItemId || ''} onChange={(e) => setIssueForm({ ...issueForm, relatedItemId: e.target.value })} className={editInputCls}><option value="">ΓÇö None ΓÇö</option>{inventory.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                      <div className="space-y-1"><label className="text-xs font-medium text-muted-foreground">Description</label><textarea value={issueForm.description} onChange={(e) => setIssueForm({ ...issueForm, description: e.target.value })} rows={3} placeholder="Describe the issue or complaint..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowIssueForm(false); setIssueForm({ type: SupplierIssueType.QUALITY, severity: 'Medium', description: '', relatedItemId: '' }); }} className="inline-flex items-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-3">Cancel</button>
                        <button onClick={handleLogIssue} className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"><Save size={12} /> Save Issue</button>
                      </div>
                    </div>
                  )}

                  {supplierIssueList.length === 0 && !showIssueForm ? (
                    <div className="p-8 text-center text-muted-foreground border rounded-lg"><CheckCircle2 size={32} className="mx-auto mb-2 opacity-40 text-green-600" /><p className="text-sm">No issues logged. This supplier has a clean record.</p></div>
                  ) : (
                    <div className="space-y-2">
                      {supplierIssueList.map((issue) => {
                        const relItem = issue.relatedItemId ? inventory.find((i) => i.id === issue.relatedItemId) : null;
                        return (
                          <div key={issue.id} className={`p-3 rounded-lg border ${issue.status === 'Open' ? 'border-red-200 bg-red-50/40' : 'bg-muted/20'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-semibold">{issue.type}</span>
                                  {severityBadge(issue.severity)}
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${issue.status === 'Open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{issue.status === 'Open' ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />} {issue.status}</span>
                                </div>
                                <p className="text-sm mt-1.5">{issue.description}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                                  <span className="inline-flex items-center gap-1"><Calendar size={10} /> {issue.date}</span>
                                  {issue.reportedByAgentName && <span>by {issue.reportedByAgentName}</span>}
                                  {relItem && <span className="inline-flex items-center gap-1"><Package size={10} /> {relItem.name}</span>}
                                </div>
                                {issue.status === 'Resolved' && issue.resolutionNote && (
                                  <div className="mt-2 border-t pt-2 text-xs text-muted-foreground"><span className="font-semibold text-green-700">Resolution ({issue.resolvedDate}):</span> {issue.resolutionNote}</div>
                                )}
                              </div>
                            </div>
                            {issue.status === 'Open' && can('suppliers.resolve_issue') && (
                              resolvingIssueId === issue.id ? (
                                <div className="mt-2 border-t pt-2 space-y-2">
                                  <textarea value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} rows={2} placeholder="Resolution note (optional)..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
                                  <div className="flex justify-end gap-2">
                                    <button onClick={() => { setResolvingIssueId(null); setResolutionText(''); }} className="inline-flex items-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-7 px-2.5">Cancel</button>
                                    <button onClick={() => handleResolveIssue(issue)} className="inline-flex items-center gap-1 rounded-md text-xs font-medium bg-green-600 text-white hover:bg-green-700 h-7 px-2.5"><CheckCircle2 size={12} /> Mark Resolved</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-2 flex justify-end"><button onClick={() => { setResolvingIssueId(issue.id); setResolutionText(''); }} className="inline-flex items-center gap-1 rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-7 px-2.5"><CheckCircle2 size={12} /> Resolve</button></div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
