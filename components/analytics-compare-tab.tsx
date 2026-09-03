'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeftRight, Crown, Lightbulb, Loader2, Sparkles, Table as TableIcon, BarChart3, ExternalLink,
} from 'lucide-react';
import { useInsightDataBundle } from '@/hooks/use-insight-data-bundle';
import { useNarrateInsight } from '@/hooks/use-queries';
import {
  EntityKind, ENTITY_KINDS, listEntities, compare, type CompareResult,
} from '@/lib/insights';

type CompareScope = 'product' | 'customer' | 'general';
type ViewMode = 'chart' | 'table';

const SCOPE_KINDS: Record<CompareScope, EntityKind[]> = {
  product: ['product', 'category'],
  customer: ['customer', 'segment'],
  general: ['supplier', 'hub', 'agent', 'product', 'customer', 'category', 'segment'],
};

const selCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring';

export function AnalyticsCompareTab({ periodLabel }: { periodLabel: string }) {
  const { bundle, isLoading } = useInsightDataBundle();
  const [scope, setScope] = useState<CompareScope>('product');
  const allowedKinds = SCOPE_KINDS[scope];
  const [kind, setKind] = useState<EntityKind>(allowedKinds[0]);
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');
  const [view, setView] = useState<ViewMode>('chart');
  const [narrative, setNarrative] = useState<string | null>(null);
  const narrate = useNarrateInsight();

  useEffect(() => {
    if (!allowedKinds.includes(kind)) setKind(allowedKinds[0]);
  }, [scope, allowedKinds, kind]);

  const entities = useMemo(() => listEntities(kind, bundle), [kind, bundle]);

  useEffect(() => {
    if (entities.length === 0) return;
    if (!entities.find((e) => e.id === aId)) setAId(entities[0].id);
    if (!entities.find((e) => e.id === bId)) setBId(entities[1]?.id || entities[0].id);
  }, [entities]); // eslint-disable-line react-hooks/exhaustive-deps

  const result = useMemo(
    () => (aId && bId && aId !== bId ? compare(kind, aId, bId, bundle) : null),
    [kind, aId, bId, bundle],
  );

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

  const insightsLink = `/insights?mode=compare&kind=${encodeURIComponent(kind)}&a=${encodeURIComponent(aId)}&b=${encodeURIComponent(bId)}`;

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
            b: row.b?.display ?? '—',
            winner: row.winner ?? undefined,
            deltaPct: row.deltaPct,
          })),
        ),
      },
      { onSuccess: (data) => setNarrative(data.summary) },
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="animate-spin" size={16} /> Loading comparison data…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <ArrowLeftRight size={16} className="text-primary" /> Compare
          </h2>
          <p className="text-xs text-muted-foreground">
            Side-by-side metrics for the selected hub and period. Open Insight Explorer for Ask / Explore / Simulate.
          </p>
        </div>
        <Link
          href={insightsLink}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-accent"
        >
          <Sparkles size={13} /> Open in Insights <ExternalLink size={12} />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => setScope(key)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
              scope === key
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card hover:bg-accent text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {scope === 'general' && (
        <div className="flex flex-wrap items-center gap-2">
          {ENTITY_KINDS.filter((k) => allowedKinds.includes(k.key)).map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setKind(k.key)}
              className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
                kind === k.key ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {scope !== 'general' && allowedKinds.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          {allowedKinds.map((k) => {
            const meta = ENTITY_KINDS.find((e) => e.key === k);
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold ${
                  kind === k ? 'bg-background shadow-sm' : 'text-muted-foreground'
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
          <label className="text-[10px] font-bold uppercase text-primary">Entity A</label>
          <select value={aId} onChange={(e) => setAId(e.target.value)} className={selCls}>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.sublabel ? ` · ${e.sublabel}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-full border bg-muted/40 text-muted-foreground shrink-0 mt-4">
          <ArrowLeftRight size={16} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-blue-600">Entity B</label>
          <select value={bId} onChange={(e) => setBId(e.target.value)} className={selCls}>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
                {e.sublabel ? ` · ${e.sublabel}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!result ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {aId === bId ? 'Pick two different entities to compare.' : 'Select entities to compare.'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 items-stretch gap-3">
            <div className={`rounded-xl border p-4 ${result.aWins > result.bWins ? 'border-primary/40 bg-primary/5' : 'bg-card'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-primary">Entity A</span>
                {result.aWins > result.bWins && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    <Crown size={9} /> Leader
                  </span>
                )}
              </div>
              <p className="text-lg font-black truncate mt-1">{result.aLabel}</p>
              <p className="text-xs text-muted-foreground">{result.aWins} metric wins</p>
            </div>
            <div className="flex flex-col items-center justify-center rounded-xl border bg-muted/20 p-4">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Score</span>
              <span className="text-2xl font-black">
                {result.aWins} <span className="text-muted-foreground text-lg">–</span> {result.bWins}
              </span>
            </div>
            <div className={`rounded-xl border p-4 ${result.bWins > result.aWins ? 'border-blue-500/40 bg-blue-500/5' : 'bg-card'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-blue-600">Entity B</span>
                {result.bWins > result.aWins && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
                    <Crown size={9} /> Leader
                  </span>
                )}
              </div>
              <p className="text-lg font-black truncate mt-1">{result.bLabel}</p>
              <p className="text-xs text-muted-foreground">{result.bWins} metric wins</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border">
              <button
                type="button"
                onClick={() => setView('chart')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'chart' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <BarChart3 size={13} /> Chart
              </button>
              <button
                type="button"
                onClick={() => setView('table')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${view === 'table' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
              >
                <TableIcon size={13} /> Table
              </button>
            </div>
            <button
              type="button"
              onClick={() => handleNarrate(result)}
              disabled={narrate.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold hover:bg-accent disabled:opacity-50"
            >
              {narrate.isPending ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              AI summary
            </button>
          </div>

          {view === 'chart' ? (
            <div className="rounded-xl border bg-card p-4 h-[360px]">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No numeric metrics to chart.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(_v, name, item) => {
                        const p = item?.payload as { aDisplay?: string; bDisplay?: string };
                        return name === 'a' ? p.aDisplay ?? String(_v) : p.bDisplay ?? String(_v);
                      }}
                      labelFormatter={(_l, items) => (items?.[0]?.payload as { full?: string })?.full ?? String(_l)}
                    />
                    <Legend />
                    <Bar dataKey="a" name={result.aLabel} fill="#0891b2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="b" name={result.bLabel} fill="#2563eb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {result.groups.map((g) => (
                <div key={g.group} className="rounded-xl border bg-card overflow-hidden">
                  <div className="px-4 py-2 border-b bg-muted/20 text-[10px] font-bold uppercase text-muted-foreground">
                    {g.group}
                  </div>
                  <div className="divide-y">
                    {g.rows.map((r) => (
                      <div
                        key={r.key}
                        className="grid grid-cols-[1fr_auto_auto] sm:grid-cols-[minmax(120px,1fr)_1fr_1fr] gap-3 px-4 py-2.5 items-center"
                      >
                        <span className="text-sm text-muted-foreground">{r.label}</span>
                        <span className={`text-sm font-bold tabular-nums text-right ${r.winner === 'a' ? 'text-primary' : ''}`}>
                          {r.winner === 'a' && <Crown size={11} className="inline mr-1 text-primary" />}
                          {r.a.display}
                        </span>
                        <span className={`text-sm font-bold tabular-nums text-right ${r.winner === 'b' ? 'text-blue-600' : ''}`}>
                          {r.winner === 'b' && <Crown size={11} className="inline mr-1 text-blue-600" />}
                          {r.b?.display ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border bg-card shadow-sm">
            <div className="p-4 border-b flex items-center gap-2">
              <Lightbulb size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold">Key Insights</h3>
            </div>
            <div className="p-4 space-y-2">
              {result.insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                      ins.winner === 'a' ? 'bg-primary' : ins.winner === 'b' ? 'bg-blue-500' : 'bg-muted-foreground'
                    }`}
                  />
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
            {narrative && (
              <div className="px-4 pb-4">
                <div className="rounded-lg border bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
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
