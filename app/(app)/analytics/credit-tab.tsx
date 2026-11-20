'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsOverviewData } from '@/types/api';
import { CHART_TOOLTIP, formatAxisMoney, formatCount, formatDate, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import type { Period } from '@/lib/period';
import { DataTable, KpiStrip, StatusBadge, type Column, type KpiCell } from '@/components/app';
import {
  AXIS_TICK, BAR_CURSOR, ChartEmpty, LEGEND_STYLE, Panel, RankedBars, Seg, SourceNote, TabLayout, TwoCol,
  effectiveGrain, grainOptions, type Grain, type GrainOption,
} from './analytics-ui';

type CreditData = AnalyticsOverviewData['credit'];
type Debtor = CreditData['topDebtors'][number];

/** Older debt is the real risk: status colour only on the two oldest buckets. */
const AGE_BAR = ['bg-chart-1', 'bg-chart-3', 'bg-warning', 'bg-destructive'];
const riskBar = (ratio: number) => (ratio > 50 ? 'bg-destructive' : ratio > 25 ? 'bg-warning' : 'bg-chart-1');
const creditHref = (customerId?: string) => (customerId ? `/credits?customer=${encodeURIComponent(customerId)}` : undefined);

export function CreditTab({ data, period }: Readonly<{ data: CreditData; period: Period }>) {
  const router = useRouter();
  const { kpis, agingReport, topDebtors, customerRisk, collectionTrend, collectionWeeklyTrend } = data;
  const { totalOutstanding, totalOverdue, totalCleared, collectionRate } = kpis;

  const grains: GrainOption[] = grainOptions(period, ['week', 'month']).filter(([g]) => g !== 'week' || collectionWeeklyTrend.length > 0);
  const [chosenGrain, setChosenGrain] = useState<Grain | null>(null);
  const collGrain = effectiveGrain(chosenGrain, grains, 'month');
  const collSeries = collGrain === 'week' ? collectionWeeklyTrend : collectionTrend;
  const [agingMetric, setAgingMetric] = useState<'amount' | 'count'>('amount');
  const [riskMetric, setRiskMetric] = useState<'creditRatio' | 'totalOwed'>('creditRatio');
  const [status, setStatus] = useState<'all' | 'Overdue' | 'Pending'>('all');

  const cells: KpiCell[] = [
    { label: 'Owed now', value: formatMoneyShort(totalOutstanding), tone: totalOutstanding > 0 ? 'warning' : 'default', href: '/credits', detail: 'All open credit, today' },
    { label: 'Overdue now', value: formatMoneyShort(totalOverdue), tone: totalOverdue > 0 ? 'danger' : 'default', href: '/credits?overdue=1', detail: 'Past the due date' },
    { label: 'Collection rate', value: `${collectionRate}%`, detail: 'Cleared of all credit issued' },
    { label: 'Cleared', value: formatMoneyShort(totalCleared), detail: 'All time' },
  ];

  const agingRows = agingReport.map((b, i) => ({
    key: b.label,
    label: b.label,
    value: agingMetric === 'amount' ? b.amount : b.count,
    detail: agingMetric === 'amount' ? plural(b.count, 'account') : formatMoneyShort(b.amount),
    barClass: AGE_BAR[i] ?? 'bg-chart-1',
  }));
  const riskRows = [...customerRisk]
    .sort((a, b) => b[riskMetric] - a[riskMetric])
    .map((r) => ({
      key: r.customerId ?? r.name,
      label: r.name,
      value: r[riskMetric],
      detail: riskMetric === 'creditRatio' ? `${formatMoneyShort(r.totalOwed)} of ${formatMoneyShort(r.totalSpent)}` : r.overdueCount ? `${r.overdueCount} overdue` : undefined,
      barClass: riskMetric === 'creditRatio' ? riskBar(r.creditRatio) : undefined,
      href: creditHref(r.customerId),
    }));

  const debtors = status === 'all' ? topDebtors : topDebtors.filter((d) => d.status === status);
  const columns: Column<Debtor>[] = [
    { id: 'customer', header: 'Customer', mobile: 'title', cell: (d) => d.customerName, sortValue: (d) => d.customerName.toLowerCase() },
    { id: 'status', header: 'Status', mobile: 'meta', cell: (d) => <StatusBadge tone={d.status === 'Overdue' ? 'danger' : 'warning'}>{d.status}</StatusBadge>, sortValue: (d) => d.status },
    { id: 'issued', header: 'Issued', mobile: 'subtitle', cell: (d) => formatDate(d.dateIssued), sortValue: (d) => d.dateIssued },
    { id: 'owed', header: 'Owed', align: 'right', mobile: 'value', cell: (d) => formatMoney(d.amountOwed), sortValue: (d) => d.amountOwed },
  ];

  return (
    <TabLayout>
      <KpiStrip cells={cells} label="Credit figures" />

      <Panel
        title="Collection performance"
        subtitle={`Credit issued and cleared ${collGrain === 'week' ? 'per week' : 'per month'}, by issue date`}
        control={<Seg label="Collection grain" value={collGrain} onChange={(g) => setChosenGrain(g)} options={grains} />}
        bodyClassName="h-[280px]"
      >
        {collSeries.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={collSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={16} />
              <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={56} tickFormatter={(v) => formatAxisMoney(Number(v))} />
              <Tooltip {...CHART_TOOLTIP} cursor={BAR_CURSOR} formatter={(v) => formatMoney(Number(v))} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ ...LEGEND_STYLE, paddingTop: 8 }} />
              <Bar dataKey="issued" name="Issued" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              <Bar dataKey="cleared" name="Cleared" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ChartEmpty text="No credit issued in this period" />
        )}
      </Panel>

      <TwoCol>
        <Panel
          title="Age of open credit"
          subtitle="What is owed today, by how long ago it was issued"
          control={<Seg label="Aging metric" value={agingMetric} onChange={setAgingMetric} options={[['amount', 'Amount'], ['count', 'Accounts']]} />}
        >
          <RankedBars rows={agingRows} format={agingMetric === 'amount' ? formatMoneyShort : formatCount} emptyText="Nothing owed" />
        </Panel>
        <Panel
          title="Customer credit risk"
          subtitle={riskMetric === 'creditRatio' ? 'Owed as a share of lifetime spend (higher is riskier)' : 'Ranked by amount owed'}
          control={<Seg label="Risk metric" value={riskMetric} onChange={setRiskMetric} options={[['creditRatio', 'Ratio'], ['totalOwed', 'Owed']]} />}
        >
          <RankedBars
            rows={riskRows}
            format={riskMetric === 'creditRatio' ? (n) => `${n}%` : formatMoneyShort}
            showShare={riskMetric === 'totalOwed'}
            limit={10}
            emptyText="No customers owe anything"
          />
        </Panel>
      </TwoCol>

      <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Largest balances</h3>
            <p className="text-xs text-muted-foreground">Open credit today. Select one to open the customer&apos;s credit.</p>
          </div>
          <Seg label="Debt status" value={status} onChange={setStatus} options={[['all', 'All'], ['Overdue', 'Overdue'], ['Pending', 'Pending']]} />
        </div>
        <DataTable
          label="Largest balances"
          columns={columns}
          rows={debtors}
          getRowId={(d) => d.id}
          defaultSort={{ id: 'owed', dir: 'desc' }}
          onRowClick={(d) => { const href = creditHref(d.customerId); if (href) router.push(href); }}
          resetPageKey={status}
          empty={<p className="px-4 py-8 text-center text-sm text-muted-foreground">{status === 'all' ? 'No open credit' : `No ${status.toLowerCase()} credit`}</p>}
        />
      </div>

      <SourceNote>Owed, overdue, age and risk are today&apos;s balances whatever the period. The collection chart uses each credit&apos;s issue date.</SourceNote>
    </TabLayout>
  );
}
