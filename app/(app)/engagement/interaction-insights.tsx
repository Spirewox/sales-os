'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_TOOLTIP } from '@/lib/format';
import { type Customer, type Feedback, FeedbackType } from '@/types';

// Categorical series tokens, fixed order (see globals.css).
const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

/** Sentiment mix and complaints by segment, shown on demand under the Interactions KPIs. */
export function InteractionInsights({ feedbacks, customers }: Readonly<{ feedbacks: Feedback[]; customers: Customer[] }>) {
  const sentimentData = useMemo(() => {
    const counts: Record<string, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    feedbacks.forEach((f) => { counts[f.sentiment || 'Neutral']++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [feedbacks]);

  const bySegment = useMemo(() => {
    const segCounts: Record<string, number> = {};
    feedbacks.filter((f) => f.type === FeedbackType.COMPLAINT).forEach((f) => {
      const customer = customers.find((c) => c.id === f.customerId || c.name === f.customerName);
      if (customer?.segments?.length) customer.segments.forEach((seg) => { segCounts[seg] = (segCounts[seg] || 0) + 1; });
      else segCounts['Unassigned'] = (segCounts['Unassigned'] || 0) + 1;
    });
    return Object.entries(segCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [feedbacks, customers]);

  const appreciations = feedbacks.filter((f) => f.type === FeedbackType.APPRECIATION).length;
  const satisfaction = feedbacks.length > 0 ? Math.round((appreciations / feedbacks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section className="flex h-72 flex-col rounded-xl border bg-card">
        <div className="flex items-baseline justify-between gap-2 border-b px-5 py-3">
          <h3 className="text-sm font-semibold">Sentiment</h3>
          <p className="text-xs text-muted-foreground tabular-nums">{satisfaction}% of feedback is appreciation</p>
        </div>
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" stroke="var(--card)" label={({ name, value }) => `${name}: ${value}`} style={{ fontSize: 12 }}>
                {sentimentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...CHART_TOOLTIP} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="flex h-72 flex-col rounded-xl border bg-card">
        <div className="border-b px-5 py-3"><h3 className="text-sm font-semibold">Complaints by segment</h3></div>
        <div className="flex-1 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySegment}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis axisLine={false} tickLine={false} allowDecimals={false} width={32} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <Tooltip {...CHART_TOOLTIP} />
              <Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
