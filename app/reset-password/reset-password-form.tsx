'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, LockKeyhole } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import { useCompletePasswordReset } from '@/hooks/use-queries';

type ResetPasswordFormProps = Readonly<{ token?: string }>;

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const completeReset = useCompletePasswordReset();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError('');

    if (!token) {
      setError('This password reset link is invalid or incomplete.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (
      newPassword.length < 8 ||
      newPassword.length > 128 ||
      !/[a-z]/.test(newPassword) ||
      !/[A-Z]/.test(newPassword) ||
      !/\d/.test(newPassword)
    ) {
      setError(
        'Use 8 to 128 characters with an uppercase letter, lowercase letter, and number.',
      );
      return;
    }

    try {
      await completeReset.mutateAsync({ token, newPassword });
      setCompleted(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reset your password. Please request a new link.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border bg-card p-8 shadow-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            {completed ? (
              <CheckCircle2 className="mb-4 text-primary" size={24} aria-hidden />
            ) : (
              <LockKeyhole className="mb-4 text-muted-foreground" size={24} aria-hidden />
            )}
            <h1 className="text-xl font-semibold tracking-tight">
              {completed ? 'Password updated' : 'Create a new password'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {completed
                ? 'Your password has been reset. You can now sign in.'
                : 'Choose a secure password for your Sales OS account.'}
            </p>
          </div>

          {!completed && token && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="text-sm font-medium"
                >
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <p className="text-xs text-muted-foreground">
                  8 to 128 characters, including uppercase, lowercase, and a number.
                </p>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={128}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <SubmitButton
                type="submit"
                loading={completeReset.isPending}
                className="h-10 w-full rounded-md"
              >
                Reset password
              </SubmitButton>
            </form>
          )}

          {!token && !completed && (
            <div className="space-y-4">
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                This password reset link is invalid or incomplete.
              </p>
              <Link
                href="/forgot-password"
                className="block text-center text-sm font-medium text-primary hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          )}

          {completed && (
            <Link
              href="/login"
              className="flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign in
            </Link>
          )}

          {!completed && token && (
            <Link
              href="/login"
              className="mt-5 block text-center text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
