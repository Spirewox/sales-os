'use client';

import { useState } from 'react';
import { GUIDE, PLANNER, planPurchase } from '@/lib/kitchen-guide';
import { Field, inputClass, NumberInput } from './kitchen-ui';

const fmt = (v: number) => v.toLocaleString('en-NG', { maximumFractionDigits: v >= 100 ? 0 : v >= 10 ? 1 : 2 });

function GuideTable({ title, head, rows, hint, wide }: { title: string; head: string[]; rows: readonly (readonly string[])[]; hint?: string; wide?: boolean }) {
  return (
    <section className={`rounded-xl border bg-card ${wide ? 'lg:col-span-2' : ''}`}>
      <h3 className="border-b px-4 py-3 text-sm font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-2 text-left font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={`px-4 py-2 ${i === 0 ? 'font-medium' : ''}`}>{c || '-'}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {hint && <p className="border-t px-4 py-2 text-xs text-muted-foreground">{hint}</p>}
    </section>
  );
}

export function YieldGuide() {
  const [k, setK] = useState('jollof');
  const [portions, setPortions] = useState(200);
  const [each, setEach] = useState(3);
  const [bulk, setBulk] = useState(false);
  const item = PLANNER.find((p) => p.k === k) ?? PLANNER[0];
  const plan = planPurchase(item, portions, each, bulk);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">How much should I buy?</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <Field label="Item" htmlFor="pl-item">
            <select id="pl-item" className={inputClass} value={k} onChange={(e) => setK(e.target.value)}>
              {PLANNER.map((p) => <option key={p.k} value={p.k}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Packs / guests" htmlFor="pl-n"><NumberInput id="pl-n" value={portions} onChange={setPortions} /></Field>
          <Field label="Scoops / pieces each" htmlFor="pl-u"><NumberInput id="pl-u" value={each} step={0.5} onChange={setEach} /></Field>
        </div>
        {item.bulkPer && (
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={bulk} onChange={(e) => setBulk(e.target.checked)} /> Cooking 10kg+ at once ({item.bulkPer} scoops per kg)
          </label>
        )}
        <div className="mt-4 rounded-xl bg-muted/50 p-4" aria-live="polite">
          <p className="text-xs text-muted-foreground">You need</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{fmt(plan.need)} {item.unit}</p>
          <p className="text-sm tabular-nums text-muted-foreground">{fmt(plan.units)} scoops/pieces ÷ {plan.per} each, buy {plan.packs} × {item.packLabel}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Round up a little, but keep extra under 10%: more than that eats into the food cost. For meat, plan on the minimum or average count per carton, since piece sizes vary.</p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GuideTable title="Rice yield per 1kg" head={['Rice', 'Yield', 'Note']} rows={GUIDE.rice} />
        <GuideTable title="Serving size" head={['Service', 'Rice']} rows={GUIDE.serving} hint="Kids' packs get less rice and a lower price than adult packs." />
        <GuideTable title="Bowls & trays" head={['Container', 'Jollof rice', 'Fried rice']} rows={GUIDE.trays} hint="Raw long grain rice needed to fill each size." />
        <GuideTable title="Swallow, moimoi & pasta" head={['Item', 'Yield']} rows={GUIDE.other} hint="Thicker swallow gives fewer wraps; South-East events usually want supersize." />
        <GuideTable wide title="Proteins" head={['Cut', 'Per kg', 'Per carton', 'Plan with']} rows={GUIDE.protein} hint="Most frozen chicken is sold as Cut-4; cut again for Cut-8. Live birds should weigh at least 1.5kg for a good Cut-8." />
        <GuideTable
          wide
          title="Jollof rice by the bag"
          head={['Ingredient', 'Half bag (25kg)', 'Full bag (50kg)']}
          rows={GUIDE.jollofBag}
          hint="Spices for a half bag: 1 pack each of bay leaf (125g, about ¼ used), Knorr beef, Maggi chicken (450g), thyme (50g), curry (100g, half used), Royco, salt (1kg) and Maggi star. Double for a full bag. Add ginger and garlic. Use less tin tomato for a lighter colour."
        />
      </div>
    </div>
  );
}
