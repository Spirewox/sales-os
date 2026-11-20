'use client';

import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { BrandLogo } from '@/components/brand';
import { useKitchenJob } from '@/hooks/use-kitchen';
import { formatDue, hubNameOf, naira, STAGE_LABELS } from '@/lib/kitchen-types';

/**
 * Client-facing quote or order summary: bill lines and totals only, never costs.
 * Opened from the job panel; staff print it or save it as PDF to send on WhatsApp.
 */
export default function KitchenQuotePage() {
  const { id } = useParams<{ id: string }>();
  const job = useKitchenJob(id);

  if (job.isPending) return <p role="status" className="p-8 text-sm text-muted-foreground">Loading…</p>;
  if (job.isError || !job.data) {
    return (
      <div role="alert" className="mx-auto max-w-xl p-8">
        <h1 className="text-lg font-semibold">Quote not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">{job.error?.message ?? 'Sign in to Sales OS with kitchen access to open this quote.'}</p>
      </div>
    );
  }
  const j = job.data;
  const isQuote = j.stage === 'draft' || j.stage === 'quoted';
  const balance = Math.max(0, j.total - j.paid);
  const issued = new Date(j.quoted_at ?? j.confirmed_at ?? j.createdAt);

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <Printer size={16} aria-hidden /> Print or save as PDF
        </button>
      </div>
      <main className="mx-auto max-w-3xl rounded-xl bg-white p-8 text-slate-900 shadow-sm print:rounded-none print:shadow-none sm:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
          <BrandLogo variant="color" width={150} />
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight">{isQuote ? 'Quote' : 'Order summary'}</h1>
            <p className="font-mono text-sm">{j.code}</p>
            <p className="text-sm text-slate-600">{issued.toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {!isQuote && <p className="text-sm text-slate-600">Status: {STAGE_LABELS[j.stage]}</p>}
          </div>
        </header>

        <section className="grid gap-4 py-6 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">For</p>
            <p className="font-semibold">{j.customer_name || 'Customer'}</p>
            {j.phone && <p>{j.phone}</p>}
            {j.fulfilment === 'delivery' && j.address && <p className="text-slate-600">{j.address}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-xs text-slate-500">{j.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</p>
            <p>{formatDue(j.due_at)}</p>
            {hubNameOf(j.hub) && <p className="text-slate-600">Fudfarmer Kitchen, {hubNameOf(j.hub)}</p>}
          </div>
        </section>

        <table className="w-full text-sm">
          <thead className="border-y bg-slate-50 text-left text-xs text-slate-500">
            <tr><th className="px-3 py-2 font-medium">Item</th><th className="px-3 py-2 text-right font-medium">Qty</th><th className="px-3 py-2 text-right font-medium">Price</th><th className="px-3 py-2 text-right font-medium">Amount</th></tr>
          </thead>
          <tbody className="divide-y">
            {j.bill_lines.map((b, i) => (
              <tr key={i}><td className="px-3 py-2">{b.desc}</td><td className="px-3 py-2 text-right tabular-nums">{b.qty}</td><td className="px-3 py-2 text-right tabular-nums">{naira(b.unit_price)}</td><td className="px-3 py-2 text-right tabular-nums">{naira(b.qty * b.unit_price)}</td></tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-900">
            <tr><td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td><td className="px-3 py-2 text-right text-lg font-semibold tabular-nums">{naira(j.total)}</td></tr>
            {j.paid > 0 && (
              <>
                <tr><td colSpan={3} className="px-3 py-1 text-right text-slate-600">Paid</td><td className="px-3 py-1 text-right tabular-nums">{naira(j.paid)}</td></tr>
                <tr><td colSpan={3} className="px-3 py-1 text-right font-semibold">Balance</td><td className="px-3 py-1 text-right font-semibold tabular-nums">{naira(balance)}</td></tr>
              </>
            )}
          </tfoot>
        </table>

        <footer className="mt-8 space-y-1 border-t pt-4 text-xs text-slate-500">
          {isQuote && j.expires_at && <p>This quote is valid until {new Date(j.expires_at).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}.</p>}
          {isQuote && <p>Prices may change if the menu, quantities or date change.</p>}
          <p>Thank you for choosing Fudfarmer.</p>
        </footer>
      </main>
    </div>
  );
}
