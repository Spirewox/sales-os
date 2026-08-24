import { StockMovementType } from '../types';
import { DataBundle } from './insights';
import { deriveSegments } from './segmentation';

/**
 * Scenario simulator — the "what-if" engine for decision-making.
 *
 * Every scenario is computed deterministically from the real data: a monthly
 * baseline (units, revenue, cost, profit, margin, stock cover) is derived from
 * actual transactions, then a set of adjustable levers projects the outcome.
 * A plain-English interpreter (interpretScenario) picks the scenario and
 * pre-fills the levers, so users can describe a situation and then fine-tune.
 * No external LLM — the model of the business *is* the intelligence.
 */

const SALE = StockMovementType.SALE;
const money = (n: number) => { const v = Math.round(n); if (Math.abs(v) >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M'; if (Math.abs(v) >= 1000) return '₦' + (v / 1000).toFixed(0) + 'k'; return '₦' + v.toLocaleString(); };
const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n)}%`;
const clampPct = (n: number) => Math.round(n);

export type ScenarioKey = 'price' | 'demand' | 'cost' | 'collect' | 'churn' | 'promo';
export type ValueKind = 'money' | 'number' | 'percent';

export interface Levers {
  target: string;          // 'all' | 'cat:<Category>' | 'item:<id>' | 'sup:<id>'
  priceChangePct: number;
  costChangePct: number;
  volumeChangePct: number;
  elasticity: number;      // demand response to price (negative)
  passThroughPct: number;  // how much of a cost rise you pass to price
  collectPct: number;      // % of overdue collected
  discountPct: number;
  upliftPct: number;       // expected volume uplift from a promo
  churnCount: number;      // # of top customers lost
  churnSegment: string;    // '' or a segment name
}

export function defaultLevers(): Levers {
  return { target: 'all', priceChangePct: 10, costChangePct: 15, volumeChangePct: 20, elasticity: -0.8, passThroughPct: 50, collectPct: 50, discountPct: 5, upliftPct: 15, churnCount: 3, churnSegment: '' };
}

export interface LeverDef { key: keyof Levers; label: string; kind: 'target' | 'pct' | 'int' | 'elasticity'; min?: number; max?: number; step?: number; includeSuppliers?: boolean; hint?: string }
export interface ScenarioDef { key: ScenarioKey; label: string; blurb: string; levers: LeverDef[] }

export const SIM_SCENARIOS: ScenarioDef[] = [
  { key: 'price', label: 'Price change', blurb: 'Raise or cut prices and see the demand + profit trade-off', levers: [
    { key: 'target', label: 'Applies to', kind: 'target' },
    { key: 'priceChangePct', label: 'Price change', kind: 'pct', min: -50, max: 50, step: 1 },
    { key: 'elasticity', label: 'Demand sensitivity', kind: 'elasticity', min: -2, max: 0, step: 0.1, hint: 'How much volume reacts to price. −0.8 = a 10% rise loses ~8% of units.' },
  ] },
  { key: 'demand', label: 'Demand shift', blurb: 'Model faster or slower sales and the stock impact', levers: [
    { key: 'target', label: 'Applies to', kind: 'target' },
    { key: 'volumeChangePct', label: 'Volume change', kind: 'pct', min: -50, max: 150, step: 5 },
  ] },
  { key: 'cost', label: 'Cost / supplier shock', blurb: 'A supplier or category cost move — and how much to pass on', levers: [
    { key: 'target', label: 'Applies to', kind: 'target', includeSuppliers: true },
    { key: 'costChangePct', label: 'Cost change', kind: 'pct', min: -30, max: 80, step: 1 },
    { key: 'passThroughPct', label: 'Passed to price', kind: 'pct', min: 0, max: 100, step: 5, hint: 'Share of the cost move you add to your selling price.' },
    { key: 'elasticity', label: 'Demand sensitivity', kind: 'elasticity', min: -2, max: 0, step: 0.1 },
  ] },
  { key: 'collect', label: 'Credit recovery', blurb: 'Collect a slice of overdue credit and free up cash', levers: [
    { key: 'collectPct', label: 'Overdue collected', kind: 'pct', min: 0, max: 100, step: 5 },
  ] },
  { key: 'churn', label: 'Customer churn', blurb: 'Lose top customers or a whole segment — revenue at risk', levers: [
    { key: 'churnCount', label: 'Top customers lost', kind: 'int', min: 0, max: 20, step: 1 },
    { key: 'churnSegment', label: 'Or a segment', kind: 'target' },
  ] },
  { key: 'promo', label: 'Discount & promo', blurb: 'Trade margin for volume — is it accretive?', levers: [
    { key: 'target', label: 'Applies to', kind: 'target' },
    { key: 'discountPct', label: 'Discount', kind: 'pct', min: 0, max: 50, step: 1 },
    { key: 'upliftPct', label: 'Expected volume uplift', kind: 'pct', min: 0, max: 200, step: 5 },
  ] },
];

/* ─────────── baseline (monthly run-rate from real transactions) ─────────── */

interface Baseline { units: number; revenue: number; cogs: number; profit: number; avgPrice: number; avgCost: number; marginPct: number; stockUnits: number; coverDays: number; label: string }

function spanMonths(dates: string[]): number {
  if (dates.length < 2) return 1;
  const ts = dates.map((d) => new Date(d).getTime());
  const days = (Math.max(...ts) - Math.min(...ts)) / 86_400_000;
  return Math.max(1, days / 30);
}

export function targetLabel(target: string, bundle: DataBundle): string {
  if (target === 'all' || !target) return 'the whole catalogue';
  if (target.startsWith('cat:')) return `${target.slice(4)} products`;
  if (target.startsWith('item:')) return bundle.inventory.find((i) => i.id === target.slice(5))?.name || 'that product';
  if (target.startsWith('sup:')) return bundle.suppliers.find((s) => s.id === target.slice(4))?.name || 'that supplier';
  return target;
}

function itemIdsForTarget(target: string, bundle: DataBundle): Set<string> | null {
  if (target === 'all' || !target) return null; // null = all
  if (target.startsWith('cat:')) { const c = target.slice(4); return new Set(bundle.inventory.filter((i) => i.category === c).map((i) => i.id)); }
  if (target.startsWith('item:')) return new Set([target.slice(5)]);
  if (target.startsWith('sup:')) { const s = target.slice(4); return new Set(bundle.inventory.filter((i) => i.supplierId === s).map((i) => i.id)); }
  return null;
}

function baselineFor(target: string, bundle: DataBundle): Baseline {
  const ids = itemIdsForTarget(target, bundle);
  const saleLogs = bundle.stockLogs.filter((l) => l.type === SALE && (!ids || ids.has(l.itemId)));
  const months = spanMonths(bundle.stockLogs.filter((l) => l.type === SALE).map((l) => l.date));
  let units = 0, revenue = 0, cogs = 0;
  saleLogs.forEach((l) => { const q = Math.abs(l.quantity); units += q; revenue += q * l.unitPrice; cogs += q * l.unitCost; });
  units /= months; revenue /= months; cogs /= months;
  const profit = revenue - cogs;
  const avgPrice = units > 0 ? revenue / units : 0;
  const avgCost = units > 0 ? cogs / units : 0;
  const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;
  const stockUnits = bundle.inventory.filter((i) => !ids || ids.has(i.id)).reduce((a, i) => a + i.currentStock, 0);
  const perDay = units / 30;
  const coverDays = perDay > 0 ? stockUnits / perDay : Infinity;
  return { units, revenue, cogs, profit, avgPrice, avgCost, marginPct, stockUnits, coverDays, label: targetLabel(target, bundle) };
}

/* ─────────── output shape ─────────── */

export interface SimMetric { label: string; baseline: number; projected: number; kind: ValueKind; better?: 'up' | 'down' }
export interface SimOutput {
  scenario: ScenarioKey;
  title: string;
  subtitle: string;
  headline: SimMetric;
  metrics: SimMetric[];
  chart: { name: string; Baseline: number; Projected: number }[];
  narrative: string;
  verdict: { tone: 'positive' | 'caution' | 'negative' | 'neutral'; text: string };
  assumptions: string[];
}

const m = (label: string, baseline: number, projected: number, kind: ValueKind, better: 'up' | 'down' = 'up'): SimMetric => ({ label, baseline, projected, kind, better });

/* ─────────── the simulator ─────────── */

export function runSimulation(scenario: ScenarioKey, lv: Levers, bundle: DataBundle): SimOutput {
  switch (scenario) {
    case 'price': return simPrice(lv, bundle);
    case 'demand': return simDemand(lv, bundle);
    case 'cost': return simCost(lv, bundle);
    case 'collect': return simCollect(lv, bundle);
    case 'churn': return simChurn(lv, bundle);
    case 'promo': return simPromo(lv, bundle);
  }
}

function simPrice(lv: Levers, bundle: DataBundle): SimOutput {
  const b = baselineFor(lv.target, bundle);
  const dp = lv.priceChangePct / 100;
  const newPrice = b.avgPrice * (1 + dp);
  const newUnits = Math.max(0, b.units * (1 + lv.elasticity * dp));
  const newRevenue = newUnits * newPrice;
  const newProfit = newUnits * (newPrice - b.avgCost);
  const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
  const profitDelta = newProfit - b.profit;
  const verdict = Math.abs(profitDelta) < b.profit * 0.02
    ? { tone: 'neutral' as const, text: `Roughly profit-neutral — the volume pull-back cancels the price gain.` }
    : profitDelta > 0
      ? { tone: 'positive' as const, text: `Accretive: monthly profit rises ${money(profitDelta)} even after losing ~${Math.round(b.units - newUnits)} units/mo. Worth testing.` }
      : { tone: 'negative' as const, text: `Dilutive: you lose more from softer demand than you gain on price — profit drops ${money(-profitDelta)}/mo. Ease the increase or protect volume.` };
  return {
    scenario: 'price', title: `${pct(lv.priceChangePct)} price on ${b.label}`, subtitle: `Assuming demand sensitivity of ${lv.elasticity}`,
    headline: m('Monthly Gross Profit', b.profit, newProfit, 'money'),
    metrics: [
      m('Monthly Revenue', b.revenue, newRevenue, 'money'),
      m('Monthly Gross Profit', b.profit, newProfit, 'money'),
      m('Gross Margin', b.marginPct, newMargin, 'percent'),
      m('Units / month', b.units, newUnits, 'number'),
    ],
    chart: [{ name: 'Revenue', Baseline: Math.round(b.revenue), Projected: Math.round(newRevenue) }, { name: 'Profit', Baseline: Math.round(b.profit), Projected: Math.round(newProfit) }],
    narrative: `Repricing ${b.label} by ${pct(lv.priceChangePct)} moves the unit price to about ${money(newPrice)}. With a ${lv.elasticity} demand response, volume shifts ${pct(clampPct((newUnits / (b.units || 1) - 1) * 100))} to ~${Math.round(newUnits)} units/mo, taking revenue ${money(b.revenue)} → ${money(newRevenue)} and profit ${money(b.profit)} → ${money(newProfit)}.`,
    verdict,
    assumptions: [`Demand sensitivity (elasticity) = ${lv.elasticity}`, `Unit cost held at ${money(b.avgCost)}`, `Monthly run-rate from actual sales`],
  };
}

function simDemand(lv: Levers, bundle: DataBundle): SimOutput {
  const b = baselineFor(lv.target, bundle);
  const dv = lv.volumeChangePct / 100;
  const newUnits = Math.max(0, b.units * (1 + dv));
  const newRevenue = newUnits * b.avgPrice;
  const newProfit = newUnits * (b.avgPrice - b.avgCost);
  const newCover = newUnits > 0 ? b.stockUnits / (newUnits / 30) : Infinity;
  const stockTight = dv > 0 && newCover < 14 && Number.isFinite(newCover);
  const verdict = dv >= 0
    ? stockTight
      ? { tone: 'caution' as const, text: `Upside is real (+${money(newProfit - b.profit)}/mo) but stock only covers ${Math.round(newCover)} days at the higher run-rate — line up reorders or you'll stock out.` }
      : { tone: 'positive' as const, text: `Clean upside: +${money(newProfit - b.profit)}/mo in profit and current stock can absorb the demand.` }
    : { tone: 'negative' as const, text: `Softer demand costs ${money(b.profit - newProfit)}/mo — a signal to defend volume or trim purchasing.` };
  return {
    scenario: 'demand', title: `${pct(lv.volumeChangePct)} demand on ${b.label}`, subtitle: `Prices and costs held constant`,
    headline: m('Monthly Gross Profit', b.profit, newProfit, 'money'),
    metrics: [
      m('Monthly Revenue', b.revenue, newRevenue, 'money'),
      m('Monthly Gross Profit', b.profit, newProfit, 'money'),
      m('Units / month', b.units, newUnits, 'number'),
      m('Days of stock cover', Number.isFinite(b.coverDays) ? b.coverDays : 0, Number.isFinite(newCover) ? newCover : 0, 'number', 'up'),
    ],
    chart: [{ name: 'Revenue', Baseline: Math.round(b.revenue), Projected: Math.round(newRevenue) }, { name: 'Profit', Baseline: Math.round(b.profit), Projected: Math.round(newProfit) }],
    narrative: `A ${pct(lv.volumeChangePct)} demand shift on ${b.label} takes volume to ~${Math.round(newUnits)} units/mo, revenue ${money(b.revenue)} → ${money(newRevenue)} and profit ${money(b.profit)} → ${money(newProfit)}. At that pace, on-hand stock covers about ${Number.isFinite(newCover) ? Math.round(newCover) : '∞'} days.`,
    verdict,
    assumptions: [`Selling price ${money(b.avgPrice)} and cost ${money(b.avgCost)} unchanged`, `Stock cover based on current on-hand units`],
  };
}

