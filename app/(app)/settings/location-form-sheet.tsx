'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateHub, useUpdateHub } from '@/hooks/use-queries';
import { hubOptionLabel } from '@/lib/api-mappers';
import { FormField, FormSection, FormSheet, fieldClass } from '@/components/app';
import type { Agent, Hub, OwnershipType } from '@/types';
import { SheetSelect } from './sheet-select';

const OWNERSHIP_OPTIONS = [
  { value: 'RO', label: 'Retail owned (RO)' },
  { value: 'RF', label: 'Retail franchise (RF)' },
];

/** Add or edit a hub or RSP. Save logic is unchanged from the old modal. */
export function LocationFormSheet({ initial, onClose, hubs, hubOnlyLocations, agents }: Readonly<{ initial: Partial<Hub>; onClose: () => void; hubs: Hub[]; hubOnlyLocations: Hub[]; agents: Agent[] }>) {
  const createHub = useCreateHub();
  const updateHub = useUpdateHub();
  const [editingHub, setEditingHub] = useState<Partial<Hub>>(initial);
  const patch = (p: Partial<Hub>) => setEditingHub((h) => ({ ...h, ...p }));
  const isRsp = editingHub.locationType === 'rsp';

  const handleSaveHub = async () => {
    if (!editingHub.name) { toast.error('Hub name is required.'); return; }
    const duplicate = hubs.find((h) => h.name.toLowerCase() === editingHub.name!.toLowerCase() && h.id !== editingHub.id);
    if (duplicate) { toast.error('A hub with that name already exists.'); return; }
    if (editingHub.locationType === 'rsp' && !editingHub.ownershipType) {
      toast.error('Select ownership type for this RSP (Retail Owned or Retail Franchise).');
      return;
    }

    try {
      const hubManager = editingHub.hubManagerId || null;
      if (editingHub.id) {
        await updateHub.mutateAsync({
          id: editingHub.id,
          hub_name: editingHub.name,
          hub_address: editingHub.address,
          hub_phone: editingHub.phone,
          hub_manager: hubManager,
          is_active: editingHub.isActive,
          location_type: editingHub.locationType,
          parent_hub: editingHub.locationType === 'rsp' ? (editingHub.parentHubId || null) : null,
          ownership_type: editingHub.locationType === 'rsp' ? editingHub.ownershipType ?? undefined : undefined,
        });
      } else {
        const hubName = editingHub.name ?? '';
        await createHub.mutateAsync({
          hub_name: hubName,
          hub_address: editingHub.address,
          hub_phone: editingHub.phone,
          hub_manager: hubManager || undefined,
          is_active: editingHub.isActive !== false,
          location_type: editingHub.locationType ?? 'hub',
          parent_hub: editingHub.locationType === 'rsp' ? (editingHub.parentHubId || null) : null,
          ownership_type: editingHub.locationType === 'rsp' ? editingHub.ownershipType ?? undefined : undefined,
        });
      }
      onClose();
      toast.success('Location saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save hub.');
    }
  };

  const missing = !editingHub.name?.trim() ? 'Enter a location name' : isRsp && !editingHub.ownershipType ? 'Choose the ownership' : null;

  return (
    <FormSheet
      title={editingHub.id ? 'Edit location' : 'Add location'}
      description={editingHub.id ? `${editingHub.locationType === 'rsp' ? 'RSP' : 'Hub'}${editingHub.code ? `, code ${editingHub.code}` : ''}` : 'A hub, or a retail sales point (RSP) that can sit under a hub.'}
      onClose={onClose}
      onSubmit={() => void handleSaveHub()}
      submitLabel={editingHub.id ? 'Save location' : 'Add location'}
      submitting={createHub.isPending || updateHub.isPending}
      disabledReason={missing}
    >
      <FormSection title="Location">
        <FormField label="Location name" htmlFor="hub-name" required>
          <input id="hub-name" type="text" value={editingHub.name || ''} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Abuja" className={fieldClass} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Type" htmlFor="hub-type">
            <SheetSelect
              id="hub-type"
              value={editingHub.locationType ?? 'hub'}
              onChange={(v) => patch({
                locationType: v as Hub['locationType'],
                parentHubId: v === 'hub' ? undefined : editingHub.parentHubId,
                ownershipType: v === 'hub' ? undefined : (editingHub.ownershipType ?? 'RO'),
              })}
              options={[{ value: 'hub', label: 'Hub' }, { value: 'rsp', label: 'RSP' }]}
            />
          </FormField>
          <FormField label="Code" htmlFor="hub-code" hint={editingHub.id ? undefined : 'Assigned when you save.'}>
            <input id="hub-code" type="text" value={editingHub.id ? (editingHub.code || 'N/A') : 'Auto'} disabled className={fieldClass} />
          </FormField>
        </div>
        {isRsp && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Parent hub" htmlFor="hub-parent">
              <SheetSelect
                id="hub-parent"
                value={editingHub.parentHubId ?? ''}
                onChange={(v) => patch({ parentHubId: v || undefined })}
                options={[{ value: '', label: 'Standalone' }, ...hubOnlyLocations.filter((h) => h.id !== editingHub.id).map((h) => ({ value: h.id, label: hubOptionLabel(h) }))]}
              />
            </FormField>
            <FormField label="Ownership" htmlFor="hub-ownership" required>
              <SheetSelect
                id="hub-ownership"
                value={editingHub.ownershipType ?? ''}
                onChange={(v) => patch({ ownershipType: (v || undefined) as OwnershipType | undefined })}
                options={[{ value: '', label: 'Select ownership' }, ...OWNERSHIP_OPTIONS]}
              />
            </FormField>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={editingHub.isActive !== false} onChange={(e) => patch({ isActive: e.target.checked })} className="size-4 accent-[var(--primary)]" />
          Active
        </label>
      </FormSection>

      <FormSection title="Contact and manager">
        <FormField label="Address" htmlFor="hub-address">
          <input id="hub-address" type="text" value={editingHub.address || ''} onChange={(e) => patch({ address: e.target.value })} placeholder="Full address" className={fieldClass} autoComplete="off" />
        </FormField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="hub-phone">
            <input id="hub-phone" type="tel" value={editingHub.phone || ''} onChange={(e) => patch({ phone: e.target.value })} className={fieldClass} autoComplete="off" />
          </FormField>
          <FormField label="Manager" htmlFor="hub-manager">
            <SheetSelect
              id="hub-manager"
              value={editingHub.hubManagerId || ''}
              onChange={(v) => patch({ hubManagerId: v || undefined })}
              options={[{ value: '', label: 'No manager' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
            />
          </FormField>
        </div>
      </FormSection>
    </FormSheet>
  );
}
