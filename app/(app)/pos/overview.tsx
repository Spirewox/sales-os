'use client';

import { MapPin } from 'lucide-react';
import { DataTable, EmptyState, KpiStrip, RowAction, SectionErrorBoundary, type Column } from '@/components/app';
import { LivePosPanel } from '@/components/live-pos-panel';
import { LocationTypeTag } from '@/components/hub-scope-filter';
import { usePosOverview, type PosLocation, type PosOverview } from '@/hooks/use-pos-overview';
import { formatCount, formatMoney, formatMoneyShort, plural } from '@/lib/format';
import { previousRange } from '@/lib/period';
import { PosFilterBar } from './pos-filter-bar';
import { usePosFilters } from './use-pos-filters';

const pctChange = (current: number, previous: number | undefined) =>
  previous == null || previous <= 0 ? null : ((current - previous) / previous) * 100;

/** Overview: KPIs, then live tills, locations and the payment mix. */
export function OverviewTab({ onViewTills, tabHref }: Readonly<{ onViewTills: (location: PosLocation) => void; tabHref: (tab: string) => string }>) {
  const f = usePosFilters();
  const overview = usePosOverview({ hub_id: f.hubId, date_from: f.dateFrom, date_to: f.dateTo });
  const prevRange = previousRange(f.period);
  const previous = usePosOverview({ hub_id: f.hubId, date_from: prevRange?.from ?? '', date_to: prevRange?.to ?? '' }).data;
  const data = overview.data;
  const change = (current: number | undefined, prev: number | undefined) => {
    const pct = current == null ? null : pctChange(current, prev);
    return pct == null ? null : { pct };
  };
  const average = data && data.transactions > 0 ? data.netSales / data.transactions : null;
  const prevAverage = previous && previous.transactions > 0 ? previous.netSales / previous.transactions : undefined;
  const locationNames = Object.fromEntries(f.scope.activeHubs.map((h) => [h.id, h.name]));

  return (
    <div className="space-y-6">
      <PosFilterBar f={f} searchPlaceholder="Search locations" />
      {overview.isError && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-card p-5">
          <p className="text-sm text-destructive">{overview.error.message}</p>
          <button type="button" onClick={() => void overview.refetch()} className="mt-2 text-sm font-semibold underline">Try again</button>
        </div>
      )}
      <KpiStrip
        label="POS figures"
        loading={overview.isPending}
        cells={[
          { label: 'Net POS sales', value: data ? formatMoneyShort(data.netSales) : '-', change: change(data?.netSales, previous?.netSales), detail: data ? `${plural(data.refunds, 'refund')}, voids excluded` : undefined },
          { label: 'Transactions', value: data ? formatCount(data.transactions) : '-', change: change(data?.transactions, previous?.transactions), href: tabHref('transactions') },
          { label: 'Average sale', value: average == null ? '-' : formatMoneyShort(average), change: average == null ? null : change(average, prevAverage) },
          { label: 'Tills', value: data ? formatCount(data.tillCount) : '-', detail: data ? `${formatCount(data.registeredCount)} with a passkey` : undefined, href: tabHref('tills') },
        ]}
      />
      <SectionErrorBoundary label="Live tills">
        <LivePosPanel locationId={f.hubId} locationNames={locationNames} />
      </SectionErrorBoundary>
      <SectionErrorBoundary label="Locations">
        <LocationsSection data={data} loading={overview.isPending} search={f.urlSearch} onViewTills={onViewTills} />
      </SectionErrorBoundary>
      <SectionErrorBoundary label="Payment mix">
        <PaymentMix data={data} loading={overview.isPending} />
      </SectionErrorBoundary>
      <p className="text-xs text-muted-foreground">Sales dates use Africa/Lagos time. Till counts show the current state. Offline sales appear after the till syncs.</p>
    </div>
  );
}

function LocationsSection({ data, loading, search, onViewTills }: Readonly<{ data?: PosOverview; loading: boolean; search: string; onViewTills: (l: PosLocation) => void }>) {
  const term = search.trim().toLowerCase();
  const rows = data?.locations.filter((l) => !term || l.name.toLowerCase().includes(term));
  const columns: Column<PosLocation>[] = [
    { id: 'name', header: 'Location', mobile: 'title', sortValue: (l) => l.name.toLowerCase(), cell: (l) => <span className="inline-flex items-center gap-2">{l.name}<LocationTypeTag locationType={l.locationType} /></span> },
    { id: 'tills', header: 'Tills', align: 'right', mobile: 'meta', sortValue: (l) => l.tillCount, cell: (l) => <span>{formatCount(l.tillCount)}<span className="md:hidden"> tills</span></span> },
    { id: 'passkeys', header: 'Passkeys', align: 'right', hideBelow: 'lg', sortValue: (l) => l.registeredCount, cell: (l) => formatCount(l.registeredCount) },
    { id: 'transactions', header: 'Transactions', align: 'right', mobile: 'subtitle', sortValue: (l) => l.transactions, cell: (l) => <span>{formatCount(l.transactions)}<span className="md:hidden"> transactions</span></span> },
    { id: 'sales', header: 'Net POS sales', align: 'right', mobile: 'value', sortValue: (l) => l.netSales, cell: (l) => formatMoney(l.netSales) },
  ];
  return (
    <section aria-labelledby="pos-locations-title" className="space-y-3">
      <h2 id="pos-locations-title" className="text-sm font-semibold">Locations</h2>
      <DataTable
        label="POS locations"
        columns={columns}
        rows={rows}
        loading={loading}
        getRowId={(l) => l.id}
        defaultSort={{ id: 'sales', dir: 'desc' }}
        resetPageKey={term}
        rowActions={(l) => <RowAction onClick={() => onViewTills(l)}>View tills<span className="sr-only"> at {l.name}</span></RowAction>}
        empty={<EmptyState size="compact" icon={<MapPin />} title={term ? 'No matching locations' : 'No permitted locations'} description={term ? 'Try another search.' : 'Contact your administrator to check your location assignment.'} />}
      />
    </section>
  );
}

/** Payment types as ranked bars with their share of net sales. */
function PaymentMix({ data, loading }: Readonly<{ data?: PosOverview; loading: boolean }>) {
  const payments = [...(data?.payments ?? [])].sort((a, b) => b.netSales - a.netSales);
  const total = payments.reduce((sum, p) => sum + Math.max(0, p.netSales), 0);
  return (
    <section aria-labelledby="pos-payments-title" className="space-y-3 rounded-xl border bg-card p-5">
      <div>
        <h2 id="pos-payments-title" className="text-sm font-semibold">Payment mix</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Each sale’s recorded payment type. This is not a cash reconciliation.</p>
      </div>
      {loading ? (
        <div className="space-y-3" aria-hidden>{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />)}</div>
      ) : !payments.length ? (
        <p className="py-4 text-sm text-muted-foreground">No POS sales were recorded in this period.</p>
      ) : (
        <ol className="space-y-3">
          {payments.map((p) => {
            const share = total > 0 ? (Math.max(0, p.netSales) / total) * 100 : 0;
            return (
              <li key={p.method} className="space-y-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="font-medium">{p.method} <span className="text-xs font-normal text-muted-foreground">{plural(p.transactions, 'transaction')}</span></span>
                  <span className="tabular-nums"><span className="font-semibold">{formatMoney(p.netSales)}</span> <span className="text-muted-foreground">{Math.round(share)}%</span></span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
