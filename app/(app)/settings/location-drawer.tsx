'use client';

import type { ReactNode } from 'react';
import { PosPaymentSettings } from '@/components/pos-payment-settings';
import { EntityDrawer, RowAction, StatusBadge } from '@/components/app';
import type { Agent, Hub } from '@/types';

function Detail({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium break-words">{children}</dd>
    </div>
  );
}

/** One location: details, its team, and location-level POS settings (company admins only, as on the POS page before). */
export function LocationDrawer({ hub, agents, canManage, canConfigurePos, onEdit, overflow, onClose }: Readonly<{
  hub: Hub; agents: Agent[]; canManage: boolean; canConfigurePos: boolean; onEdit: () => void; overflow?: ReactNode; onClose: () => void;
}>) {
  const team = agents.filter((a) => a.location === hub.name);
  const isHub = hub.locationType === 'hub';
  const ownership = isHub ? null : hub.ownershipType === 'RO' ? 'Retail owned' : hub.ownershipType === 'RF' ? 'Retail franchise' : null;
  return (
    <EntityDrawer
      onClose={onClose}
      title={hub.name}
      subtitle={[isHub ? 'Hub' : 'RSP', hub.code, ownership].filter(Boolean).join(', ')}
      status={hub.isActive ? <StatusBadge tone="good">Active</StatusBadge> : <StatusBadge tone="neutral">Inactive</StatusBadge>}
      actions={canManage ? <RowAction tone="primary" onClick={onEdit}>Edit</RowAction> : undefined}
      overflow={canManage ? overflow : undefined}
      stats={[
        { label: 'Team', value: team.length },
        isHub ? { label: 'RSPs', value: hub.childRspCount ?? 0 } : { label: 'Parent hub', value: hub.parentHubName ?? 'Standalone' },
      ]}
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Manager">{hub.managerName ?? '-'}</Detail>
          <Detail label="Phone">{hub.phone || '-'}</Detail>
          <div className="sm:col-span-2"><Detail label="Address">{hub.address || '-'}</Detail></div>
        </dl>

        {canConfigurePos && (
          <section aria-labelledby="location-pos" className="space-y-3 border-t pt-4">
            <h3 id="location-pos" className="text-sm font-semibold">POS payments</h3>
            <PosPaymentSettings hubId={hub.id} />
          </section>
        )}

        <section aria-labelledby="location-team" className="space-y-2 border-t pt-4">
          <h3 id="location-team" className="text-sm font-semibold">Team</h3>
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is assigned here yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {team.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{a.name}</span>
                  <StatusBadge tone="neutral">{a.role}</StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </EntityDrawer>
  );
}
