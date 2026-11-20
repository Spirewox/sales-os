'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { axiosGet } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { TillRegistration } from '@/components/till-registration';

type Row = {
  _id: string; hub: string; device_id?: string; label?: string; registered?: boolean; revoked?: boolean;
  client_sale_id?: string; client_shift_id?: string; cashier_name?: string; kind?: string; status?: string;
  total_kobo?: number; createdAt?: string; opened_at?: string; closed_at?: string; last_seen?: string; variance?: number;
  receipt?: { lines?: { name: string; qty: number; lineTotal: number }[]; receiptPayment?: { checkoutReference?: string; provider?: string; actualMethod?: string } };
  checkoutReference?: string;
  review_reason?: string; evidence?: { amountKobo?: number; terminalSerial?: string; reference?: string; transactionReference?: string };
};
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) : '—';
const money = (value?: number) => value == null ? '—' : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value / 100);

export function PosOperations({ section, locations }: { section: string; locations: { id: string; name: string }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const query = new URLSearchParams(params);
  query.delete('tab');
  const encoded = query.toString();
  const result = useQuery({
    queryKey: ['pos-operations', user?.id, user?.visibleHubIds, user?.permissions, section, encoded],
    enabled: Boolean(user),
    queryFn: async () => await axiosGet(`pos/operations/${section}?${encoded}`, true) as { data: Row[]; nextCursor: string | null },
    refetchInterval: 30_000,
  });
  function navigate(update: Record<string, string>) {
    const next = new URLSearchParams(params);
    next.delete('before');
    if (Object.keys(update).some(key => key !== 'before')) next.delete('reference');
    for (const [key, value] of Object.entries(update)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`?${next}`, { scroll: false });
  }
  const hub = locations.find(location => location.id === params.get('hub_id'));
  const heading = { transactions: 'Transactions', tills: 'Tills', shifts: 'Shifts', reviews: 'Payment review' }[section];
  const input = 'min-h-10 min-w-0 rounded-md border bg-background px-2 text-sm';
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{heading}</h1>
        <button type="button" onClick={() => void result.refetch()} className="rounded-md border px-3 py-2 text-sm">Refresh</button>
      </div>
      <form key={encoded} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => {
        event.preventDefault();
        navigate(Object.fromEntries([...new FormData(event.currentTarget)].map(([key, value]) => [key, String(value)])));
      }}>
        <select name="hub_id" aria-label="Location" defaultValue={params.get('hub_id') || ''} className={input}>
          <option value="">All accessible locations</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
        <input name="q" aria-label="Search records" placeholder="Search records" defaultValue={params.get('q') || ''} className={input} />
        {section !== 'tills' && <>
          <input name="date_from" aria-label="From date" type="date" defaultValue={params.get('date_from') || ''} className={input} />
          <input name="date_to" aria-label="To date" type="date" defaultValue={params.get('date_to') || ''} className={input} />
        </>}
        {(section === 'transactions' || section === 'shifts') && <>
          <input name="device_id" aria-label="Till ID" placeholder="Till ID" defaultValue={params.get('device_id') || ''} className={input} />
          <input name="cashier_id" aria-label="Cashier ID" placeholder="Cashier ID" defaultValue={params.get('cashier_id') || ''} className={input} />
          <select name="status" aria-label="Status" defaultValue={params.get('status') || ''} className={input}>
            <option value="">All statuses</option>
            {(section === 'shifts' ? ['open', 'closed'] : ['awaiting', 'completed', 'cancelled', 'review']).map(status => <option key={status}>{status}</option>)}
          </select>
        </>}
        {section === 'transactions' && <select name="kind" aria-label="Transaction type" defaultValue={params.get('kind') || ''} className={input}>
          <option value="">All transaction types</option><option value="sale">Sale</option><option value="repayment">Repayment</option><option value="refund">Refund</option><option value="void">Void</option>
        </select>}
        <button className="min-h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">Apply filters</button>
      </form>
      {section === 'tills' && hub && <TillRegistration hubId={hub.id} hubName={hub.name} onClose={() => navigate({ hub_id: '' })} />}
      {result.isPending && <div aria-label="Loading records" role="status" className="space-y-2">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />)}
      </div>}
      {result.isError && <p role="alert" className="rounded-md border p-4">Could not load records. Use Refresh to retry.</p>}
      {result.data?.data.length === 0 && <p className="rounded-md border p-4 text-sm text-muted-foreground">No records match these filters.</p>}
      {Boolean(result.data?.data.length) && <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted"><tr><th className="p-3">Reference</th><th className="hidden p-3 md:table-cell">Location</th><th className="p-3">Status</th><th className="p-3 text-right">{section === 'shifts' ? 'Variance' : 'Amount'}</th></tr></thead>
          <tbody>{result.data?.data.map(row => <tr key={row._id} className="border-t align-top">
            <td className="max-w-40 break-words p-3">
              <details><summary className="cursor-pointer font-medium">{row.client_sale_id || row.label || row.client_shift_id || row.evidence?.reference || row.device_id || row._id}</summary>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>Location · {locations.find(location => location.id === row.hub)?.name || row.hub}</div>
                  {row.cashier_name && <div>Cashier · {row.cashier_name}</div>}
                  {(row.device_id || row.evidence?.terminalSerial) && <div>Till · {row.device_id || row.evidence?.terminalSerial}</div>}
                  <div>{dateTime(row.opened_at || row.createdAt || row.last_seen)}</div>
                  {row.closed_at && <div>Closed · {dateTime(row.closed_at)}</div>}
                  {row.evidence?.transactionReference && <div>{row.evidence.transactionReference}</div>}
                  {row.review_reason && <div>{row.review_reason}</div>}
                  {row.checkoutReference && <Link className="underline" href={`?${new URLSearchParams({
                    tab: 'transactions', hub_id: row.hub, reference: row.checkoutReference,
                    date_from: '2000-01-01', date_to: dateTime(row.createdAt).includes('—')
                      ? new Date().toISOString().slice(0, 10)
                      : new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(row.createdAt!)),
                  })}`}>Open checkout and receipt details</Link>}
                  {row.receipt?.receiptPayment && <div>{row.receipt.receiptPayment.actualMethod} · {row.receipt.receiptPayment.checkoutReference}</div>}
                  {row.receipt?.lines?.map((line, index) => <div key={index}>{line.qty} × {line.name} · {money(line.lineTotal)}</div>)}
                </dl>
              </details>
            </td>
            <td className="hidden p-3 md:table-cell">{locations.find(location => location.id === row.hub)?.name || row.hub}</td>
            <td className="p-3">{section === 'tills' ? row.revoked ? 'Revoked' : row.registered ? 'Registered' : 'Unregistered' : row.status || 'Needs review'}</td>
            <td className="p-3 text-right">{money(row.variance ?? row.total_kobo ?? row.evidence?.amountKobo)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="flex gap-3">
        {params.has('before') && <button onClick={() => router.back()} className="rounded-md border px-3 py-2 text-sm">Previous page</button>}
        {result.data?.nextCursor && <button onClick={() => navigate({ before: result.data!.nextCursor! })} className="rounded-md border px-3 py-2 text-sm">Next page</button>}
      </div>
    </section>
  );
}