function simCost(lv: Levers, bundle: DataBundle): SimOutput {
  const b = baselineFor(lv.target, bundle);
  const dc = lv.costChangePct / 100;
  const newCost = b.avgCost * (1 + dc);
  const priceRise = dc * (lv.passThroughPct / 100);
  const newPrice = b.avgPrice * (1 + priceRise);
  const newUnits = Math.max(0, b.units * (1 + lv.elasticity * priceRise));
  const newRevenue = newUnits * newPrice;
  const newProfit = newUnits * (newPrice - newCost);
  const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
  const profitDelta = newProfit - b.profit;
  const fullOffset = clampPct((dc) * 100); // price rise needed to fully offset
  const verdict = profitDelta >= -b.profit * 0.02
    ? { tone: 'positive' as const, text: `Manageable — passing ${lv.passThroughPct}% of the cost through keeps profit within ${money(Math.abs(profitDelta))}/mo of today.` }
    : { tone: 'negative' as const, text: `Margin squeeze: profit falls ${money(-profitDelta)}/mo. To fully protect it you'd need to lift price ~${fullOffset}% — or renegotiate the cost / switch supplier.` };
  return {
    scenario: 'cost', title: `${pct(lv.costChangePct)} cost on ${b.label}`, subtitle: `Passing ${lv.passThroughPct}% through to price`,
    headline: m('Monthly Gross Profit', b.profit, newProfit, 'money'),
    metrics: [
      m('Monthly Gross Profit', b.profit, newProfit, 'money'),
      m('Gross Margin', b.marginPct, newMargin, 'percent'),
      m('Unit Cost', b.avgCost, newCost, 'money', 'down'),
      m('Monthly Revenue', b.revenue, newRevenue, 'money'),
    ],
    chart: [{ name: 'Profit', Baseline: Math.round(b.profit), Projected: Math.round(newProfit) }, { name: 'Revenue', Baseline: Math.round(b.revenue), Projected: Math.round(newRevenue) }],
    narrative: `A ${pct(lv.costChangePct)} cost move on ${b.label} pushes unit cost ${money(b.avgCost)} → ${money(newCost)}. Passing ${lv.passThroughPct}% to price (${money(b.avgPrice)} → ${money(newPrice)}) leaves margin at ${Math.round(newMargin)}% and monthly profit ${money(b.profit)} → ${money(newProfit)}.`,
    verdict,
    assumptions: [`${lv.passThroughPct}% of the cost change passed to price`, `Demand sensitivity ${lv.elasticity}`, `Full offset would need a ~${fullOffset}% price rise`],
  };
}

