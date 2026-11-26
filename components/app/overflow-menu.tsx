'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Menu } from '@base-ui/react/menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export type OverflowItem = {
  label: string;
  /** Either onSelect or href. */
  onSelect?: () => void;
  href?: string;
  /** With href: open in a new tab. */
  external?: boolean;
  icon?: ReactNode;
  /** Destructive items render last, in red, after a separator. */
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

/** A visible, worded trigger in place of `⋯`, for a menu people should find without hunting, such as Export. */
export type OverflowTrigger = { text: string; icon?: ReactNode; disabled?: boolean };

/** The `⋯` menu for secondary and destructive actions (Import, Export, Void, Delete). */
export function OverflowMenu({ items, label = 'More actions', className, size = 'default', trigger }: Readonly<{
  items: OverflowItem[]; label?: string; className?: string; size?: 'default' | 'sm';
  /** Show a worded outline button, such as "Export", instead of `⋯`. `label` stays its accessible name. */
  trigger?: OverflowTrigger;
}>) {
  const visible = items.filter((i) => !i.hidden);
  if (visible.length === 0) return null;
  const normal = visible.filter((i) => !i.destructive);
  const danger = visible.filter((i) => i.destructive);
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        title={label}
        disabled={trigger?.disabled}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md border bg-card transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-[popup-open]:bg-muted disabled:pointer-events-none disabled:opacity-50',
          trigger
            ? cn('gap-1.5 px-3 text-sm font-medium text-foreground [&_svg]:size-4 [&_svg]:shrink-0', size === 'sm' ? 'h-8' : 'h-9')
            : cn('text-muted-foreground', size === 'sm' ? 'size-8' : 'size-9'),
          className,
        )}
      >
        {trigger ? <>{trigger.icon}{trigger.text}</> : <MoreHorizontal size={16} aria-hidden />}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={4} className="z-50">
          <Menu.Popup className="min-w-44 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            {normal.map((item) => <Item key={item.label} item={item} />)}
            {normal.length > 0 && danger.length > 0 && <Menu.Separator className="my-1 h-px bg-border" />}
            {danger.map((item) => <Item key={item.label} item={item} />)}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function Item({ item }: Readonly<{ item: OverflowItem }>) {
  return (
    <Menu.Item
      disabled={item.disabled}
      onClick={item.onSelect}
      render={item.href ? (item.external || !item.href.startsWith('/') ? <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} /> : <Link href={item.href} />) : undefined}
      className={cn(
        'flex cursor-default items-center gap-2 rounded-md px-2.5 py-1.5 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-muted [&_svg]:size-4 [&_svg]:shrink-0',
        item.destructive ? 'text-destructive data-[highlighted]:bg-destructive/10' : 'text-foreground',
      )}
    >
      {item.icon}
      {item.label}
    </Menu.Item>
  );
}
