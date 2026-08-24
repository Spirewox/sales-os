'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAnalyticsOverview } from '@/hooks/use-queries';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { HubScopeFilterBar } from '@/components/hub-scope-filter';
import {
  MetricsPeriodBar,
  useMetricsPeriod,
  type MetricsPeriodPreset,
} from '@/components/metrics-period-bar';
import { HAS_API } from '@/lib/require-api';
import type { AnalyticsOverviewData } from '@/types/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import {
  TrendingUp, BarChart3, Users, Package, CreditCard,
  ArrowUpRight, ArrowDownRight, Minus,
  AlertTriangle, ChevronRight, ArrowLeftRight,
} from 'lucide-react';
import { PaymentMode } from '@/types';
import { PRODUCT_CATEGORY_COLORS } from '@/lib/product-categories';
import { AnalyticsPageSkeleton } from '@/components/ui/loading-skeletons';
import { AnalyticsCompareTab } from '@/components/analytics-compare-tab';

const NAIRA = '\u20A6';
const fmt = (n: number) => `${NAIRA}${n.toLocaleString()}`;
const fmtK = (n: number) => n >= 1_000_000 ? `${NAIRA}${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${NAIRA}${(n / 1000).toFixed(0)}k` : fmt(n);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;

const TT = {
  contentStyle: { backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: 12 },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.2 },
};

const CHART_COLORS = ['#0891b2', '#ea580c', '#7c3aed', '#dc2626', '#ca8a04', '#16a34a', '#2563eb', '#f59e0b', '#ec4899', '#6b7280'];
const CAT_COLORS = PRODUCT_CATEGORY_COLORS;

type AnalyticsTab = 'sales' | 'products' | 'customers' | 'credit' | 'compare';

type PrimaryScope = {
  preset: MetricsPeriodPreset;
  isCustom: boolean;
};

type GrainOption = [string, string];

/** Card grains stricter than primary (All/Custom keep all). */
function revenueGrainOptions(scope: PrimaryScope): GrainOption[] {
  if (scope.isCustom || scope.preset === 'all') {
    return [
      ['day', 'Daily'],
      ['week', 'Weekly'],
      ['month', 'Monthly'],
    ];
  }
  if (scope.preset === 'month') {
    return [
      ['day', 'Daily'],
      ['week', 'Weekly'],
    ];
  }
  if (scope.preset === 'week') {
    return [['day', 'Daily']];
  }
  return [];
}

function weekMonthGrainOptions(scope: PrimaryScope): GrainOption[] {
  if (scope.isCustom || scope.preset === 'all') {
    return [
      ['week', 'Weekly'],
      ['month', 'Monthly'],
    ];
  }
  if (scope.preset === 'month') {
    return [['week', 'Weekly']];
  }
  return [];
}

function coarsestOptionKey(options: GrainOption[]): string | null {
  if (!options.length) return null;
  return options[options.length - 1][0];
}

