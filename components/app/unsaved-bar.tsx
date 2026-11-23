'use client';

import type { ReactNode } from 'react';

/** Sticky bar shown while a form holds unsaved edits: Discard and Save. */
export function UnsavedBar({ message = 'Unsaved changes', onDiscard, onSave, saving, saveLabel = 'Save changes' }: Readonly<{ message?: ReactNode; onDiscard: () => void; onSave: () => void; saving?: boolean; saveLabel?: string }>) {
  return (
    <div role="region" aria-label="Unsaved changes" className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-sm font-medium">{message}</p>
      <div className="flex gap-2">
        <button type="button" onClick={onDiscard} disabled={saving} className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-50">Discard</button>
        <button type="button" onClick={onSave} disabled={saving} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">{saving ? 'Saving…' : saveLabel}</button>
      </div>
    </div>
  );
}
