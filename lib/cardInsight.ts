/**
 * Per-card insight generator.
 *
 * Given a card's own labelled data series, produces a short narrative read —
 * the headline, concentration, spread, trend (for time series) and a
 * recommendation — powering the "AI insight" button on every analytics card.
 */

export interface Point { label: string; value: number }
export type ValueKind = 'money' | 'number' | 'percent';

const money = (n: number) => { const v = Math.round(n); if (Math.abs(v) >= 1_000_000) return '₦' + (v / 1_000_000).toFixed(1) + 'M'; if (Math.abs(v) >= 1000) return '₦' + (v / 1000).toFixed(0) + 'k'; return '₦' + v.toLocaleString(); };
const fmt = (v: number, k: ValueKind) => k === 'money' ? money(v) : k === 'percent' ? `${Math.round(v)}%` : Math.round(v).toLocaleString();
const pctOf = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

export interface CardInsight { title: string; bullets: string[] }

export function generateCardInsight(title: string, series: Point[], opts: { kind?: ValueKind; time?: boolean } = {}): CardInsight {
  const kind: ValueKind = opts.kind || 'number';
  const clean = series.filter((s) => Number.isFinite(s.value));
  if (clean.length === 0) return { title, bullets: ['No data available to analyse yet.'] };

  const total = clean.reduce((a, s) => a + s.value, 0);
  const n = clean.length;
  const avg = total / n;
  const sorted = [...clean].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const bottom = sorted[n - 1];
  const topShare = pctOf(top.value, total);
  const bullets: string[] = [];

  // Headline
  if (n === 1) {
    bullets.push(`Only ${clean[0].label} has data — ${fmt(clean[0].value, kind)}.`);
  } else {
    bullets.push(`${top.label} leads with ${fmt(top.value, kind)}${total > 0 && kind !== 'percent' ? ` — ${topShare}% of the ${fmt(total, kind)} total` : ''}.`);
  }

  // Time trend
  let change = 0;
  if (opts.time && n >= 2) {
    const first = clean[0], last = clean[n - 1];
    change = first.value !== 0 ? Math.round(((last.value - first.value) / Math.abs(first.value)) * 100) : (last.value > 0 ? 100 : 0);
    bullets.push(`${change >= 0 ? 'Up' : 'Down'} ${Math.abs(change)}% from ${first.label} (${fmt(first.value, kind)}) to ${last.label} (${fmt(last.value, kind)}); peaked in ${top.label}.`);
  } else if (n >= 3 && kind !== 'percent') {
    // Concentration
    let cum = 0, k = 0;
    for (const s of sorted) { cum += s.value; k++; if (cum >= total * 0.8) break; }
    bullets.push(`Top ${k} of ${n} make up ${pctOf(cum, total)}% — ${k <= Math.ceil(n * 0.35) ? 'highly concentrated' : 'fairly spread out'}.`);
  }

  // Spread
  if (n >= 2) bullets.push(`Ranges ${fmt(bottom.value, kind)} (${bottom.label}) → ${fmt(top.value, kind)} (${top.label}); average ${fmt(avg, kind)}.`);

  // Recommendation
  if (opts.time && change <= -15) bullets.push(`⚠ Downtrend — dig into what changed and act before it compounds.`);
  else if (opts.time && change >= 15) bullets.push(`↑ Strong momentum — reinforce what's driving the lift.`);
  else if (n >= 3 && topShare >= 45 && kind !== 'percent') bullets.push(`Heavy reliance on ${top.label} (${topShare}%) — protect it and grow the long tail.`);
  else if (n >= 3) bullets.push(`Well balanced — the opportunity is lifting the middle of the pack.`);

  return { title, bullets: bullets.slice(0, 4) };
}
