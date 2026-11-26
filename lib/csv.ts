import { buildCsv, saveCsv, type ExportCell } from '@/lib/export';

/** Download rows as a CSV file. UTF-8 with a BOM so spreadsheet apps read ₦ correctly. */
export function downloadCsv(filename: string, headers: string[], rows: ExportCell[][]) {
  saveCsv(filename, buildCsv(headers.map((header, i) => ({ header, value: (row: ExportCell[]) => row[i] })), rows));
}
