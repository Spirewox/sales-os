'use client';

import { X } from 'lucide-react';
import { SubmitButton } from '@/components/submit-button';

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
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle ? (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {warning ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {warning}
          </div>
        ) : null}

        <dl className="space-y-2 rounded-lg border divide-y">
          {rows.map((row) => (
            <div
              key={`${row.label}-${row.value}`}
              className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <dt className="text-muted-foreground shrink-0">{row.label}</dt>
              <dd
                className={
                  row.tone === 'warn'
                    ? 'font-medium text-amber-800 text-right'
                    : row.tone === 'muted'
                      ? 'text-muted-foreground text-right'
                      : 'font-medium text-right'
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
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back
          </button>
          <SubmitButton onClick={onConfirm} loading={!!loading} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {confirmLabel}
          </SubmitButton>
        </div>
      </div>
    </div>
  );
}
