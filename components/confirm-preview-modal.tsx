'use client';

import { X } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';
import { ModalDialog } from '@/components/ui/modal-dialog';

export type ConfirmPreviewRow = {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'muted';
};

type Props = {
  open: boolean;
  title: string;
  subtitle?: string;
  rows: ConfirmPreviewRow[];
  warning?: string;
  confirmLabel?: string;
  loading?: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export function ConfirmPreviewModal({
  open,
  title,
  subtitle,
  rows,
  warning,
  confirmLabel = 'Confirm',
  loading,
  onBack,
  onConfirm,
}: Props) {
  if (!open) return null;

  return (
    <ModalDialog onClose={onBack} labelledBy="confirm-preview-title">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 id="confirm-preview-title" className="text-lg font-semibold">{title}</h2>
            {subtitle ? (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        {warning ? (
          <div className="mb-4 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
            {warning}
          </div>
        ) : null}

        <dl className="rounded-md border divide-y">
          {rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd
                className={
                  row.tone === 'warn'
                    ? 'font-medium text-warning text-right tabular-nums'
                    : row.tone === 'muted'
                      ? 'text-muted-foreground text-right tabular-nums'
                      : 'font-medium text-right tabular-nums'
                }
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 items-center justify-center rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            Back
          </button>
          <SubmitButton onClick={onConfirm} loading={!!loading}>
            {confirmLabel}
          </SubmitButton>
        </div>
      </div>
    </ModalDialog>
  );
}
