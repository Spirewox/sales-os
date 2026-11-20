'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const variantClasses = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
} as const;

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: keyof typeof variantClasses;
};

export function SubmitButton({
  loading = false,
  disabled,
  className,
  children,
  variant = 'primary',
  type = 'button',
  ...props
}: SubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 transition-colors disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
