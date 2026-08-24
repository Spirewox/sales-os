'use client';

import { useState, useMemo } from 'react';
import {
  X, Users, Scale, AlertTriangle, CheckCircle2, Clock, CloudOff, Printer,
  TrendingUp, Receipt, Percent, RotateCcw, ShieldCheck, ChevronDown, ChevronUp,
  ListOrdered, Boxes, Search, Cloud, Loader2, Save, LifeBuoy,
} from 'lucide-react';
import { PosSale, Shift, Cashier, StoreProfile, PosProduct, AssistRequest, ResolutionKind } from '@/lib/types';
import { AssistQueue } from './assist-panels';
import { openCount } from '@/lib/assist';
import {
  cashierPerformance, reconcileDay, closingInventory, todayStr, dayOf,
  CashierPerf, DayReconciliation, ClosingInventory,
} from '@/lib/supervisor';
import { fmt } from '@/lib/money';

type Tab = 'assist' | 'cashiers' | 'transactions' | 'stock' | 'reconcile';

export function SupervisorView({
  sales, shifts, cashiers, catalog, store, unsynced, stockCounts, onSaveCount,
  assists, onClaimAssist, onResolveAssist, onCancelAssist, onClose,
}: {
  sales: PosSale[]; shifts: Shift[]; cashiers: Cashier[]; catalog: PosProduct[];
  store: StoreProfile; unsynced: number;
  /** day → (productId → counted qty) */
  stockCounts: Record<string, Record<string, number>>;
  onSaveCount: (day: string, counts: Record<string, number>) => void;
  assists: AssistRequest[];
  onClaimAssist: (a: AssistRequest) => void;
  onResolveAssist: (a: AssistRequest, kind: ResolutionKind, note: string, payload: { productId?: string; newValue?: number; amount?: number }) => void;
  onCancelAssist: (a: AssistRequest) => void;
  onClose: () => void;
}) {
  const waiting = openCount(assists);
  const [tab, setTab] = useState<Tab>(waiting > 0 ? 'assist' : 'cashiers');
  const [day, setDay] = useState(todayStr());
  const [expanded, setExpanded] = useState<string | null>(null);

  const perf = useMemo(() => cashierPerformance(sales, shifts, cashiers, day), [sales, shifts, cashiers, day]);
  const recon = useMemo(() => reconcileDay(sales, shifts, day, unsynced, assists), [sales, shifts, day, unsynced, assists]);
  const stock = useMemo(() => closingInventory(catalog, sales, day, stockCounts[day]), [catalog, sales, day, stockCounts]);
  const dayTxns = useMemo(
    () => sales.filter((s) => dayOf(s.createdAt) === day).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, day],
  );

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
      {/* header */}
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck size={18} className="text-[var(--color-brand)] shrink-0" />
          <div className="min-w-0">
            <h2 className="font-black text-sm truncate">Supervisor</h2>
            <p className="text-[11px] text-[var(--color-ink-dim)] truncate">{store.storeName} · {store.deviceLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
            className="h-9 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs outline-none" />
          <button onClick={() => window.print()} className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink-dim)]">
            <Printer size={15} />
          </button>
          <button onClick={onClose} className="h-9 w-9 grid place-items-center rounded-lg border border-[var(--color-line)]"><X size={17} /></button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex gap-1 px-4 pt-3 shrink-0 overflow-x-auto">
        {([
          ['assist', waiting > 0 ? `Assist (${waiting})` : 'Assist', LifeBuoy],
          ['cashiers', 'Cashiers', Users],
          ['transactions', `Transactions (${dayTxns.length})`, ListOrdered],
          ['stock', 'Closing Stock', Boxes],
          ['reconcile', 'Reconciliation', Scale],
        ] as [Tab, string, typeof Users][]).map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${tab === k ? 'bg-[var(--color-brand)] text-white' : k === 'assist' && waiting > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-[var(--color-surface-2)] text-[var(--color-ink-dim)]'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'assist' && <AssistQueue assists={assists} catalog={catalog} onClaim={onClaimAssist} onResolve={onResolveAssist} onCancel={onCancelAssist} />}
        {tab === 'cashiers' && <CashierTab perf={perf} expanded={expanded} setExpanded={setExpanded} />}
        {tab === 'transactions' && <TransactionsTab txns={dayTxns} cashiers={cashiers} expanded={expanded} setExpanded={setExpanded} />}
        {tab === 'stock' && <StockTab stock={stock} day={day} onSaveCount={onSaveCount} />}
        {tab === 'reconcile' && <ReconcileTab recon={recon} stock={stock} />}
      </div>
    </div>
  );
}

