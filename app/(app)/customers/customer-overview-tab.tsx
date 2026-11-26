'use client';

import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Check, Copy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/app';
import { contactsOf, otherContacts } from '@/lib/customer-contacts';
import { Customer, CustomerType } from '@/types';
import { CHART_TOOLTIP, formatAxisMoney, formatDate, formatMoney, plural } from '@/lib/format';
import { hasPhone, whatsappHref } from './customer-links';
import { SegmentChips } from './customer-segments';
import type { PurchaseAnalytics } from './customer-analytics';
import { customerTypeLabel } from './customer-form';

const sectionTitle = 'mb-2 text-xs font-medium text-muted-foreground';

function CopyButton({ value, label }: Readonly<{ value: string; label: string }>) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => { void navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check size={14} aria-hidden className="text-primary" /> : <Copy size={14} aria-hidden />}
    </button>
  );
}

function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3 py-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function CustomerOverviewTab({ customer, segments, analytics, trend }: Readonly<{
  customer: Customer;
  segments: string[];
  analytics: PurchaseAnalytics | null;
  trend: { month: string; amount: number }[];
}>) {
  const isBusiness = customer.type === CustomerType.B2B;
  // Primary first; an older business shows its own name and phone as its one contact. An individual
  // is their own primary, so only their other contacts are listed.
  const contacts = contactsOf(customer);
  const shownContacts = isBusiness ? contacts : otherContacts(contacts);
  const profile = isBusiness
    ? [{ label: 'Category', value: customer.businessCategory }, { label: 'Business address', value: customer.businessAddress }]
    : [
        { label: 'Gender', value: customer.gender },
        { label: 'Family type', value: customer.familyType },
        { label: 'Marital status', value: customer.maritalStatus },
        { label: 'Age group', value: customer.ageGroup },
        { label: 'Lifestyle and health', value: customer.lifestyle },
        { label: 'Employment', value: customer.employmentStatus },
        { label: 'Job type', value: customer.jobType },
        { label: 'Religion', value: customer.religion },
      ];
  const filled = profile.filter((r) => r.value);

  return (
    <div className="space-y-6">
      <section>
        <h3 className={sectionTitle}>Contact</h3>
        <dl className="divide-y">
          <Row label="Phone">{hasPhone(customer.phone) ? <><span className="truncate tabular-nums">{customer.phone}</span><CopyButton value={customer.phone} label="phone" /></> : '-'}</Row>
          <Row label="Email">{customer.email ? <><span className="truncate">{customer.email}</span><CopyButton value={customer.email} label="email" /></> : '-'}</Row>
          <Row label="Hub">{customer.location || '-'}</Row>
          <Row label="Type">{customerTypeLabel(customer.type)}</Row>
          <Row label="Joined">{formatDate(customer.joinedDate)}</Row>
          {customer.addedByAgentName && <Row label="Added by">{customer.addedByAgentName}</Row>}
        </dl>
      </section>

      {analytics && (
        <section>
          <h3 className={sectionTitle}>Buying pattern</h3>
          <dl className="divide-y">
            <Row label="Lifetime value">{formatMoney(analytics.totalSpent)}<span className="font-normal text-muted-foreground tabular-nums">{`· ${plural(analytics.n, 'order')}`}</span></Row>
            <Row label="Profit">{formatMoney(analytics.totalProfit)}<span className="font-normal text-muted-foreground tabular-nums">{`· ${analytics.avgMargin.toFixed(0)}% margin`}</span></Row>
            <Row label="Average order">{formatMoney(analytics.aov)}</Row>
            <Row label="Frequency">
              {analytics.avgInterval > 0 ? `About every ${Math.round(analytics.avgInterval)} days` : '-'}
              <span className="font-normal text-muted-foreground tabular-nums">{`· ${analytics.ordersPerMonth.toFixed(1)} a month`}</span>
            </Row>
            <Row label="Cadence">{analytics.regularity}</Row>
            <Row label="Activity">{analytics.activity}, last order {analytics.daysSinceLast} days ago</Row>
            <Row label="Trend (90 days)">{analytics.trend}<span className="font-normal text-muted-foreground tabular-nums">{` ${analytics.trendPct > 0 ? '+' : ''}${analytics.trendPct}% vs prior 90 days`}</span></Row>
            <Row label="Top channel">{analytics.preferredChannel}</Row>
            <Row label="Paid at sale / on credit">{`${analytics.cashCount} / ${analytics.creditCount}`}</Row>
            <Row label="Next order expected">{analytics.nextExpected ? formatDate(analytics.nextExpected) : '-'}</Row>
            <Row label="Biggest order">{formatMoney(analytics.biggest.amount)}<span className="font-normal text-muted-foreground tabular-nums">{`· ${formatDate(analytics.biggest.date)}`}</span></Row>
          </dl>
        </section>
      )}

      {trend.length > 1 && (
        <section>
          <h3 className={sectionTitle}>Monthly spending</h3>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="customerSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis width={52} tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatAxisMoney(Number(v))} />
                <RechartsTooltip {...CHART_TOOLTIP} formatter={(value) => [formatMoney(Number(value)), 'Spent']} />
                <Area type="monotone" dataKey="amount" stroke="var(--chart-1)" fill="url(#customerSpendGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section>
        <h3 className={sectionTitle}>{customer.type === CustomerType.B2B ? 'Business profile' : 'Profile'}</h3>
        {filled.length === 0 ? (
          <p className="text-sm text-muted-foreground">No profile details yet. Use Edit to add them.</p>
        ) : (
          <dl className="divide-y">{filled.map((r) => <Row key={r.label} label={r.label}>{r.value}</Row>)}</dl>
        )}
      </section>

      {shownContacts.length > 0 && (
        <section>
          <h3 className={sectionTitle}>{isBusiness ? 'Contacts' : 'Other contacts'}</h3>
          <ul className="divide-y">
            {shownContacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{c.name || 'Unnamed contact'}</span>
                    {c.isPrimary && <StatusBadge tone="good">Primary</StatusBadge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[c.role, hasPhone(c.phone) ? c.phone : null, c.email].filter(Boolean).join(', ')}
                  </p>
                </div>
                {hasPhone(c.phone) && (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<a href={whatsappHref(c.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name || c.phone}`} />}
                  >
                    <MessageCircle aria-hidden /> WhatsApp
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className={sectionTitle}>Segments</h3>
        {segments.length > 0 ? <SegmentChips segments={segments} /> : <p className="text-sm text-muted-foreground">No segments yet. Add profile details to generate them.</p>}
      </section>
    </div>
  );
}
