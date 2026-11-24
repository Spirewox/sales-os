'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeftRight, Crown, Lightbulb, Loader2, Sparkles, Table as TableIcon, BarChart3,
} from 'lucide-react';
import {
  useCompareEntities,
  useCompareInsight,
  type InsightScopeParams,
} from '@/hooks/use-insights-api';
import { useNarrateInsight } from '@/hooks/use-queries';
import {
  EntityKind, ENTITY_KINDS, type CompareResult,
} from '@/lib/insights';
import { CHART_TEXT, CHART_TOOLTIP } from '@/lib/format';

type CompareScope = 'product' | 'customer' | 'general';
type ViewMode = 'chart' | 'table';

const SCOPE_KINDS: Record<CompareScope, EntityKind[]> = {
  product: ['product', 'category'],
  customer: ['customer', 'segment'],
  general: ['supplier', 'hub', 'agent', 'product', 'customer', 'category', 'segment'],
};

const scopeForKind = (k: EntityKind): CompareScope =>
  SCOPE_KINDS.product.includes(k) ? 'product' : SCOPE_KINDS.customer.includes(k) ? 'customer' : 'general';

/** Compact axis ticks: 2.4M, 450k, 12. Values here mix money and counts, so no currency sign. */
function fmtCompactAxis(v: number): string {
  const n = Math.abs(v);
  if (n >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

const selCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * The one Compare view (Insights' duplicate was removed). `initialKind/A/B` come from the URL
 * (?tab=compare&kind=product&a=<id>&b=<id>), e.g. old /insights?mode=compare links.
 */
export function AnalyticsCompareTab({
  periodLabel,
  scope = {},
  initialKind,
  initialA,
  initialB,
}: {
  periodLabel: string;
  scope?: InsightScopeParams;
  initialKind?: EntityKind;
  initialA?: string;
  initialB?: string;
}) {
  const [cmpScope, setCmpScope] = useState<CompareScope>(initialKind ? scopeForKind(initialKind) : 'product');
  const allowedKinds = SCOPE_KINDS[cmpScope];
  const [kind, setKind] = useState<EntityKind>(initialKind ?? allowedKinds[0]);
  const [aId, setAId] = useState(initialA ?? '');
  const [bId, setBId] = useState(initialB ?? '');
  const [view, setView] = useState<ViewMode>('chart');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const narrate = useNarrateInsight();
  const compareMut = useCompareInsight();
  const { data: entities = [], isLoading: entitiesLoading } = useCompareEntities(kind, scope);

  useEffect(() => {
    if (!allowedKinds.includes(kind)) setKind(allowedKinds[0]);
  }, [cmpScope, allowedKinds, kind]);

  useEffect(() => {
    if (entities.length === 0) return;
    if (!entities.find((e) => e.id === aId)) setAId(entities[0].id);
    if (!entities.find((e) => e.id === bId)) setBId(entities[1]?.id || entities[0].id);
  }, [entities]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setNarrative(null);
    if (!aId || !bId || aId === bId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    compareMut.mutate(
      { kind, aId, bId, ...scope },
      {
        onSuccess: (data) => { if (!cancelled) setResult(data); },
        onError: () => { if (!cancelled) setResult(null); },
      },
    );
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, aId, bId, scope]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.groups.flatMap((g) =>
      g.rows
        .filter((r) => r.b && Number.isFinite(r.a.value) && Number.isFinite(r.b.value))
        .slice(0, 8)
        .map((r) => ({
          name: r.label.length > 18 ? `${r.label.slice(0, 16)}…` : r.label,
          full: r.label,
          a: r.a.value,
          b: r.b!.value,
          aDisplay: r.a.display,
          bDisplay: r.b!.display,
        })),
    ).slice(0, 10);
  }, [result]);

  const handleNarrate = (r: CompareResult) => {
    setNarrative(null);
    narrate.mutate(
      {
        kind,
        aLabel: r.aLabel,
        bLabel: r.bLabel,
        aWins: r.aWins,
        bWins: r.bWins,
        periodLabel,
        insights: r.insights.map((i) => i.text),
        metrics: r.groups.flatMap((g) =>
          g.rows.map((row) => ({
            group: g.group,
            label: row.label,
            a: row.a.display,
            b: row.b?.display ?? '-',
            winner: row.winner ?? undefined,
            deltaPct: row.deltaPct,
          })),
        ),
      },
      { onSuccess: (data) => setNarrative(data.summary) },
    );
  };

  const loadingCompare = entitiesLoading || (compareMut.isPending && !result);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Two products, customers, suppliers, locations or agents side by side, for the selected location and period.
      </p>

      <div role="group" aria-label="Compare scope" className="inline-flex flex-wrap items-center rounded-md border bg-muted/40 p-0.5">
        {(
          [
            ['product', 'Products'],
            ['customer', 'Customers'],
            ['general', 'General'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={cmpScope === key}
            onClick={() => setCmpScope(key)}
            className={`rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
              cmpScope === key
                ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cmpScope === 'general' && (
        <div role="group" aria-label="Entity type" className="inline-flex flex-wrap items-center rounded-md border bg-muted/40 p-0.5">
          {ENTITY_KINDS.filter((k) => allowedKinds.includes(k.key)).map((k) => (
            <button
              key={k.key}
              type="button"
              aria-pressed={kind === k.key}
              onClick={() => setKind(k.key)}
              className={`rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
                kind === k.key ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {cmpScope !== 'general' && allowedKinds.length > 1 && (
        <div role="group" aria-label="Entity type" className="inline-flex flex-wrap items-center rounded-md border bg-muted/40 p-0.5">
          {allowedKinds.map((k) => {
            const meta = ENTITY_KINDS.find((e) => e.key === k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={`rounded-[calc(var(--radius)-2px)] px-2.5 py-1 text-xs font-medium transition-colors ${
                  kind === k ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                }`}
              >
                {meta?.label ?? k}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="space-y-1">
          <label htmlFor="compare-entity-a" className="text-xs text-muted-foreground">Entity A</label>
          <select id="compare-entity-a" value={aId} onChange={(e) => setAId(e.target.value)} className={selCls} disabled={entitiesLoading}>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.sublabel ? ` · ${e.sublabel}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex items-center justify-center h-10 w-10 text-muted-foreground shrink-0 mt-4">
          <ArrowLeftRight size={16} aria-hidden />
        </div>
        <div className="space-y-1">
          <label htmlFor="compare-entity-b" className="text-xs text-muted-foreground">Entity B</label>
          <select id="compare-entity-b" value={bId} onChange={(e) => setBId(e.target.value)} className={selCls} disabled={entitiesLoading}>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.sublabel ? ` · ${e.sublabel}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loadingCompare ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" size={16} aria-hidden /> Loading comparison…
        </div>
      ) : !result ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {aId === bId ? 'Pick two different entities to compare.' : 'Select entities to compare.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-3">
            <div className={`rounded-xl border bg-card p-4 ${result.aWins > result.bWins ? 'border-primary/40' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: 'var(--series-1)' }} />Entity A</span>
                {result.aWins > result.bWins && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Crown size={12} aria-hidden /> Leader
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold truncate mt-1">{result.aLabel}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{result.aWins} metric wins</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-4">
              <span className="text-xs text-muted-foreground">Score</span>
              <span className="text-2xl font-semibold tabular-nums">
                {result.aWins} <span className="text-muted-foreground text-lg">to</span> {result.bWins}
              </span>
            </div>
            <div className={`rounded-xl border bg-card p-4 ${result.bWins > result.aWins ? 'border-primary/40' : ''}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span aria-hidden className="h-2 w-2 rounded-full" style={{ background: 'var(--series-2)' }} />Entity B</span>
                {result.bWins > result.aWins && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Crown size={12} aria-hidden /> Leader
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold truncate mt-1">{result.bLabel}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{result.bWins} metric wins</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div role="group" aria-label="View" className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-md border">
              <button
                type="button"
                aria-pressed={view === 'chart'}
                onClick={() => setView('chart')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-colors ${view === 'chart' ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}
              >
                <BarChart3 size={14} aria-hidden /> Chart
              </button>
              <button
                type="button"
                aria-pressed={view === 'table'}
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[calc(var(--radius)-2px)] text-xs font-medium transition-colors ${view === 'table' ? 'bg-accent text-accent-foreground shadow-sm ring-1 ring-inset ring-primary/45' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}`}
              >
                <TableIcon size={14} aria-hidden /> Table
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleNarrate(result)}
              disabled={narrate.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {narrate.isPending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} className="text-muted-foreground" aria-hidden />}
              AI summary
            </button>
          </div>

          {view === 'chart' ? (
            <div className="rounded-xl border bg-card p-4 h-[360px] relative">
              {compareMut.isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/50">
                  <Loader2 className="animate-spin text-muted-foreground" size={20} />
                </div>
              )}
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No numeric metrics to chart.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={CHART_TEXT.tick} angle={-25} textAnchor="end" height={60} />
                    <YAxis axisLine={false} tickLine={false} width={56} tick={CHART_TEXT.tick} tickFormatter={fmtCompactAxis} />
                    <Tooltip
                      {...CHART_TOOLTIP}
                      cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                      formatter={(_v, name, item) => {
                        const p = item?.payload as { aDisplay?: string; bDisplay?: string };
                        return name === 'a' ? p.aDisplay ?? String(_v) : p.bDisplay ?? String(_v);
                      }}
                      labelFormatter={(_l, items) => (items?.[0]?.payload as { full?: string })?.full ?? String(_l)}
                    />
                    <Legend wrapperStyle={CHART_TEXT.legend} />
                    <Bar dataKey="a" name={result.aLabel} fill="var(--series-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="b" name={result.bLabel} fill="var(--series-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {result.groups.map((g) => (
                <div key={g.group} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-2 border-b text-xs font-medium text-muted-foreground">
                    {g.group}
                  </div>
                  <div className="divide-y">
                    {g.rows.map((r) => (
                      <div
                        key={r.key}
                        className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-3 px-4 py-2.5 items-center"
                      >
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        <span className={`text-sm font-semibold tabular-nums text-right ${r.winner === 'a' ? 'text-primary' : ''}`}>
                          {r.winner === 'a' && <Crown size={14} className="inline mr-1 text-primary" aria-label="Winner" />}
                          {r.a.display}
                          {r.winner === 'a' && r.deltaPct > 0 && <Lead pct={r.deltaPct} />}
                        </span>
                        <span className={`text-sm font-semibold tabular-nums text-right ${r.winner === 'b' ? 'text-primary' : ''}`}>
                          {r.winner === 'b' && <Crown size={14} className="inline mr-1 text-primary" aria-label="Winner" />}
                          {r.b?.display ?? '-'}
                          {r.winner === 'b' && r.deltaPct > 0 && <Lead pct={r.deltaPct} />}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border bg-card">
            <div className="p-4 border-b flex items-center gap-2">
              <Lightbulb size={16} className="text-muted-foreground" aria-hidden />
              <h3 className="text-sm font-semibold">Key insights</h3>
            </div>
            <div className="p-4 space-y-2">
              {result.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    aria-hidden
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ background: ins.winner === 'a' ? 'var(--series-1)' : ins.winner === 'b' ? 'var(--series-2)' : 'var(--border)' }}
                  />
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
            {narrative && (
              <div className="px-4 pb-4">
                <div className="rounded-md border bg-muted/40 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {narrative}
                </div>
              </div>
            )}
            {narrate.isError && (
              <p className="px-4 pb-4 text-xs text-destructive">Could not generate AI summary. Try again.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** The winner's lead on a metric, as the old Insights compare showed it. */
function Lead({ pct }: Readonly<{ pct: number }>) {
  return <span className="ml-2 text-xs font-normal text-muted-foreground">{pct}% ahead</span>;
}