/* Reusable per-card segmented filter (secondary — operates on parent-scoped payload) */
function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: GrainOption[] }) {
  if (!options.length) return null;
  return (
    <div className="flex items-center gap-0.5 bg-muted/40 p-0.5 rounded-lg border shrink-0">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${value === key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function CardHead({
  title,
  subtitle,
  control,
}: {
  title: React.ReactNode;
  subtitle?: string;
  control?: React.ReactNode;
}) {
  return (
    <div className="p-5 border-b flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
      </div>
      {control ? <div className="flex items-center gap-2 shrink-0">{control}</div> : null}
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<AnalyticsTab>('sales');
  const hubScope = useHubScopeFilter();
  const metricsPeriod = useMetricsPeriod('all');
  const { data: overview, isLoading } = useAnalyticsOverview({
    hub_id: hubScope.hubIdForApi,
    ...metricsPeriod.apiParams,
  });

  const tabs: { key: AnalyticsTab; label: string; icon: React.ElementType }[] = [
    { key: 'sales', label: 'Sales Analysis', icon: TrendingUp },
    { key: 'products', label: 'Product Performance', icon: Package },
    { key: 'customers', label: 'Customer Insights', icon: Users },
    { key: 'credit', label: 'Credit & Risk', icon: CreditCard },
    { key: 'compare', label: 'Compare', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <BarChart3 className="text-primary" /> Analytics
        </h1>
        <p className="text-sm text-muted-foreground">Deeper insights into FudFarmer operations</p>
      </div>

      <div className="space-y-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Location
          </p>
          <HubScopeFilterBar scope={hubScope} />
        </div>
        <div className="space-y-2 border-t pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Reporting period
          </p>
          <MetricsPeriodBar
            period={metricsPeriod}
            hint="Sales and Customer Insights use sale date (acquisition = first purchase). Credits use issue date; feedback and stock moves use their event dates. Product stock levels are a current snapshot."
          />
        </div>
      </div>

      {!HAS_API ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <BarChart3 size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Connect to the API to view analytics.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  tab === t.key
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'compare' ? (
            <AnalyticsCompareTab
              periodLabel={
                metricsPeriod.isCustom
                  ? `${metricsPeriod.dateFrom} → ${metricsPeriod.dateTo}`
                  : metricsPeriod.preset
              }
            />
          ) : isLoading || !overview ? (
            <AnalyticsPageSkeleton />
          ) : (
            <>
              {tab === 'sales' && (
                <SalesAnalysis
                  data={overview.sales}
                  primary={{ preset: metricsPeriod.preset, isCustom: metricsPeriod.isCustom }}
                />
              )}
              {tab === 'products' && <ProductPerformance data={overview.products} />}
              {tab === 'customers' && (
                <CustomerInsights
                  data={overview.customers}
                  router={router}
                  primary={{ preset: metricsPeriod.preset, isCustom: metricsPeriod.isCustom }}
                />
              )}
              {tab === 'credit' && (
                <CreditRisk
                  data={overview.credit}
                  primary={{ preset: metricsPeriod.preset, isCustom: metricsPeriod.isCustom }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SALES ANALYSIS TAB
   ═══════════════════════════════════════════════════════ */
function SalesAnalysis({
  data,
  primary,
}: {
  data: AnalyticsOverviewData['sales'];
  primary: PrimaryScope;
}) {
  const {
    monthlyTrend = [],
    weeklyTrend = [],
    dailyTrend = [],
    growth,
    dayOfWeekPattern,
    channelBreakdown,
    paymentModeSplit,
    paymentTypeSplit,
    collectedVsOutstanding,
    aovTrend = [],
    aovWeeklyTrend = [],
    totalRevenue,
  } = data;

  const grainOptions = useMemo(() => revenueGrainOptions(primary), [primary.isCustom, primary.preset]);
  const aovOptions = useMemo(() => weekMonthGrainOptions(primary), [primary.isCustom, primary.preset]);

  const [grain, setGrain] = useState<'day' | 'week' | 'month'>(
    () => (coarsestOptionKey(revenueGrainOptions(primary)) as 'day' | 'week' | 'month') ?? 'month',
  );
  const [drillMonth, setDrillMonth] = useState<string | null>(null);
  const [dowMetric, setDowMetric] = useState<'avg' | 'total' | 'orders'>('avg');
  const [aovGrain, setAovGrain] = useState<'week' | 'month'>(
    () => (coarsestOptionKey(weekMonthGrainOptions(primary)) as 'week' | 'month') ?? 'month',
  );
  const [chanMetric, setChanMetric] = useState<'revenue' | 'count'>('revenue');
  const [pmMetric, setPmMetric] = useState<'value' | 'count'>('value');
  const [ptMetric, setPtMetric] = useState<'value' | 'count'>('value');

  useEffect(() => {
    const next = coarsestOptionKey(grainOptions) as 'day' | 'week' | 'month' | null;
    if (!next) {
      setDrillMonth(null);
      return;
    }
    if (!grainOptions.some(([k]) => k === grain)) {
      setGrain(next);
    }
    if (!grainOptions.some(([k]) => k === 'month')) {
      setDrillMonth(null);
    }
  }, [grainOptions, grain]);

  useEffect(() => {
    const next = coarsestOptionKey(aovOptions) as 'week' | 'month' | null;
    if (!next) return;
    if (!aovOptions.some(([k]) => k === aovGrain)) {
      setAovGrain(next);
    }
  }, [aovOptions, aovGrain]);

  const effGrain: 'day' | 'week' | 'month' = drillMonth ? 'day' : grain;

  const revenueTrend = useMemo(() => {
    if (drillMonth) {
      return dailyTrend.filter((d) => (d.key ?? '').startsWith(drillMonth));
    }
    if (effGrain === 'day') return dailyTrend;
    if (effGrain === 'week') return weeklyTrend;
    return monthlyTrend;
  }, [dailyTrend, weeklyTrend, monthlyTrend, effGrain, drillMonth]);

  const aovSeries = aovGrain === 'week' ? aovWeeklyTrend : aovTrend;

  const dowDataKey = dowMetric === 'orders' ? 'orders' : dowMetric === 'total' ? 'revenue' : 'avgRevenue';
  const dowName = dowMetric === 'orders' ? 'Orders' : dowMetric === 'total' ? 'Total Revenue' : 'Avg Revenue';

  const GrowthBadge = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${value > 0 ? 'text-emerald-600' : value < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
      {value > 0 ? <ArrowUpRight size={12} /> : value < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
      {Math.abs(value)}%
    </span>
  );

  return (
    <div className="space-y-5">
      {growth && (
        <div className="rounded-xl border bg-gradient-to-br from-cyan-50 to-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
              Revenue Growth Rate (MoM %)
            </p>
            <p className="text-sm text-muted-foreground">
              Month-over-month revenue change vs {growth.prevMonth}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 text-3xl font-black ${
                growth.revGrowth > 0
                  ? 'text-emerald-600'
                  : growth.revGrowth < 0
                    ? 'text-red-600'
                    : 'text-muted-foreground'
              }`}
            >
              {growth.revGrowth > 0 ? (
                <ArrowUpRight size={28} />
              ) : growth.revGrowth < 0 ? (
                <ArrowDownRight size={28} />
              ) : (
                <Minus size={28} />
              )}
              {growth.revGrowth > 0 ? '+' : ''}
              {growth.revGrowth}%
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {growth && (
          <>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Revenue Growth Rate MoM</p>
              <div className="flex items-end gap-2">
                <GrowthBadge value={growth.revGrowth} />
                <span className="text-[10px] text-muted-foreground">vs {growth.prevMonth}</span>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Order Growth</p>
              <div className="flex items-end gap-2">
                <GrowthBadge value={growth.orderGrowth} />
                <span className="text-[10px] text-muted-foreground">vs {growth.prevMonth}</span>
              </div>
            </div>
          </>
        )}
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Revenue</p>
          <p className="text-xl font-black text-emerald-600">{fmtK(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Collected</p>
          <p className="text-xl font-black text-emerald-600">{fmtK(collectedVsOutstanding.collected)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Outstanding</p>
          <p className={`text-xl font-black ${collectedVsOutstanding.outstanding > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{fmtK(collectedVsOutstanding.outstanding)}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <CardHead
          title={
            <span className="inline-flex items-center gap-2">
              Revenue Trend
              {drillMonth && (
                <button
                  type="button"
                  onClick={() => setDrillMonth(null)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  ← Back
                </button>
              )}
            </span>
          }
          subtitle={
            drillMonth
              ? 'Daily revenue for the selected month'
              : effGrain === 'month'
                ? 'Click a month to drill into daily revenue'
                : `Revenue per ${effGrain}`
          }
          control={
            !drillMonth && grainOptions.length > 0 ? (
              <Seg
                value={grain}
                onChange={(v) => setGrain(v as 'day' | 'week' | 'month')}
                options={grainOptions}
              />
            ) : undefined
          }
        />
        <div className="p-5 h-[300px]">
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueTrend}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onClick={(state) => {
                  const key = (state as { activePayload?: { payload?: { key?: string } }[] })
                    ?.activePayload?.[0]?.payload?.key;
                  if (!drillMonth && effGrain === 'month' && key) {
                    setDrillMonth(key);
                  }
                }}
                style={{ cursor: !drillMonth && effGrain === 'month' ? 'pointer' : 'default' }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0891b2" strokeWidth={2} fill="url(#revGrad)" dot={effGrain !== 'day'} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No sales data yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Sales by Day of Week"
            subtitle={dowMetric === 'avg' ? 'Average revenue per day' : dowMetric === 'total' ? 'Total revenue by day' : 'Order count by day'}
            control={
              <Seg
                value={dowMetric}
                onChange={(v) => setDowMetric(v as 'avg' | 'total' | 'orders')}
                options={[
                  ['avg', 'Avg'],
                  ['total', 'Total'],
                  ['orders', 'Orders'],
                ]}
              />
            }
          />
          <div className="p-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekPattern} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => (dowMetric === 'orders' ? String(v) : fmtK(v))}
                />
                <Tooltip
                  {...TT}
                  formatter={(value) => (dowMetric === 'orders' ? Number(value) : fmt(Number(value)))}
                />
                <Bar dataKey={dowDataKey} name={dowName} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <CardHead
            title="Average Order Value Trend"
            subtitle={`Average ticket size per ${aovGrain}`}
            control={
              aovOptions.length > 0 ? (
                <Seg
                  value={aovGrain}
                  onChange={(v) => setAovGrain(v as 'week' | 'month')}
                  options={aovOptions}
                />
              ) : undefined
            }
          />
          <div className="p-5 h-[260px]">
            {aovSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aovSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                  <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                  <Line type="monotone" dataKey="aov" name="AOV" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Sales Channel Mix"
            subtitle={chanMetric === 'revenue' ? 'Revenue by channel' : 'Orders by channel'}
            control={
              <Seg
                value={chanMetric}
                onChange={(v) => setChanMetric(v as 'revenue' | 'count')}
                options={[
                  ['revenue', 'Revenue'],
                  ['count', 'Orders'],
                ]}
              />
            }
          />
          <div className="p-5">
            <div className="flex items-center justify-center h-[200px]">
              {channelBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelBreakdown}
                      dataKey={chanMetric}
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {channelBreakdown.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...TT}
                      formatter={(value) =>
                        chanMetric === 'revenue' ? fmt(Number(value)) : Number(value)
                      }
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">No data</p>
              )}
            </div>
            <div className="space-y-2 mt-2">
              {channelBreakdown.map((ch, idx) => {
                const total = channelBreakdown.reduce(
                  (a, c) => a + (chanMetric === 'revenue' ? c.revenue : c.count),
                  0,
                );
                const val = chanMetric === 'revenue' ? ch.revenue : ch.count;
                return (
                  <div key={ch.name} className="flex items-center gap-3 py-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="text-xs font-medium flex-1">{ch.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {chanMetric === 'revenue' ? `${ch.count} orders` : fmtK(ch.revenue)}
                    </span>
                    <span className="text-xs font-bold">
                      {chanMetric === 'revenue' ? fmtK(ch.revenue) : ch.count}
                    </span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right">{pct(val, total)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <CardHead
            title="Payment Mode"
            subtitle="Full payment vs credit vs partial credit"
            control={
              <Seg
                value={pmMetric}
                onChange={(v) => setPmMetric(v as 'value' | 'count')}
                options={[
                  ['value', 'Value'],
                  ['count', 'Count'],
                ]}
              />
            }
          />
          <div className="p-5">
            <div className="flex items-center justify-center h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentModeSplit.filter((d) => d.count > 0)}
                    dataKey={pmMetric}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                  >
                    <Cell fill="#16a34a" />
                    <Cell fill="#ea580c" />
                    <Cell fill="#ca8a04" />
                  </Pie>
                  <Tooltip
                    {...TT}
                    formatter={(value) =>
                      pmMetric === 'value' ? fmt(Number(value)) : Number(value)
                    }
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              {paymentModeSplit.map((item, idx) => {
                const colors = [
                  { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'text-emerald-600' },
                  { bg: 'bg-orange-50', text: 'text-orange-700', label: 'text-orange-600' },
                  { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'text-yellow-600' },
                ];
                const c = colors[idx] || colors[0];
                return (
                  <div key={item.name} className={`p-3 rounded-lg border ${c.bg} text-center`}>
                    <p className={`text-lg font-black ${c.text}`}>
                      {pmMetric === 'value' ? fmtK(item.value) : item.count}
                    </p>
                    <p className={`text-[10px] font-bold ${c.label} uppercase`}>
                      {item.name === PaymentMode.FULL_PAYMENT
                        ? 'Full'
                        : item.name === PaymentMode.FULL_CREDIT
                          ? 'Credit'
                          : 'Partial'}{' '}
                      ({pmMetric === 'value' ? item.count : fmtK(item.value)})
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <CardHead
          title="Payment Type"
          subtitle="How customers pay — Cash, Transfer, or POS (excludes full credit sales)"
          control={
            <Seg
              value={ptMetric}
              onChange={(v) => setPtMetric(v as 'value' | 'count')}
              options={[
                ['value', 'Value'],
                ['count', 'Count'],
              ]}
            />
          }
        />
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {paymentTypeSplit.map((item, idx) => {
              const total = paymentTypeSplit.reduce(
                (a, d) => a + (ptMetric === 'value' ? d.value : d.count),
                0,
              );
              const val = ptMetric === 'value' ? item.value : item.count;
              const icons: Record<string, string> = {
                Cash: '💵',
                Transfer: '🏦',
                POS: '💳',
              };
              return (
                <div key={item.name} className="p-4 rounded-xl border bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{icons[item.name] || '💰'}</span>
                    <span className="text-sm font-bold">{item.name}</span>
                  </div>
                  <p className="text-xl font-black">
                    {ptMetric === 'value' ? fmtK(item.value) : item.count}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {ptMetric === 'value' ? `${item.count} transactions` : fmtK(item.value)}
                    </span>
                    <span className="text-xs font-bold">{pct(val, total)}%</span>
                  </div>
                  <div className="mt-2 h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct(val, total)}%`,
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   PRODUCT PERFORMANCE TAB
   ═══════════════════════════════════════════════════════ */
function ProductPerformance({ data }: { data: AnalyticsOverviewData['products'] }) {
  const { productRevenue, categoryRevenue, stockTurnover, deadStock } = data;
  const [prodSort, setProdSort] = useState<'revenue' | 'orders'>('revenue');
  const [catMetric, setCatMetric] = useState<'revenue' | 'orders'>('revenue');
  const [turnoverSort, setTurnoverSort] = useState<'turnover' | 'units'>('turnover');

  const sortedProducts = useMemo(() => {
    const rows = [...productRevenue];
    rows.sort((a, b) =>
      prodSort === 'revenue' ? b.revenue - a.revenue : b.count - a.count,
    );
    return rows.slice(0, 15);
  }, [productRevenue, prodSort]);

  const sortedCategories = useMemo(() => {
    const rows = [...categoryRevenue];
    rows.sort((a, b) =>
      catMetric === 'revenue' ? b.revenue - a.revenue : b.orders - a.orders,
    );
    return rows;
  }, [categoryRevenue, catMetric]);

  const sortedTurnover = useMemo(() => {
    const rows = [...stockTurnover];
    rows.sort((a, b) =>
      turnoverSort === 'turnover' ? b.turnover - a.turnover : b.unitsSold - a.unitsSold,
    );
    return rows;
  }, [stockTurnover, turnoverSort]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card">
        <CardHead
          title={`Top Products by ${prodSort === 'revenue' ? 'Revenue' : 'Orders'}`}
          subtitle="Best selling products in the selected range"
          control={
            <Seg
              value={prodSort}
              onChange={(v) => setProdSort(v as 'revenue' | 'orders')}
              options={[
                ['revenue', 'Revenue'],
                ['orders', 'Orders'],
              ]}
            />
          }
        />
        <div className="p-5">
          {sortedProducts.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">#</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">Product</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase">Category</th>
                    <th className="px-4 py-2.5 text-center text-[10px] font-bold text-muted-foreground uppercase">Orders</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-muted-foreground uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedProducts.map((p, idx) => (
                    <tr key={p.name} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground font-bold">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${CAT_COLORS[p.category] || CAT_COLORS.Other}15`,
                            color: CAT_COLORS[p.category] || CAT_COLORS.Other,
                          }}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium">{p.count}</td>
                      <td className="px-4 py-2.5 text-right font-black text-emerald-600">{fmtK(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No sales data</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <CardHead
            title={`${catMetric === 'revenue' ? 'Revenue' : 'Orders'} by Category`}
            subtitle="Comparison across product categories"
            control={
              <Seg
                value={catMetric}
                onChange={(v) => setCatMetric(v as 'revenue' | 'orders')}
                options={[
                  ['revenue', 'Revenue'],
                  ['orders', 'Orders'],
                ]}
              />
            }
          />
          <div className="p-5 h-[300px]">
            {sortedCategories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedCategories} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                    tickFormatter={(v) => (catMetric === 'revenue' ? fmtK(v) : String(v))}
                  />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={100} />
                  <Tooltip
                    {...TT}
                    formatter={(value) =>
                      catMetric === 'revenue' ? fmt(Number(value)) : Number(value)
                    }
                  />
                  <Bar dataKey={catMetric} name={catMetric === 'revenue' ? 'Revenue' : 'Orders'} radius={[0, 4, 4, 0]} barSize={18}>
                    {sortedCategories.map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No data</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <CardHead
            title={turnoverSort === 'turnover' ? 'Stock Turnover' : 'Units Sold'}
            subtitle="Units moved in the selected range ÷ current stock (stock level is a live snapshot)"
            control={
              <Seg
                value={turnoverSort}
                onChange={(v) => setTurnoverSort(v as 'turnover' | 'units')}
                options={[
                  ['turnover', 'Turnover'],
                  ['units', 'Units'],
                ]}
              />
            }
          />
          <div className="p-5">
            {sortedTurnover.length > 0 ? (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto">
                {sortedTurnover.map((item) => {
                  const metric = turnoverSort === 'turnover' ? item.turnover : item.unitsSold;
                  const maxMetric = Math.max(
                    ...sortedTurnover.map((s) =>
                      turnoverSort === 'turnover' ? s.turnover : s.unitsSold,
                    ),
                    1,
                  );
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-28 truncate shrink-0" title={item.name}>{item.name}</span>
                      <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(metric / maxMetric) * 100}%`,
                            backgroundColor: item.fill,
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold w-12 text-right">
                        {turnoverSort === 'turnover' ? `${item.turnover}x` : item.unitsSold}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No stock movement data</p>
            )}
          </div>
        </div>
      </div>

      {deadStock.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50">
          <div className="p-5">
            <h3 className="text-sm font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle size={14} /> Dead Stock Alert — {deadStock.length} SKUs with zero sales in range
            </h3>
            <p className="text-[11px] text-amber-700 mb-3">These items have stock on hand but no sales in the selected date range</p>
            <div className="flex flex-wrap gap-2">
              {deadStock.map((item) => (
                <span key={item.id} className="text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">
                  {item.name} — {item.currentStock} in stock
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CUSTOMER INSIGHTS TAB
   ═══════════════════════════════════════════════════════ */
function CustomerInsights({
  data,
  router,
  primary,
}: {
  data: AnalyticsOverviewData['customers'];
  router: ReturnType<typeof useRouter>;
  primary: PrimaryScope;
}) {
  const {
    kpis,
    acquisitionTrend = [],
    acquisitionWeeklyTrend = [],
    clvDistribution,
    buyerAnalysis,
    topSpenders,
    repeatCustomers,
    concentration,
    segmentData = [],
  } = data;

  const [acqGrain, setAcqGrain] = useState<'week' | 'month'>(
    () => (coarsestOptionKey(weekMonthGrainOptions(primary)) as 'week' | 'month') ?? 'month',
  );
  const [clvMetric, setClvMetric] = useState<'count' | 'revenue'>('count');
  const [topSort, setTopSort] = useState<'spent' | 'orders'>('spent');
  const [segMetric, setSegMetric] = useState<'revenue' | 'customers'>('revenue');

  const acqOptions = useMemo(() => weekMonthGrainOptions(primary), [primary.isCustom, primary.preset]);

  useEffect(() => {
    const next = coarsestOptionKey(acqOptions) as 'week' | 'month' | null;
    if (!next) return;
    if (!acqOptions.some(([k]) => k === acqGrain)) {
      setAcqGrain(next);
    }
  }, [acqOptions, acqGrain]);

  const acqSeries = acqGrain === 'week' ? acquisitionWeeklyTrend : acquisitionTrend;

  const sortedTop = useMemo(() => {
    const rows = [...topSpenders];
    rows.sort((a, b) =>
      topSort === 'spent'
        ? b.totalSpent - a.totalSpent
        : (b.totalOrders ?? 0) - (a.totalOrders ?? 0),
    );
    return rows;
  }, [topSpenders, topSort]);

  const sortedSegments = useMemo(() => {
    const rows = segmentData.map((s) => ({
      name: s.name,
      customers: s.customers ?? s.value ?? 0,
      revenue: s.revenue ?? 0,
    }));
    rows.sort((a, b) =>
      segMetric === 'revenue' ? b.revenue - a.revenue : b.customers - a.customers,
    );
    return rows;
  }, [segmentData, segMetric]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Customers</p>
          <p className="text-2xl font-black">{kpis.totalCustomers}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Avg Lifetime Value</p>
          <p className="text-2xl font-black text-emerald-600">{kpis.totalCustomers > 0 ? fmtK(kpis.avgLifetimeValue) : '—'}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Revenue Concentration</p>
          <p className="text-2xl font-black">{concentration.top20Pct}%</p>
          <p className="text-[10px] text-muted-foreground">from top 20% ({concentration.top20Count})</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Repeat Rate</p>
          <p className="text-2xl font-black">{kpis.repeatRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <CardHead
          title="Customer Acquisition"
          subtitle={`New customers and cumulative growth per ${acqGrain}`}
          control={
            acqOptions.length > 0 ? (
              <Seg
                value={acqGrain}
                onChange={(v) => setAcqGrain(v as 'week' | 'month')}
                options={acqOptions}
              />
            ) : undefined
          }
        />
        <div className="p-5 h-[280px]">
          {acqSeries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={acqSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="acqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} dy={8} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <Tooltip {...TT} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar yAxisId="left" dataKey="new" name="New Customers" fill="#7c3aed" radius={[4, 4, 0, 0]} barSize={16} />
                <Line yAxisId="right" type="monotone" dataKey="total" name="Cumulative" stroke="#0891b2" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">No customer data</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h3 className="text-sm font-bold">Buyer Engagement Tiers</h3>
            <p className="text-[11px] text-muted-foreground">Customer breakdown by purchase frequency</p>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-center h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={buyerAnalysis.filter((b) => b.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                    {buyerAnalysis.filter((b) => b.value > 0).map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip {...TT} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {buyerAnalysis.map((tier) => (
                <div key={tier.name} className="flex items-center gap-2 p-2 rounded-lg border">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.fill }} />
                  <span className="text-[10px] font-medium flex-1">{tier.name}</span>
                  <span className="text-xs font-black">{tier.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <CardHead
            title="Lifetime Value Distribution"
            subtitle={clvMetric === 'count' ? 'Customers per spend bracket' : 'Revenue per spend bracket'}
            control={
              <Seg
                value={clvMetric}
                onChange={(v) => setClvMetric(v as 'count' | 'revenue')}
                options={[
                  ['count', 'Count'],
                  ['revenue', 'Revenue'],
                ]}
              />
            }
          />
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clvDistribution} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => (clvMetric === 'revenue' ? fmtK(v) : String(v))}
                />
                <Tooltip
                  {...TT}
                  formatter={(value) =>
                    clvMetric === 'revenue' ? fmt(Number(value)) : Number(value)
                  }
                />
                <Bar
                  dataKey={clvMetric}
                  name={clvMetric === 'count' ? 'Customers' : 'Revenue'}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Top Customers"
            subtitle={topSort === 'spent' ? 'Ranked by total spend' : 'Ranked by order count'}
            control={
              <Seg
                value={topSort}
                onChange={(v) => setTopSort(v as 'spent' | 'orders')}
                options={[
                  ['spent', 'Spend'],
                  ['orders', 'Orders'],
                ]}
              />
            }
          />
          <div className="p-5">
            {sortedTop.length > 0 ? (
              <div className="space-y-1">
                {sortedTop.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <p className="text-sm font-semibold flex-1 truncate">{c.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.type}
                    </span>
                    <span className="text-sm font-black text-emerald-600 w-20 text-right">
                      {topSort === 'spent' ? fmtK(c.totalSpent) : `${c.totalOrders ?? 0} ord`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No customers with purchases yet</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <div className="p-5 border-b">
            <h3 className="text-sm font-bold">Repeat Customers</h3>
            <p className="text-[11px] text-muted-foreground">Customers with 2 or more orders</p>
          </div>
          <div className="p-5">
            {repeatCustomers.length > 0 ? (
              <div className="space-y-1">
                {repeatCustomers.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
                    <span className="text-xs font-black text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <p className="text-sm font-semibold flex-1 truncate">{c.name}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.type === 'B2B' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {c.type}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground">{c.totalOrders} orders</span>
                    <span className="text-sm font-black text-emerald-600 w-20 text-right">{fmtK(c.totalSpent)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No repeat customers yet</p>
            )}
          </div>
        </div>
      </div>

      {sortedSegments.length > 0 && (
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Segment Performance"
            subtitle={segMetric === 'revenue' ? 'Revenue by segment' : 'Customers by segment'}
            control={
              <Seg
                value={segMetric}
                onChange={(v) => setSegMetric(v as 'revenue' | 'customers')}
                options={[
                  ['revenue', 'Revenue'],
                  ['customers', 'Customers'],
                ]}
              />
            }
          />
          <div className="p-5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedSegments} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(v) => (segMetric === 'revenue' ? fmtK(v) : String(v))}
                />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={120} />
                <Tooltip
                  {...TT}
                  formatter={(value) =>
                    segMetric === 'revenue' ? fmt(Number(value)) : Number(value)
                  }
                />
                <Bar
                  dataKey={segMetric}
                  name={segMetric === 'revenue' ? 'Revenue' : 'Customers'}
                  fill="#0891b2"
                  radius={[0, 4, 4, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => router.push('/customers')}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity"
        >
          <Users size={16} />
          View All Customers
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CREDIT & RISK TAB
   ═══════════════════════════════════════════════════════ */
function CreditRisk({
  data,
  primary,
}: {
  data: AnalyticsOverviewData['credit'];
  primary: PrimaryScope;
}) {
  const {
    kpis,
    agingReport,
    topDebtors,
    customerRisk,
    collectionTrend = [],
    collectionWeeklyTrend = [],
  } = data;
  const { totalOutstanding, totalOverdue, totalCleared, collectionRate } = kpis;

  const [agingMetric, setAgingMetric] = useState<'amount' | 'count'>('amount');
  const [debtorStatus, setDebtorStatus] = useState<'all' | 'Overdue' | 'Pending'>('all');
  const [riskSort, setRiskSort] = useState<'ratio' | 'owed'>('ratio');
  const [collGrain, setCollGrain] = useState<'week' | 'month'>(
    () => (coarsestOptionKey(weekMonthGrainOptions(primary)) as 'week' | 'month') ?? 'month',
  );

  const collOptions = useMemo(() => weekMonthGrainOptions(primary), [primary.isCustom, primary.preset]);

  useEffect(() => {
    const next = coarsestOptionKey(collOptions) as 'week' | 'month' | null;
    if (!next) return;
    if (!collOptions.some(([k]) => k === collGrain)) {
      setCollGrain(next);
    }
  }, [collOptions, collGrain]);

  const filteredDebtors = useMemo(() => {
    if (debtorStatus === 'all') return topDebtors;
    return topDebtors.filter((d) => d.status === debtorStatus);
  }, [topDebtors, debtorStatus]);

  const sortedRisk = useMemo(() => {
    const rows = [...customerRisk];
    rows.sort((a, b) =>
      riskSort === 'ratio' ? b.creditRatio - a.creditRatio : b.totalOwed - a.totalOwed,
    );
    return rows;
  }, [customerRisk, riskSort]);

  const collSeries = collGrain === 'week' ? collectionWeeklyTrend : collectionTrend;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Outstanding</p>
          <p className="text-2xl font-black text-amber-600">{fmtK(totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 border-red-200">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Overdue</p>
          <p className="text-2xl font-black text-red-600">{fmtK(totalOverdue)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Cleared (All Time)</p>
          <p className="text-2xl font-black text-emerald-600">{fmtK(totalCleared)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Collection Rate</p>
          <p className="text-2xl font-black">{collectionRate}%</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <CardHead
          title="Aging Report"
          subtitle="Outstanding credit breakdown by age"
          control={
            <Seg
              value={agingMetric}
              onChange={(v) => setAgingMetric(v as 'amount' | 'count')}
              options={[
                ['amount', 'Amount'],
                ['count', 'Count'],
              ]}
            />
          }
        />
        <div className="p-5">
          <div className="grid grid-cols-4 gap-3 mb-4">
            {agingReport.map((bucket, idx) => {
              const colors = [
                'bg-emerald-50 border-emerald-200 text-emerald-700',
                'bg-blue-50 border-blue-200 text-blue-700',
                'bg-amber-50 border-amber-200 text-amber-700',
                'bg-red-50 border-red-200 text-red-700',
              ];
              return (
                <div key={bucket.label} className={`p-4 rounded-lg border text-center ${colors[idx]}`}>
                  <p className="text-xl font-black">
                    {agingMetric === 'count' ? bucket.count : fmtK(bucket.amount)}
                  </p>
                  <p className="text-[10px] font-bold uppercase mt-1">{bucket.label}</p>
                  <p className="text-[10px] opacity-70">
                    {agingMetric === 'count' ? fmtK(bucket.amount) : `${bucket.count} accounts`}
                  </p>
                </div>
              );
            })}
          </div>

          {totalOutstanding > 0 && (
            <div className="flex h-4 rounded-full overflow-hidden border">
              {agingReport.map((bucket, idx) => {
                const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500'];
                const metric = agingMetric === 'count' ? bucket.count : bucket.amount;
                const totalMetric =
                  agingMetric === 'count'
                    ? agingReport.reduce((a, b) => a + b.count, 0)
                    : totalOutstanding;
                const width = pct(metric, totalMetric);
                return width > 0 ? (
                  <div
                    key={idx}
                    className={`${colors[idx]} transition-all`}
                    style={{ width: `${width}%` }}
                    title={`${bucket.label}: ${agingMetric === 'count' ? `${bucket.count} accounts` : fmtK(bucket.amount)}`}
                  />
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Top Debtors"
            subtitle="Customers with the largest outstanding balances"
            control={
              <Seg
                value={debtorStatus}
                onChange={(v) => setDebtorStatus(v as 'all' | 'Overdue' | 'Pending')}
                options={[
                  ['all', 'All'],
                  ['Overdue', 'Overdue'],
                  ['Pending', 'Pending'],
                ]}
              />
            }
          />
          <div className="p-5">
            {filteredDebtors.length > 0 ? (
              <div className="space-y-2.5">
                {filteredDebtors.map((cr, idx) => (
                  <div key={cr.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                    <span className="text-xs font-bold text-muted-foreground w-5">{idx + 1}</span>
                    <span className="text-xs font-semibold flex-1 truncate">{cr.customerName}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cr.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {cr.status}
                    </span>
                    <span className="text-xs font-black w-20 text-right">{fmtK(cr.amountOwed)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-medium text-center py-4">No outstanding credits</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card">
          <CardHead
            title="Customer Credit Risk"
            subtitle={
              riskSort === 'ratio'
                ? 'Owed as % of total spend (higher = riskier)'
                : 'Ranked by amount owed'
            }
            control={
              <Seg
                value={riskSort}
                onChange={(v) => setRiskSort(v as 'ratio' | 'owed')}
                options={[
                  ['ratio', 'Ratio'],
                  ['owed', 'Owed'],
                ]}
              />
            }
          />
          <div className="p-5">
            {sortedRisk.length > 0 ? (
              <div className="space-y-2.5">
                {sortedRisk.map((cr) => (
                  <div key={cr.name} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 truncate shrink-0" title={cr.name}>{cr.name}</span>
                    {riskSort === 'ratio' ? (
                      <>
                        <div className="flex-1 h-3 bg-muted/40 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${cr.creditRatio > 50 ? 'bg-red-500' : cr.creditRatio > 25 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(cr.creditRatio, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-bold w-10 text-right ${cr.creditRatio > 50 ? 'text-red-600' : cr.creditRatio > 25 ? 'text-amber-600' : 'text-emerald-600'}`}
                        >
                          {cr.creditRatio}%
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-black ml-auto">{fmtK(cr.totalOwed)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600 font-medium text-center py-4">No credit risk data</p>
            )}
          </div>
        </div>
      </div>

      {collSeries.length > 0 && (
        <div className="rounded-xl border bg-card">
          <CardHead
            title="Collection Performance"
            subtitle={`Credits issued vs cleared per ${collGrain}`}
            control={
              collOptions.length > 0 ? (
                <Seg
                  value={collGrain}
                  onChange={(v) => setCollGrain(v as 'week' | 'month')}
                  options={collOptions}
                />
              ) : undefined
            }
          />
          <div className="p-5 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collSeries} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickFormatter={(v) => fmtK(v)} />
                <Tooltip {...TT} formatter={(value) => fmt(Number(value))} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="issued" name="Issued" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="cleared" name="Cleared" fill="#16a34a" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
