import { downloadCsv } from '@/lib/csv';
import type { AuditChange, AuditLog } from '@/types';
import { formatAuditAction, formatAuditEntity } from '@/lib/api-mappers';
import { formatMoney } from '@/lib/format';

function formatNaira(n: number): string {
  return `₦${n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseMoneyToken(text: string): number | null {
  const value = text.replace(/[₦,\s]/g, '');
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatMoneyArrows(text: string): string {
  const sep = text.indexOf('→');
  if (sep < 0) return text;
  const left = text.slice(0, sep).trim();
  const right = text.slice(sep + 1).trim();
  const na = parseMoneyToken(left);
  const nb = parseMoneyToken(right);
  if (na == null || nb == null) return text;
  return `${formatNaira(na)} → ${formatNaira(nb)}`;
}

export type DetailRow = { label?: string; text: string };

export function parseAuditDetailRows(details: string): DetailRow[] | null {
  if (!details?.trim()) return null;
  const lower = details.toLowerCase();
  const looksStructured =
    details.includes('\n') ||
    details.includes('→') ||
    lower.includes('unit cost') ||
    lower.includes('list price');
  if (!looksStructured) return null;

  const rows: DetailRow[] = [];
  const chunks = details
    .replace(/,\s*(?=cost\s)/gi, '\n')
    .replace(/,\s*(?=price\s)/gi, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const chunk of chunks) {
    const colon = chunk.indexOf(':');
    if (colon > 0 && chunk.includes('→')) {
      const label = chunk.slice(0, colon).trim();
      const text = chunk.slice(colon + 1).trim();
      rows.push({
        label,
        text: /cost|price|amount/i.test(label) || text.includes('₦') ? formatMoneyArrows(text) : text,
      });
      continue;
    }
    const chunkLower = chunk.toLowerCase();
    if (chunkLower.startsWith('cost ')) {
      rows.push({ label: 'Unit cost', text: formatMoneyArrows(chunk.slice(5).trim()) });
      continue;
    }
    if (chunkLower.startsWith('price ')) {
      rows.push({ label: 'List price', text: formatMoneyArrows(chunk.slice(6).trim()) });
      continue;
    }
    rows.push({ text: chunk.includes('₦') ? formatMoneyArrows(chunk) : chunk });
  }

  return rows.length ? rows : null;
}

export function auditDetailsSummary(details: string): string {
  const rows = parseAuditDetailRows(details);
  if (!rows?.length) return details || '-';
  const change = rows.find((r) => r.label && /cost|price/i.test(r.label));
  if (change) return `${change.label} ${change.text}`;
  return rows[0].text;
}

export type ChangeRow = { field: string; before: string; after: string };

const skuFieldLabels: Record<string, string> = {
  sku: 'SKU', name: 'Product name', category: 'Category', unit_of_measure: 'Unit of measure',
  current_stock: 'Stock on hand', min_stock_level: 'Minimum stock', base_selling_price: 'Unit selling price',
  carton_price: 'Carton selling price', carton_cost: 'Carton cost', carton_weight: 'Carton weight',
  supplier: 'Supplier', is_active: 'Availability', hub: 'Location', image: 'Product image',
};
const moneyFields = new Set(['base_selling_price', 'carton_price', 'carton_cost']);

export function formatSkuChange(change: AuditChange): ChangeRow {
  const format = (value: AuditChange['before']) => {
    if (value == null || value === '') return 'Not set';
    if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
    if (typeof value === 'string') return value;
    if (moneyFields.has(change.field)) return formatMoney(value);
    return value.toLocaleString('en-NG', { maximumFractionDigits: 6 }) + (change.field === 'carton_weight' ? ' kg' : '');
  };
  return { field: skuFieldLabels[change.field] ?? 'Product detail', before: format(change.before), after: format(change.after) };
}

/** Split detail rows into "A → B" changes (for a before/after table) and the remaining notes. */
export function splitChanges(rows: DetailRow[]): { changes: ChangeRow[]; notes: DetailRow[] } {
  const changes: ChangeRow[] = [];
  const notes: DetailRow[] = [];
  for (const row of rows) {
    const sep = row.text.indexOf('→');
    if (sep < 0) { notes.push(row); continue; }
    changes.push({
      field: row.label ?? 'Value',
      before: row.text.slice(0, sep).trim() || '-',
      after: row.text.slice(sep + 1).trim() || '-',
    });
  }
  return { changes, notes };
}

/** In-app page for a record, where one exists (cross-module deep links). */
export function auditRecordHref(log: Pick<AuditLog, 'entityType' | 'entityId'>): string | null {
  if (!log.entityId) return null;
  const id = encodeURIComponent(log.entityId);
  if (log.entityType === 'Sale') return `/sales?sale=${id}`;
  if (log.entityType === 'Customer') return `/customers?customer=${id}`;
  if (log.entityType === 'Inventory') return `/inventory?product=${id}`;
  return null;
}

const csvTime = (ts: string) => {
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString('en-GB', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/** Download the given entries (the current filtered page) as CSV. */
export function downloadAuditCsv(logs: AuditLog[], filename: string) {
  const headers = ['Time (Lagos)', 'User', 'Location', 'Record type', 'Record ID', 'Action', 'Details'];
  const rows = logs.map((l) => [
    csvTime(l.timestamp),
    l.userName,
    l.location,
    formatAuditEntity(l.entityType),
    l.entityId ?? '',
    formatAuditAction(l.action),
    l.bulkUpload?.fileName ? `${l.bulkUpload.fileName}${l.details ? `: ${l.details}` : ''}` : l.details,
  ]);
  downloadCsv(filename, headers, rows);
}