function simCollect(lv: Levers, bundle: DataBundle): SimOutput {
  const overdue = bundle.credits.filter((c) => c.status === 'Overdue').reduce((a, c) => a + c.amountOwed, 0);
  const outstanding = bundle.credits.filter((c) => c.status !== 'Clear').reduce((a, c) => a + c.amountOwed, 0);
  const collected = overdue * (lv.collectPct / 100);
  const remaining = outstanding - collected;
  const verdict = collected > 0
    ? { tone: 'positive' as const, text: `Collecting ${lv.collectPct}% of overdue frees ${money(collected)} in cash — enough to fund restocking or cut borrowing. One-off, so pair it with tighter terms to stop it rebuilding.` }
    : { tone: 'neutral' as const, text: `Set a collection target above 0% to see the cash impact.` };
  return {
    scenario: 'collect', title: `Collect ${lv.collectPct}% of overdue credit`, subtitle: `${money(overdue)} currently overdue`,
    headline: m('Cash unlocked', 0, collected, 'money'),
    metrics: [
      m('Cash unlocked', 0, collected, 'money'),
      m('Receivables outstanding', outstanding, remaining, 'money', 'down'),
      m('Overdue balance', overdue, overdue - collected, 'money', 'down'),
    ],
    chart: [{ name: 'Overdue', Baseline: Math.round(overdue), Projected: Math.round(overdue - collected) }, { name: 'Outstanding', Baseline: Math.round(outstanding), Projected: Math.round(remaining) }],
    narrative: `There is ${money(overdue)} overdue out of ${money(outstanding)} total receivables. Recovering ${lv.collectPct}% brings in ${money(collected)} and drops outstanding credit to ${money(remaining)}.`,
    verdict,
    assumptions: [`Applied to overdue balances only`, `A one-off cash event, not recurring profit`],
  };
}

