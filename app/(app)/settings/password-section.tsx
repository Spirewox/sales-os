'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { useResetPassword } from '@/hooks/use-queries';
import { HAS_API } from '@/lib/require-api';
import { getPasswordStrength } from '@/lib/settings-helpers';
import { FormField, fieldClass } from '@/components/app';
import { cn } from '@/lib/utils';
import { SectionHeading, btnPrimary } from './settings-ui';

export function PasswordSection() {
  const resetPassword = useResetPassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordUpdate = async () => {
    if (!currentPassword) { toast.error('Enter your current password.'); return; }
    if (!newPassword || newPassword.length < 8) { toast.error('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    try {
      await resetPassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password updated successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password.');
    }
  };

  const strength = getPasswordStrength(newPassword);
  // Map the helper's colour onto status tokens: weak = destructive, medium = warning, strong = primary.
  const tone = strength.color === 'bg-destructive'
    ? { bar: 'bg-destructive', text: 'text-destructive' }
    : strength.color === 'bg-yellow-500'
      ? { bar: 'bg-warning', text: 'text-warning' }
      : { bar: 'bg-primary', text: 'text-primary' };
  const mismatch = !!confirmPassword && confirmPassword !== newPassword;

  return (
    <section aria-labelledby="settings-password" className="space-y-5">
      <SectionHeading id="settings-password" title="Password" description="Use at least 8 characters. A mix of letters, numbers and symbols is stronger." />
      <form onSubmit={(e) => { e.preventDefault(); void handlePasswordUpdate(); }} className="space-y-4 rounded-xl border bg-card p-5">
        {/* Lets password managers pair the new password with the account. */}
        <input type="text" name="username" autoComplete="username" hidden readOnly />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 md:max-w-[calc(50%-0.5rem)]">
            <FormField label="Current password" htmlFor="current-password">
              <input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={fieldClass} autoComplete="current-password" />
            </FormField>
          </div>
          <div className="space-y-2">
            <FormField label="New password" htmlFor="new-password">
              <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={fieldClass} autoComplete="new-password" aria-describedby={newPassword ? 'new-password-strength' : undefined} />
            </FormField>
            {newPassword && (
              <div className="space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all duration-300', tone.bar, strength.width)} /></div>
                <p id="new-password-strength" className={cn('text-xs font-medium', tone.text)}>Strength: {strength.label.toLowerCase()}</p>
              </div>
            )}
          </div>
          <FormField label="Confirm new password" htmlFor="confirm-password" error={mismatch ? 'Passwords do not match.' : null}>
            <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={fieldClass} autoComplete="new-password" aria-invalid={mismatch || undefined} />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <button type="submit" disabled={!HAS_API || resetPassword.isPending} className={btnPrimary}>
            <Lock aria-hidden /> {resetPassword.isPending ? 'Updating…' : 'Update password'}
          </button>
          {!HAS_API && <p className="text-xs text-muted-foreground">Connect to the API to change your password.</p>}
        </div>
      </form>
    </section>
  );
}
