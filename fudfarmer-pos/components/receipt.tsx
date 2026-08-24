'use client';

import { X, Printer, CloudOff, Cloud, Check } from 'lucide-react';
import { PosSale, StoreProfile } from '@/lib/types';
import { fmt } from '@/lib/money';

/** Post-sale receipt. Renders from the locally-stored sale — works fully offline. */
export function Receipt({ sale, store, onClose }: { sale: PosSale; store: StoreProfile; onClose: () => void }) {
  const when = new Date(sale.createdAt);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/70">
      <div className="w-full max-w-xs rounded-2xl bg-white text-black overflow-hidden">
        <div className="p-3 border-b border-black/10 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700"><Check size={14} /> Sale complete</span>
          <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
        </div>

        <div className="p-4 font-mono text-[11px] leading-relaxed max-h-[60vh] overflow-y-auto">
          <div className="text-center">
            <p className="font-black text-sm">{store.storeName}</p>
            <p>{store.deviceLabel} · {sale.cashierName}</p>
            <p>{when.toLocaleString('en-NG')}</p>
            <p className="mt-1 break-all text-[9px] text-black/50">#{sale.id}</p>
          </div>

          <div className="my-2 border-t border-dashed border-black/30" />

          {sale.lines.map((l) => (
            <div key={l.productId} className="flex justify-between gap-2">
              <span className="flex-1">{l.qty}× {l.name}</span>
              <span>{fmt(l.lineTotal)}</span>
            </div>
          ))}

          <div className="my-2 border-t border-dashed border-black/30" />

          <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sale.subtotal)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>−{fmt(sale.discount)}</span></div>}
          {sale.tax ? (
            <div className="flex justify-between">
              <span>{store.taxLabel || 'Tax'} {sale.taxRatePct ? `${sale.taxRatePct}%` : ''}{store.taxInclusive ? ' (incl.)' : ''}</span>
              <span>{fmt(sale.tax)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-black text-sm"><span>TOTAL</span><span>{fmt(sale.total)}</span></div>

          <div className="my-2 border-t border-dashed border-black/30" />

          {sale.payments.map((p, i) => (
            <div key={i} className="flex justify-between"><span>{p.method}</span><span>{fmt(p.amount)}</span></div>
          ))}
          {sale.change > 0 && <div className="flex justify-between font-bold"><span>Change</span><span>{fmt(sale.change)}</span></div>}
          {sale.customerName && <p className="mt-1">Customer: {sale.customerName}</p>}

          <p className="text-center mt-3">{store.receiptFooter}</p>

          <div className={`mt-3 text-center text-[10px] font-bold ${sale.syncState === 'synced' ? 'text-emerald-700' : 'text-amber-700'}`}>
            {sale.syncState === 'synced'
              ? <span className="inline-flex items-center gap-1"><Cloud size={11} /> Synced to head office</span>
              : <span className="inline-flex items-center gap-1"><CloudOff size={11} /> Saved on this device — syncs when online</span>}
          </div>
        </div>

        <div className="p-3 border-t border-black/10 flex gap-2">
          <button onClick={() => window.print()} className="flex-1 h-11 rounded-xl border border-black/15 font-bold text-xs inline-flex items-center justify-center gap-1.5">
            <Printer size={14} /> Print
          </button>
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-bold text-xs">New sale</button>
        </div>
      </div>
    </div>
  );
}