function simChurn(lv: Levers, bundle: DataBundle): SimOutput {
  const months = spanMonths(bundle.sales.filter((s) => s.status !== 'Voided').map((s) => s.date));
  const rev: Record<string, number> = {};
  bundle.sales.filter((s) => s.status !== 'Voided').forEach((s) => { rev[s.customerId] = (rev[s.customerId] || 0) + s.amount; });
  const totalMonthly = Object.values(rev).reduce((a, v) => a + v, 0) / months;

  let lostIds: string[];
  let scopeLabel: string;
  if (lv.churnSegment && lv.churnSegment.startsWith('seg:')) {
    const seg = lv.churnSegment.slice(4);
    lostIds = bundle.customers.filter((c) => deriveSegments(c).includes(seg)).map((c) => c.id);
    scopeLabel = `the ${seg} segment (${lostIds.length} customers)`;
  } else {
    lostIds = Object.entries(rev).sort((a, b) => b[1] - a[1]).slice(0, lv.churnCount).map(([id]) => id);
    scopeLabel = `your top ${lostIds.length} customers`;
  }
  const lostMonthly = lostIds.reduce((a, id) => a + (rev[id] || 0), 0) / months;
  const share = totalMonthly > 0 ? (lostMonthly / totalMonthly) * 100 : 0;
  const creditExposure = bundle.credits.filter((c) => lostIds.includes(c.customerId) && c.status !== 'Clear').reduce((a, c) => a + c.amountOwed, 0);
  const verdict = share >= 25
    ? { tone: 'negative' as const, text: `Severe concentration risk: losing ${scopeLabel} wipes ${Math.round(share)}% of monthly revenue (${money(lostMonthly)}). Diversify the base and lock in these accounts now.` }
    : share >= 10
      ? { tone: 'caution' as const, text: `Meaningful exposure: ${Math.round(share)}% of revenue (${money(lostMonthly)}) rides on ${scopeLabel}. Build retention and a wider pipeline.` }
      : { tone: 'positive' as const, text: `Resilient: only ${Math.round(share)}% of revenue depends on ${scopeLabel} — the base is well spread.` };
  const names = lostIds.map((id) => bundle.customers.find((c) => c.id === id)?.name).filter(Boolean).slice(0, 4).join(', ');
  return {
    scenario: 'churn', title: `If ${scopeLabel} churn`, subtitle: names ? `${names}${lostIds.length > 4 ? '…' : ''}` : 'Revenue concentration test',
    headline: m('Monthly revenue at risk', totalMonthly, totalMonthly - lostMonthly, 'money'),
    metrics: [
      m('Monthly revenue', totalMonthly, totalMonthly - lostMonthly, 'money'),
      m('Revenue at risk', 0, lostMonthly, 'money', 'down'),
      m('Share of revenue lost', 0, share, 'percent', 'down'),
      m('Credit exposure removed', creditExposure, 0, 'money'),
    ],
    chart: [{ name: 'Retained', Baseline: Math.round(totalMonthly), Projected: Math.round(totalMonthly - lostMonthly) }],
    narrative: `${scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)} generate about ${money(lostMonthly)}/mo — ${Math.round(share)}% of your ${money(totalMonthly)} monthly revenue. Losing them would also clear ${money(creditExposure)} of credit exposure but leave a serious hole to backfill.`,
    verdict,
    assumptions: [`Monthly revenue from actual sales history`, `Scope: ${scopeLabel}`],
  };
}

