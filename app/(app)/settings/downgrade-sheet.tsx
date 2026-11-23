'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useDowngradeHub } from '@/hooks/use-queries';
import { hubOptionLabel } from '@/lib/api-mappers';
import { FormField, FormSection, FormSheet } from '@/components/app';
import type { Hub, OwnershipType } from '@/types';
import { SheetSelect } from './sheet-select';

type ChildAction = { action: 'reassign' | 'standalone'; target_hub_id?: string };

/** Turn a hub into an RSP: decide where its RSPs and manager go. Logic unchanged from the old modal. */
export function DowngradeSheet({ hub: downgradingHub, hubs, hubOnlyLocations, onClose }: Readonly<{ hub: Hub; hubs: Hub[]; hubOnlyLocations: Hub[]; onClose: () => void }>) {
  const downgradeHub = useDowngradeHub();
  const children = hubs.filter((h) => h.parentHubId === downgradingHub.id);
  const [childRspActions, setChildRspActions] = useState<Record<string, ChildAction>>(() => Object.fromEntries(children.map((c) => [c.id, { action: 'standalone' as const }])));
  const [downgradeManagerAction, setDowngradeManagerAction] = useState<'keep' | 'reassign'>('keep');
  const [downgradeReassignHubId, setDowngradeReassignHubId] = useState('');
  const [downgradeParentHubId, setDowngradeParentHubId] = useState('');
  const [downgradeOwnershipType, setDowngradeOwnershipType] = useState<OwnershipType>('RO');
  const otherHubs = hubOnlyLocations.filter((h) => h.id !== downgradingHub.id);
  const hubOptions = otherHubs.map((h) => ({ value: h.id, label: hubOptionLabel(h) }));

  const handleConfirmDowngrade = async () => {
    try {
      await downgradeHub.mutateAsync({
        id: downgradingHub.id,
        child_rsp_actions: children.map((c) => ({
          rsp_id: c.id,
          action: childRspActions[c.id]?.action ?? 'standalone',
          target_hub_id: childRspActions[c.id]?.target_hub_id,
        })),
        manager_action: downgradeManagerAction,
        reassign_hub_id: downgradeManagerAction === 'reassign' ? downgradeReassignHubId : undefined,
        parent_hub_id: downgradeParentHubId || null,
        ownership_type: downgradeOwnershipType,
      });
      onClose();
      toast.success(`"${downgradingHub.name}" downgraded to RSP.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to downgrade hub.');
    }
  };

  const missing = downgradeManagerAction === 'reassign' && !downgradeReassignHubId ? 'Choose the manager’s new hub' : null;
  const radio = 'size-4 accent-[var(--primary)]';

  return (
    <FormSheet
      title={`Downgrade ${downgradingHub.name} to RSP`}
      description="It becomes a retail sales point. Stock and sales history stay where they are."
      onClose={onClose}
      onSubmit={() => void handleConfirmDowngrade()}
      submitLabel="Downgrade to RSP"
      submitting={downgradeHub.isPending}
      disabledReason={missing}
    >
      {children.length > 0 && (
        <FormSection title="Its RSPs" description="Choose what happens to each RSP under this hub.">
          {children.map((child) => {
            const current = childRspActions[child.id];
            return (
              <fieldset key={child.id} className="space-y-2 rounded-md border p-3 text-sm">
                <legend className="px-1 font-medium">{child.name}</legend>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`child-${child.id}`} className={radio} checked={current?.action === 'standalone'} onChange={() => setChildRspActions({ ...childRspActions, [child.id]: { action: 'standalone' } })} />
                    Standalone
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name={`child-${child.id}`} className={radio} checked={current?.action === 'reassign'} onChange={() => setChildRspActions({ ...childRspActions, [child.id]: { action: 'reassign', target_hub_id: hubOnlyLocations[0]?.id } })} />
                    Move to another hub
                  </label>
                </div>
                {current?.action === 'reassign' && (
                  <FormField label="New hub" htmlFor={`child-hub-${child.id}`}>
                    <SheetSelect id={`child-hub-${child.id}`} value={current.target_hub_id ?? ''} onChange={(v) => setChildRspActions({ ...childRspActions, [child.id]: { action: 'reassign', target_hub_id: v } })} options={hubOptions} />
                  </FormField>
                )}
              </fieldset>
            );
          })}
        </FormSection>
      )}

      <FormSection title="Manager">
        <fieldset className="space-y-2 text-sm">
          <legend className="sr-only">Manager</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="downgrade-manager" className={radio} checked={downgradeManagerAction === 'keep'} onChange={() => setDowngradeManagerAction('keep')} />
            Keep as manager of this RSP
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="downgrade-manager" className={radio} checked={downgradeManagerAction === 'reassign'} onChange={() => setDowngradeManagerAction('reassign')} />
            Move the manager to another hub
          </label>
        </fieldset>
        {downgradeManagerAction === 'reassign' && (
          <FormField label="Manager’s new hub" htmlFor="downgrade-reassign" required>
            <SheetSelect id="downgrade-reassign" value={downgradeReassignHubId} onChange={setDowngradeReassignHubId} options={[{ value: '', label: 'Select target hub' }, ...hubOptions]} />
          </FormField>
        )}
      </FormSection>

      <FormSection title="As an RSP">
        <FormField label="Ownership" htmlFor="downgrade-ownership" required>
          <SheetSelect id="downgrade-ownership" value={downgradeOwnershipType} onChange={(v) => setDowngradeOwnershipType(v as OwnershipType)} options={[{ value: 'RO', label: 'Retail owned (RO)' }, { value: 'RF', label: 'Retail franchise (RF)' }]} />
        </FormField>
        <FormField label="Place under hub" htmlFor="downgrade-parent" hint="Optional">
          <SheetSelect id="downgrade-parent" value={downgradeParentHubId} onChange={setDowngradeParentHubId} options={[{ value: '', label: 'Standalone RSP' }, ...hubOptions]} />
        </FormField>
      </FormSection>
    </FormSheet>
  );
}
