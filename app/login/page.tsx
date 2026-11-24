'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { MOCK_AUTH } from '@/lib/mock-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLoader, BrandLogo } from '@/components/brand';
import { AuthShell } from '@/components/auth/auth-shell';


export default function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) router.replace('/');
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <BrandLoader />;
  }

  return (
    <AuthShell>
      <div className="mb-10 lg:hidden">
        <BrandLogo variant="color" width={148} priority className="dark:hidden" />
        <BrandLogo variant="white" width={148} className="hidden dark:block" />
      </div>

      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to Sales OS with your work email or username.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        <div className="space-y-1.5">
          <Label htmlFor="login-email">Email or username</Label>
          <div className="relative">
            <User size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-email"
              type="text"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@fudfarmer.com"
              required
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="h-10 pl-10"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              aria-invalid={!!error || undefined}
              aria-describedby={error ? 'login-error' : undefined}
              className="h-10 pr-11 pl-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </Button>
          </div>
        </div>

        {error && (
          <p id="login-error" role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}

        <Button type="submit" size="control" loading={submitting} className="h-10 w-full">
          Sign in
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        No account yet? Ask your company admin to invite you.
      </p>

      {MOCK_AUTH && (
        <p className="mt-6 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Local demo: any email and password signs you in with sample data.
        </p>
      )}
    </AuthShell>
  );
}
