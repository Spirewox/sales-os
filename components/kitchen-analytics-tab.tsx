'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Banknote, ChefHat, Clock, FileCheck2, Percent, TrendingUp } from 'lucide-react';
import { MetricValue } from '@/components/ui/metric-value';
import { CardSkeleton } from '@/components/ui/loading-skeletons';
import { useKitchenAnalytics } from '@/hooks/use-kitchen';
import { naira, pct } from '@/lib/kitchen-types';

// Same first two hues as the rest of Analytics (validated as a pair for light and dark).
const REVENUE = '#0891b2';
const PROFIT = '#ea580c';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym: string) => `${MONTHS.at(Number(ym.slice(5, 7)) - 1)} ${ym.slice(2, 4)}`;
const compact = (v: number) => (Math.abs(v) >= 1e6 ? `₦${(v / 1e6).toFixed(1)}m` : Math.abs(v) >= 1e3 ? `₦${Math.round(v / 1e3)}k` : `₦${v}`);
const minutes = (m: number | null) => (m == null ? '—' : m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

function Tile({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-1 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <MetricValue value={value} className="font-bold" />
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function KitchenAnalyticsTab({ scope }: { scope: { hub_id?: string; period?: string; date_from?: string; date_to?: string } }) {
  const q = useKitchenAnalytics(scope);
  if (q.isPending) {
    return <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>;
  }
  if (q.isError) return <p role="alert" className="rounded-xl border p-5 text-sm text-destructive">{q.error.message}</p>;
  const a = q.data;
  const showCosts = a.completed.profit !== undefined;
  const months = a.by_month.map((m) => ({ ...m, label: monthLabel(m.month) }));

  if (!a.completed.jobs && !a.quotes.sent && !a.cancelled.jobs) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <ChefHat size={28} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No kitchen jobs completed, quoted or cancelled in this period.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Tile label="Kitchen revenue" value={naira(a.completed.revenue)} hint={`${a.completed.jobs} completed job${a.completed.jobs === 1 ? '' : 's'} · average ${naira(a.completed.average)}`} icon={<Banknote size={14} />} />
        {showCosts && (
          <Tile label="Profit" value={a.completed.costed_jobs ? naira(a.completed.profit) : '—'} hint={a.completed.costed_jobs ? `${pct(a.completed.margin)} margin on ${a.completed.costed_jobs} costed job${a.completed.costed_jobs === 1 ? '' : 's'}` : 'No costed jobs yet'} icon={<TrendingUp size={14} />} />
        )}
        {showCosts && <Tile label="Food cost" value={a.completed.costed_jobs ? pct(a.completed.food_cost_pct) : '—'} hint={a.completed.costed_jobs ? 'Of the price, costed jobs (target 30%)' : 'Needs jobs priced from recipes'} icon={<Percent size={14} />} />}
        <Tile label="Still owed" value={naira(a.completed.owed)} hint={`${naira(a.completed.collected)} collected`} icon={<Banknote size={14} />} />
        <Tile label="Time to accept" value={minutes(a.time_to_accept.median_minutes)} hint={a.time_to_accept.jobs ? `Median of ${a.time_to_accept.jobs}; average ${minutes(a.time_to_accept.average_minutes)}` : 'No accepted jobs yet'} icon={<Clock size={14} />} />
        <Tile label="Quotes turned into orders" value={pct(a.quotes.conversion_rate)} hint={`${a.quotes.converted} of ${a.quotes.sent} sent · ${a.quotes.declined} declined · ${a.quotes.expired} expired`} icon={<FileCheck2 size={14} />} />
      </div>

      {months.length > 0 && (
        <section className="rounded-xl border bg-card">
          <div className="border-b p-5">
            <h3 className="text-sm font-bold">{showCosts ? 'Revenue and profit by month' : 'Revenue by month'}</h3>
            <p className="text-[11px] text-muted-foreground">Completed kitchen jobs, by completion month (Lagos time){showCosts ? '; profit counts costed jobs only' : ''}</p>
          </div>
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} tickFormatter={(v) => compact(Number(v))} width={52} />
                <Tooltip
                  cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--foreground)' }}
                  formatter={(value, name) => [naira(Number(value)), name]}
                />
                {showCosts && <Legend iconType="square" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
                <Bar dataKey="revenue" name="Revenue" fill={REVENUE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                {showCosts && <Bar dataKey="profit" name="Profit" fill={PROFIT} radius={[4, 4, 0, 0]} maxBarSize={32} />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border bg-card">
          <h3 className="border-b p-5 text-sm font-bold">By outlet</h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="px-4 py-2 text-left">Outlet</th><th className="px-4 py-2 text-right">Jobs</th><th className="px-4 py-2 text-right">Revenue</th>{showCosts && <th className="px-4 py-2 text-right">Profit</th>}</tr>
            </thead>
            <tbody className="divide-y">
              {a.by_outlet.map((o) => (
                <tr key={o.hub}><td className="px-4 py-2">{o.name}</td><td className="px-4 py-2 text-right tabular-nums">{o.jobs}</td><td className="px-4 py-2 text-right tabular-nums">{naira(o.revenue)}</td>{showCosts && <td className="px-4 py-2 text-right tabular-nums">{a.completed.costed_jobs ? naira(o.profit) : '—'}</td>}</tr>
              ))}
              {!a.by_outlet.length && <tr><td colSpan={4} className="px-4 py-6 text-center italic text-muted-foreground">No completed jobs</td></tr>}
            </tbody>
          </table>
        </section>
        <section className="overflow-hidden rounded-xl border bg-card">
          <h3 className="border-b p-5 text-sm font-bold">By channel</h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr><th className="px-4 py-2 text-left">Channel</th><th className="px-4 py-2 text-right">Jobs</th><th className="px-4 py-2 text-right">Revenue</th><th className="px-4 py-2 text-right">Share</th></tr>
            </thead>
            <tbody className="divide-y">
              {a.by_channel.map((c) => (
                <tr key={c.channel}><td className="px-4 py-2">{c.channel}</td><td className="px-4 py-2 text-right tabular-nums">{c.jobs}</td><td className="px-4 py-2 text-right tabular-nums">{naira(c.revenue)}</td><td className="px-4 py-2 text-right tabular-nums">{pct(a.completed.revenue ? c.revenue / a.completed.revenue : null)}</td></tr>
              ))}
              {!a.by_channel.length && <tr><td colSpan={4} className="px-4 py-6 text-center italic text-muted-foreground">No completed jobs</td></tr>}
            </tbody>
          </table>
        </section>
      </div>

      {a.cancelled.jobs > 0 && (
        <section className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-bold">{a.cancelled.jobs} cancelled job{a.cancelled.jobs === 1 ? '' : 's'}</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {a.cancelled.top_reasons.map((r) => <li key={r.reason} className="flex justify-between gap-4"><span>{r.reason}</span><span className="tabular-nums text-muted-foreground">{r.jobs}</span></li>)}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Kitchen jobs also post to Sales when completed, so these figures are included in Sales Analysis too. <Link href="/kitchen?tab=jobs" className="text-primary hover:underline">Open kitchen jobs</Link>
      </p>
    </div>
  );
}
