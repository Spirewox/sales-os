'use client';

import { useId, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalDialog } from '@/components/ui/modal-dialog';

/** Confirmation before an irreversible or destructive action (delete, deactivate, void). */
export function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm, busy, tone = 'danger' }: Readonly<{ title: string; message: ReactNode; confirmLabel: string; onCancel: () => void; onConfirm: () => void; busy?: boolean; tone?: 'danger' | 'default' }>) {
  const titleId = useId();
  return (
    <ModalDialog onClose={onCancel} labelledBy={titleId}>
      <div className="relative z-10 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
        <div className="flex items-start gap-3">
          {tone === 'danger' && <AlertTriangle size={20} aria-hidden className="mt-0.5 shrink-0 text-destructive" />}
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">{title}</h2>
            <div className="mt-1 text-sm text-muted-foreground">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted">Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={tone === 'danger' ? 'inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50' : 'inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50'}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
