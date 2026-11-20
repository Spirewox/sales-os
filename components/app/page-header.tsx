import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  /** One primary action, plus at most one secondary; everything else goes in `overflow`. */
  actions?: ReactNode;
  /** An <OverflowMenu> for Import, Export, Template and the like. */
  overflow?: ReactNode;
  /** <SectionTabs>: always below the title, never in the action cluster. */
  tabs?: ReactNode;
  className?: string;
};

/** The one page header: title, a line of description, actions on the right, tabs underneath. */
export function PageHeader({ title, description, actions, overflow, tabs, className }: Readonly<PageHeaderProps>) {
  return (
    <header className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-[65ch] text-sm text-muted-foreground">{description}</p>}
        </div>
        {(actions || overflow) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
            {overflow}
          </div>
        )}
      </div>
      {tabs}
    </header>
  );
}
