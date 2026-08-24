'use client';

/**
 * POS Settings (§25) — the configurable surface behind the till.
 *
 * Gated by the `settings.manage` permission, so only Super Admin reaches it.
 * It also renders the live permission matrix (§22) read-only, so a manager can
 * see exactly what each role may do without digging through code.
 */

import { useState } from 'react';
import {
  X, Settings as Cog, Receipt, Percent, RotateCcw, ShieldCheck, Store,
  Wifi, Hash, Save, Check, Minus,
} from 'lucide-react';
import { StoreProfile, Cashier } from '@/lib/types';
import { PERMISSIONS, POS_ROLES, MATRIX, roleLabel, PosRole } from '@/lib/permissions';

type Tab = 'store' | 'tax' | 'discounts' | 'returns' | 'offline' | 'permissions' | 'staff';

const TABS: { key: Tab; label: string; icon: typeof Cog }[] = [
  { key: 'store', label: 'Store & receipt', icon: Store },
  { key: 'tax', label: 'Tax', icon: Receipt },
  { key: 'discounts', label: 'Discounts', icon: Percent },
  { key: 'returns', label: 'Returns', icon: RotateCcw },
  { key: 'offline', label: 'Offline & device', icon: Wifi },
  { key: 'permissions', label: 'Permissions', icon: ShieldCheck },
  { key: 'staff', label: 'Staff', icon: Hash },
];

