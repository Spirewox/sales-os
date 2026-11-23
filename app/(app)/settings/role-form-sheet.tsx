'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateRole } from '@/hooks/use-queries';
import { fePermissionsToApiInput } from '@/lib/role-permissions';
import { FormField, FormSheet, fieldClass } from '@/components/app';
import type { ApiRole } from '@/types/api';

/** Create a custom role with no permissions; switch them on in the matrix afterwards. */
export function RoleFormSheet({ onClose, onCreated }: Readonly<{ onClose: () => void; onCreated: (role: ApiRole) => void }>) {
  const createRole = useCreateRole();
  const [newRole, setNewRole] = useState({ label: '', description: '' });

  const handleCreateRole = async () => {
    const trimmedLabel = newRole.label.trim();
    if (!trimmedLabel) {
      toast.error('Role name is required.');
      return;
    }
    const slug = trimmedLabel.toLowerCase().replace(/\s+/g, '_');
    try {
      const created = await createRole.mutateAsync({
        name: slug,
        label: trimmedLabel,
        description: newRole.description.trim() || undefined,
        permissions: fePermissionsToApiInput([]),
      });
      onCreated(created);
      toast.success(`Role "${trimmedLabel}" created.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create role.');
    }
  };

  return (
    <FormSheet
      title="Add role"
      description="The new role starts with no access. Turn on what it needs in the table."
      onClose={onClose}
      onSubmit={() => void handleCreateRole()}
      submitLabel="Create role"
      submitting={createRole.isPending}
      disabledReason={newRole.label.trim() ? null : 'Enter a role name'}
    >
      <FormField label="Role name" htmlFor="role-label" required>
        <input id="role-label" type="text" value={newRole.label} onChange={(e) => setNewRole({ ...newRole, label: e.target.value })} placeholder="e.g. Warehouse lead" className={fieldClass} autoComplete="off" />
      </FormField>
      <FormField label="Description" htmlFor="role-description" hint="Optional">
        <textarea id="role-description" value={newRole.description} onChange={(e) => setNewRole({ ...newRole, description: e.target.value })} className={`${fieldClass} h-auto min-h-20 py-2`} />
      </FormField>
    </FormSheet>
  );
}
