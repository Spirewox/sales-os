'use client';

import { useEffect, useRef } from 'react';

type ModalDialogProps = {
  onClose: () => void;
  children: React.ReactNode;
  /** `end` docks the panel to the right edge (side sheet). */
  align?: 'center' | 'end';
  /** Accessible name, e.g. "Record new sale". Use `labelledBy` instead when the panel has a visible heading with an id. */
  label?: string;
  labelledBy?: string;
  /** False for forms with typed input: Escape and backdrop clicks then do nothing, so work isn't lost. Close via the form's own buttons. */
  dismissible?: boolean;
};

/** Open ModalDialogs, newest last; only the topmost handles Escape. */
const openStack: object[] = [];

const FOCUSABLE = 'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell for every popup form and detail panel.
 * Native <dialog> (role=dialog) with aria-modal, Escape and backdrop-click to close,
 * focus moved into the panel on open and returned to the trigger on close.
 * Uses the `open` attribute rather than showModal() so toasts stay visible above it.
 */
export function ModalDialog({ onClose, children, align = 'center', label, labelledBy, dismissible = true }: Readonly<ModalDialogProps>) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);
  useEffect(() => {
    onCloseRef.current = onClose;
    dismissibleRef.current = dismissible;
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    // Prefer the first form field so typing can start at once; otherwise the first focusable control.
    const content = ':scope > :not(button[aria-label="Close dialog"])';
    // `data-autofocus` wins; comboboxes are skipped so their lists don't pop open on load.
    const field =
      panel?.querySelector<HTMLElement>(`${content} [data-autofocus]`) ??
      panel?.querySelector<HTMLElement>(`${content} input:not([disabled]):not([type=hidden]):not([type=button]):not([role=combobox]), ${content} select:not([disabled]), ${content} textarea:not([disabled])`);
    const first = field ?? panel?.querySelector<HTMLElement>(`${content} ${FOCUSABLE}`);
    first?.focus({ preventScroll: true });

    // Escape is caught at the window (capture phase) by the topmost open ModalDialog only, so it never
    // reaches a sheet or menu underneath (which would close and discard this dialog's input).
    const token = {};
    openStack.push(token);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || openStack.at(-1) !== token) return;
      // Let an open dropdown or combobox inside the dialog close itself first.
      const active = document.activeElement;
      if (active?.closest('[aria-expanded="true"]') && ref.current?.contains(active)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (dismissibleRef.current) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      openStack.splice(openStack.indexOf(token), 1);
      if (previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, []);

  const layoutClass = align === 'end' ? 'flex justify-end' : 'flex items-center justify-center p-4';

  return (
    <dialog
      ref={ref}
      open
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className={`fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 ${layoutClass}`}
      onCancel={(e) => { e.preventDefault(); if (dismissible) onClose(); }}
    >
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-background/80 p-0 backdrop-blur-sm"
        onClick={dismissible ? onClose : undefined}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      {children}
    </dialog>
  );
}
