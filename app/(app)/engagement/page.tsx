'use client';

import { useEffect, useMemo, useState } from 'react';
import { Award, Crown, Megaphone, Phone, X } from 'lucide-react';
import { HubScopeSelect } from '@/components/hub-scope-filter';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { FilterSelect } from '@/components/filter-select';
import { useHubScopeFilter } from '@/hooks/use-hub-scope';
import { useCustomer, useCustomerEngagement } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { Customer } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerDetailPanel, CustomerDrawer } from '../customers/customer-detail-panel';

const LOYALTY_OPTIONS = [
  'All',
  'Prospect',
  'First-Time Buyer',
  'Repeat Buyer',
  'Loyal',
  'Bronze',
  'Silver',
  'Gold',
] as const;

function gradeBadge(grade: string | null) {
  if (!grade) return null;
  if (grade === 'Gold') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 border border-yellow-200">
        <Crown size={12} fill="currentColor" /> Gold
      </span>
    );
  }
  if (grade === 'Silver') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
        <Award size={12} /> Silver
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-700 border border-orange-200">
      <Award size={12} /> Bronze
    </span>
  );
}

export default function EngagementPage() {
  const { can } = usePermissions();
  const hubScope = useHubScopeFilter();
  const [activity, setActivity] = useState<'All' | 'At Risk' | 'Dormant'>('All');
  const [loyalty, setLoyalty] = useState<string>('All');
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [openCustomerOverride, setOpenCustomerOverride] = useState<Customer | null>(null);

  useEffect(() => {
    const activityParam = new URLSearchParams(window.location.search).get('activity');
    if (activityParam === 'At Risk' || activityParam === 'Dormant') {
      setActivity(activityParam);
    }
  }, []);

  const { data, isFetching } = useCustomerEngagement(
    {
      activity,
      loyalty: loyalty === 'All' ? undefined : loyalty,
      hub_id: hubScope.hubIdForApi,
    },
    { enabled: can('customers.view') },
  );

  const { data: fetchedCustomer, isFetching: openCustomerLoading, isError: openCustomerError } = useCustomer(openCustomerId);
  const openCustomer = openCustomerOverride?.id === openCustomerId
    ? openCustomerOverride
    : (fetchedCustomer ?? null);

  const closeCustomer = () => {
    setOpenCustomerId(null);
    setOpenCustomerOverride(null);
  };

  const rows = data?.items ?? [];
  const totals = useMemo(() => {
    const atRisk = rows.filter((r) => r.activity === 'At Risk').length;
    const dormant = rows.filter((r) => r.activity === 'Dormant').length;
    return { atRisk, dormant, total: rows.length };
  }, [rows]);

  if (!can('customers.view')) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        You do not have permission to view customer engagement.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Megaphone size={22} /> Engagement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Off-cadence customers for win-back and follow-up outreach.
          </p>
        </div>
        <HubScopeSelect scope={hubScope} />
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <div className="rounded-xl border p-3 bg-muted/20">
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Off cadence</p>
          <p className="text-xl font-black">{totals.total}</p>
        </div>
        <div className="rounded-xl border p-3 bg-orange-50/50">
          <p className="text-[10px] font-bold uppercase text-orange-700/70">At Risk</p>
          <p className="text-xl font-black text-orange-700">{totals.atRisk}</p>
        </div>
        <div className="rounded-xl border p-3 bg-red-50/50">
          <p className="text-[10px] font-bold uppercase text-red-700/70">Dormant</p>
          <p className="text-xl font-black text-red-700">{totals.dormant}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          value={activity}
          onChange={(v) => setActivity(v as 'All' | 'At Risk' | 'Dormant')}
          options={[
            { value: 'All', label: 'All activity' },
            { value: 'At Risk', label: 'At Risk' },
            { value: 'Dormant', label: 'Dormant' },
          ]}
        />
        <FilterSelect
          value={loyalty}
          onChange={setLoyalty}
          options={LOYALTY_OPTIONS.map((v) => ({
            value: v,
            label: v === 'All' ? 'All loyalty' : v,
          }))}
        />
      </div>

      <div className="rounded-md border bg-card">
        <div className="relative w-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="[&_tr]:border-b bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="border-b">
                <th className="h-12 px-4 font-medium">Customer</th>
                <th className="h-12 px-4 font-medium">Phone</th>
                <th className="h-12 px-4 font-medium">Hub</th>
                <th className="h-12 px-4 font-medium">Loyalty</th>
                <th className="h-12 px-4 font-medium">Activity</th>
                <th className="h-12 px-4 font-medium">Days late</th>
                <th className="h-12 px-4 font-medium">Recommended action</th>
                <th className="h-12 px-4 font-medium" />
              </tr>
            </thead>
            <tbody>
              {isFetching && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6">
                    <TableSkeleton rows={6} />
                  </td>
                </tr>
              ) : null}
              {!isFetching && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    No off-cadence customers for these filters.
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => {
                const actClr =
                  row.activity === 'At Risk'
                    ? 'bg-orange-100 text-orange-700 border-orange-200'
                    : 'bg-red-100 text-red-700 border-red-200';
                return (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setOpenCustomerOverride(null);
                      setOpenCustomerId(row.id);
                    }}
                    className="border-t hover:bg-muted/20 cursor-pointer"
                  >
                    <td className="p-3">
                      <p className="font-semibold">{row.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Last order {row.lastOrderDate} · {row.daysSinceLast}d ago
                      </p>
                    </td>
                    <td className="p-3">
                      {row.phone ? (
                        <a
                          href={`tel:${row.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone size={12} /> {row.phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground">{row.hub || '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 items-start">
                        {gradeBadge(row.loyaltyGrade)}
                        <span className="inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {row.loyalty}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${actClr}`}>
                        {row.activity}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{row.daysLate}d</p>
                      {Math.round(row.avgInterval) > 0 ? (
                        <p className="text-[10px] text-muted-foreground">
                          vs ~{Math.round(row.avgInterval)}d cadence
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground">Single purchase</p>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground leading-snug">
                      {row.recommendedAction}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenCustomerOverride(null);
                          setOpenCustomerId(row.id);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openCustomerId && !openCustomer ? (
        <CustomerDrawer onClose={closeCustomer}>
          <div className="flex items-center justify-between border-b p-6">
            <h2 className="text-lg font-semibold">Customer details</h2>
            <button type="button" onClick={closeCustomer} aria-label="Close customer details" className="p-1 text-muted-foreground hover:text-foreground">
              <X size={20} />
            </button>
          </div>
          {openCustomerError && !openCustomerLoading ? (
            <p role="alert" className="p-6 text-sm text-destructive">Couldn’t load customer details. Close the drawer and try again.</p>
          ) : (
            <div className="space-y-6 p-6" role="status" aria-label="Loading customer details" aria-busy="true">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16 rounded-lg" />)}
              </div>
              <Skeleton className="h-28 rounded-lg" />
            </div>
          )}
        </CustomerDrawer>
      ) : null}

      {openCustomer ? (
        <CustomerDetailPanel
          customer={openCustomer}
          onClose={closeCustomer}
          animate={false}
          onUpdated={setOpenCustomerOverride}
        />
      ) : null}
    </div>
  );
}
