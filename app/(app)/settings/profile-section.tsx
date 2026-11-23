'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useUpdateProfile } from '@/hooks/use-queries';
import { HAS_API } from '@/lib/require-api';
import { FormField, StatusBadge, fieldClass } from '@/components/app';
import { SectionHeading, UnsavedBar } from './settings-ui';

type User = ReturnType<typeof useAuth>['user'];

const fromUser = (user: User) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  location: user?.hubName ?? user?.location ?? '',
});

/** Name and phone are editable; email, location and role are set by an administrator. */
export function ProfileSection() {
  const { user, refetch: refetchUser } = useAuth();
  const updateProfile = useUpdateProfile();
  const [saved, setSaved] = useState(() => fromUser(user));
  const [name, setName] = useState(saved.name);
  const [phone, setPhone] = useState(saved.phone);

  // Refresh the form when the signed-in user changes (after save or a refetch).
  const [seenUser, setSeenUser] = useState(user);
  if (user !== seenUser) {
    setSeenUser(user);
    const next = fromUser(user);
    setSaved(next);
    setName(next.name);
    setPhone(next.phone);
  }

  const dirty = name !== saved.name || phone !== saved.phone;
  const discard = () => { setName(saved.name); setPhone(saved.phone); };

  const handleProfileUpdate = async () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    if (!HAS_API) {
      toast.info('Connect to the API to save profile changes.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        full_name: name.trim(),
        phone: phone.trim(),
      });
      refetchUser();
      toast.success('Profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  return (
    <section aria-labelledby="settings-profile" className="space-y-5">
      <SectionHeading id="settings-profile" title="Profile" description="How you appear to your team." />
      <form
        onSubmit={(e) => { e.preventDefault(); if (dirty) void handleProfileUpdate(); }}
        className="space-y-4 rounded-xl border bg-card p-5"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Full name" htmlFor="profile-name" required>
            <input id="profile-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} autoComplete="name" />
          </FormField>
          <FormField label="Phone" htmlFor="profile-phone">
            <input id="profile-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} autoComplete="tel" />
          </FormField>
          <FormField label="Email" htmlFor="profile-email" hint="Managed by your administrator.">
            <input id="profile-email" type="email" value={saved.email} readOnly disabled className={fieldClass} />
          </FormField>
          <FormField label="Location" htmlFor="profile-hub" hint="Assigned by your administrator.">
            <input id="profile-hub" type="text" value={saved.location || '-'} readOnly disabled className={fieldClass} />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-sm text-muted-foreground">Role</span>
          {user?.role && <StatusBadge tone="neutral">{user.role}</StatusBadge>}
          <span className="text-xs text-muted-foreground">Assigned by a company admin</span>
        </div>
        {/* Enter in a field saves; the bar below is the visible control. */}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
      {dirty && <UnsavedBar onDiscard={discard} onSave={() => void handleProfileUpdate()} saving={updateProfile.isPending} />}
    </section>
  );
}
