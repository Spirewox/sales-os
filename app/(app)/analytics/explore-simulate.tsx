'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Info, Loader2, Minus, Send, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimulateInterpret, useSimulateRun, useSimulateTargets, type InsightScopeParams } from '@/hooks/use-insights-api';
import { SIM_EXAMPLES, SIM_SCENARIOS, defaultLevers, type LeverDef, type Levers, type ScenarioKey, type SimMetric, type SimOutput } from '@/lib/simulate';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatMoney, formatMoneyShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/app';
import { AXIS_TICK, BAR_CURSOR, LEGEND_STYLE } from './analytics-ui';
import { Chip, Pending, TwoPane, selectClass } from './explore-shared';

const EXAMPLES = SIM_EXAMPLES.slice(0, 4);
const fmtM = (v: number, k: SimMetric['kind']) => (k === 'money' ? formatMoneyShort(v) : k === 'percent' ? `${Math.round(v)}%` : formatCount(v));

const VERDICT = {
  positive: { icon: CheckCircle2, border: 'border-primary/40', dot: 'text-primary' },
  caution: { icon: AlertTriangle, border: 'border-warning/40', dot: 'text-warning' },
  negative: { icon: XCircle, border: 'border-destructive/40', dot: 'text-destructive' },
  neutral: { icon: Info, border: 'border-border', dot: 'text-muted-foreground' },
} as const;

export function ExploreSimulate({ scope }: Readonly<{ scope: InsightScopeParams }>) {
  const [q, setQ] = useState('');
  const [scenario, setScenario] = useState<ScenarioKey>('price');
  const [levers, setLevers] = useState<Levers>(defaultLevers());
  const [understood, setUnderstood] = useState('');
  const [out, setOut] = useState<SimOutput | null>(null);

  const { data: targetData, isLoading: targetsLoading } = useSimulateTargets(scope);
  const targets = targetData?.targets ?? [];
  const segments = targetData?.segments ?? [];
  const interpretMut = useSimulateInterpret();
  const runMut = useSimulateRun();
  const def = SIM_SCENARIOS.find((s) => s.key === scenario) ?? SIM_SCENARIOS[0];
  const patch = (p: Partial<Levers>) => setLevers((prev) => ({ ...prev, ...p }));

  // Re-run shortly after a lever moves.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      runMut.mutate({ scenario, levers, ...scope }, { onSuccess: (data) => { if (!cancelled) setOut(data); } });
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario, levers, scope]);

  const runNL = (text: string) => {
    const question = text.trim();
    if (!question) return;
    setQ(question);
    interpretMut.mutate(
      { question, ...scope },
      { onSuccess: (r) => { setScenario(r.scenario); setLevers(r.levers); setUnderstood(r.understood); } },
    );
  };
  const pickScenario = (k: ScenarioKey) => { setScenario(k); setLevers({ ...defaultLevers(), target: levers.target }); setUnderstood(''); };

  const controls = (
    <>
      <section className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-1">
          <label htmlFor="sim-scenario" className="text-xs text-muted-foreground">Scenario</label>
          <select id="sim-scenario" value={scenario} onChange={(e) => pickScenario(e.target.value as ScenarioKey)} className={selectClass}>
            {SIM_SCENARIOS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">{def.blurb}</p>
        </div>
        {targetsLoading ? (
          <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" aria-hidden /> Loading products and suppliers…</p>
        ) : (
          def.levers.map((ld) => <LeverControl key={ld.key} def={ld} levers={levers} patch={patch} targets={targets} segments={segments} />)
        )}
      </section>
      <section className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Try</h3>
        <div className="mt-3 space-y-2">
          {EXAMPLES.map((ex) => <Chip key={ex} onClick={() => runNL(ex)} disabled={interpretMut.isPending}>{ex}</Chip>)}
        </div>
      </section>
    </>
  );

  let results;
  if (runMut.isPending && !out) results = <Pending text="Running the scenario…" />;
  else if (!out) results = <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{runMut.error instanceof Error ? runMut.error.message : 'The scenario could not run. Try again.'}</p>;
  else results = <SimResults out={out} updating={runMut.isPending} />;

  return (
    <div className="space-y-5">
      <form className="rounded-xl border bg-card p-2 pl-4" onSubmit={(e) => { e.preventDefault(); runNL(q); }}>
        <div className="flex items-center gap-2">
          <FlaskConical size={16} className="shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="sim-question" className="sr-only">Describe a what-if scenario</label>
          <input id="sim-question" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe a what-if, e.g. what if I raise Beef prices 10%?" className="h-10 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
          <button type="submit" disabled={!q.trim() || interpretMut.isPending} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {interpretMut.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />} Simulate
          </button>
        </div>
        {(understood || interpretMut.isError) && (
          <p className={cn('px-1 pb-1 pt-2 text-xs', interpretMut.isError ? 'text-destructive' : 'text-muted-foreground')}>
            {interpretMut.isError ? 'Could not read that scenario. Set the levers instead.' : <>Understood as: <span className="font-medium text-foreground">{understood}</span></>}
          </p>
        )}
      </form>
      <TwoPane controls={controls} results={results} />
    </div>
  );
}

