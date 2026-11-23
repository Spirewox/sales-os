'use client';

import { Fragment, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { PERMISSION_GROUPS, type Permission, type PermissionGroup } from '@/lib/permissions';
import { isCompanyAdminRole, permissionDisplayLabel, permissionGroupDisplay, roleLabel } from '@/lib/role-permissions';
import { OverflowMenu, StatusBadge } from '@/components/app';
import { cn } from '@/lib/utils';
import type { ApiRole } from '@/types/api';

const TOTAL = PERMISSION_GROUPS.reduce((sum, g) => sum + g.permissions.length, 0);
const box = 'size-4 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-60';

type Props = {
  roles: ApiRole[];
  rolePerms: Record<string, Permission[]>;
  dirtyIds: Set<string>;
  /** Role column shown on phones (one at a time there). */
  phoneRoleId: string;
  onTogglePermission: (roleId: string, perm: Permission) => void;
  onToggleGroup: (roleId: string, group: PermissionGroup) => void;
  onDeleteRole?: (roleId: string) => void;
};

/** Permission groups as rows, roles as columns. Groups expand to single permissions. */
export function RolesMatrix({ roles, rolePerms, dirtyIds, phoneRoleId, onTogglePermission, onToggleGroup, onDeleteRole }: Readonly<Props>) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (label: string) => setExpanded((s) => { const n = new Set(s); if (n.has(label)) n.delete(label); else n.add(label); return n; });
  const allOpen = expanded.size === PERMISSION_GROUPS.length;
  const colCls = (id: string) => cn('w-32 min-w-28 px-3', id !== phoneRoleId && 'hidden md:table-cell');

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">Tick what each role can see and do. Open a group to set single permissions.</p>
        <button type="button" onClick={() => setExpanded(allOpen ? new Set() : new Set(PERMISSION_GROUPS.map((g) => g.label)))} className="shrink-0 text-xs font-medium text-primary hover:underline">
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <div className="overflow-x-auto" role="region" aria-label="Roles and permissions" tabIndex={0}>
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-48 bg-muted px-4 py-2.5 text-left font-medium md:min-w-64">Permission</th>
              {roles.map((r) => {
                const count = (rolePerms[r._id] || []).length;
                const custom = r.is_system === false;
                return (
                  <th key={r._id} scope="col" className={cn(colCls(r._id), 'py-2.5 text-center align-top font-medium')}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="flex items-center gap-1 text-foreground">
                        {roleLabel(r)}
                        {custom && onDeleteRole && (
                          <OverflowMenu size="sm" className="size-6 border-0 bg-transparent" label={`Actions for ${roleLabel(r)}`} items={[{ label: 'Delete role', destructive: true, onSelect: () => onDeleteRole(r._id) }]} />
                        )}
                      </span>
                      <span className="flex flex-wrap items-center justify-center gap-1 font-normal">
                        {custom && <StatusBadge tone="neutral">Custom</StatusBadge>}
                        {dirtyIds.has(r._id) ? <StatusBadge tone="warning">Edited</StatusBadge> : <span className="tabular-nums">{isCompanyAdminRole(r) ? 'Full access' : `${count} of ${TOTAL}`}</span>}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {PERMISSION_GROUPS.map((group) => {
              const open = expanded.has(group.label);
              const display = permissionGroupDisplay(group.label);
              const keys = group.permissions.map((p) => p.key);
              const rowsId = `perm-group-${group.label.replace(/\W+/g, '-').toLowerCase()}`;
              return (
                <Fragment key={group.label}>
                  <tr className="bg-card">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-normal">
                      <button type="button" aria-expanded={open} aria-controls={open ? rowsId : undefined} onClick={() => toggleExpanded(group.label)} className="flex w-full items-start gap-1.5 rounded-md px-2 py-1 text-left hover:bg-muted">
                        <ChevronRight size={16} aria-hidden className={cn('mt-0.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')} />
                        <span className="min-w-0">
                          <span className="block font-semibold">{display.label}</span>
                          {display.description && <span className="block text-xs text-muted-foreground">{display.description}</span>}
                        </span>
                      </button>
                    </th>
                    {roles.map((r) => {
                      const perms = rolePerms[r._id] || [];
                      const selected = keys.filter((k) => perms.includes(k)).length;
                      const all = selected === keys.length;
                      const some = selected > 0 && !all;
                      const locked = isCompanyAdminRole(r);
                      return (
                        <td key={r._id} className={cn(colCls(r._id), 'py-2 text-center')}>
                          <span className="inline-flex flex-col items-center gap-0.5">
                            <input
                              type="checkbox"
                              className={box}
                              checked={all}
                              ref={(el) => { if (el) el.indeterminate = some; }}
                              disabled={locked}
                              onChange={() => onToggleGroup(r._id, group)}
                              aria-label={`${roleLabel(r)}: all of ${display.label}`}
                            />
                            <span className="text-xs text-muted-foreground tabular-nums">{selected}/{keys.length}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                  {open && group.permissions.map((perm, i) => (
                    <tr key={perm.key} id={i === 0 ? rowsId : undefined} className="bg-muted/20">
                      <th scope="row" title={perm.key} className="sticky left-0 z-10 bg-muted px-4 py-2 pl-11 text-left font-normal">
                        {permissionDisplayLabel(perm.label)}
                        <span className="block font-mono text-xs text-muted-foreground">{perm.key}</span>
                      </th>
                      {roles.map((r) => {
                        const checked = (rolePerms[r._id] || []).includes(perm.key);
                        return (
                          <td key={r._id} className={cn(colCls(r._id), 'py-2 text-center')}>
                            <input
                              type="checkbox"
                              className={box}
                              checked={checked}
                              disabled={isCompanyAdminRole(r)}
                              onChange={() => onTogglePermission(r._id, perm.key)}
                              aria-label={`${roleLabel(r)}: ${permissionDisplayLabel(perm.label)}`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
