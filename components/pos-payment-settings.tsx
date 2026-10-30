'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { axiosGet, axiosPatch } from '@/lib/api';

export function PosPaymentSettings({ hubId }: { hubId: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setEnabled(null); setError('');
    axiosGet(`hub/${hubId}`, true).then(result => {
      if (active) setEnabled(result.data?.pos_manual_payment_confirmation === true);
    }).catch(() => { if (active) setError('Could not load payment settings.'); });
    return () => { active = false; };
  }, [hubId, retry]);
  return <div className="border-t pt-4">
    <h4 className="text-sm font-bold">Manual payment confirmation</h4>
    <p className="mt-1 text-xs leading-5 text-muted-foreground">Allow the originating cashier and this location’s managers to confirm receipt of the full payment. Confirmation completes the sale and consumes reserved stock.</p>
    {error ? <p role="alert" className="mt-2 text-sm text-destructive">{error} <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>
      : enabled === null ? <p role="status" className="mt-2 text-sm text-muted-foreground">Loading settings…</p>
      : <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} disabled={saving} onChange={async event => {
          const next = event.target.checked;
          setSaving(true);
          try { await axiosPatch(`hub/${hubId}/pos-payment-settings`, { manualConfirmationEnabled: next }, true); setEnabled(next); toast.success('Payment settings saved'); }
          catch (failure) { toast.error(failure instanceof Error ? failure.message : 'Could not save payment settings'); }
          finally { setSaving(false); }
        }} />
        {saving ? 'Saving…' : 'Allow manual confirmation at this location'}
      </label>}
  </div>;
}
