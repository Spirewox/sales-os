import type { Sale } from '@/types';
import { formatDate, formatMoney } from '@/lib/format';
import { saleBalance, saleItemsLabel, saleRef } from './sales-utils';

const esc = (v: unknown) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Opens a printable receipt for one sale in a new window. Returns false when the browser
 * blocked the window (the caller tells the user).
 */
export function printSaleReceipt(sale: Sale, opts: { balance?: number; businessName?: string } = {}): boolean {
  const win = window.open('', '_blank', 'width=420,height=640');
  if (!win) return false;
  const { paid, balance } = saleBalance(sale, opts.balance);
  const row = (label: string, value: string, strong = false) =>
    `<tr><td>${esc(label)}</td><td class="r${strong ? ' b' : ''}">${esc(value)}</td></tr>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${esc(saleRef(sale.id))}</title>
<style>
  body{font:14px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#111;margin:24px;max-width:360px}
  h1{font-size:18px;margin:0 0 2px} p{margin:0;color:#555;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:16px} td{padding:4px 0;vertical-align:top}
  .r{text-align:right} .b{font-weight:600} hr{border:0;border-top:1px dashed #999;margin:12px 0}
  @media print{body{margin:0}}
</style></head><body>
<h1>${esc(opts.businessName || 'Sales receipt')}</h1>
<p>Sale #${esc(saleRef(sale.id))} · ${esc(formatDate(sale.date))}${sale.hubName ? ` · ${esc(sale.hubName)}` : ''}</p>
<table>
${row('Customer', sale.customerName)}
${row('Item', saleItemsLabel(sale))}
${sale.discount ? row('Discount', formatMoney(sale.discount)) : ''}
</table><hr><table>
${row('Total', formatMoney(sale.amount), true)}
${row('Paid', formatMoney(paid))}
${balance > 0 ? row('Balance due', formatMoney(balance), true) : ''}
${sale.paymentType ? row('Method', sale.paymentType) : ''}
</table>
${sale.status === 'Voided' ? '<p style="margin-top:12px;color:#b91c1c;font-weight:600">VOIDED</p>' : ''}
<p style="margin-top:16px">Served by ${esc(sale.agentName || '-')}. Thank you.</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
