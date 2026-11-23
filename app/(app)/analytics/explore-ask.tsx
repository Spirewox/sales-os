'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, Calendar, ChevronRight, Loader2, Search, Send, Sparkles } from 'lucide-react';
import { useAskInsight, useCompareInsight, type InsightScopeParams } from '@/hooks/use-insights-api';
import { ASK_EXAMPLES, type AskResult } from '@/lib/ask';
import type { Filter } from '@/lib/explore';
import type { CompareResult } from '@/lib/insights';
import { formatDate } from '@/lib/format';
import { InsightButton } from '@/components/insight-button';
import { EmptyState, StatusBadge } from '@/components/app';
import { Panel } from './analytics-ui';
import { Chip, ExampleList, Pending, ResultChart, TwoPane, addRecentQuestion, clearRecentQuestions, fmtShort, toChartKind, useRecentQuestions } from './explore-shared';

export type SeedQuery = { dataset: string; measure: string; groupBy: string; filters: Filter[] };

/** Four starting points, one per kind of answer (breakdown, pattern, find, credit); the other six are under "More examples". */
const EXAMPLES = [ASK_EXAMPLES[5], ASK_EXAMPLES[4], ASK_EXAMPLES[0], ASK_EXAMPLES[9]].filter(Boolean);
const winnerDot = (w?: string | null) => (w === 'a' ? 'var(--series-1)' : w === 'b' ? 'var(--series-2)' : 'var(--border)');

