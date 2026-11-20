import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A dashboard card: title (with an optional caption such as the period) and a right-side action. */
export function Panel({ title, caption, action, children, className }: Readonly<{ title: string; caption?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }>) {
  return (
    <section aria-label={title} className={cn('flex min-w-0 flex-col rounded-xl border bg-card', className)}>
      <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-5 py-3">
        <h2 className="text-sm font-semibold">
          {title}
          {caption && <span className="ml-2 text-xs font-normal text-muted-foreground">{caption}</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

export function PanelLink({ href, children }: Readonly<{ href: string; children: ReactNode }>) {
  return (
    <Link href={href} className="-my-1 inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {children}
      <ChevronRight size={14} aria-hidden />
    </Link>
  );
}

/** A small segmented control for in-panel toggles (radio semantics, so the selected option is announced). */
export { Segmented } from '@/components/app/segmented';