function SimResults({ out, updating }: Readonly<{ out: SimOutput; updating: boolean }>) {
  const v = VERDICT[out.verdict.tone] ?? VERDICT.neutral;
  const VIcon = v.icon;
  return (
    <>
      <section className="relative rounded-xl border bg-card p-5">
        {updating && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50">
            <Loader2 className="animate-spin text-muted-foreground" size={20} aria-label="Updating" />
          </div>
        )}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Projected outcome</p>
            <h3 className="text-base font-semibold leading-tight">{out.title}</h3>
            <p className="text-xs text-muted-foreground">{out.subtitle}</p>
          </div>
          <MetricTile mt={out.headline} big />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {out.metrics.map((mt) => <MetricTile key={mt.label} mt={mt} />)}
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={out.chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(n) => formatAxisMoney(Number(n))} tick={AXIS_TICK} axisLine={false} tickLine={false} width={56} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(n) => formatMoney(Number(n))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
              <Bar dataKey="Baseline" fill="var(--series-other)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Projected" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={cn('rounded-xl border bg-card p-4', v.border)}>
        <div className="flex items-start gap-2.5">
          <VIcon size={16} className={cn('mt-0.5 shrink-0', v.dot)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs text-muted-foreground">Recommendation</p>
            <p className="text-sm font-semibold leading-snug">{out.verdict.text}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{out.narrative}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {out.assumptions.map((a) => <StatusBadge key={a} tone="neutral">{a}</StatusBadge>)}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MetricTile({ mt, big }: Readonly<{ mt: SimMetric; big?: boolean }>) {
  const delta = mt.projected - mt.baseline;
  const base = Math.abs(mt.baseline);
  const dpct = base > 1e-9 ? (delta / base) * 100 : delta !== 0 ? 100 : 0;
  const dir = delta > 0.5 ? 'up' : delta < -0.5 ? 'down' : 'flat';
  const good = dir === 'flat' ? 'flat' : (mt.better || 'up') === dir ? 'good' : 'bad';
  const color = good === 'good' ? 'text-primary' : good === 'bad' ? 'text-destructive' : 'text-muted-foreground';
  const Icon = dir === 'up' ? TrendingUp : dir === 'down' ? TrendingDown : Minus;
  const deltaLabel = mt.kind === 'percent' ? `${delta >= 0 ? '+' : ''}${Math.round(delta)}pp` : `${dpct >= 0 ? '+' : ''}${Math.round(dpct)}%`;
  return (
    <div className={cn('rounded-md border p-3', big ? 'bg-muted/40' : 'bg-card')}>
      <p className="truncate text-xs text-muted-foreground">{mt.label}</p>
      <p className={cn('mt-0.5 font-semibold tracking-tight tabular-nums', big ? 'text-2xl' : 'text-lg')}>{fmtM(mt.projected, mt.kind)}</p>
      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs tabular-nums">
        <span className="text-muted-foreground">from {fmtM(mt.baseline, mt.kind)}</span>
        <span className={cn('inline-flex items-center gap-0.5 font-medium', color)}><Icon size={14} aria-hidden />{deltaLabel}</span>
      </div>
    </div>
  );
}

function LeverControl({ def, levers, patch, targets, segments }: Readonly<{ def: LeverDef; levers: Levers; patch: (p: Partial<Levers>) => void; targets: { value: string; label: string }[]; segments: string[] }>) {
  const id = `lever-${def.key}`;
  if (def.kind === 'target') {
    if (def.key === 'churnSegment') {
      return (
        <div className="space-y-1">
          <label htmlFor={id} className="text-xs text-muted-foreground">{def.label}</label>
          <select id={id} value={levers.churnSegment} onChange={(e) => patch({ churnSegment: e.target.value })} className={selectClass}>
            <option value="">Use top customers</option>
            {segments.map((s) => <option key={s} value={`seg:${s}`}>{s}</option>)}
          </select>
        </div>
      );
    }
    const opts = def.includeSuppliers ? targets : targets.filter((o) => !o.value.startsWith('sup:'));
    return (
      <div className="space-y-1">
        <label htmlFor={id} className="text-xs text-muted-foreground">{def.label}</label>
        <select id={id} value={String(levers[def.key])} onChange={(e) => patch({ [def.key]: e.target.value } as Partial<Levers>)} className={selectClass}>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  const val = Number(levers[def.key]);
  const showSign = (def.min ?? 0) < 0 && def.kind !== 'elasticity';
  const display = def.kind === 'elasticity' ? val.toFixed(1) : `${showSign && val > 0 ? '+' : ''}${Math.round(val)}${def.kind === 'int' ? '' : '%'}`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs text-muted-foreground">{def.label}</label>
        <span className="text-xs font-semibold tabular-nums">{display}</span>
      </div>
      <input id={id} type="range" min={def.min} max={def.max} step={def.step} value={val} onChange={(e) => patch({ [def.key]: Number(e.target.value) } as Partial<Levers>)} className="mt-1.5 w-full accent-primary" />
      {def.hint && <p className="mt-0.5 text-xs leading-tight text-muted-foreground">{def.hint}</p>}
    </div>
  );
}
