'use client';

import { PosPaymentSettings } from '@/components/pos-payment-settings';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateTillCode, usePosTills, useRevokeTill } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { useAuth } from '@/contexts/auth-context';

export function TillRegistration({
  hubId,
  hubName,
  onClose,
}: {
  hubId: string;
  hubName: string;
  onClose: () => void;
}) {
  const { can } = usePermissions();
  const { user } = useAuth();
  const canManage = can('pos.manage_tills');
  const tills = usePosTills(hubId, JSON.stringify([user?.id, user?.visibleHubIds, user?.permissions]));
  const createCode = useCreateTillCode();
  const revoke = useRevokeTill();
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);

  const issue = async () => {
    try {
      const res = await createCode.mutateAsync(hubId);
      setIssued({ code: res.data.code, expiresAt: res.data.expiresAt });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create a registration code');
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold">Tills at {hubName}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">A new till stays closed until someone enters a code on that device and creates its passkey.</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button type="button" onClick={() => void issue()} disabled={createCode.isPending} className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {createCode.isPending ? 'Creating…' : 'New registration code'}
          </button>}
          <button type="button" onClick={onClose} className="h-9 rounded-md border px-3 text-sm">Close</button>
        </div>
      </div>

      {canManage && issued && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Show this code once. It can be used on one till and expires {new Date(issued.expiresAt).toLocaleString()}.</p>
          <p className="mt-2 font-mono text-2xl font-black tracking-[0.25em]">{issued.code}</p>
        </div>
      )}

      {user?.roleName === 'company_admin' && <PosPaymentSettings hubId={hubId} />}
      {tills.isPending && <p role="status" className="text-sm text-muted-foreground">Loading tills…</p>}
      {tills.isError && <div role="alert" className="text-sm text-destructive">{tills.error.message} <button type="button" className="underline" onClick={() => void tills.refetch()}>Retry</button></div>}
      <div className="relative overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Label</th>
              <th className="p-3 font-medium">Passkey</th>
              <th className="p-3 font-medium">Last seen</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(tills.data ?? []).map((till) => (
              <tr key={till.deviceId} className="border-b last:border-0">
                <td className="p-3">
                  <div className="font-medium">{till.label || 'Store till'}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{till.deviceId}</div>
                </td>
                <td className="p-3">{till.passkey ? 'Yes' : 'Not yet'}</td>
                <td className="p-3 text-muted-foreground">{till.lastSeen ? new Date(till.lastSeen).toLocaleString() : '—'}</td>
                <td className="p-3 text-right">
                  {canManage && <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    disabled={revoke.isPending}
                    onClick={() => {
                      if (!window.confirm('Revoke this till? It cannot sign in until it is registered again.')) return;
                      void revoke.mutateAsync({ hubId, deviceId: till.deviceId }).catch((err) => {
                        toast.error(err instanceof Error ? err.message : 'Could not revoke this till');
                      });
                    }}
                  >
                    Revoke
                  </button>}
                </td>
              </tr>
            ))}
            {tills.data && tills.data.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-sm text-muted-foreground">No tills registered for this location.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
