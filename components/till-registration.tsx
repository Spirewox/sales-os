'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { FormField, FormSection, FormSheet } from '@/components/app';
import { FilterSelect } from '@/components/filter-select';
import { useCreateTillCode } from '@/hooks/use-queries';
import { usePermissions } from '@/hooks/use-permissions';
import { formatDateTime } from '@/lib/format';

/**
 * Register till: pick a location, create a one-time code, then enter it on the till and
 * create its passkey there. The sheet stays open so the code can be read off the screen.
 */
export function RegisterTillSheet({ locations, defaultHubId, onClose }: Readonly<{
  locations: { id: string; name: string }[];
  defaultHubId?: string;
  onClose: () => void;
}>) {
  const { can } = usePermissions();
  const canManage = can('pos.manage_tills');
  const qc = useQueryClient();
  const createCode = useCreateTillCode();
  const [hubId, setHubId] = useState(defaultHubId ?? (locations.length === 1 ? locations[0].id : ''));
  const [issued, setIssued] = useState<{ code: string; expiresAt: string; hubName: string } | null>(null);
  const hubName = locations.find((l) => l.id === hubId)?.name ?? '';

  const issue = async () => {
    try {
      const res = await createCode.mutateAsync(hubId);
      setIssued({ code: res.data.code, expiresAt: res.data.expiresAt, hubName });
      void qc.invalidateQueries({ queryKey: ['pos-operations'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create a registration code');
    }
  };

  const disabledReason = !canManage ? 'You need permission to register tills' : !hubId ? 'Choose a location' : null;

  return (
    <FormSheet
      title="Register till"
      description="A new till stays closed until someone enters a code on that device and creates its passkey."
      onClose={onClose}
      onSubmit={() => void issue()}
      submitLabel={issued ? 'Create another code' : 'Create registration code'}
      submitting={createCode.isPending}
      disabledReason={disabledReason}
    >
      <FormSection title="Where the till sells">
        <FormField label="Location" htmlFor="register-till-location" required hint="The till can only sell from this location.">
          <FilterSelect
            id="register-till-location"
            ariaLabel="Location"
            value={hubId}
            onChange={(v) => { setHubId(v); setIssued(null); }}
            options={[{ value: '', label: 'Choose a location' }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
            className="h-9 data-[size=default]:h-9"
          />
        </FormField>
      </FormSection>
      {issued && (
        <section aria-labelledby="register-till-code" className="rounded-lg border border-primary/30 bg-primary/5 p-4" role="status">
          <h3 id="register-till-code" className="text-sm font-semibold">Registration code for {issued.hubName}</h3>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-[0.25em]">{issued.code}</p>
          <p className="mt-3 text-xs text-muted-foreground">Show this code once. It works on one till and expires {formatDateTime(issued.expiresAt)}.</p>
        </section>
      )}
      <p className="text-sm text-muted-foreground">Enter the code on the till, then create its passkey there. The till shows as Registered once that is done.</p>
    </FormSheet>
  );
}
