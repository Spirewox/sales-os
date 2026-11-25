'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { AuditLog } from '@/types';
import { formatAuditAction, formatAuditEntity } from '@/lib/api-mappers';
import { formatDate } from '@/lib/format';
import { EntityDrawer, RowAction, StatusBadge } from '@/components/app';
import { auditRecordHref, formatSkuChange, parseAuditDetailRows, splitChanges } from './audit-details';
import { BulkUploadRows, BulkUploadSummary, uploadDomain, uploadStage, uploadTemplate } from './bulk-upload-details';

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
              <td className="px-3 py-2 align-top break-words text-muted-foreground">{c.before}</td>
              <td className="px-3 py-2 align-top font-medium break-words">{c.after}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AuditDrawer({ log, onClose }: Readonly<{ log: AuditLog; onClose: () => void }>) {
  const update = log.inventoryUpdate;
  const isSkuUpdate = log.action === 'UPDATE_SKU';
  const legacySku = isSkuUpdate && !update ? /^SKU\s+(\S+)\s+updated(?:\s+\((.*)\))?$/i.exec(log.details) : null;
  const sku = update?.sku ?? legacySku?.[1];
  const rows = parseAuditDetailRows(legacySku ? (legacySku[2] ?? '').replace(/^stock\s+/i, 'Stock on hand: ') : log.details || '');
  const { changes, notes } = rows ? splitChanges(rows) : { changes: [], notes: [] };
  const bulk = log.bulkUpload;
  const template = uploadTemplate(bulk?.importType);
  const href = bulk ? null : auditRecordHref(log);
  const [tab, setTab] = useState<'changes' | 'rows' | 'results'>('changes');
  return (
    <EntityDrawer
      onClose={onClose}
      width={bulk ? 'lg' : 'md'}
      title={bulk ? bulk.fileName ?? `${uploadDomain(bulk.domain)} workbook` : update?.productName ?? (isSkuUpdate ? 'SKU updated' : formatAuditAction(log.action))}
      subtitle={`${log.userName}${log.location ? `, ${log.location}` : ''} · ${formatDate(log.timestamp)} ${timeOf(log.timestamp)}`}
      status={bulk ? <StatusBadge tone="neutral">{uploadStage(bulk.stage)}</StatusBadge> : update ? <StatusBadge tone="neutral">SKU updated</StatusBadge> : undefined}
      actions={href ? <RowAction href={href}><ExternalLink aria-hidden /> {isSkuUpdate ? 'Open product' : `Open ${formatAuditEntity(log.entityType).toLowerCase()}`}</RowAction> : undefined}
      stats={bulk ? [
        { label: 'Module', value: uploadDomain(bulk.domain) },
        ...(template ? [{ label: 'Template', value: template }] : []),
      ] : undefined}
      tabs={bulk ? { items: [{ id: 'changes', label: 'Summary' }, { id: 'rows', label: 'Rows' }, { id: 'results', label: 'Results', hidden: !(bulk.resultCount || bulk.results?.length || bulk.importProgress) }], value: tab, onChange: setTab } : undefined}
    >
      {tab === 'changes' && bulk && <BulkUploadSummary upload={bulk} details={log.details} />}
      {tab === 'changes' && !bulk && (
        <div className="space-y-4">
          {sku && (
            <dl>
              <dt className="text-xs text-muted-foreground">SKU</dt>
              <dd className="mt-0.5 text-sm font-medium break-words">{sku}</dd>
            </dl>
          )}
          {update ? (
            <section aria-label="Product changes" className="space-y-2">
              <h3 className="text-sm font-semibold">What changed</h3>
              {update.changes.length > 0 ? <ChangeTable changes={update.changes.map(formatSkuChange)} /> :
                <p className="text-sm text-muted-foreground">No tracked product fields changed.</p>}
            </section>
          ) : <>
          {changes.length > 0 && <ChangeTable changes={changes} />}
          {isSkuUpdate && changes.length === 0 && <p className="text-sm text-muted-foreground">This older entry records the update. Before and after values weren’t saved.</p>}
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
          ) : !sku && (
            <dl>
              <dt className="text-xs text-muted-foreground">Details</dt>
              <dd className="mt-0.5 text-sm font-medium whitespace-pre-wrap break-words">{log.details || '-'}</dd>
            </dl>
          )}
          </>}
        </div>
      )}
      {tab === 'rows' && bulk && <BulkUploadRows upload={bulk} results={false} />}
      {tab === 'results' && bulk && <BulkUploadRows upload={bulk} results />}
    </EntityDrawer>
  );
}