function simPromo(lv: Levers, bundle: DataBundle): SimOutput {
  const b = baselineFor(lv.target, bundle);
  const d = lv.discountPct / 100;
  const u = lv.upliftPct / 100;
  const newPrice = b.avgPrice * (1 - d);
  const newUnits = b.units * (1 + u);
  const newRevenue = newUnits * newPrice;
  const newProfit = newUnits * (newPrice - b.avgCost);
  const newMargin = newRevenue > 0 ? (newProfit / newRevenue) * 100 : 0;
  const unitMargin = newPrice - b.avgCost;
  const breakevenUplift = unitMargin > 0 ? (b.profit / (unitMargin * b.units) - 1) * 100 : Infinity;
  const profitDelta = newProfit - b.profit;
  const verdict = unitMargin <= 0
    ? { tone: 'negative' as const, text: `A ${lv.discountPct}% discount sells ${b.label} below cost — every extra unit loses money. Don't run it.` }
    : profitDelta >= 0
      ? { tone: 'positive' as const, text: `Accretive: the +${lv.upliftPct}% volume clears the break-even of ~+${Math.round(breakevenUplift)}%, adding ${money(profitDelta)}/mo in profit.` }
      : { tone: 'caution' as const, text: `Below break-even: you'd need ~+${Math.round(breakevenUplift)}% volume to hold profit but assumed +${lv.upliftPct}%. Profit falls ${money(-profitDelta)}/mo unless the lift is bigger.` };
  return {
    scenario: 'promo', title: `${lv.discountPct}% off ${b.label} for +${lv.upliftPct}% volume`, subtitle: `Break-even needs ~+${Number.isFinite(breakevenUplift) ? Math.round(breakevenUplift) : '∞'}% volume`,
    headline: m('Monthly Gross Profit', b.profit, newProfit, 'money'),
    metrics: [
      m('Monthly Gross Profit', b.profit, newProfit, 'money'),
      m('Monthly Revenue', b.revenue, newRevenue, 'money'),
      m('Gross Margin', b.marginPct, newMargin, 'percent'),
      m('Units / month', b.units, newUnits, 'number'),
    ],
    chart: [{ name: 'Revenue', Baseline: Math.round(b.revenue), Projected: Math.round(newRevenue) }, { name: 'Profit', Baseline: Math.round(b.profit), Projected: Math.round(newProfit) }],
    narrative: `Discounting ${b.label} ${lv.discountPct}% drops the price to ${money(newPrice)}. To break even you need volume up ~${Number.isFinite(breakevenUplift) ? Math.round(breakevenUplift) : '∞'}%; you assumed +${lv.upliftPct}% → ~${Math.round(newUnits)} units/mo, taking profit ${money(b.profit)} → ${money(newProfit)}.`,
    verdict,
    assumptions: [`Cost held at ${money(b.avgCost)}`, `Break-even volume = discount ÷ remaining unit margin`],
  };
}

