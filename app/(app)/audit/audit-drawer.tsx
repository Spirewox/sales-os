'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AuditLog } from '@/types';
import { formatAuditAction, formatAuditEntity } from '@/lib/api-mappers';
import { formatDate } from '@/lib/format';
import { EntityDrawer, RowAction, StatusBadge } from '@/components/app';
import { auditRecordHref, parseAuditDetailRows, splitChanges } from './audit-details';

export const timeOf = (ts: string) => new Date(ts).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' });

/** Before/after table for "A → B" changes. */
function ChangeTable({ changes }: Readonly<{ changes: ReturnType<typeof splitChanges>['changes'] }>) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">Changes</caption>
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="w-1/4 px-3 py-2 text-left font-medium">Field</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">Before</th>
            <th scope="col" className="px-3 py-2 text-left font-medium">After</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {changes.map((c, i) => (
            <tr key={`${c.field}-${i}`}>
              <th scope="row" className="px-3 py-2 text-left align-top text-xs font-medium text-muted-foreground">{c.field}</th>
              <td className="px-3 py-2 align-top break-words text-muted-foreground line-through decoration-muted-foreground/50">{c.before}</td>
              <td className="px-3 py-2 align-top font-medium break-words">{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditDrawer({ log, onClose }: Readonly<{ log: AuditLog; onClose: () => void }>) {
  const rows = parseAuditDetailRows(log.details || '');
  const { changes, notes } = rows ? splitChanges(rows) : { changes: [], notes: [] };
  const bulk = log.bulkUpload;
  const href = bulk ? null : auditRecordHref(log);
  const [tab, setTab] = useState<'changes' | 'rows' | 'results'>('changes');
  return (
    <EntityDrawer
      onClose={onClose}
      width={bulk ? 'lg' : 'md'}
      title={bulk ? bulk.fileName ?? 'Bulk upload' : `${formatAuditEntity(log.entityType)}: ${formatAuditAction(log.action).toLowerCase()}`}
      subtitle={`${log.userName}${log.location ? `, ${log.location}` : ''} · ${formatDate(log.timestamp)} ${timeOf(log.timestamp)}`}
      status={bulk ? <StatusBadge tone="neutral">{formatAuditAction(log.action)}</StatusBadge> : undefined}
      actions={href ? <RowAction href={href}><ExternalLink aria-hidden /> Open {formatAuditEntity(log.entityType).toLowerCase()}</RowAction> : undefined}
      stats={bulk ? [
        { label: 'Domain', value: <span className="capitalize">{bulk.domain ?? '-'}</span> },
        { label: 'Type', value: bulk.importType ?? '-' },
        { label: 'Stage', value: bulk.stage ?? log.action },
        { label: 'Record ID', value: <span className="text-sm">{log.entityId || '-'}</span> },
      ] : undefined}
      tabs={bulk ? { items: [{ id: 'changes', label: 'Summary' }, { id: 'rows', label: 'Rows' }, { id: 'results', label: 'Results' }], value: tab, onChange: setTab } : undefined}
    >
      {tab === 'changes' && (
        <div className="space-y-4">
          {!bulk && (
            <dl>
              <dt className="text-xs text-muted-foreground">Record</dt>
              <dd className="mt-0.5 text-sm font-medium break-all">{formatAuditEntity(log.entityType)}{log.entityId ? `, ${log.entityId}` : ''}</dd>
            </dl>
          )}
          {changes.length > 0 && <ChangeTable changes={changes} />}
          {rows ? (
            notes.length > 0 && (
              <dl className="space-y-3">
                {notes.map((row, i) => (
                  <div key={`${row.label ?? 'row'}-${i}`}>
                    <dt className="text-xs text-muted-foreground">{row.label ?? (changes.length ? 'Note' : 'Details')}</dt>
                    <dd className="mt-0.5 text-sm font-medium break-words">{row.text}</dd>
                  </div>
                ))}
              </dl>
            )
          ) : (
            <dl>
              <dt className="text-xs text-muted-foreground">Details</dt>
              <dd className="mt-0.5 text-sm font-medium whitespace-pre-wrap break-words">{log.details || '-'}</dd>
            </dl>
          )}
        </div>
      )}
      {tab === 'rows' && bulk && <pre role="region" aria-label="Uploaded rows" tabIndex={0} className="max-h-[60dvh] overflow-auto overscroll-contain rounded-md bg-muted p-3 text-xs">{JSON.stringify(bulk.rows ?? [], null, 2)}</pre>}
      {tab === 'results' && bulk && <pre role="region" aria-label="Upload results" tabIndex={0} className="max-h-[60dvh] overflow-auto overscroll-contain rounded-md bg-muted p-3 text-xs">{JSON.stringify(bulk.results ?? bulk.summary ?? {}, null, 2)}</pre>}
    </EntityDrawer>
  );
}
