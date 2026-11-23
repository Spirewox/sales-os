'use client';

import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { cn } from '@/lib/utils';

type FormSheetProps = {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  /** Explain why Save is off, e.g. "Choose a customer". Shown next to the disabled button. */
  disabledReason?: string | null;
  submitting?: boolean;
  /** A line of derived values above the footer, e.g. "Total ₦45,000 · Balance ₦5,000". */
  preview?: ReactNode;
  children: ReactNode;
  width?: 'md' | 'lg';
  /** Extra save options shown before Cancel, e.g. "Save draft". */
  secondaryActions?: ReactNode;
  /** One destructive action (Archive, Delete) at the far left of the footer. */
  destructiveAction?: ReactNode;
};

/**
 * Full-height side sheet for create and edit. Escape and backdrop clicks don't close it, so typed
 * work isn't lost; the sticky footer keeps Save on screen.
 */
export function FormSheet({ title, description, onClose, onSubmit, submitLabel, disabledReason, submitting, preview, children, width = 'md', secondaryActions, destructiveAction }: Readonly<FormSheetProps>) {
  const headingId = useId();
  const reasonId = useId();
  const blocked = !!disabledReason || !!submitting;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!blocked) onSubmit();
  };
  return (
    <ModalDialog onClose={onClose} align="end" labelledBy={headingId} dismissible={false}>
      <form onSubmit={submit} noValidate className={cn('relative flex h-full w-full flex-col border-l bg-background shadow-xl', width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-start gap-3 border-b px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">{children}</div>
        <div className="border-t bg-background px-5 py-3">
          {preview && <div className="mb-2 text-sm text-muted-foreground tabular-nums">{preview}</div>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {destructiveAction && <div className="mr-auto">{destructiveAction}</div>}
            {disabledReason && !submitting && <p id={reasonId} className={cn('text-xs text-muted-foreground', !destructiveAction && 'mr-auto')}>{disabledReason}</p>}
            {secondaryActions}
            <button type="button" onClick={onClose} className="h-9 rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">Cancel</button>
            <button type="submit" aria-disabled={blocked} aria-describedby={disabledReason ? reasonId : undefined} className={cn('h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90', blocked && 'cursor-not-allowed opacity-50 hover:bg-primary')}>
              {submitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}

/** A titled group of fields. `optional` sections start collapsed. */
export function FormSection({ title, description, optional, defaultOpen, children }: Readonly<{ title: string; description?: string; optional?: boolean; defaultOpen?: boolean; children: ReactNode }>) {
  const [open, setOpen] = useState(defaultOpen ?? !optional);
  const id = useId();
  if (!optional) {
    return (
      <section aria-labelledby={id} className="space-y-3">
        <div>
          <h3 id={id} className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {children}
      </section>
    );
  }
  return (
    <section className="rounded-lg border">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span>
          <span className="block text-sm font-semibold">{title} <span className="font-normal text-muted-foreground">(optional)</span></span>
          {description && <span className="block text-xs text-muted-foreground">{description}</span>}
        </span>
        <ChevronDown size={16} aria-hidden className={cn('shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <div id={id} hidden={!open} className="space-y-3 border-t px-4 py-4">{children}</div>
    </section>
  );
}

/** Label, control and hint/error wired together. */
export function FormField({ label, htmlFor, required, hint, error, children }: Readonly<{ label: string; htmlFor: string; required?: boolean; hint?: string; error?: string | null; children: ReactNode }>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive" aria-hidden> *</span>}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export const fieldClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring aria-invalid:border-destructive disabled:opacity-60';