export function SettingsPanel({
  store, cashiers, onSave, onClose,
}: {
  store: StoreProfile;
  cashiers: Cashier[];
  onSave: (patch: Partial<StoreProfile>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('store');
  const [draft, setDraft] = useState<StoreProfile>(store);
  const dirty = JSON.stringify(draft) !== JSON.stringify(store);
  const set = <K extends keyof StoreProfile>(k: K, v: StoreProfile[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg)] flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--color-line)] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Cog size={18} className="text-[var(--color-brand)] shrink-0" />
          <div className="min-w-0">
            <h2 className="font-black text-sm">POS Settings</h2>
            <p className="text-[11px] text-[var(--color-ink-dim)] truncate">{store.storeName} · {store.deviceLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && (
            <button onClick={() => onSave(draft)}
              className="h-9 px-3 rounded-lg bg-[var(--color-brand)] text-white text-xs font-black inline-flex items-center gap-1.5">
              <Save size={13} /> Save
            </button>
          )}
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-[var(--color-line)] text-xs font-bold inline-flex items-center gap-1.5">
            <X size={14} /> Close
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 shrink-0">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${tab === t.key ? 'bg-[var(--color-brand)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-ink-dim)]'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {tab === 'store' && (
            <Card title="Store information">
              <Text label="Store name" value={draft.storeName} onChange={(v) => set('storeName', v)} />
              <Text label="Receipt footer" value={draft.receiptFooter || ''} onChange={(v) => set('receiptFooter', v)} />
              <Text label="Currency" value={draft.currency} onChange={(v) => set('currency', v)} />
              <Read label="Store type" value={draft.storeType} />
            </Card>
          )}

          {tab === 'tax' && (
            <Card title="Tax" hint="Inclusive means shelf prices already contain tax — the total is unchanged and the tax is simply shown. Exclusive adds it at checkout.">
              <Num label="Rate %" value={draft.taxRatePct} step={0.5} onChange={(v) => set('taxRatePct', v)} />
              <Text label="Label on receipt" value={draft.taxLabel} onChange={(v) => set('taxLabel', v)} />
              <Toggle label="Prices include tax" value={draft.taxInclusive} onChange={(v) => set('taxInclusive', v)} />
              {draft.taxRatePct === 0 && <p className="text-[11px] text-amber-400">Rate is 0 — no tax will be charged or shown.</p>}
            </Card>
          )}

          {tab === 'discounts' && (
            <Card title="Discount rules" hint="Anything above the approval threshold blocks checkout until someone with Approve Discount authorises it.">
              <Num label="Needs approval above %" value={draft.discountApprovalThresholdPct} onChange={(v) => set('discountApprovalThresholdPct', v)} />
              <Num label="Hard maximum %" value={draft.maxDiscountPct} onChange={(v) => set('maxDiscountPct', v)} />
              {draft.discountApprovalThresholdPct > draft.maxDiscountPct && (
                <p className="text-[11px] text-[var(--color-danger)]">Threshold is above the maximum — approval would never trigger.</p>
              )}
            </Card>
          )}

          {tab === 'returns' && (
            <Card title="Returns & refunds" hint="Every return needs approval from a role holding Approve Refund, and captures a reason.">
              <Read label="Approval required" value="Always" />
              <Read label="Reason required" value="Always" />
              <Read label="Partial returns" value="Allowed — quantity per line" />
              <Read label="Stock restored" value="Pro-rata on return" />
            </Card>
          )}

          {tab === 'offline' && (
            <Card title="Offline behaviour & device">
              <Toggle label="Allow selling below zero stock offline" value={draft.allowNegativeStock} onChange={(v) => set('allowNegativeStock', v)} />
              <Read label="Device ID" value={draft.deviceId} />
              <Text label="Terminal name" value={draft.deviceLabel} onChange={(v) => set('deviceLabel', v)} />
              <Read label="Transaction numbering" value="deviceId + timestamp (collision-free across tills)" />
            </Card>
          )}

          {tab === 'permissions' && (
            <Card title="Permission matrix" hint="Read-only view of what each role may do (§22). Limited = allowed within bounds — e.g. a cashier may discount up to the threshold, or see only their own reconciliation.">
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase text-[var(--color-ink-dim)]">
                      <th className="text-left py-2 pr-2 font-bold">Permission</th>
                      {POS_ROLES.map((r) => <th key={r.key} className="text-center px-1 font-bold">{r.label.split(' ')[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {PERMISSIONS.map((p) => (
                      <tr key={p.key}>
                        <td className="py-1.5 pr-2">{p.label}</td>
                        {POS_ROLES.map((r) => {
                          const lv = MATRIX[r.key as PosRole][p.key];
                          return (
                            <td key={r.key} className="text-center px-1">
                              {lv === 'full' ? <Check size={13} className="inline text-emerald-400" />
                                : lv === 'limited' ? <span className="text-[9px] font-bold text-amber-400">LTD</span>
                                : <Minus size={12} className="inline text-[var(--color-ink-dim)] opacity-40" />}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {tab === 'staff' && (
            <Card title="Staff on this till">
              <div className="divide-y divide-[var(--color-line)]">
                {cashiers.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-[11px] text-[var(--color-ink-dim)]">{roleLabel(c.role)}</p>
                    </div>
                    <span className={`text-[10px] font-black ${c.isActive ? 'text-emerald-400' : 'text-[var(--color-ink-dim)]'}`}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── field primitives ─────────── */
function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-line)] p-4">
      <h3 className="text-sm font-black">{title}</h3>
      {hint && <p className="text-[11px] text-[var(--color-ink-dim)] mt-0.5 mb-3">{hint}</p>}
      <div className={hint ? 'space-y-3' : 'space-y-3 mt-3'}>{children}</div>
    </div>
  );
}
const inputCls = 'w-full h-10 px-3 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-line)] text-sm outline-none focus:border-[var(--color-brand)]';
function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <label className="block"><span className="text-[11px] font-bold text-[var(--color-ink-dim)]">{label}</span>
    <input value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} mt-1`} /></label>;
}
function Num({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return <label className="block"><span className="text-[11px] font-bold text-[var(--color-ink-dim)]">{label}</span>
    <input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className={`${inputCls} mt-1`} /></label>;
}
function Read({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between text-xs py-1"><span className="text-[var(--color-ink-dim)]">{label}</span><span className="font-semibold">{value}</span></div>;
}
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] p-2.5">
      <span className="text-xs font-bold">{label}</span>
      <span className={`h-5 w-9 rounded-full relative transition-colors ${value ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-line)]'}`}>
        <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: value ? 18 : 2 }} />
      </span>
    </button>
  );
}