/* ─────────── natural-language interpreter ─────────── */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
const firstPct = (q: string): number | null => { const m2 = q.match(/(-?\d+(?:\.\d+)?)\s*(?:%|percent|per cent)/); return m2 ? parseFloat(m2[1]) : null; };
const firstInt = (q: string): number | null => { const m2 = q.match(/\b(\d{1,3})\b/); return m2 ? parseInt(m2[1], 10) : null; };
const isDown = (q: string) => /\b(cut|drop|reduce|lower|decrease|down|fall|fewer|less|slash|discount|off)\b/.test(q);

function detectScenario(q: string): ScenarioKey {
  if (/\b(collect|recover|chase|overdue|receivable|owe|debt)\b/.test(q)) return 'collect';
  if (/\b(churn|lose|lost|leave|leaves|leaving|stop buying|walk away|drop out|concentrat)\b/.test(q)) return 'churn';
  if (/\b(discount|promo|promotion|markdown|clearance|bundle|offer|deal)\b/.test(q)) return 'promo';
  if (/\b(cost|supplier|vendor|procure|procurement|buying price|cogs|input price)\b/.test(q)) return 'cost';
  if (/\b(demand|volume|sell more|sales grow|grow sales|faster|slower|units|traffic)\b/.test(q) && !/\bprice\b/.test(q)) return 'demand';
  return 'price';
}

