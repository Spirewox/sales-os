'use client';

import { useState } from 'react';
import { X, Cloud, CloudOff, Loader2, RotateCcw, Ban, Search, Receipt as ReceiptIcon, Minus, Plus } from 'lucide-react';
import { PosSale, RETURN_REASONS } from '@/lib/types';
import { fmt } from '@/lib/money';

const stateChip = (s: PosSale) => {
  if (s.syncState === 'synced') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400"><Cloud size={10} /> Synced</span>;
  if (s.syncState === 'syncing') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-400"><Loader2 size={10} className="animate-spin" /> Syncing</span>;
  if (s.syncState === 'failed') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--color-danger)]"><CloudOff size={10} /> Retrying</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400"><CloudOff size={10} /> Queued</span>;
};

/** Quantities still returnable on a sale (§11). */
export const returnableLines = (s: PosSale) =>
  s.lines.map((l) => ({ ...l, remaining: l.qty - ((s.returnedQty || {})[l.productId] || 0) }))
    .filter((l) => l.remaining > 0);

export function SalesHistory({
  sales, onClose, onRefund, onVoid, onView, canRefund = true, canVoid = true,
}: {
  sales: PosSale[];
  onClose: () => void;
  onRefund: (s: PosSale) => void;
  onVoid: (s: PosSale) => void;
  onView: (s: PosSale) => void;
  /** Straight from the permission matrix (§22) — a cashier may not void. */
  canRefund?: boolean;
  canVoid?: boolean;
}) {
  const [q, setQ] = useState('');
  // Hide reversal mirror-records from the list; the original carries the status.
  const list = sales
    .filter((s) => !s.reversalOf)
    .filter((s) => !q || s.id.toLowerCase().includes(q.toLowerCase()) || (s.customerName || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between shrink-0">
          <h2 className="font-black flex items-center gap-2"><ReceiptIcon size={17} /> Sales</h2>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>

        <div className="p-3 shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-dim)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search receipt no. or customer…"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
          {list.length === 0 && <p className="text-center text-sm text-[var(--color-ink-dim)] py-10">No sales yet.</p>}
          {list.map((s) => {
            const remaining = returnableLines(s);
            const reversed = s.status !== 'completed' || remaining.length === 0;
            return (
              <div key={s.id} className={`rounded-xl bg-[var(--color-surface-2)] p-3 ${reversed ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => onView(s)} className="text-left min-w-0 flex-1">
                    <p className="text-sm font-black">
                      {fmt(s.total)}
                      {reversed && <span className="ml-2 text-[10px] uppercase font-black text-[var(--color-danger)]">{s.status}</span>}
                    </p>
                    <p className="text-[11px] text-[var(--color-ink-dim)]">
                      {new Date(s.createdAt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })} · {s.lines.length} item{s.lines.length !== 1 ? 's' : ''} · {s.payments.map((p) => p.method).join('/')}
                      {s.customerName ? ` · ${s.customerName}` : ''}
                    </p>
                    <p className="text-[9px] text-[var(--color-ink-dim)] font-mono mt-0.5 truncate">#{s.id}</p>
                  </button>
                  <div className="shrink-0 text-right space-y-1">
                    {stateChip(s)}
                    {!reversed && (
                      <div className="flex gap-1 justify-end">
                        {canRefund && <button onClick={() => onRefund(s)} title="Refund"
                          className="h-7 px-2 rounded-md border border-[var(--color-line)] text-[10px] font-bold inline-flex items-center gap-1 hover:border-amber-400 hover:text-amber-300">
                          <RotateCcw size={10} /> Refund
                        </button>}
                        {canVoid && <button onClick={() => onVoid(s)} title="Void"
                          className="h-7 px-2 rounded-md border border-[var(--color-line)] text-[10px] font-bold inline-flex items-center gap-1 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)]">
                          <Ban size={10} /> Void
                        </button>}
                      </div>
                    )}
                    {reversed && s.refundReason && <p className="text-[10px] text-[var(--color-ink-dim)] max-w-[130px]">{s.refundReason}</p>}
                    {!reversed && s.returnedQty && Object.keys(s.returnedQty).length > 0 && (
                      <p className="text-[10px] font-bold text-amber-400">Partly returned</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─────────── Return / void with quantities + reason (§11, §12) ─────────── */
export function ReturnModal({
  sale, mode, onClose, onConfirm,
}: {
  sale: PosSale;
  mode: 'refunded' | 'voided';
  onClose: () => void;
  onConfirm: (lines: Record<string, number>, reason: string, full: boolean) => void;
}) {
  const lines = returnableLines(sale);
  const [qty, setQty] = useState<Record<string, number>>(
    Object.fromEntries(lines.map((l) => [l.productId, mode === 'voided' ? l.remaining : 0])),
  );
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]);
  const [note, setNote] = useState('');

  const soldNet = sale.lines.reduce((a, l) => a + l.lineTotal, 0);
  const refundNet = lines.reduce((a, l) => a + (l.qty > 0 ? (l.lineTotal / l.qty) * (qty[l.productId] || 0) : 0), 0);
  const refundTotal = soldNet > 0 ? Math.round(sale.total * (refundNet / soldNet)) : 0;
  const anything = Object.values(qty).some((q) => q > 0);
  const isFull = lines.every((l) => (qty[l.productId] || 0) >= l.remaining);

  const bump = (id: string, d: number, max: number) =>
    setQty((c) => ({ ...c, [id]: Math.max(0, Math.min(max, (c[id] || 0) + d)) }));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-sm">{mode === 'voided' ? 'Void sale' : 'Return items'}</h2>
            <p className="text-[11px] text-[var(--color-ink-dim)]">#{sale.id.slice(-12)} · {fmt(sale.total)}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.productId} className="rounded-xl bg-[var(--color-surface-2)] p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{l.name}</p>
                    <p className="text-[10px] text-[var(--color-ink-dim)]">{l.remaining} {l.unit} returnable · {fmt(l.lineTotal / l.qty)} each</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => bump(l.productId, -1, l.remaining)} className="h-7 w-7 grid place-items-center rounded-md bg-[var(--color-surface)] border border-[var(--color-line)]"><Minus size={12} /></button>
                    <span className="w-8 text-center text-sm font-black">{qty[l.productId] || 0}</span>
                    <button onClick={() => bump(l.productId, 1, l.remaining)} className="h-7 w-7 grid place-items-center rounded-md bg-[var(--color-surface)] border border-[var(--color-line)]"><Plus size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
            {lines.length === 0 && <p className="text-center text-sm text-[var(--color-ink-dim)] py-6">Nothing left to return.</p>}
          </div>

          <div>
            <label className="text-[11px] font-bold text-[var(--color-ink-dim)]">Reason</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 px-2 mt-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none">
              {RETURN_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add detail (optional)"
              className="w-full h-10 px-3 mt-2 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]" />
          </div>

          <div className="rounded-xl bg-[var(--color-surface-2)] p-3 flex items-center justify-between">
            <span className="text-xs text-[var(--color-ink-dim)]">{isFull ? 'Full refund' : 'Partial refund'}</span>
            <span className="text-lg font-black text-[var(--color-brand)]">{fmt(refundTotal)}</span>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--color-line)] shrink-0">
          <button disabled={!anything}
            onClick={() => onConfirm(qty, note.trim() ? `${reason} — ${note.trim()}` : reason, isFull)}
            className="w-full h-12 rounded-xl bg-[var(--color-brand)] text-white font-black text-sm disabled:opacity-30">
            {mode === 'voided' ? 'Void' : 'Refund'} {refundTotal > 0 ? fmt(refundTotal) : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
