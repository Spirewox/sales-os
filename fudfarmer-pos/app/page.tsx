'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Search, Plus, Minus, Trash2, X, Wifi, WifiOff, LogOut,
  ShoppingCart, Banknote, CreditCard, Smartphone, UserPlus, Check, Receipt as ReceiptIcon,
  Loader2, Delete, User, Clock, FileText, PauseCircle, PlayCircle, ShieldCheck, LifeBuoy,
  Settings as Cog,
} from 'lucide-react';
import {
  PosProduct, PosCustomer, Cashier, StoreProfile, PosSale, PosPayment, PaymentMethod, Shift, HeldSale,
  AssistRequest, IssueType, ResolutionKind,
} from '@/lib/types';
import { ensureSeeded } from '@/lib/seed';
import {
  getCatalog, getCustomers, getCashiers, recordSale, getSales, getOutbox,
  getShifts, saveShift, reverseSale, getHeld, saveHeld, deleteHeld,
  getStockCounts, saveStockCount, getAssists, saveAssist, saveProduct, saveStore,
} from '@/lib/db';
import { flushOutbox, startSync, exportPayload } from '@/lib/sync';
import { CartLine, computeTotals, cartCount, lineTotal, toSaleLines, newSaleId, paid, balanceDue, changeDue, pctToAmount, maxDiscountPctInCart } from '@/lib/cart';
import { buildReport, openShiftFor, newShiftId, ShiftReport } from '@/lib/shift';
import { fmt, toKobo } from '@/lib/money';
import { Receipt } from '@/components/receipt';
import { OpenShiftModal, ReportModal, PinGate } from '@/components/shift-panels';
import { SalesHistory, ReturnModal } from '@/components/sales-history';
import { SupervisorView } from '@/components/supervisor-view';
import { RequestHelpModal, MyRequests } from '@/components/assist-panels';
import { newAssistId, openCount } from '@/lib/assist';
import { SettingsPanel } from '@/components/settings-panel';
import { can, canFully, roleLabel } from '@/lib/permissions';

