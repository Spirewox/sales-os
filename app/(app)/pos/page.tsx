'use client';

import { useState } from 'react';
import {
  Banknote,
  Monitor,
  Receipt,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useHubs } from '@/hooks/use-queries';
import { usePosOverview } from '@/hooks/use-pos-overview';
import { TillRegistration } from '@/components/till-registration';
import { LocationTypeTag } from '@/components/hub-scope-filter';

const money = (value: number) =>
  new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value);
const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

export default function PosPage() {
  const { can } = usePermissions();
  // The inner component only mounts after authorization, so forbidden users issue no POS queries.
  if (!can('pos.view'))
    return (
      <div role="alert" className="rounded-xl border p-6">
        <h1 className="text-xl font-bold">POS access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your role does not have permission to view tills and POS metrics.
        </p>
      </div>
    );
  return <PosWorkspace />;
}

function PosWorkspace() {
  const [locationId, setLocationId] = useState('');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [tillLocation, setTillLocation] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const hubs = useHubs();
  const invalidRange = !from || !to || from > to;
  const overview = usePosOverview({
    hub_id: locationId || undefined,
    date_from: from,
    date_to: to,
  });
  const data = overview.data;
  const locations = hubs.data?.filter((hub) => hub.isActive) ?? [];
  const inputClass =
    'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-primary';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Monitor className="text-primary" size={25} />
            POS
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Till operations and recorded sales across your locations.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void overview.refetch();
            void hubs.refetch();
          }}
          disabled={overview.isFetching || invalidRange}
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={overview.isFetching ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <label className="space-y-1.5 text-xs font-semibold">
          Location
          <select
            className={inputClass}
            value={locationId}
            onChange={(event) => {
              setLocationId(event.target.value);
              setTillLocation(null);
            }}
          >
            <option value="">All permitted locations</option>
            {locations.map((hub) => (
              <option key={hub.id} value={hub.id}>
                {hub.name} ({hub.locationType === 'rsp' ? 'RSP' : 'Hub'})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          From
          <input
            className={inputClass}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="space-y-1.5 text-xs font-semibold">
          To
          <input
            className={inputClass}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-3">
          Sales dates use Africa/Lagos. Till registration counts show the
          current state. Offline sales appear after syncing.
        </p>
      </div>
      {invalidRange && (
        <p role="alert" className="text-sm text-destructive">
          Choose a valid start and end date.
        </p>
      )}
      {hubs.isError && (
        <p role="alert" className="text-sm text-destructive">
          Could not load location options. Use Refresh to try again.
        </p>
      )}
      {overview.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-card p-5"
        >
          <p className="text-sm text-destructive">{overview.error.message}</p>
          <button
            type="button"
            onClick={() => void overview.refetch()}
            className="mt-2 text-sm font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}
      {overview.isPending && !invalidRange && (
        <p role="status" className="py-8 text-sm text-muted-foreground">
          Loading POS overview…
        </p>
      )}

      {data && !invalidRange && !overview.isError && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Registered tills',
                value: data.tillCount.toLocaleString(),
                note: 'Non-revoked devices',
                icon: Monitor,
              },
              {
                label: 'Passkeys created',
                value: data.registeredCount.toLocaleString(),
                note: 'Devices with a passkey',
                icon: ShieldCheck,
              },
              {
                label: 'Net POS sales',
                value: money(data.netSales),
                note: `${data.refunds} refund${data.refunds === 1 ? '' : 's'} · voided sales excluded`,
                icon: Banknote,
              },
              {
                label: 'Transactions',
                value: data.transactions.toLocaleString(),
                note: 'Sales recorded in the selected period',
                icon: Receipt,
              },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{metric.label}</span>
                  <metric.icon size={17} className="text-primary" />
                </div>
                <p className="mt-3 break-words text-2xl font-bold tabular-nums">
                  {metric.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metric.note}
                </p>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-bold">Locations and tills</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Sales are reported by location. Open a location to inspect its
                tills and last-seen information.
              </p>
            </div>
            <div className="relative overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    {[
                      'Location',
                      'Tills',
                      'Passkeys',
                      'Net POS sales',
                      'Transactions',
                      '',
                    ].map((heading, index) => (
                      <th
                        key={index}
                        scope="col"
                        className="whitespace-nowrap p-4 font-medium"
                      >
                        {heading || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.locations.map((location) => (
                    <tr key={location.id} className="border-t">
                      <td className="p-4">
                        <div className="flex items-center gap-2 font-medium">
                          {location.name}
                          <LocationTypeTag
                            locationType={location.locationType}
                          />
                        </div>
                      </td>
                      <td className="p-4 tabular-nums">{location.tillCount}</td>
                      <td className="p-4 tabular-nums">
                        {location.registeredCount}
                      </td>
                      <td className="whitespace-nowrap p-4 tabular-nums">
                        {money(location.netSales)}
                      </td>
                      <td className="p-4 tabular-nums">
                        {location.transactions}
                      </td>
                      <td className="p-4">
                        <button
                          type="button"
                          className="whitespace-nowrap font-medium text-primary hover:underline"
                          onClick={() =>
                            setTillLocation({
                              id: location.id,
                              name: location.name,
                            })
                          }
                          aria-label={`View tills at ${location.name}`}
                        >
                          View tills
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!data.locations.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        No permitted locations are available. Contact your
                        administrator to check your location assignment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {tillLocation &&
            data.locations.some(
              (location) => location.id === tillLocation.id,
            ) && (
              <TillRegistration
                key={tillLocation.id}
                hubId={tillLocation.id}
                hubName={tillLocation.name}
                onClose={() => setTillLocation(null)}
              />
            )}

          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-bold">Recorded payment types</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on each sale’s recorded payment classification; this is not
              a cash reconciliation report.
            </p>
            {!data.payments.length ? (
              <p className="py-6 text-sm text-muted-foreground">
                No POS sales were recorded in this period.
              </p>
            ) : (
              <div className="mt-4 divide-y">
                {data.payments.map((payment) => (
                  <div
                    key={payment.method}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{payment.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.transactions} transactions
                      </p>
                    </div>
                    <span className="font-semibold tabular-nums">
                      {money(payment.netSales)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
