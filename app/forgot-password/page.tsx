'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import { useForgotPassword } from '@/hooks/use-queries';
import { BrandLogo } from '@/components/brand';

export default function ForgotPasswordPage() {
  const forgotPassword = useForgotPassword();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError('');

    try {
      await forgotPassword.mutateAsync({ email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to request a password reset. Please try again.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border bg-card p-8 shadow-lg">
          <div className="mb-8 flex flex-col items-center text-center">
            {submitted ? (
              <MailCheck className="mb-4 text-primary" size={24} aria-hidden />
            ) : (
              <div className="mb-4 flex flex-col items-center">
                <BrandLogo variant="color" width={160} className="mb-1" />
              </div>
            )}
            <h1 className="text-xl font-semibold tracking-tight">
              {submitted ? 'Check your email' : 'Forgot your password?'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {submitted
                ? 'If an account exists for that email, we sent a password reset link.'
                : 'Enter your email and we will send you a secure reset link.'}
            </p>
          </div>

          {!submitted && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@fudfarmer.com"
                  autoComplete="email"
                  required
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
                loading={forgotPassword.isPending}
                className="h-10 w-full rounded-md"
              >
                Send reset link
              </SubmitButton>
            </form>
          )}

          <Link
            href="/login"
            className="mt-5 block text-center text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
