import { csvDate, type ExportCell, type ExportNoun } from '@/lib/export';
import { plural } from '@/lib/format';

/** Rows laid out for the PDF table: text cells, and which columns hold only numbers. */
export function pdfTable(headers: string[], rows: ExportCell[][]): { head: string[]; body: string[][]; numeric: boolean[] } {
  const numeric = headers.map((_, i) => {
    const filled = rows.map((r) => r[i]).filter((v) => v != null && v !== '');
    return filled.length > 0 && filled.every((v) => typeof v === 'number');
  });
  const text = (v: ExportCell) => {
    if (v == null) return '';
    if (typeof v === 'number') return v.toLocaleString('en-NG', { maximumFractionDigits: 2 });
    // The built-in PDF fonts have no naira sign.
    return v.replace(/₦\s?/g, 'NGN ');
  };
  return { head: headers, body: rows.map((r) => headers.map((_, i) => text(r[i]))), numeric };
}

export type PdfMeta = { filters: string[]; exportedAt: Date; count: number; noun: ExportNoun };

/** The two lines under the title: what was filtered, and how many rows when. */
export function pdfHeaderLines({ filters, exportedAt, count, noun }: PdfMeta): string[] {
  const when = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(exportedAt).replace(' at ', ', ');
  return [
    `Filters: ${filters.length ? filters.join(', ') : 'none'}`,
    `${plural(count, noun.one, noun.many)}. Exported ${when} Lagos time.`,
  ];
}

/** A PDF of the table, landscape when it is wide, with the filters on top and page numbers below. */
export async function buildPdf(input: {
  title: string; filters: string[]; exportedAt: Date; noun: ExportNoun; headers: string[]; rows: ExportCell[][];
}): Promise<Uint8Array> {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const table = pdfTable(input.headers, input.rows);
  const doc = new jsPDF({ orientation: input.headers.length > 6 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  const margin = 36;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(input.title, margin, margin + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines = pdfHeaderLines({ filters: input.filters, exportedAt: input.exportedAt, count: input.rows.length, noun: input.noun });
  const wrapped = lines.flatMap((l) => doc.splitTextToSize(l, doc.internal.pageSize.getWidth() - margin * 2) as string[]);
  doc.text(wrapped, margin, margin + 24);
  const columnStyles = Object.fromEntries(table.numeric.map((n, i) => [i, n ? { halign: 'right' as const } : {}]));
  autoTable(doc, {
    head: [table.head],
    body: table.body,
    startY: margin + 30 + wrapped.length * 11,
    margin: { left: margin, right: margin, bottom: margin },
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    // Greys only: the PDF is printed as often as it is read.
    headStyles: { fillColor: 240, textColor: 20, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: 250 },
    columnStyles,
    // Number columns: the header sits over the figures, on the right.
    didParseCell: (data) => { if (data.section === 'head' && table.numeric[data.column.index]) data.cell.styles.halign = 'right'; },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(`Page ${page}`, doc.internal.pageSize.getWidth() - margin, doc.internal.pageSize.getHeight() - 18, { align: 'right' });
      doc.text(`${input.title}, ${csvDate(input.exportedAt)}`, margin, doc.internal.pageSize.getHeight() - 18);
    },
  });
  return new Uint8Array(doc.output('arraybuffer'));
}
