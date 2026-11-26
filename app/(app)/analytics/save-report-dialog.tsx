'use client';

import { useId, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalDialog } from '@/components/ui/modal-dialog';
import { useSaveReport, useUpdateSavedReport } from '@/hooks/use-reports';
import type { SavedReport } from '@/lib/reports';

export const REPORT_NAME_MAX = 60;

/**
 * Names a report and keeps it under Analytics → Reports → My reports. With `existing`, it saves the
 * changes to that report instead of making a new one.
 */
export function SaveReportDialog({ query, defaultName, existing, successMessage = 'Saved. Find it in Reports.', onSaved, onClose }: Readonly<{
  query: Omit<SavedReport, 'id' | 'createdAt' | 'name'>;
  defaultName: string;
  existing?: SavedReport;
  successMessage?: string;
  onSaved?: (report: SavedReport) => void;
  onClose: () => void;
}>) {
  const titleId = useId();
  const nameId = useId();
  const errorId = useId();
  const [name, setName] = useState((existing?.name ?? defaultName).slice(0, REPORT_NAME_MAX));
  const [error, setError] = useState<string | null>(null);
  const create = useSaveReport();
  const update = useUpdateSavedReport();
  const pending = create.isPending || update.isPending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pending) return;
    const trimmed = name.trim();
    if (!trimmed) { setError('Give the report a name.'); return; }
    const done = {
      onSuccess: (saved: SavedReport) => { toast.success(successMessage); onClose(); onSaved?.(saved); },
      // A clash with one of their own names belongs under the field; anything else is a failed save.
      onError: (err: Error) => {
        if (/already have a report/i.test(err.message)) setError(err.message);
        else toast.error(err.message || 'The report was not saved. Try again.');
      },
    };
    if (existing) update.mutate({ id: existing.id, body: { ...query, name: trimmed } }, done);
    else create.mutate({ ...query, name: trimmed }, done);
  };

  return (
    <ModalDialog onClose={onClose} labelledBy={titleId} dismissible={!pending}>
      <form onSubmit={submit} noValidate className="relative z-10 w-full max-w-sm rounded-xl border bg-card p-6 shadow-lg">
        <h2 id={titleId} className="text-base font-semibold">{existing ? 'Save changes' : 'Save as report'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">It runs again for whatever period and location Reports is set to.</p>
        <div className="mt-4 space-y-1.5">
          <Label htmlFor={nameId}>Name</Label>
          <Input
            id={nameId}
            value={name}
            maxLength={REPORT_NAME_MAX}
            required
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => { setName(e.target.value); setError(null); }}
          />
          {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button type="submit" loading={pending}>Save</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