export default function PosPage() {
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [catalog, setCatalog] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [cashier, setCashier] = useState<Cashier | null>(null);
  const [booting, setBooting] = useState(true);

  // sell state
  const [lines, setLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [customer, setCustomer] = useState<PosCustomer | null>(null);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [discountFor, setDiscountFor] = useState<string | 'cart' | null>(null);   // which line (or cart) is being discounted
  const [discountApproved, setDiscountApproved] = useState(false);
  const [discountGate, setDiscountGate] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);

  // Phase 2: shifts, history, refunds, held carts
  const [shift, setShift] = useState<Shift | null>(null);
  const [allShifts, setAllShifts] = useState<Shift[]>([]);
  const [stockCounts, setStockCounts] = useState<Record<string, Record<string, number>>>({});
  const [assists, setAssists] = useState<AssistRequest[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSupervisor, setShowSupervisor] = useState(false);
  const [supervisorGate, setSupervisorGate] = useState(false);
  /** Who authorised the supervisor session — actions are attributed to THEM, not the signed-in cashier. */
  const [actingSupervisor, setActingSupervisor] = useState<string | null>(null);
  const [sales, setSales] = useState<PosSale[]>([]);
  const [held, setHeld] = useState<HeldSale[]>([]);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [report, setReport] = useState<{ data: ShiftReport; kind: 'X' | 'Z' } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [pendingReversal, setPendingReversal] = useState<{ sale: PosSale; mode: 'refunded' | 'voided' } | null>(null);
  const [returnFor, setReturnFor] = useState<{ sale: PosSale; mode: 'refunded' | 'voided' } | null>(null);
  const [returnAuth, setReturnAuth] = useState<string | null>(null);
  const [viewSale, setViewSale] = useState<PosSale | null>(null);

  // connectivity / sync
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  const refreshSyncState = useCallback(async () => {
    // Catalog is included so on-hand stock stays truthful after every sale/refund.
    const [ob, allSales, heldList, allShifts, counts, cat, asks] = await Promise.all([
      getOutbox(), getSales(), getHeld(), getShifts(), getStockCounts(), getCatalog(), getAssists(),
    ]);
    setPending(ob.length);
    setSales(allSales);
    setHeld(heldList);
    setAllShifts(allShifts);
    setCatalog(cat);
    setStockCounts(Object.fromEntries(counts.map((c) => [c.day, c.counts])));
    setAssists(asks);
    const t = new Date().toISOString().slice(0, 10);
    setTodayCount(allSales.filter((s) => s.createdAt.slice(0, 10) === t && !s.reversalOf).length);
  }, []);

  // boot: seed + load
  useEffect(() => {
    (async () => {
      const s = await ensureSeeded();
      const [cat, cus, csh] = await Promise.all([getCatalog(), getCustomers(), getCashiers()]);
      setStore(s); setCatalog(cat); setCustomers(cus); setCashiers(csh);
      await refreshSyncState();
      setBooting(false);
    })();
  }, [refreshSyncState]);

  // service worker + background sync
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const stop = startSync(refreshSyncState);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); stop(); };
  }, [refreshSyncState]);

  const categories = useMemo(() => ['All', ...Array.from(new Set(catalog.map((p) => p.category)))], [catalog]);
  const visible = useMemo(() => catalog.filter((p) =>
    p.isActive
    && (category === 'All' || p.category === category)
    && (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
  ), [catalog, category, search]);

  const totals = computeTotals(lines, {
    orderDiscount, taxRatePct: store?.taxRatePct, taxInclusive: store?.taxInclusive,
  });
  const { subtotal, discount, tax, total } = totals;
  /** Largest discount % anywhere in the cart — what the approval gate checks. */
  const cartDiscountPct = maxDiscountPctInCart(lines, orderDiscount);
  const needsDiscountApproval = store ? cartDiscountPct > store.discountApprovalThresholdPct : false;
  const waitingAssists = openCount(assists);
  const myOpen = assists.filter((a) => a.cashierId === cashier?.id && (a.status === 'open' || a.status === 'in_progress')).length;
  const myResolved = assists.filter((a) => a.cashierId === cashier?.id && a.status === 'resolved').length;

  // ── cart ops ──
  const addProduct = (p: PosProduct) => {
    setLines((cur) => {
      const i = cur.findIndex((l) => l.product.id === p.id);
      if (i >= 0) { const n = [...cur]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...cur, { product: p, qty: 1, discount: 0 }];
    });
  };
  const setQty = (id: string, qty: number) =>
    setLines((cur) => qty <= 0 ? cur.filter((l) => l.product.id !== id) : cur.map((l) => l.product.id === id ? { ...l, qty } : l));
  const removeLine = (id: string) => setLines((cur) => cur.filter((l) => l.product.id !== id));
  const clearCart = () => { setLines([]); setCustomer(null); setOrderDiscount(0); setDiscountApproved(false); };

  /** Apply a discount to one line or the whole cart, capped by store policy. */
  const applyDiscount = (targetId: string | 'cart', amount: number) => {
    const cap = store?.maxDiscountPct ?? 100;
    if (targetId === 'cart') {
      const base = lines.reduce((s2, l) => s2 + lineTotal(l), 0);
      setOrderDiscount(Math.min(Math.max(0, amount), pctToAmount(base, cap)));
    } else {
      setLines((cur) => cur.map((l) => {
        if (l.product.id !== targetId) return l;
        const base = l.product.price * l.qty;
        return { ...l, discount: Math.min(Math.max(0, amount), pctToAmount(base, cap)) };
      }));
    }
    setDiscountApproved(false);   // a changed discount must be re-authorised
    setDiscountFor(null);
  };

  /** Charging is gated when the discount exceeds the store's threshold. */
  const startCheckout = () => {
    if (needsDiscountApproval && !discountApproved) { setDiscountGate(true); return; }
    setShowPay(true);
  };
  const authoriseDiscount = (pin: string) => {
    const sup = cashiers.find((c) => c.pin === pin && c.isActive && canFully(c.role, 'discount.approve'));
    if (!sup) { toast.error('That PIN cannot approve discounts'); return; }
    setDiscountApproved(true);
    setDiscountGate(false);
    setShowPay(true);
    toast.success(`Discount authorised by ${sup.name.split(' (')[0]}`);
  };

  // ── complete the sale (local-first; never awaits network) ──
  const completeSale = async (payments: PosPayment[]) => {
    if (!store || !cashier) return;
    const sale: PosSale = {
      id: newSaleId(store.deviceId),
      deviceId: store.deviceId,
      storeId: store.storeName,
      cashierId: cashier.id,
      cashierName: cashier.name,
      lines: toSaleLines(lines),
      subtotal, discount, total,
      orderDiscount: orderDiscount || undefined,
      tax: tax || undefined,
      taxRatePct: store.taxRatePct || undefined,
      payments,
      change: changeDue(payments, total),
      customerId: customer?.id,
      customerName: customer?.name,
      status: 'completed',
      createdAt: new Date().toISOString(),
      syncState: 'pending',
      shiftId: shift?.id,
    };
    await recordSale(sale);           // durable BEFORE anything else
    setLastSale(sale);
    setShowPay(false);
    clearCart();
    await refreshSyncState();
    toast.success(`Sale ${fmt(total)} recorded${navigator.onLine ? '' : ' — will sync when back online'}`);
    void flushOutbox().then(refreshSyncState);  // fire & forget
  };

  // ── Phase 2: shift lifecycle ──
  const handleLogin = async (c: Cashier) => {
    setCashier(c);
    const shifts = await getShifts();
    const open = openShiftFor(shifts, c.id);
    if (open) { setShift(open); toast.success(`Welcome back, ${c.name.split(' ')[0]} — shift resumed`); }
    else { setShowOpenShift(true); }
  };

  const openShift = async (openingFloat: number) => {
    if (!cashier || !store) return;
    const s: Shift = {
      id: newShiftId(store.deviceId), deviceId: store.deviceId,
      cashierId: cashier.id, cashierName: cashier.name,
      openedAt: new Date().toISOString(), openingFloat, status: 'open',
    };
    await saveShift(s);
    setShift(s);
    setShowOpenShift(false);
    await refreshSyncState();
    toast.success(`Shift open · float ${fmt(openingFloat)}`);
  };

  const showReport = (kind: 'X' | 'Z') => {
    if (!shift) return;
    setReport({ data: buildReport(shift, sales), kind });
  };

  const closeShift = async (countedCash: number) => {
    if (!shift) return;
    const r = buildReport(shift, sales, countedCash);
    const closed: Shift = {
      ...shift, status: 'closed', closedAt: new Date().toISOString(),
      countedCash, expectedCash: r.expectedCash, variance: r.variance,
    };
    await saveShift(closed);
    setReport(null);
    setShift(null);
    setCashier(null);   // shift end = sign out
    await refreshSyncState();
    const v = r.variance ?? 0;
    if (v === 0) toast.success('Shift closed — drawer balances');
    else toast.warning(`Shift closed — drawer ${v > 0 ? 'over' : 'short'} ${fmt(Math.abs(v))}`);
  };

  // ── Phase 2: refunds & voids (supervisor-gated) ──
  /** Supervisor authorises first; the return picker (qty + reason) opens after. */
  const authoriseReversal = (pin: string) => {
    if (!pendingReversal) return;
    const sup = cashiers.find((c) => c.pin === pin && c.isActive && canFully(c.role, 'refund.approve'));
    if (!sup) { toast.error('That PIN cannot approve refunds'); return; }
    setReturnAuth(sup.name);
    setReturnFor(pendingReversal);
    setPendingReversal(null);
  };

  /** Commit the return — full or partial — with the cashier-chosen reason. */
  const commitReturn = async (lines: Record<string, number>, reason: string, full: boolean) => {
    if (!returnFor || !returnAuth) return;
    const { sale, mode } = returnFor;
    const rev = await reverseSale(sale, { mode, by: returnAuth, reason, lines: full ? undefined : lines });
    setReturnFor(null); setReturnAuth(null);
    await refreshSyncState();
    toast.success(`${full ? 'Full' : 'Partial'} ${mode === 'voided' ? 'void' : 'refund'} ${fmt(Math.abs(rev.total))} — by ${returnAuth.split(' (')[0]}`);
    void flushOutbox().then(refreshSyncState);
  };

  /** Persist a settings change and apply it to the running till immediately. */
  const saveSettings = async (patch: Partial<StoreProfile>) => {
    if (!store) return;
    const next = { ...store, ...patch };
    await saveStore(next);
    setStore(next);
    setShowSettings(false);
    toast.success('Settings saved');
  };

  /* ── Supervisor assist ── */
  const raiseAssist = async (d: { type: IssueType; note: string; urgent: boolean; attachCart: boolean }) => {
    if (!cashier || !store) return;
    const req: AssistRequest = {
      id: newAssistId(store.deviceId), deviceId: store.deviceId, shiftId: shift?.id,
      cashierId: cashier.id, cashierName: cashier.name,
      type: d.type, urgent: d.urgent, note: d.note,
      context: d.attachCart && lines.length > 0
        ? { cartTotal: total, cartLines: lines.map((l) => ({ name: l.product.name, qty: l.qty, unit: l.product.unit })) }
        : undefined,
      status: 'open', createdAt: new Date().toISOString(), syncState: 'pending',
    };
    await saveAssist(req);
    await refreshSyncState();
    setShowHelp(false);
    toast.success('Supervisor notified' + (d.urgent ? ' — marked urgent' : ''));
  };

  const claimAssist = async (a: AssistRequest) => {
    await saveAssist({ ...a, status: 'in_progress', claimedBy: actingSupervisor || 'Supervisor', claimedAt: new Date().toISOString() });
    await refreshSyncState();
  };

  const cancelAssist = async (a: AssistRequest) => {
    await saveAssist({ ...a, status: 'cancelled', resolvedBy: actingSupervisor || 'Supervisor', resolvedAt: new Date().toISOString() });
    await refreshSyncState();
    toast.info('Request dismissed');
  };

  /** Resolve a request AND actually perform the fix. */
  const resolveAssist = async (
    a: AssistRequest, kind: ResolutionKind, note: string,
    payload: { productId?: string; newValue?: number; amount?: number },
  ) => {
    const by = actingSupervisor || 'Supervisor';
    const product = payload.productId ? catalog.find((p) => p.id === payload.productId) : undefined;
    let action: AssistRequest['action'] = { kind };
    let done = note;

    if (kind === 'price_override' && product && payload.newValue != null) {
      action = { kind, productId: product.id, productName: product.name, oldValue: product.price, newValue: payload.newValue };
      await saveProduct({ ...product, price: payload.newValue });
      done = note || `Price set to ${fmt(payload.newValue)}`;
    } else if (kind === 'stock_correction' && product && payload.newValue != null) {
      action = { kind, productId: product.id, productName: product.name, oldValue: product.stock ?? 0, newValue: payload.newValue };
      await saveProduct({ ...product, stock: payload.newValue });
      done = note || `Stock corrected to ${payload.newValue}`;
    } else if (kind === 'cash_drop' && payload.amount != null) {
      action = { kind, amount: payload.amount };
      done = note || `${fmt(payload.amount)} removed from drawer`;
    } else if (kind === 'sync_retry') {
      await flushOutbox();
      done = note || 'Sync retried';
    }

    await saveAssist({ ...a, status: 'resolved', resolvedBy: by, resolvedAt: new Date().toISOString(), resolution: done, action });
    await refreshSyncState();
    toast.success('Resolved — ' + done);
  };

  // ── Supervisor view (a cashier must be authorised by a supervisor to open it) ──
  const openSupervisor = () => {
    // Anyone who can see all store sales gets straight in; everyone else needs a PIN.
    if (canFully(cashier?.role, 'sale.viewAll')) { setActingSupervisor(cashier!.name); setShowSupervisor(true); }
    else setSupervisorGate(true);
  };
  const authoriseSupervisor = (pin: string) => {
    const sup = cashiers.find((c) => c.pin === pin && c.isActive && canFully(c.role, 'sale.viewAll'));
    if (!sup) { toast.error('That PIN cannot open the supervisor view'); return; }
    setActingSupervisor(sup.name);
    setSupervisorGate(false);
    setShowSupervisor(true);
  };

  /** Record an end-of-day physical stock count. */
  const saveDayCount = async (day: string, counts: Record<string, number>) => {
    await saveStockCount({
      id: day, day, counts,
      countedBy: actingSupervisor || cashier?.name || 'Supervisor',
      countedAt: new Date().toISOString(),
    });
    await refreshSyncState();
    const n = Object.keys(counts).length;
    toast.success(`Stock count saved — ${n} product${n !== 1 ? 's' : ''}`);
  };

  // ── Phase 2: hold / resume a cart ──
  const holdCart = async () => {
    if (!cashier || lines.length === 0) return;
    const h: HeldSale = {
      id: `hold-${Date.now().toString(36)}`,
      label: customer?.name || `${cartCount(lines)} items · ${fmt(total)}`,
      lines: lines.map((l) => ({ productId: l.product.id, qty: l.qty, discount: l.discount })),
      customerId: customer?.id, customerName: customer?.name,
      cashierId: cashier.id, createdAt: new Date().toISOString(),
    };
    await saveHeld(h);
    clearCart();
    await refreshSyncState();
    toast.success('Cart held');
  };

  const resumeCart = async (h: HeldSale) => {
    const restored: CartLine[] = h.lines
      .map((l) => { const p = catalog.find((x) => x.id === l.productId); return p ? { product: p, qty: l.qty, discount: l.discount } : null; })
      .filter((x): x is CartLine => x !== null);
    setLines(restored);
    setCustomer(h.customerId ? customers.find((c) => c.id === h.customerId) || null : null);
    await deleteHeld(h.id);
    setShowHeld(false);
    await refreshSyncState();
    toast.success('Cart resumed');
  };

  /** Hand this till's sales to the tenant's CRM (copy → paste into CRM ▸ POS Sync). */
  const copyPayloadForCrm = async () => {
    if (!store) return;
    const json = exportPayload({ deviceId: store.deviceId, deviceLabel: store.deviceLabel, storeName: store.storeName });
    try {
      await navigator.clipboard.writeText(json);
      toast.success('Sync payload copied — paste it into your CRM ▸ POS Sync');
    } catch {
      // clipboard can be blocked; fall back to a download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      a.download = `pos-sync-${store.deviceLabel.replace(/\s+/g, '-')}.json`;
      a.click();
      toast.success('Sync payload downloaded');
    }
  };

  const manualSync = async () => {
    setSyncing(true);
    const res = await flushOutbox();
    await refreshSyncState();
    setSyncing(false);
    if (res.pushed) toast.success(`Synced ${res.pushed} record${res.pushed !== 1 ? 's' : ''}`);
    else if (res.remaining) toast.error(`${res.remaining} still queued — no connection`);
    else toast.info('Everything is already synced');
  };

  if (booting) {
    return <div className="h-screen grid place-items-center text-[var(--color-ink-dim)]"><Loader2 className="animate-spin" /></div>;
  }
  if (!cashier) {
    return <PinLogin cashiers={cashiers} store={store} onLogin={handleLogin} />;
  }
  // A till must be on an open shift before it can sell.
  if (!shift) {
    return (
      <>
        <div className="h-screen grid place-items-center p-6 text-center">
          <div>
            <Clock size={40} className="mx-auto text-[var(--color-ink-dim)]" />
            <h1 className="text-lg font-black mt-3">No open shift</h1>
            <p className="text-xs text-[var(--color-ink-dim)] mt-1">Open a shift to start selling.</p>
            <div className="flex gap-2 justify-center mt-4">
              <button onClick={() => setCashier(null)} className="h-11 px-4 rounded-xl border border-[var(--color-line)] text-sm font-bold">Sign out</button>
              {/* A supervisor reviews the day without having to open a till. */}
              <button onClick={openSupervisor} className="h-11 px-4 rounded-xl border border-[var(--color-line)] text-sm font-bold inline-flex items-center gap-1.5">
                <ShieldCheck size={15} /> Supervisor
              </button>
              <button onClick={() => setShowOpenShift(true)} className="h-11 px-5 rounded-xl bg-[var(--color-brand)] text-white text-sm font-black">Open shift</button>
            </div>
          </div>
        </div>
        {showOpenShift && <OpenShiftModal cashierName={cashier.name} onClose={() => setShowOpenShift(false)} onOpen={openShift} />}
        {supervisorGate && (
          <PinGate title="Supervisor access" note="Cashier performance and end-of-day reconciliation are supervisor-only."
            onCancel={() => setSupervisorGate(false)} onVerify={authoriseSupervisor} />
        )}
        {showSettings && store && (
        <SettingsPanel store={store} cashiers={cashiers} onSave={saveSettings} onClose={() => setShowSettings(false)} />
      )}
      {showSupervisor && store && (
          <SupervisorView sales={sales} shifts={allShifts} cashiers={cashiers} catalog={catalog} store={store}
            unsynced={pending} stockCounts={stockCounts} onSaveCount={saveDayCount}
            assists={assists} onClaimAssist={claimAssist} onResolveAssist={resolveAssist} onCancelAssist={cancelAssist}
            onClose={() => { setShowSupervisor(false); setActingSupervisor(null); }} />
        )}
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 h-14 bg-[var(--color-surface)] border-b border-[var(--color-line)] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="h-8 w-8 rounded-lg bg-[var(--color-brand)] grid place-items-center font-black text-white text-sm">FF</span>
          <div className="min-w-0 hidden sm:block">
            <p className="text-sm font-bold truncate">{store?.storeName}</p>
            <p className="text-[11px] text-[var(--color-ink-dim)]">{store?.deviceLabel} · {store?.storeType}</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Sync status — cashiers must SEE that nothing is lost */}
          <button onClick={manualSync}
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${
              online ? 'border-[var(--color-line)] text-[var(--color-ink)]' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
            {syncing ? <Loader2 size={14} className="animate-spin" /> : online ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">{online ? 'Online' : 'Offline'}</span>
            {pending > 0 && <span className="ml-0.5 rounded-full bg-amber-500 text-black px-1.5 text-[10px] font-black">{pending}</span>}
          </button>
          <div className="text-right hidden md:block">
            <p className="text-[11px] text-[var(--color-ink-dim)]">Sales today</p>
            <p className="text-sm font-black leading-none">{todayCount}</p>
          </div>
          <button onClick={() => setShowHelp(true)} title="Ask a supervisor for help"
            className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] relative">
            <LifeBuoy size={15} />
            {myOpen > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-black grid place-items-center">{myOpen}</span>}
          </button>
          <button onClick={() => setShowMyRequests(true)} title="My help requests"
            className="h-9 px-2 rounded-lg border border-[var(--color-line)] text-[10px] font-black text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            {myResolved > 0 ? <span className="text-emerald-400">{myResolved} ✓</span> : 'REQ'}
          </button>
          {can(cashier?.role, 'settings.manage') && (
            <button onClick={() => setShowSettings(true)} title="POS settings"
              className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
              <Cog size={15} />
            </button>
          )}
          <button onClick={openSupervisor} title="Supervisor — cashier performance & reconciliation"
            className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] relative">
            <ShieldCheck size={15} />
            {waitingAssists > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-black text-[9px] font-black grid place-items-center">{waitingAssists}</span>}
          </button>
          <button onClick={copyPayloadForCrm} title="Send sales to my CRM"
            className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <FileText size={15} />
          </button>
          <button onClick={() => setShowHistory(true)} title="Sales & refunds"
            className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <ReceiptIcon size={15} />
          </button>
          <button onClick={() => showReport('X')} title="X report"
            className="h-9 px-2.5 rounded-lg border border-[var(--color-line)] text-[11px] font-black text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            X
          </button>
          <button onClick={() => showReport('Z')} title="Close shift (Z report)"
            className="h-9 px-2.5 rounded-lg border border-amber-500/40 text-[11px] font-black text-amber-300 hover:bg-amber-500/10">
            Z
          </button>
          <button onClick={() => setCashier(null)} title="Sign out"
            className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Catalog */}
        <section className="flex-1 flex flex-col min-w-0">
          <div className="p-3 flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product or SKU…"
                className="w-full h-11 pl-10 pr-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]" />
            </div>
          </div>
          <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto shrink-0">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 h-8 rounded-lg text-xs font-bold whitespace-nowrap border ${
                  category === c ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'bg-[var(--color-surface)] border-[var(--color-line)] text-[var(--color-ink-dim)]'}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {visible.map((p) => {
                const low = p.trackStock && typeof p.stock === 'number' && p.stock <= 0;
                return (
                  <button key={p.id} onClick={() => addProduct(p)}
                    className="tap text-left rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] p-3 hover:border-[var(--color-brand)] active:scale-[0.98] transition-all">
                    <p className="text-sm font-bold leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                    <p className="text-[11px] text-[var(--color-ink-dim)] mt-0.5">{p.unit}{p.trackStock && typeof p.stock === 'number' ? ` · ${p.stock} left` : ''}</p>
                    <p className={`text-base font-black mt-1.5 ${low ? 'text-[var(--color-danger)]' : 'text-[var(--color-brand)]'}`}>{fmt(p.price)}</p>
                  </button>
                );
              })}
              {visible.length === 0 && <p className="col-span-full text-center text-sm text-[var(--color-ink-dim)] py-10">No products match.</p>}
            </div>
          </div>
        </section>

        {/* Cart */}
        <aside className="w-[340px] lg:w-[380px] shrink-0 bg-[var(--color-surface)] border-l border-[var(--color-line)] flex flex-col">
          <div className="p-3 border-b border-[var(--color-line)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold"><ShoppingCart size={16} /> Cart <span className="text-[var(--color-ink-dim)] font-medium">({cartCount(lines)})</span></div>
            {lines.length > 0 && <button onClick={clearCart} className="text-xs text-[var(--color-danger)] font-bold">Clear</button>}
          </div>

          <button onClick={() => setShowCustomers(true)}
            className="mx-3 mt-3 h-10 rounded-lg border border-dashed border-[var(--color-line)] text-xs font-bold text-[var(--color-ink-dim)] flex items-center justify-center gap-1.5 hover:border-[var(--color-brand)] hover:text-[var(--color-ink)]">
            {customer ? <><User size={13} /> {customer.name}</> : <><UserPlus size={13} /> Add customer (optional)</>}
          </button>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {lines.length === 0 && <p className="text-center text-sm text-[var(--color-ink-dim)] py-10">Tap a product to start.</p>}
            {lines.map((l) => (
              <div key={l.product.id} className="rounded-xl bg-[var(--color-surface-2)] p-2.5 animate-pop">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-tight">{l.product.name}</p>
                  <button onClick={() => removeLine(l.product.id)} className="text-[var(--color-ink-dim)] hover:text-[var(--color-danger)] shrink-0"><Trash2 size={14} /></button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQty(l.product.id, l.qty - 1)} className="h-8 w-8 grid place-items-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)]"><Minus size={14} /></button>
                    <input value={l.qty} onChange={(e) => setQty(l.product.id, Math.max(0, Number(e.target.value) || 0))}
                      className="h-8 w-12 text-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)] text-sm font-bold outline-none" />
                    <button onClick={() => setQty(l.product.id, l.qty + 1)} className="h-8 w-8 grid place-items-center rounded-lg bg-[var(--color-surface)] border border-[var(--color-line)]"><Plus size={14} /></button>
                  </div>
                  <div className="text-right">
                    <button onClick={() => setDiscountFor(l.product.id)}
                      className={`text-[10px] font-bold ${l.discount > 0 ? 'text-amber-400' : 'text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]'}`}>
                      {l.discount > 0 ? `−${fmt(l.discount)} off` : '+ Discount'}
                    </button>
                    <p className="text-sm font-black">{fmt(lineTotal(l))}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[var(--color-line)] space-y-2 shrink-0">
            <div className="flex justify-between text-xs text-[var(--color-ink-dim)]"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {totals.lineDiscount > 0 && <div className="flex justify-between text-xs text-amber-400"><span>Line discounts</span><span>−{fmt(totals.lineDiscount)}</span></div>}
            {totals.orderDiscount > 0 && <div className="flex justify-between text-xs text-amber-400"><span>Cart discount</span><span>−{fmt(totals.orderDiscount)}</span></div>}
            {lines.length > 0 && (
              <button onClick={() => setDiscountFor('cart')}
                className="w-full text-left text-[10px] font-bold text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]">
                {orderDiscount > 0 ? 'Edit cart discount' : '+ Cart discount'}
              </button>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-xs text-[var(--color-ink-dim)]">
                <span>{store?.taxLabel || 'Tax'} {store?.taxRatePct}%{store?.taxInclusive ? ' (incl.)' : ''}</span>
                <span>{fmt(tax)}</span>
              </div>
            )}
            {needsDiscountApproval && (
              <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <ShieldCheck size={11} /> {Math.round(cartDiscountPct)}% discount needs supervisor approval
              </p>
            )}
            <div className="flex justify-between items-baseline"><span className="text-sm font-bold">Total</span><span className="text-2xl font-black text-[var(--color-brand)]">{fmt(total)}</span></div>
            <div className="flex gap-2">
              <button disabled={lines.length === 0} onClick={holdCart}
                className="flex-1 h-11 rounded-xl border border-[var(--color-line)] text-xs font-bold disabled:opacity-30 inline-flex items-center justify-center gap-1.5">
                <PauseCircle size={14} /> Hold
              </button>
              <button onClick={() => setShowHeld(true)} disabled={held.length === 0}
                className="flex-1 h-11 rounded-xl border border-[var(--color-line)] text-xs font-bold disabled:opacity-30 inline-flex items-center justify-center gap-1.5">
                <PlayCircle size={14} /> Held {held.length > 0 && <span className="rounded-full bg-amber-500 text-black px-1.5 text-[10px] font-black">{held.length}</span>}
              </button>
            </div>
            <button disabled={lines.length === 0} onClick={startCheckout}
              className="w-full h-14 rounded-xl bg-[var(--color-brand)] text-white text-base font-black disabled:opacity-30 active:scale-[0.99] transition-transform">
              Charge {total > 0 ? fmt(total) : ''}
            </button>
          </div>
        </aside>
      </div>

      {discountFor && (
        <DiscountModal
          label={discountFor === 'cart' ? 'Cart discount' : lines.find((l) => l.product.id === discountFor)?.product.name || ''}
          base={discountFor === 'cart' ? lines.reduce((a, l) => a + lineTotal(l), 0) : (() => { const l = lines.find((x) => x.product.id === discountFor); return l ? l.product.price * l.qty : 0; })()}
          current={discountFor === 'cart' ? orderDiscount : (lines.find((l) => l.product.id === discountFor)?.discount || 0)}
          maxPct={store?.maxDiscountPct ?? 50}
          approvalPct={store?.discountApprovalThresholdPct ?? 10}
          onClose={() => setDiscountFor(null)}
          onApply={(amt) => applyDiscount(discountFor, amt)} />
      )}
      {discountGate && (
        <PinGate title="Approve discount"
          note={`This cart carries a ${Math.round(cartDiscountPct)}% discount, above the ${store?.discountApprovalThresholdPct}% limit. A supervisor must authorise it.`}
          onCancel={() => setDiscountGate(false)} onVerify={authoriseDiscount} />
      )}
      {showPay && <PaymentModal total={total} onClose={() => setShowPay(false)} onConfirm={completeSale} hasCustomer={!!customer} />}
      {showCustomers && <CustomerModal customers={customers} onPick={(c) => { setCustomer(c); setShowCustomers(false); }} onClear={() => { setCustomer(null); setShowCustomers(false); }} onClose={() => setShowCustomers(false)} />}
      {lastSale && store && <Receipt sale={lastSale} store={store} onClose={() => setLastSale(null)} />}
      {viewSale && store && <Receipt sale={viewSale} store={store} onClose={() => setViewSale(null)} />}

      {showOpenShift && <OpenShiftModal cashierName={cashier.name} onClose={() => setShowOpenShift(false)} onOpen={openShift} />}
      {report && store && (
        <ReportModal report={report.data} store={store} kind={report.kind}
          onClose={() => setReport(null)} onConfirmClose={closeShift} />
      )}
      {showHistory && (
        <SalesHistory sales={sales} onClose={() => setShowHistory(false)}
          canRefund={can(cashier?.role, 'refund.process')} canVoid={can(cashier?.role, 'transaction.void')}
          onView={(s) => { setShowHistory(false); setViewSale(s); }}
          onRefund={(s) => { setShowHistory(false); setPendingReversal({ sale: s, mode: 'refunded' }); }}
          onVoid={(s) => { setShowHistory(false); setPendingReversal({ sale: s, mode: 'voided' }); }} />
      )}
      {pendingReversal && (
        <PinGate title={pendingReversal.mode === 'voided' ? 'Void sale' : 'Refund sale'}
          note={`${pendingReversal.mode === 'voided' ? 'Voiding' : 'Refunding'} up to ${fmt(pendingReversal.sale.total)} — supervisor PIN required. You'll pick the items next.`}
          onCancel={() => setPendingReversal(null)} onVerify={authoriseReversal} />
      )}
      {returnFor && (
        <ReturnModal sale={returnFor.sale} mode={returnFor.mode}
          onClose={() => { setReturnFor(null); setReturnAuth(null); }}
          onConfirm={commitReturn} />
      )}
      {showHeld && <HeldModal held={held} onResume={resumeCart} onClose={() => setShowHeld(false)} onDiscard={async (id) => { await deleteHeld(id); await refreshSyncState(); toast.info('Held cart discarded'); }} />}

      {showHelp && (
        <RequestHelpModal cartTotal={total}
          cartLines={lines.map((l) => ({ name: l.product.name, qty: l.qty, unit: l.product.unit }))}
          onClose={() => setShowHelp(false)} onSubmit={raiseAssist} />
      )}
      {showMyRequests && (
        <MyRequests mine={assists.filter((a) => a.cashierId === cashier?.id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))}
          onClose={() => setShowMyRequests(false)} />
      )}
      {showSettings && store && (
        <SettingsPanel store={store} cashiers={cashiers} onSave={saveSettings} onClose={() => setShowSettings(false)} />
      )}
      {supervisorGate && (
        <PinGate title="Supervisor access" note="Cashier performance and end-of-day reconciliation are supervisor-only."
          onCancel={() => setSupervisorGate(false)} onVerify={authoriseSupervisor} />
      )}
      {showSupervisor && store && (
        <SupervisorView sales={sales} shifts={allShifts} cashiers={cashiers} catalog={catalog} store={store}
          unsynced={pending} stockCounts={stockCounts} onSaveCount={saveDayCount}
            assists={assists} onClaimAssist={claimAssist} onResolveAssist={resolveAssist} onCancelAssist={cancelAssist}
          onClose={() => { setShowSupervisor(false); setActingSupervisor(null); }} />
      )}
    </div>
  );
}

/* ─────────── PIN login ─────────── */
function PinLogin({ cashiers, store, onLogin }: { cashiers: Cashier[]; store: StoreProfile | null; onLogin: (c: Cashier) => void }) {
  const [sel, setSel] = useState<Cashier | null>(null);
  const [pin, setPin] = useState('');

  const submit = (value: string) => {
    if (!sel) return;
    if (value === sel.pin) { onLogin(sel); toast.success(`Welcome, ${sel.name.split(' ')[0]}`); }
    else { toast.error('Wrong PIN'); setPin(''); }
  };
  const tap = (d: string) => {
    if (d === 'del') return setPin((p) => p.slice(0, -1));
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (sel && next.length === sel.pin.length) setTimeout(() => submit(next), 120);
  };

  return (
    <div className="h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="h-14 w-14 rounded-2xl bg-[var(--color-brand)] grid place-items-center font-black text-white text-lg mx-auto">FF</span>
          <h1 className="text-xl font-black mt-3">{store?.storeName || 'FudFarmer POS'}</h1>
          <p className="text-xs text-[var(--color-ink-dim)]">{store?.deviceLabel} · Sign in to sell</p>
        </div>

        {!sel ? (
          <div className="space-y-2">
            {cashiers.filter((c) => c.isActive).map((c) => (
              <button key={c.id} onClick={() => setSel(c)}
                className="w-full h-14 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] px-4 flex items-center justify-between hover:border-[var(--color-brand)]">
                <span className="font-bold text-sm">{c.name}</span>
                <span className="text-[10px] uppercase font-black text-[var(--color-ink-dim)]">{roleLabel(c.role)}</span>
              </button>
            ))}
            <p className="text-center text-[11px] text-[var(--color-ink-dim)] pt-2">Demo PINs — Cashiers 1234 / 2345 · Manager 9999 · Finance 4444 · Admin 0000</p>
          </div>
        ) : (
          <div>
            <button onClick={() => { setSel(null); setPin(''); }} className="text-xs text-[var(--color-ink-dim)] mb-3">← {sel.name}</button>
            <div className="flex justify-center gap-2 mb-5">
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-surface-2)]'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
                <button key={i} onClick={() => tap(k)}
                  className="h-16 rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] text-xl font-black active:scale-95 transition-transform grid place-items-center">
                  {k === 'del' ? <Delete size={20} /> : k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────── Payment ─────────── */
function PaymentModal({ total, onClose, onConfirm, hasCustomer }: { total: number; onClose: () => void; onConfirm: (p: PosPayment[]) => void; hasCustomer: boolean }) {
  const [payments, setPayments] = useState<PosPayment[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [entry, setEntry] = useState('');

  const due = balanceDue(payments, total);
  const change = changeDue(payments, total);
  const entryKobo = toKobo(Number(entry) || 0);

  const add = (amountKobo: number) => {
    if (amountKobo <= 0) return;
    if (method === 'Credit' && !hasCustomer) { toast.error('Pick a customer for credit sales'); return; }
    setPayments((p) => [...p, { method, amount: amountKobo }]);
    setEntry('');
  };
  const tap = (d: string) => {
    if (d === 'del') return setEntry((e) => e.slice(0, -1));
    if (d === '.' && entry.includes('.')) return;
    setEntry((e) => (e + d).slice(0, 12));
  };

  const METHODS: { m: PaymentMethod; icon: typeof Banknote }[] = [
    { m: 'Cash', icon: Banknote }, { m: 'Transfer', icon: Smartphone },
    { m: 'Card', icon: CreditCard }, { m: 'Credit', icon: User },
  ];
  const quick = [1000, 2000, 5000, 10000];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <h2 className="font-black">Payment</h2>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-3">
          <div className="rounded-xl bg-[var(--color-surface-2)] p-3 text-center">
            <p className="text-[11px] text-[var(--color-ink-dim)]">{due > 0 ? 'Balance due' : 'Change'}</p>
            <p className={`text-3xl font-black ${due > 0 ? 'text-[var(--color-ink)]' : 'text-[var(--color-brand)]'}`}>{fmt(due > 0 ? due : change)}</p>
            <p className="text-[11px] text-[var(--color-ink-dim)] mt-0.5">Total {fmt(total)} · Paid {fmt(paid(payments))}</p>
          </div>

          {payments.length > 0 && (
            <div className="space-y-1">
              {payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-[var(--color-surface-2)] rounded-lg px-2.5 py-1.5">
                  <span className="font-bold">{p.method}</span>
                  <span className="flex items-center gap-2">{fmt(p.amount)}
                    <button onClick={() => setPayments((cur) => cur.filter((_, j) => j !== i))} className="text-[var(--color-danger)]"><X size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-4 gap-1.5">
            {METHODS.map(({ m, icon: Icon }) => (
              <button key={m} onClick={() => setMethod(m)}
                className={`h-11 rounded-lg text-[11px] font-bold border flex flex-col items-center justify-center gap-0.5 ${
                  method === m ? 'bg-[var(--color-brand)] border-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-ink-dim)]'}`}>
                <Icon size={14} /> {m}
              </button>
            ))}
          </div>

          <input value={entry} onChange={(e) => setEntry(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" inputMode="decimal"
            className="w-full h-12 px-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xl font-black text-center outline-none focus:border-[var(--color-brand)]" />

          <div className="grid grid-cols-4 gap-1.5">
            {quick.map((q) => (
              <button key={q} onClick={() => setEntry(String(q))} className="h-9 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[11px] font-bold">{q.toLocaleString()}</button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
              <button key={k} onClick={() => tap(k)}
                className="h-12 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-lg font-black grid place-items-center active:scale-95 transition-transform">
                {k === 'del' ? <Delete size={17} /> : k}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button onClick={() => add(entryKobo)} disabled={entryKobo <= 0}
              className="flex-1 h-12 rounded-xl border border-[var(--color-line)] font-bold text-sm disabled:opacity-30">Add payment</button>
            <button onClick={() => add(due)} disabled={due <= 0}
              className="flex-1 h-12 rounded-xl border border-[var(--color-line)] font-bold text-sm disabled:opacity-30">Exact {fmt(due)}</button>
          </div>

          <button onClick={() => onConfirm(payments)} disabled={due > 0 || payments.length === 0}
            className="w-full h-14 rounded-xl bg-[var(--color-brand)] text-white text-base font-black disabled:opacity-30 flex items-center justify-center gap-2">
            <Check size={18} /> Complete sale
          </button>
        </div>
      </div>
    </div>
  );
}


/* ─────────── Discount (§13) ─────────── */
function DiscountModal({
  label, base, current, maxPct, approvalPct, onClose, onApply,
}: {
  label: string; base: number; current: number; maxPct: number; approvalPct: number;
  onClose: () => void; onApply: (amountKobo: number) => void;
}) {
  const [mode, setMode] = useState<'pct' | 'amt'>('pct');
  const [v, setV] = useState(current > 0 ? (mode === 'pct' ? String(Math.round((current / base) * 100)) : String(current / 100)) : '');
  const n = Number(v) || 0;
  const amount = mode === 'pct' ? Math.round(base * (n / 100)) : toKobo(n);
  const appliedPct = base > 0 ? (amount / base) * 100 : 0;
  const overCap = appliedPct > maxPct;
  const needsApproval = appliedPct > approvalPct;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-black text-sm truncate">{label}</h2>
            <p className="text-[11px] text-[var(--color-ink-dim)]">of {fmt(base)}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>
        <div className="p-4">
          <div className="flex gap-2 mb-3">
            {(['pct', 'amt'] as const).map((k) => (
              <button key={k} onClick={() => { setMode(k); setV(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold border ${mode === k ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]' : 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-ink-dim)]'}`}>
                {k === 'pct' ? 'Percentage' : 'Fixed amount'}
              </button>
            ))}
          </div>
          <input value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
            placeholder={mode === 'pct' ? '0' : '0.00'}
            className="w-full h-12 px-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xl font-black text-center outline-none focus:border-[var(--color-brand)]" />
          <div className="flex gap-1.5 my-3">
            {(mode === 'pct' ? [5, 10, 15, 20] : [500, 1000, 2000, 5000]).map((q) => (
              <button key={q} onClick={() => setV(String(q))}
                className="flex-1 h-8 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-[11px] font-bold">
                {mode === 'pct' ? `${q}%` : fmt(q * 100)}
              </button>
            ))}
          </div>
          <div className="rounded-lg bg-[var(--color-surface-2)] p-2.5 text-xs flex justify-between">
            <span className="text-[var(--color-ink-dim)]">Discount</span>
            <span className="font-black text-amber-400">−{fmt(amount)} ({Math.round(appliedPct)}%)</span>
          </div>
          {overCap && <p className="text-[10px] text-[var(--color-danger)] mt-2">Above the {maxPct}% store limit — it will be capped.</p>}
          {!overCap && needsApproval && <p className="text-[10px] text-amber-400 mt-2">Above {approvalPct}% — a supervisor must approve at checkout.</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={() => onApply(0)} className="flex-1 h-11 rounded-xl border border-[var(--color-line)] text-xs font-bold">Remove</button>
            <button onClick={() => onApply(amount)} className="flex-1 h-11 rounded-xl bg-[var(--color-brand)] text-white text-sm font-black">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Held carts ─────────── */
function HeldModal({ held, onResume, onDiscard, onClose }: { held: HeldSale[]; onResume: (h: HeldSale) => void; onDiscard: (id: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <h2 className="font-black flex items-center gap-2"><PauseCircle size={17} /> Held carts</h2>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {held.length === 0 && <p className="text-center text-sm text-[var(--color-ink-dim)] py-8">Nothing held.</p>}
          {held.map((h) => (
            <div key={h.id} className="rounded-xl bg-[var(--color-surface-2)] p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{h.label}</p>
                <p className="text-[11px] text-[var(--color-ink-dim)]">{h.lines.length} line{h.lines.length !== 1 ? 's' : ''} · {new Date(h.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => onDiscard(h.id)} className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-danger)]"><Trash2 size={14} /></button>
                <button onClick={() => onResume(h)} className="h-9 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-black">Resume</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Customer picker ─────────── */
function CustomerModal({ customers, onPick, onClear, onClose }: { customers: PosCustomer[]; onPick: (c: PosCustomer) => void; onClear: () => void; onClose: () => void }) {
  const [q, setQ] = useState('');
  const list = customers.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone || '').includes(q));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between">
          <h2 className="font-black">Customer</h2>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>
        <div className="p-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone…"
            className="w-full h-11 px-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]" />
        </div>
        <div className="max-h-72 overflow-y-auto px-3 pb-3 space-y-1.5">
          {list.map((c) => (
            <button key={c.id} onClick={() => onPick(c)} className="w-full text-left rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 hover:border-[var(--color-brand)] border border-transparent">
              <p className="text-sm font-bold">{c.name}</p>
              {c.phone && <p className="text-[11px] text-[var(--color-ink-dim)]">{c.phone}</p>}
            </button>
          ))}
          {list.length === 0 && <p className="text-center text-xs text-[var(--color-ink-dim)] py-6">No match — walk-in sale.</p>}
        </div>
        <div className="p-3 border-t border-[var(--color-line)]">
          <button onClick={onClear} className="w-full h-10 rounded-lg border border-[var(--color-line)] text-xs font-bold text-[var(--color-ink-dim)]">Walk-in (no customer)</button>
        </div>
      </div>
    </div>
  );
}