/* ─────────── Cashier performance ─────────── */
function CashierTab({ perf, expanded, setExpanded }: { perf: CashierPerf[]; expanded: string | null; setExpanded: (v: string | null) => void }) {
  if (perf.length === 0) {
    return <p className="text-center text-sm text-[var(--color-ink-dim)] py-16">No cashier activity on this day.</p>;
  }
  const best = perf[0];
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {best.net > 0 && (
        <div className="rounded-xl bg-[var(--color-brand)]/10 border border-[var(--color-brand)]/30 p-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--color-brand)] shrink-0" />
          <p className="text-xs"><b>{best.cashierName.split(' (')[0]}</b> leads with {fmt(best.net)} net across {best.transactions} sales.</p>
        </div>
      )}

      {perf.map((p) => {
        const open = expanded === p.cashierId;
        return (
          <div key={p.cashierId} className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
            <button onClick={() => setExpanded(open ? null : p.cashierId)} className="w-full p-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{p.cashierName}</p>
                  <p className="text-[11px] text-[var(--color-ink-dim)]">
                    {p.transactions} sales · {p.itemsSold} items · {p.hours > 0 ? `${p.hours.toFixed(1)}h` : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black">{fmt(p.net)}</p>
                  <p className="text-[10px] text-[var(--color-ink-dim)]">net</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3">
                <Mini label="Avg basket" value={fmt(p.avgBasket)} />
                <Mini label="Cash taken" value={fmt(p.cashTaken)} />
                <Mini label="Per hour" value={p.salesPerHour > 0 ? fmt(p.salesPerHour) : '—'} />
              </div>

              {p.flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {p.flags.map((f, i) => (
                    <span key={i} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${f.level === 'high' ? 'bg-[var(--color-danger)]/15 text-[var(--color-danger)]' : 'bg-amber-500/15 text-amber-300'}`}>
                      <AlertTriangle size={9} /> {f.text}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex justify-center mt-1.5 text-[var(--color-ink-dim)]">
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {open && (
              <div className="px-3 pb-3 space-y-2 border-t border-[var(--color-line)] pt-3">
                <Row icon={Receipt} label="Gross sales" value={fmt(p.gross)} />
                <Row icon={RotateCcw} label={`Refunds (${p.refundCount})`} value={p.refunds > 0 ? `−${fmt(p.refunds)}` : fmt(0)} tone={p.refunds > 0 ? 'bad' : undefined} />
                <Row icon={Percent} label="Discounts given" value={fmt(p.discountGiven)} tone={p.discountGiven > 0 ? 'warn' : undefined} />
                <Row icon={Scale} label="Drawer variance" value={p.variance === 0 ? 'Balanced' : `${p.variance > 0 ? '+' : '−'}${fmt(Math.abs(p.variance))}`} tone={p.variance === 0 ? 'good' : p.variance < 0 ? 'bad' : 'warn'} />
                {p.byMethod.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[10px] font-bold text-[var(--color-ink-dim)] mb-1">PAYMENT MIX</p>
                    {p.byMethod.map((m) => (
                      <div key={m.method} className="flex justify-between text-xs py-0.5">
                        <span>{m.method}</span><span className="font-semibold">{fmt(m.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Transaction journal ─────────── */
const syncChip = (s: PosSale) => {
  if (s.syncState === 'synced') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400"><Cloud size={9} /> Synced</span>;
  if (s.syncState === 'syncing') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400"><Loader2 size={9} className="animate-spin" /> Syncing</span>;
  if (s.syncState === 'failed') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-danger)]"><CloudOff size={9} /> Retrying</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400"><CloudOff size={9} /> Queued</span>;
};

function TransactionsTab({
  txns, cashiers, expanded, setExpanded,
}: { txns: PosSale[]; cashiers: Cashier[]; expanded: string | null; setExpanded: (v: string | null) => void }) {
  const [q, setQ] = useState('');
  const [who, setWho] = useState('all');
  const [kind, setKind] = useState<'all' | 'sales' | 'reversals'>('all');

  const list = txns
    .filter((t) => who === 'all' || t.cashierId === who)
    .filter((t) => kind === 'all' || (kind === 'sales' ? !t.reversalOf : !!t.reversalOf))
    .filter((t) => !q || t.id.toLowerCase().includes(q.toLowerCase())
      || (t.customerName || '').toLowerCase().includes(q.toLowerCase())
      || t.lines.some((l) => l.name.toLowerCase().includes(q.toLowerCase())));

  const gross = list.filter((t) => !t.reversalOf).reduce((a, t) => a + t.total, 0);

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {/* filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search receipt, customer or product…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <select value={who} onChange={(e) => setWho(e.target.value)}
            className="h-8 px-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs outline-none shrink-0">
            <option value="all">All cashiers</option>
            {cashiers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {(['all', 'sales', 'reversals'] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)}
              className={`h-8 px-2.5 rounded-lg text-xs font-bold shrink-0 border ${kind === k ? 'bg-[var(--color-brand)] text-white border-[var(--color-brand)]' : 'bg-[var(--color-surface-2)] border-[var(--color-line)] text-[var(--color-ink-dim)]'}`}>
              {k === 'all' ? 'All' : k === 'sales' ? 'Sales' : 'Refunds/Voids'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--color-ink-dim)] px-1">
        <span>{list.length} transaction{list.length !== 1 ? 's' : ''}</span>
        <span>Gross {fmt(gross)}</span>
      </div>

      {list.length === 0 && <p className="text-center text-sm text-[var(--color-ink-dim)] py-12">No transactions match.</p>}

      {list.map((t) => {
        const open = expanded === t.id;
        const reversed = !!t.reversalOf;
        return (
          <div key={t.id} className={`rounded-xl bg-[var(--color-surface)] border overflow-hidden ${reversed ? 'border-[var(--color-danger)]/30' : 'border-[var(--color-line)]'}`}>
            <button onClick={() => setExpanded(open ? null : t.id)} className="w-full p-3 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black">{fmt(t.total)}</p>
                    {reversed && <span className="text-[9px] uppercase font-black text-[var(--color-danger)]">{t.status}</span>}
                  </div>
                  <p className="text-[11px] text-[var(--color-ink-dim)]">
                    {new Date(t.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {t.cashierName.split(' (')[0]} · {t.lines.length} line{t.lines.length !== 1 ? 's' : ''}
                    {t.customerName ? ` · ${t.customerName}` : ''}
                  </p>
                  <p className="text-[9px] font-mono text-[var(--color-ink-dim)] mt-0.5 truncate">#{t.id}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  {syncChip(t)}
                  <p className="text-[10px] text-[var(--color-ink-dim)]">{t.payments.map((p) => p.method).join(' + ')}</p>
                </div>
              </div>
              <div className="flex justify-center mt-1 text-[var(--color-ink-dim)]">{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</div>
            </button>

            {open && (
              <div className="px-3 pb-3 border-t border-[var(--color-line)] pt-2.5 space-y-2">
                <div>
                  {t.lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5">
                      <span className="truncate pr-2">{l.qty} {l.unit} × {l.name}{l.discount ? ` (−${fmt(l.discount)})` : ''}</span>
                      <span className="shrink-0 font-semibold">{fmt(l.lineTotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-dashed border-[var(--color-line)] pt-1.5 space-y-0.5 text-xs">
                  <Line label="Subtotal" value={fmt(t.subtotal)} />
                  {t.discount !== 0 && <Line label="Discount" value={`−${fmt(Math.abs(t.discount))}`} />}
                  <Line label="Total" value={fmt(t.total)} strong />
                  {t.payments.map((p, i) => <Line key={i} label={`Paid — ${p.method}`} value={fmt(p.amount)} />)}
                  {t.change > 0 && <Line label="Change" value={fmt(t.change)} />}
                </div>
                {reversed && t.refundedBy && (
                  <p className="text-[10px] text-[var(--color-danger)] flex items-center gap-1">
                    <AlertTriangle size={10} /> {t.status} by {t.refundedBy}{t.refundReason ? ` — ${t.refundReason}` : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Closing stock ─────────── */
function StockTab({ stock, day, onSaveCount }: { stock: ClosingInventory; day: string; onSaveCount: (day: string, c: Record<string, number>) => void }) {
  const [counting, setCounting] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [onlyMoved, setOnlyMoved] = useState(true);

  const rows = onlyMoved && stock.movedRows.length > 0 ? stock.movedRows : stock.rows;

  const save = () => {
    const counts: Record<string, number> = {};
    Object.entries(draft).forEach(([id, v]) => { if (v !== '') counts[id] = Number(v); });
    onSaveCount(day, counts);
    setCounting(false);
    setDraft({});
  };

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {/* summary */}
      <div className="grid grid-cols-3 gap-2">
        <Mini label="Units sold" value={String(stock.totalSoldUnits)} />
        <Mini label="Closing value" value={fmt(stock.totalClosingValue)} strong />
        <Mini label="Counted" value={`${stock.countedProducts}/${stock.rows.length}`} />
      </div>

      {stock.countedProducts > 0 && (
        <div className={`rounded-xl p-3 border flex items-start gap-2 ${stock.totalVarianceUnits === 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30'}`}>
          {stock.totalVarianceUnits === 0
            ? <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
            : <AlertTriangle size={16} className="text-[var(--color-danger)] mt-0.5 shrink-0" />}
          <div className="text-xs">
            {stock.totalVarianceUnits === 0
              ? <p><b>Stock matches.</b> {stock.countedProducts} product(s) counted, no discrepancy.</p>
              : <p><b>{stock.discrepancies.length} discrepanc{stock.discrepancies.length === 1 ? 'y' : 'ies'}</b> — {stock.totalVarianceUnits > 0 ? '+' : ''}{stock.totalVarianceUnits} units ({stock.totalVarianceValue < 0 ? '−' : ''}{fmt(Math.abs(stock.totalVarianceValue))} at cost).</p>}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setOnlyMoved((v) => !v)}
          className="h-8 px-2.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] text-xs font-bold text-[var(--color-ink-dim)]">
          {onlyMoved ? 'Showing moved only' : 'Showing all products'}
        </button>
        {counting
          ? <div className="flex gap-1.5">
              <button onClick={() => { setCounting(false); setDraft({}); }} className="h-8 px-2.5 rounded-lg border border-[var(--color-line)] text-xs font-bold">Cancel</button>
              <button onClick={save} className="h-8 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-black inline-flex items-center gap-1.5"><Save size={12} /> Save count</button>
            </div>
          : <button onClick={() => setCounting(true)} className="h-8 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-black">Enter stock count</button>}
      </div>

      {/* table */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 text-[10px] font-bold text-[var(--color-ink-dim)] border-b border-[var(--color-line)]">
          <span>PRODUCT</span><span className="text-right w-10">OPEN</span><span className="text-right w-10">SOLD</span><span className="text-right w-12">CLOSE</span><span className="text-right w-16">{counting ? 'COUNT' : 'VAR'}</span>
        </div>
        <div className="divide-y divide-[var(--color-line)]">
          {rows.map((r) => (
            <div key={r.productId} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-2 items-center">
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{r.name}</p>
                <p className="text-[10px] text-[var(--color-ink-dim)]">{r.unit} · {fmt(r.closingValue)}{r.returned > 0 ? ` · ${r.returned} returned` : ''}</p>
              </div>
              <span className="text-xs text-right w-10 text-[var(--color-ink-dim)]">{r.opening}</span>
              <span className="text-xs text-right w-10 font-semibold">{r.sold || '—'}</span>
              <span className="text-xs text-right w-12 font-bold">{r.expectedClosing}</span>
              <span className="text-right w-16">
                {counting ? (
                  <input value={draft[r.productId] ?? (r.counted != null ? String(r.counted) : '')}
                    onChange={(e) => setDraft((d) => ({ ...d, [r.productId]: e.target.value.replace(/[^\d-]/g, '') }))}
                    inputMode="numeric" placeholder="—"
                    className="w-16 h-7 px-1 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xs text-right outline-none focus:border-[var(--color-brand)]" />
                ) : r.variance == null ? (
                  <span className="text-xs text-[var(--color-ink-dim)]">—</span>
                ) : (
                  <span className={`text-xs font-black ${r.variance === 0 ? 'text-emerald-400' : 'text-[var(--color-danger)]'}`}>
                    {r.variance === 0 ? '✓' : r.variance > 0 ? `+${r.variance}` : r.variance}
                  </span>
                )}
              </span>
            </div>
          ))}
          {rows.length === 0 && <p className="p-8 text-center text-sm text-[var(--color-ink-dim)]">No stock movement on this day.</p>}
        </div>
      </div>
      <p className="text-[10px] text-[var(--color-ink-dim)] px-1">
        Opening is derived from live stock: <b>opening = closing + sold − returned</b>. Enter a physical count to reveal shrinkage.
      </p>
    </div>
  );
}

/* ─────────── Day reconciliation ─────────── */
function ReconcileTab({ recon, stock }: { recon: DayReconciliation; stock: ClosingInventory }) {
  const varTone = recon.totalVariance === 0 ? 'good' : recon.totalVariance < 0 ? 'bad' : 'warn';
  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {/* status banner */}
      <div className={`rounded-xl p-3 flex items-start gap-2 border ${
        recon.canClose && recon.balanced ? 'bg-emerald-500/10 border-emerald-500/30'
          : recon.openShifts > 0 || recon.unsynced > 0 ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30'}`}>
        {recon.canClose && recon.balanced
          ? <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
          : <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />}
        <div className="text-xs">
          {recon.openShifts > 0 && <p><b>{recon.openShifts} shift(s) still open</b> — close them (Z report) before reconciling.</p>}
          {recon.unsynced > 0 && <p className="flex items-center gap-1"><CloudOff size={11} /> {recon.unsynced} record(s) not yet synced.</p>}
          {recon.openShifts === 0 && recon.unsynced === 0 && (
            recon.balanced
              ? <p><b>Day balances.</b> Every shift closed, everything synced.</p>
              : <p><b>Day is out by {recon.totalVariance > 0 ? '+' : '−'}{fmt(Math.abs(recon.totalVariance))}.</b> Review the shifts below.</p>
          )}
          {recon.shifts.length === 0 && <p>No shifts recorded on this day.</p>}
        </div>
      </div>

      {/* trading summary */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] p-3">
        <p className="text-[10px] font-bold text-[var(--color-ink-dim)] mb-2">TRADING</p>
        <div className="grid grid-cols-3 gap-2">
          <Mini label={`Sales (${recon.transactions})`} value={fmt(recon.gross)} />
          <Mini label="Refunds" value={recon.refunds > 0 ? `−${fmt(recon.refunds)}` : fmt(0)} />
          <Mini label="Net" value={fmt(recon.net)} strong />
        </div>
        {recon.byMethod.length > 0 && (
          <div className="mt-3 space-y-1">
            {recon.byMethod.map((m) => (
              <div key={m.method} className="flex justify-between text-xs"><span className="text-[var(--color-ink-dim)]">{m.method}</span><span className="font-semibold">{fmt(m.amount)}</span></div>
            ))}
          </div>
        )}
      </div>

      {/* cash reconciliation */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] p-3">
        <p className="text-[10px] font-bold text-[var(--color-ink-dim)] mb-2">CASH RECONCILIATION</p>
        <div className="space-y-1 text-xs">
          <Line label="Opening floats" value={fmt(recon.totalFloat)} />
          <Line label="Cash sales" value={fmt(recon.totalCashSales)} />
          {recon.totalCashRefunds > 0 && <Line label="Cash refunds" value={`−${fmt(recon.totalCashRefunds)}`} />}
          {recon.totalCashDrops > 0 && <Line label="Cash drops (removed)" value={`−${fmt(recon.totalCashDrops)}`} />}
          <div className="border-t border-dashed border-[var(--color-line)] my-1.5" />
          <Line label="Expected in drawers" value={fmt(recon.totalExpected)} strong />
          <Line label="Counted" value={fmt(recon.totalCounted)} strong />
          <div className={`flex justify-between font-black text-sm pt-1 ${varTone === 'good' ? 'text-emerald-400' : varTone === 'bad' ? 'text-[var(--color-danger)]' : 'text-amber-300'}`}>
            <span>{recon.totalVariance === 0 ? 'Balanced' : recon.totalVariance > 0 ? 'Over' : 'Short'}</span>
            <span>{recon.totalVariance === 0 ? fmt(0) : `${recon.totalVariance > 0 ? '+' : '−'}${fmt(Math.abs(recon.totalVariance))}`}</span>
          </div>
        </div>
      </div>

      {/* stock position */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] p-3">
        <p className="text-[10px] font-bold text-[var(--color-ink-dim)] mb-2">CLOSING STOCK</p>
        <div className="space-y-1 text-xs">
          <Line label="Units sold today" value={String(stock.totalSoldUnits)} />
          <Line label="Closing stock value (at cost)" value={fmt(stock.totalClosingValue)} strong />
          <Line label="Products counted" value={`${stock.countedProducts} of ${stock.rows.length}`} />
          {stock.countedProducts > 0 && (
            <div className={`flex justify-between font-black pt-1 ${stock.totalVarianceUnits === 0 ? 'text-emerald-400' : 'text-[var(--color-danger)]'}`}>
              <span>{stock.totalVarianceUnits === 0 ? 'Stock matches' : `${stock.discrepancies.length} discrepanc${stock.discrepancies.length === 1 ? 'y' : 'ies'}`}</span>
              <span>{stock.totalVarianceUnits === 0 ? '✓' : `${stock.totalVarianceUnits > 0 ? '+' : ''}${stock.totalVarianceUnits} u · ${stock.totalVarianceValue < 0 ? '−' : ''}${fmt(Math.abs(stock.totalVarianceValue))}`}</span>
            </div>
          )}
          {stock.countedProducts === 0 && <p className="text-[10px] text-amber-300 pt-1">No stock count entered — cash is reconciled but stock is not.</p>}
        </div>
      </div>

      {/* per-shift breakdown */}
      {recon.shifts.length > 0 && (
        <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden">
          <p className="text-[10px] font-bold text-[var(--color-ink-dim)] p-3 pb-2">SHIFTS</p>
          <div className="divide-y divide-[var(--color-line)]">
            {recon.shifts.map((r) => (
              <div key={r.shift.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{r.shift.cashierName}</p>
                  <p className="text-[10px] text-[var(--color-ink-dim)] flex items-center gap-1">
                    <Clock size={9} />
                    {new Date(r.shift.openedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    {r.shift.closedAt ? ` – ${new Date(r.shift.closedAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ' · open'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {r.reconciled ? (
                    <>
                      <p className={`text-xs font-black ${r.variance === 0 ? 'text-emerald-400' : (r.variance || 0) < 0 ? 'text-[var(--color-danger)]' : 'text-amber-300'}`}>
                        {r.variance === 0 ? 'Balanced' : `${(r.variance || 0) > 0 ? '+' : '−'}${fmt(Math.abs(r.variance || 0))}`}
                      </p>
                      <p className="text-[10px] text-[var(--color-ink-dim)]">exp {fmt(r.expected)} · counted {fmt(r.counted || 0)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-amber-300">Not reconciled</p>
                      <p className="text-[10px] text-[var(--color-ink-dim)]">expected {fmt(r.expected)}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── bits ─────────── */
function Mini({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-[var(--color-surface-2)] p-2">
      <p className="text-[9px] text-[var(--color-ink-dim)] truncate">{label}</p>
      <p className={`${strong ? 'text-sm font-black' : 'text-xs font-bold'} truncate`}>{value}</p>
    </div>
  );
}
function Row({ icon: Icon, label, value, tone }: { icon: typeof Receipt; label: string; value: string; tone?: 'good' | 'bad' | 'warn' }) {
  const c = tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-[var(--color-danger)]' : tone === 'warn' ? 'text-amber-300' : '';
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="inline-flex items-center gap-1.5 text-[var(--color-ink-dim)]"><Icon size={12} /> {label}</span>
      <span className={`font-bold ${c}`}>{value}</span>
    </div>
  );
}
function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? 'font-black' : ''}`}><span className={strong ? '' : 'text-[var(--color-ink-dim)]'}>{label}</span><span>{value}</span></div>;
}
