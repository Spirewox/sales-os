'use client';

import { useEffect, useId, useState } from 'react';
import { toast } from 'sonner';
import { axiosGet, axiosPatch } from '@/lib/api';
import { Switch } from '@/components/ui/switch';

/** Per-location POS setting: let the cashier and managers confirm a full payment by hand. Saves on toggle. */
export function PosPaymentSettings({ hubId }: { hubId: string }) {
  const id = useId();
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

  const save = async (next: boolean) => {
    setSaving(true);
    try {
      await axiosPatch(`hub/${hubId}/pos-payment-settings`, { manualConfirmationEnabled: next }, true);
      setEnabled(next);
      toast.success(next ? 'Manual payment confirmation turned on' : 'Manual payment confirmation turned off');
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : 'Could not save payment settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-sm font-medium">Manual payment confirmation</p>
        <p id={`${id}-hint`} className="mt-0.5 text-xs leading-5 text-muted-foreground">Allow the originating cashier and this location’s managers to confirm receipt of the full payment. Confirmation completes the sale and consumes reserved stock.</p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error} <button type="button" className="font-medium underline" onClick={() => setRetry(value => value + 1)}>Retry</button>
          </p>
        )}
        {!error && enabled === null && <p role="status" className="mt-2 text-xs text-muted-foreground">Loading…</p>}
      </div>
      {!error && enabled !== null && (
        <Switch checked={enabled} disabled={saving} onCheckedChange={(v) => void save(v)} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} />
      )}
    </div>
  );
}