function detectTarget(q: string, bundle: DataBundle, includeSuppliers: boolean): string {
  // product name
  for (const it of bundle.inventory) { const n = norm(it.name); if (n.length >= 3 && q.includes(n)) return `item:${it.id}`; }
  // category
  const cats = Array.from(new Set(bundle.inventory.map((i) => i.category)));
  for (const c of cats) { const n = norm(c); if (n.length >= 3 && q.includes(n)) return `cat:${c}`; }
  // supplier
  if (includeSuppliers) for (const s of bundle.suppliers) { const n = norm(s.name); if (n.length >= 3 && q.includes(n)) return `sup:${s.id}`; }
  return 'all';
}

function detectSegment(q: string, bundle: DataBundle): string {
  const segs = new Set<string>();
  bundle.customers.forEach((c) => deriveSegments(c).forEach((s) => segs.add(s)));
  for (const s of segs) { const n = norm(s); if (n.length >= 4 && q.includes(n)) return `seg:${s}`; }
  return '';
}

export interface Interpreted { scenario: ScenarioKey; levers: Levers; understood: string }
export function interpretScenario(question: string, bundle: DataBundle): Interpreted {
  const q = ` ${norm(question)} `;
  const scenario = detectScenario(q);
  const lv = defaultLevers();
  const p = firstPct(q);
  const down = isDown(q);
  const sign = down ? -1 : 1;

  if (scenario === 'price') { lv.target = detectTarget(q, bundle, false); if (p != null) lv.priceChangePct = Math.sign(p) !== 0 && p < 0 ? p : sign * Math.abs(p); }
  else if (scenario === 'demand') { lv.target = detectTarget(q, bundle, false); if (p != null) lv.volumeChangePct = p < 0 ? p : sign * Math.abs(p); }
  else if (scenario === 'cost') { lv.target = detectTarget(q, bundle, true); if (p != null) lv.costChangePct = p < 0 ? p : sign * Math.abs(p); }
  else if (scenario === 'collect') { if (p != null) lv.collectPct = Math.min(100, Math.abs(p)); }
  else if (scenario === 'promo') { lv.target = detectTarget(q, bundle, false); if (p != null) lv.discountPct = Math.abs(p); }
  else if (scenario === 'churn') { const seg = detectSegment(q, bundle); if (seg) { lv.churnSegment = seg; lv.churnCount = 0; } else { const n = firstInt(q); if (n != null && n <= 20) lv.churnCount = n; } }

  const label = SIM_SCENARIOS.find((s) => s.key === scenario)?.label || scenario;
  const bits: string[] = [label];
  if (scenario === 'churn') bits.push(lv.churnSegment ? targetSegLabel(lv.churnSegment) : `top ${lv.churnCount}`);
  else if (scenario === 'collect') bits.push(`${lv.collectPct}% of overdue`);
  else { bits.push(targetLabel(lv.target, bundle)); const mag = scenario === 'price' ? lv.priceChangePct : scenario === 'demand' ? lv.volumeChangePct : scenario === 'cost' ? lv.costChangePct : lv.discountPct; bits.push(scenario === 'promo' ? `${mag}% off` : pct(mag)); }
  return { scenario, levers: lv, understood: bits.join(' · ') };
}

const targetSegLabel = (s: string) => s.startsWith('seg:') ? s.slice(4) : s;

export const SIM_EXAMPLES = [
  'What if I raise Beef prices 10%?',
  'What if demand for Chicken grows 25%?',
  'What if my supplier cost rises 15%?',
  'Collect 60% of overdue credit',
  'What if I lose my top 3 customers?',
  'Run a 5% discount for 20% more volume',
];
