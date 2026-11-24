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
/** The page's own overflow and padding, saved while any ModalDialog holds the scroll lock. */
let scrollLock: { overflow: string; paddingRight: string } | null = null;

const FOCUSABLE = 'input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([tabindex="-1"]), [href], [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell for every popup form and detail panel.
 * Native <dialog> (role=dialog) with aria-modal, Escape and backdrop-click to close,
 * focus moved into the panel on open and returned to the trigger on close.
 * Uses the `open` attribute rather than showModal() so toasts stay visible above it, so it traps
 * Tab inside the topmost panel and locks page scroll itself while any ModalDialog is open (G-15).
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
    // Page scroll lock: the first open dialog saves the page's overflow, the last one to close restores it.
    if (openStack.length === 1) {
      const root = document.documentElement;
      const gutter = window.innerWidth - root.clientWidth;
      scrollLock = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
      root.style.overflow = 'hidden';
      if (gutter > 0) root.style.paddingRight = `${gutter}px`;
    }
    const onKey = (e: KeyboardEvent) => {
      if (openStack.at(-1) !== token) return;
      if (e.key === 'Tab') {
        // Focus trap: wrap Tab and Shift+Tab inside the panel. Focus in a portaled popup is left to the popup.
        const panelEl = ref.current;
        const active = document.activeElement;
        if (!panelEl || (active && active !== document.body && !panelEl.contains(active))) return;
        const items = [...panelEl.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.tabIndex >= 0 && el.getClientRects().length > 0);
        if (!items.length) return;
        const firstItem = items[0];
        const lastItem = items.at(-1)!;
        if (e.shiftKey && (active === firstItem || !panelEl.contains(active))) { e.preventDefault(); lastItem.focus(); }
        else if (!e.shiftKey && (active === lastItem || !panelEl.contains(active))) { e.preventDefault(); firstItem.focus(); }
        return;
      }
      if (e.key !== 'Escape') return;
      // Let an open dropdown or combobox inside the dialog close itself first.
      const active = document.activeElement;
      if (active?.closest('[aria-expanded="true"]') && ref.current?.contains(active)) return;
      // Focus is in a floating popup portaled outside this dialog (calendar, select list): let it close first.
      if (active && active !== document.body && !ref.current?.contains(active)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (dismissibleRef.current) onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      openStack.splice(openStack.indexOf(token), 1);
      if (openStack.length === 0 && scrollLock) {
        document.documentElement.style.overflow = scrollLock.overflow;
        document.documentElement.style.paddingRight = scrollLock.paddingRight;
        scrollLock = null;
      }
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
