import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
  title: string;
  /** Say why it's empty: name the active filters or what would make rows appear. */
  description?: ReactNode;
  icon?: ReactNode;
  /** "Clear filters" or the first action, e.g. "Record sale". */
  action?: ReactNode;
  className?: string;
  /** compact = inside a table or panel; default = a whole section. */
  size?: 'default' | 'compact';
};

export function EmptyState({ title, description, icon, action, className, size = 'default' }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', size === 'compact' ? 'gap-1.5 px-4 py-8' : 'gap-2 px-6 py-14', className)}>
      {icon && <div className="mb-1 text-muted-foreground [&_svg]:size-6" aria-hidden>{icon}</div>}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