export function ExploreAsk({ scope, initialQ, onRefine }: Readonly<{ scope: InsightScopeParams; initialQ?: string; onRefine: (q: SeedQuery) => void }>) {
  const [q, setQ] = useState(initialQ ?? '');
  const askMut = useAskInsight();
  const compareMut = useCompareInsight();
  const recent = useRecentQuestions();
  const pending = askMut.isPending || compareMut.isPending;
  const result = askMut.data;
  const cmp = compareMut.data;

  const submit = (question: string) => {
    compareMut.reset();
    addRecentQuestion(question);
    askMut.mutate(
      { question, ...scope },
      {
        onSuccess: (r) => {
          if (r.compare) compareMut.mutate({ kind: r.compare.kind, aId: r.compare.aId, bId: r.compare.bId, ...scope });
        },
      },
    );
  };
  const run = (text: string) => {
    const question = text.trim();
    if (!question) return;
    setQ(question);
    submit(question);
  };

  // A question in the URL (?ask=, e.g. from an old /insights link) runs once on arrival.
  useEffect(() => {
    if (initialQ?.trim()) submit(initialQ.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  const error = (askMut.error instanceof Error && askMut.error.message) || (compareMut.error instanceof Error && compareMut.error.message) || null;

  const controls = (
    <>
      <ExampleList title="Try asking" featured={EXAMPLES} all={ASK_EXAMPLES} onPick={run} disabled={pending} />
      {recent.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Recent questions</h3>
            <button type="button" onClick={clearRecentQuestions} className="text-xs font-medium text-muted-foreground hover:text-foreground">Clear</button>
          </div>
          <div className="mt-3 space-y-2">
            {recent.map((r) => <Chip key={r} onClick={() => run(r)} disabled={pending}>{r}</Chip>)}
          </div>
        </section>
      )}
    </>
  );

  let results;
  if (pending && !result) results = <Pending text="Working out the answer…" />;
  else if (error && !pending) results = <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error || 'Could not answer that. Try again.'}</p>;
  else if (!result) results = (
    <div className="rounded-xl border bg-card">
      <EmptyState icon={<Sparkles />} title="Ask about your business" description="Sales, customers, stock, suppliers or credit. Answers use the location and period above." size="compact" />
    </div>
  );
  else results = <AskAnswer result={result} cmp={cmp} comparing={compareMut.isPending} onRefine={onRefine} />;

  return (
    <div className="space-y-5">
      <form className="flex items-center gap-2 rounded-xl border bg-card p-2 pl-4" onSubmit={(e) => { e.preventDefault(); run(q); }}>
        <Sparkles size={16} className="shrink-0 text-muted-foreground" aria-hidden />
        <label htmlFor="explore-question" className="sr-only">Ask a question</label>
        <input id="explore-question" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask anything, e.g. what do Sunday customers buy?" className="h-10 min-w-0 flex-1 bg-transparent text-sm focus:outline-none" />
        <button type="submit" disabled={!q.trim() || pending} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {pending ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Send size={14} aria-hidden />} Ask
        </button>
      </form>
      <TwoPane controls={controls} results={results} />
    </div>
  );
}

function AskAnswer({ result, cmp, comparing, onRefine }: Readonly<{ result: AskResult; cmp?: CompareResult; comparing: boolean; onRefine: (q: SeedQuery) => void }>) {
  const chips = [
    ...(result.mode === 'find' ? ['Find records'] : []),
    result.datasetLabel,
    ...(result.mode === 'aggregate' ? [result.measureLabel, `by ${result.groupLabel}`] : []),
    ...(result.dateChip ? [result.dateChip] : []),
    ...result.filterChips,
  ].filter(Boolean);
  return (
    <>
      <section className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Answer</p>
            <p className="mt-1 text-sm leading-relaxed">{result.narrative}</p>
          </div>
          {!result.compare && result.mode === 'aggregate' && result.rows.length > 0 && (
            <button type="button" onClick={() => onRefine({ dataset: result.dataset, measure: result.measure, groupBy: result.groupBy, filters: result.filters })} className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
              <ArrowUpRight size={14} aria-hidden /> Refine in builder
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Understood as</span>
          {chips.map((c) => <StatusBadge key={c} tone="neutral">{c}</StatusBadge>)}
        </div>
      </section>

      {result.mode === 'find' ? (
        result.records && result.records.length > 0 ? <RecordsList result={result} /> : null
      ) : result.compare ? (
        comparing && !cmp ? (
          <Pending text="Loading comparison…" />
        ) : cmp ? (
          <Panel
            title={`${cmp.aLabel} vs ${cmp.bLabel}`}
            subtitle={`${cmp.aWins} to ${cmp.bWins} on metric wins`}
            control={<Link href={`/analytics?tab=compare&kind=${result.compare.kind}&a=${encodeURIComponent(result.compare.aId)}&b=${encodeURIComponent(result.compare.bId)}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Open in Compare <ChevronRight size={14} aria-hidden /></Link>}
          >
            <ul className="space-y-2.5">
              {cmp.insights.map((ins, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm"><span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: winnerDot(ins.winner) }} /><span>{ins.text}</span></li>
              ))}
            </ul>
          </Panel>
        ) : null
      ) : (
        <Panel
          title={`${result.measureLabel} by ${result.groupLabel}`}
          control={<InsightButton title={`${result.measureLabel} by ${result.groupLabel}`} kind={result.measureKind} time={result.chart === 'line'} series={result.rows.map((r) => ({ label: r.label, value: r.value }))} />}
        >
          <ResultChart rows={result.rows} chart={toChartKind(result.chart)} measureLabel={result.measureLabel} measureKind={result.measureKind} groupLabel={result.groupLabel} />
        </Panel>
      )}
    </>
  );
}

function RecordsList({ result }: Readonly<{ result: AskResult }>) {
  const router = useRouter();
  const recs = result.records ?? [];
  const f = result.find!;
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Search size={16} className="shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="truncate text-sm font-semibold"><span className="tabular-nums">{f.matched}</span> {f.entityLabel}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">by {f.sortLabel}</span>
        </div>
        {f.amountKind === 'money' && f.totalAmount > 0 && (
          <div className="shrink-0 text-right"><p className="text-xs text-muted-foreground">Total</p><p className="text-sm font-semibold tabular-nums">{fmtShort(f.totalAmount, 'money')}</p></div>
        )}
      </div>
      <ul className="max-h-[520px] divide-y overflow-y-auto">
        {recs.map((r, i) => {
          const body = (
            <>
              <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  {r.count && r.count > 1 && <StatusBadge tone="neutral">{r.count} lines</StatusBadge>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  {r.date && <span className="inline-flex shrink-0 items-center gap-1"><Calendar size={12} aria-hidden />{formatDate(r.date.length === 10 ? `${r.date}T12:00:00Z` : r.date)}</span>}
                  {r.subtitle && <span className="truncate">{r.subtitle}</span>}
                </div>
              </div>
              {r.amount != null && r.amountKind === 'money' && <p className="shrink-0 text-sm font-semibold tabular-nums">{fmtShort(r.amount, 'money')}</p>}
              {r.link && <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />}
            </>
          );
          return (
            <li key={r.id + i}>
              {r.link ? (
                <button type="button" onClick={() => router.push(r.link!)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40">{body}</button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {f.matched > f.shown && <p className="border-t px-4 py-2 text-center text-xs text-muted-foreground tabular-nums">Showing the top {f.shown} of {f.matched}. Narrow it with an amount or date.</p>}
    </section>
  );
}
