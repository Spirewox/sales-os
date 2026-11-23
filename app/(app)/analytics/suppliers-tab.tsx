'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Star } from 'lucide-react';
import { useAllSupplierIssues, useInventory, useStockLogs, useSuppliers } from '@/hooks/use-queries';
import type { InsightScopeParams } from '@/hooks/use-insights-api';
import type { StockLog } from '@/types';
import type { Period } from '@/lib/period';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatDate, formatMoney, formatMoneyShort, formatPercent, plural } from '@/lib/format';
import { DataTable, KpiStrip, StatusBadge, type Column, type KpiCell } from '@/components/app';
import { Skeleton } from '@/components/ui/skeleton';
import { isPurchase, logValue, supplierKeyResolver } from '../suppliers/supplier-utils';
import {
  AXIS_TICK, BAR_CURSOR, ChartEmpty, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol,
  effectiveGrain, grainOptions, pctChange, type Grain, type RankedRow,
} from './analytics-ui';

const LOG_LIMIT = 500;

type ScoreRow = { id: string; name: string; code?: string; spend: number; orders: number; last: string | null; rating?: number; openIssues: number; active: boolean };

function bucket(day: string, grain: Grain): string {
  if (grain === 'month') return day.slice(0, 7);
  if (grain === 'week') {
    const d = new Date(`${day}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }
  return day;
}
const bucketLabel = (key: string, grain: Grain) =>
  grain === 'month'
    ? new Date(`${key}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    : new Date(`${key}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/**
 * Supplier analytics: what was bought, from whom, how costs moved and where issues sit, for the
 * selected location and period. Built from purchase records.
 */
export function SuppliersTab({ scope, prevScope, period }: Readonly<{ scope: InsightScopeParams; prevScope: InsightScopeParams | null; period: Period }>) {
  const router = useRouter();
  const hubId = scope.hub_id;
  const ranged = scope.period !== 'all';
  const { data: supplierList, isPending: suppliersLoading } = useSuppliers({ hub_id: hubId, limit: 200 });
  const suppliers = useMemo(() => supplierList?.items ?? [], [supplierList]);
  const { data: logsResult, isPending: logsLoading } = useStockLogs({
    type: 'PURCHASE', hub_id: hubId, limit: LOG_LIMIT,
    ...(ranged ? { date_from: scope.date_from, date_to: scope.date_to } : {}),
  });
  const { data: prevResult } = useStockLogs(prevScope ? { type: 'PURCHASE', hub_id: hubId, limit: LOG_LIMIT, date_from: prevScope.date_from, date_to: prevScope.date_to } : null);
  const { data: inventory } = useInventory({ hub_id: hubId });
  const supplierIds = useMemo(() => suppliers.map((s) => s.id), [suppliers]);
  const { data: issues } = useAllSupplierIssues(supplierIds);

  const grains = grainOptions(period, ['day', 'week', 'month']);
  const [chosenGrain, setChosenGrain] = useState<Grain | null>(null);
  const grain = effectiveGrain(chosenGrain, grains, 'month');

  const a = useMemo(() => {
    const keyOf = supplierKeyResolver(suppliers);
    const logs = (logsResult?.data ?? []).filter(isPurchase);
    const prevLogs = (prevResult?.data ?? []).filter(isPurchase);
    const categoryOf = new Map((inventory ?? []).map((i) => [i.id, i.category as string]));

    const spend = logs.reduce((s, l) => s + logValue(l), 0);
    const prevSpend = prevLogs.reduce((s, l) => s + logValue(l), 0);

    const bySupplier = new Map<string, { spend: number; orders: number; last: string }>();
    const byCategory = new Map<string, number>();
    const overTime = new Map<string, number>();
    const costByItem = new Map<string, { name: string; first: StockLog; last: StockLog }>();
    for (const l of logs) {
      const k = keyOf(l) ?? `name:${l.supplier ?? 'Unknown'}`;
      const cur = bySupplier.get(k) ?? { spend: 0, orders: 0, last: '' };
      cur.spend += logValue(l);
      cur.orders += 1;
      if (l.date > cur.last) cur.last = l.date;
      bySupplier.set(k, cur);
      const cat = categoryOf.get(l.itemId) ?? 'Other';
      byCategory.set(cat, (byCategory.get(cat) ?? 0) + logValue(l));
      const b = bucket(l.date.slice(0, 10), grain);
      overTime.set(b, (overTime.get(b) ?? 0) + logValue(l));
      if (l.unitCost > 0 && l.itemId) {
        const c = costByItem.get(l.itemId);
        if (!c) costByItem.set(l.itemId, { name: l.itemName, first: l, last: l });
        else {
          if (l.date < c.first.date) c.first = l;
          if (l.date > c.last.date) c.last = l;
        }
      }
    }

    const nameOf = new Map(suppliers.map((s) => [s.id, s.name]));
    const openBySupplier = new Map<string, number>();
    const openByType = new Map<string, number>();
    let highOpen = 0;
    for (const i of issues ?? []) {
      if (i.status !== 'Open') continue;
      openBySupplier.set(i.supplierId, (openBySupplier.get(i.supplierId) ?? 0) + 1);
      openByType.set(i.type, (openByType.get(i.type) ?? 0) + 1);
      if (i.severity === 'High') highOpen += 1;
    }

    const supplierRows: RankedRow[] = [...bySupplier.entries()]
      .sort((x, y) => y[1].spend - x[1].spend)
      .map(([k, v]) => ({
        key: k,
        label: nameOf.get(k) ?? k.replace(/^name:/, ''),
        value: v.spend,
        detail: plural(v.orders, 'order'),
        href: nameOf.has(k) ? `/suppliers?supplier=${k}` : undefined,
      }));
    const categoryRows: RankedRow[] = [...byCategory.entries()].sort((x, y) => y[1] - x[1]).map(([c, v]) => ({ key: c, label: c, value: v }));
    const trend = [...overTime.entries()].sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => ({ key: k, label: bucketLabel(k, grain), spend: v }));
    const costChanges = [...costByItem.entries()]
      .filter(([, c]) => c.first !== c.last && c.first.unitCost > 0)
      .map(([id, c]) => ({ id, name: c.name, from: c.first.unitCost, to: c.last.unitCost, pct: ((c.last.unitCost - c.first.unitCost) / c.first.unitCost) * 100 }))
      .filter((c) => Math.abs(c.pct) >= 0.5)
      .sort((x, y) => Math.abs(y.pct) - Math.abs(x.pct))
      .slice(0, 6);
    const issueRows: RankedRow[] = [...openByType.entries()].sort((x, y) => y[1] - x[1]).map(([t, n]) => ({ key: t, label: t, value: n, barClass: 'bg-warning' }));

    const score: ScoreRow[] = suppliers.map((s) => {
      const v = bySupplier.get(s.id);
      return { id: s.id, name: s.name, code: s.code, spend: v?.spend ?? 0, orders: v?.orders ?? 0, last: v?.last || null, rating: s.rating, openIssues: openBySupplier.get(s.id) ?? 0, active: s.isActive };
    });

    return {
      spend, prevSpend, orders: logs.length, used: [...bySupplier.keys()].filter((k) => nameOf.has(k)).length,
      activeTotal: suppliers.filter((s) => s.isActive).length,
      openIssues: [...openBySupplier.values()].reduce((x, y) => x + y, 0), highOpen,
      supplierRows, categoryRows, trend, costChanges, issueRows, score,
    };
  }, [suppliers, logsResult, prevResult, inventory, issues, grain]);

  const loading = suppliersLoading || logsLoading;
  const change = ranged && prevScope ? pctChange(a.spend, a.prevSpend) : null;
  const cells: KpiCell[] = [
    { label: 'Spend', value: formatMoneyShort(a.spend), detail: formatMoney(a.spend), change: change != null ? { pct: change, goodWhen: 'neutral' } : null },
    { label: 'Purchase orders', value: formatCount(a.orders), detail: a.orders ? `${formatMoneyShort(a.spend / a.orders)} average` : 'None in this period' },
    { label: 'Suppliers used', value: formatCount(a.used), detail: `of ${formatCount(a.activeTotal)} active`, href: '/suppliers' },
    { label: 'Open issues', value: formatCount(a.openIssues), tone: a.openIssues ? 'warning' : 'default', detail: a.highOpen ? `${a.highOpen} high severity` : 'None high severity', href: '/suppliers?show=issues' },
  ];

  const columns: Column<ScoreRow>[] = [
    {
      id: 'name', header: 'Supplier', mobile: 'title', sortValue: (r) => r.name.toLowerCase(),
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium">{r.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {r.code && <span className="font-mono">{r.code}</span>}
            {!r.active && <StatusBadge tone="neutral">Inactive</StatusBadge>}
          </span>
        </span>
      ),
    },
    { id: 'spend', header: 'Spend', align: 'right', mobile: 'value', cell: (r) => <span className="font-medium">{formatMoney(r.spend)}</span>, sortValue: (r) => r.spend },
    { id: 'orders', header: 'Orders', align: 'right', mobile: 'meta', cell: (r) => formatCount(r.orders), sortValue: (r) => r.orders },
    { id: 'avg', header: 'Average order', align: 'right', hideBelow: 'lg', cell: (r) => (r.orders ? formatMoney(r.spend / r.orders) : '-'), sortValue: (r) => (r.orders ? r.spend / r.orders : 0) },
    { id: 'last', header: 'Last purchase', mobile: 'meta', cell: (r) => (r.last ? formatDate(r.last) : <span className="text-muted-foreground">None</span>), sortValue: (r) => r.last },
    {
      id: 'rating', header: 'Rating', hideBelow: 'lg', sortValue: (r) => r.rating ?? null,
      cell: (r) => (r.rating ? <span className="inline-flex items-center gap-1 tabular-nums"><Star size={14} className="fill-current text-warning" aria-hidden />{r.rating.toFixed(1)}</span> : <span className="text-muted-foreground">-</span>),
    },
    { id: 'issues', header: 'Open issues', mobile: 'meta', cell: (r) => (r.openIssues ? <StatusBadge tone="warning">{plural(r.openIssues, 'issue')}</StatusBadge> : <span className="text-muted-foreground">None</span>), sortValue: (r) => r.openIssues },
  ];

  return (
    <TabLayout>
      <KpiStrip label="Supplier figures" cells={cells} loading={loading} />

      <Panel
        title="Spend over time"
        subtitle="Purchases recorded in this period"
        control={<Seg label="Spend grain" value={grain} onChange={setChosenGrain} options={grains} />}
        bodyClassName="h-[280px]"
      >
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : a.trend.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={a.trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={8} minTickGap={16} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => formatAxisMoney(Number(v))} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v) => [formatMoney(Number(v)), 'Spend']} />
              <Bar dataKey="spend" name="Spend" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No purchases in this period" />
        )}
      </Panel>

      <TwoCol>
        <Panel title="Spend by supplier" subtitle="Who you bought the most from">
          {loading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={a.supplierRows} format={formatMoneyShort} emptyText="No purchases in this period" limit={8} />}
        </Panel>
        <Panel title="Spend by category" subtitle="What the money went on">
          {loading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={a.categoryRows} format={formatMoneyShort} emptyText="No purchases in this period" limit={8} />}
        </Panel>
      </TwoCol>

      <TwoCol>
        <Panel title="Biggest cost changes" subtitle="Unit cost at the first and last purchase in this period">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : a.costChanges.length === 0 ? (
            <ChartEmpty text="No cost changes in this period" className="min-h-24" />
          ) : (
            <ol className="divide-y">
              {a.costChanges.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/inventory?product=${c.id}`} className="block truncate font-medium hover:underline">{c.name}</Link>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(c.from)} to {formatMoney(c.to)}</p>
                  </div>
                  <StatusBadge tone={c.pct > 0 ? 'warning' : 'good'}>{c.pct > 0 ? '+' : ''}{formatPercent(c.pct, 1)}</StatusBadge>
                </li>
              ))}
            </ol>
          )}
        </Panel>
        <Panel title="Open issues by type" subtitle="Unresolved supplier issues, all time">
          <RankedBars rows={a.issueRows} format={formatCount} emptyText="No open issues" />
        </Panel>
      </TwoCol>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Supplier scorecard</h3>
          <Link href="/suppliers" className="text-sm font-medium text-primary hover:underline">Open suppliers</Link>
        </div>
        <DataTable
          label="Supplier scorecard"
          pageSizeKey="analytics-suppliers"
          columns={columns}
          rows={loading ? undefined : a.score}
          loading={loading}
          getRowId={(r) => r.id}
          onRowClick={(r) => router.push(`/suppliers?supplier=${r.id}`)}
          defaultSort={{ id: 'spend', dir: 'desc' }}
          pageSize={10}
        />
      </section>

      <SourceNote>Built from purchase records for the selected location ({formatCount(LOG_LIMIT)} most recent in the period). Issues and ratings are all time.</SourceNote>
    </TabLayout>
  );
}
