'use client';

import { useState } from 'react';
import { X, Delete, Printer, TrendingUp, AlertTriangle, Check, Clock } from 'lucide-react';
import { Shift, StoreProfile } from '@/lib/types';
import { ShiftReport } from '@/lib/shift';
import { fmt, toKobo } from '@/lib/money';

/* ─────────── Numeric keypad shared by the money dialogs ─────────── */
export function MoneyPad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const tap = (d: string) => {
    if (d === 'del') return onChange(value.slice(0, -1));
    if (d === '.' && value.includes('.')) return;
    onChange((value + d).slice(0, 12));
  };
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => (
        <button key={k} onClick={() => tap(k)}
          className="h-12 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-lg font-black grid place-items-center active:scale-95 transition-transform">
          {k === 'del' ? <Delete size={17} /> : k}
        </button>
      ))}
    </div>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] overflow-hidden max-h-[92vh] flex flex-col">
        <div className="p-4 border-b border-[var(--color-line)] flex items-center justify-between shrink-0">
          <h2 className="font-black">{title}</h2>
          <button onClick={onClose} className="text-[var(--color-ink-dim)]"><X size={20} /></button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ─────────── Open shift ─────────── */
export function OpenShiftModal({ cashierName, onClose, onOpen }: { cashierName: string; onClose: () => void; onOpen: (floatKobo: number) => void }) {
  const [v, setV] = useState('');
  return (
    <Shell title="Open shift" onClose={onClose}>
      <p className="text-xs text-[var(--color-ink-dim)] mb-3">Count the cash in the drawer before you start selling, {cashierName.split(' ')[0]}.</p>
      <label className="text-[11px] font-bold text-[var(--color-ink-dim)]">Opening float</label>
      <input value={v} onChange={(e) => setV(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" inputMode="decimal"
        className="w-full h-12 px-3 my-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xl font-black text-center outline-none focus:border-[var(--color-brand)]" />
      <MoneyPad value={v} onChange={setV} />
      <button onClick={() => onOpen(toKobo(Number(v) || 0))}
        className="w-full h-14 mt-3 rounded-xl bg-[var(--color-brand)] text-white font-black flex items-center justify-center gap-2">
        <Clock size={17} /> Start shift
      </button>
    </Shell>
  );
}

/* ─────────── X / Z report ─────────── */
export function ReportModal({
  report, store, kind, onClose, onConfirmClose,
}: {
  report: ShiftReport; store: StoreProfile; kind: 'X' | 'Z';
  onClose: () => void; onConfirmClose?: (countedKobo: number) => void;
}) {
  const [counted, setCounted] = useState('');
  const countedKobo = toKobo(Number(counted) || 0);
  const variance = countedKobo - report.expectedCash;
  const showVariance = kind === 'Z' && counted !== '';

  const Row = ({ label, value, bold, tone }: { label: string; value: string; bold?: boolean; tone?: 'good' | 'bad' }) => (
    <div className={`flex justify-between ${bold ? 'font-black text-sm' : 'text-xs'} ${tone === 'good' ? 'text-emerald-400' : tone === 'bad' ? 'text-[var(--color-danger)]' : ''}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );

  return (
    <Shell title={kind === 'X' ? 'X Report — mid-shift' : 'Z Report — close shift'} onClose={onClose}>
      <div className="rounded-xl bg-[var(--color-surface-2)] p-3 space-y-1.5">
        <p className="text-center text-[11px] text-[var(--color-ink-dim)]">
          {store.storeName} · {store.deviceLabel}<br />{report.shift.cashierName} · opened {new Date(report.shift.openedAt).toLocaleString('en-NG')}
        </p>
        <div className="border-t border-dashed border-[var(--color-line)] my-2" />
        <Row label={`Sales (${report.saleCount})`} value={fmt(report.grossSales)} />
        {report.refundCount > 0 && <Row label={`Refunds (${report.refundCount})`} value={`−${fmt(report.refunds)}`} tone="bad" />}
        <Row label="Net sales" value={fmt(report.netSales)} bold />
        <div className="border-t border-dashed border-[var(--color-line)] my-2" />
        {report.byMethod.map((m) => <Row key={m.method} label={`${m.method} (${m.count})`} value={fmt(m.amount)} />)}
        <div className="border-t border-dashed border-[var(--color-line)] my-2" />
        <Row label="Opening float" value={fmt(report.shift.openingFloat)} />
        <Row label="Cash sales" value={fmt(report.cashSales)} />
        {report.cashRefunds > 0 && <Row label="Cash refunds" value={`−${fmt(report.cashRefunds)}`} />}
        <Row label="Expected in drawer" value={fmt(report.expectedCash)} bold />
      </div>

      {report.topProducts.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold text-[var(--color-ink-dim)] mb-1.5 flex items-center gap-1"><TrendingUp size={12} /> TOP SELLERS</p>
          {report.topProducts.map((p) => (
            <div key={p.name} className="flex justify-between text-xs py-0.5"><span className="truncate pr-2">{p.qty}× {p.name}</span><span className="shrink-0">{fmt(p.amount)}</span></div>
          ))}
        </div>
      )}

      {kind === 'Z' && (
        <div className="mt-4">
          <label className="text-[11px] font-bold text-[var(--color-ink-dim)]">Count the drawer</label>
          <input value={counted} onChange={(e) => setCounted(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" inputMode="decimal"
            className="w-full h-12 px-3 my-2 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xl font-black text-center outline-none focus:border-[var(--color-brand)]" />
          <MoneyPad value={counted} onChange={setCounted} />
          {showVariance && (
            <div className={`mt-3 rounded-xl p-3 text-center ${variance === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-300'}`}>
              <p className="text-[11px] font-bold">{variance === 0 ? 'Drawer balances' : variance > 0 ? 'Over' : 'Short'}</p>
              <p className="text-xl font-black">{variance === 0 ? fmt(0) : `${variance > 0 ? '+' : '−'}${fmt(Math.abs(variance))}`}</p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={() => window.print()} className="flex-1 h-12 rounded-xl border border-[var(--color-line)] font-bold text-xs inline-flex items-center justify-center gap-1.5">
          <Printer size={14} /> Print
        </button>
        {kind === 'X'
          ? <button onClick={onClose} className="flex-1 h-12 rounded-xl bg-[var(--color-brand)] text-white font-bold text-xs">Back to selling</button>
          : <button onClick={() => onConfirmClose?.(countedKobo)} disabled={counted === ''}
              className="flex-1 h-12 rounded-xl bg-[var(--color-brand)] text-white font-bold text-xs disabled:opacity-30 inline-flex items-center justify-center gap-1.5">
              <Check size={14} /> Close shift
            </button>}
      </div>
    </Shell>
  );
}

/* ─────────── Supervisor PIN gate ─────────── */
export function PinGate({ title, note, onCancel, onVerify }: { title: string; note?: string; onCancel: () => void; onVerify: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  return (
    <Shell title={title} onClose={onCancel}>
      {note && <p className="text-xs text-[var(--color-ink-dim)] mb-3 flex items-start gap-1.5"><AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />{note}</p>}
      <div className="flex justify-center gap-2 my-4">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-surface-2)]'}`} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) => k === '' ? <span key={i} /> : (
          <button key={i} onClick={() => k === 'del' ? setPin((p) => p.slice(0, -1)) : setPin((p) => (p + k).slice(0, 6))}
            className="h-14 rounded-xl bg-[var(--color-surface-2)] border border-[var(--color-line)] text-xl font-black grid place-items-center active:scale-95 transition-transform">
            {k === 'del' ? <Delete size={19} /> : k}
          </button>
        ))}
      </div>
      <button onClick={() => onVerify(pin)} disabled={pin.length < 4}
        className="w-full h-12 mt-3 rounded-xl bg-[var(--color-brand)] text-white font-black text-sm disabled:opacity-30">Authorise</button>
    </Shell>
  );
}
