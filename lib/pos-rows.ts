/** One row from `pos/operations/{section}`; each section fills a different subset. */
export type PosRow = {
  _id: string; hub: string; device_id?: string; label?: string; registered?: boolean; revoked?: boolean;
  client_sale_id?: string; client_shift_id?: string; cashier_id?: string; cashier_name?: string; kind?: string; status?: string;
  total_kobo?: number; createdAt?: string; opened_at?: string; closed_at?: string; last_seen?: string; variance?: number;
  receipt?: { lines?: { name: string; qty: number; lineTotal: number }[]; receiptPayment?: { checkoutReference?: string; provider?: string; actualMethod?: string } };
  checkoutReference?: string;
  review_reason?: string; evidence?: { amountKobo?: number; terminalSerial?: string; reference?: string; transactionReference?: string };
};

export const rowReference = (row: PosRow) =>
  row.client_sale_id || row.label || row.client_shift_id || row.evidence?.reference || row.device_id || row._id;

export const rowMethod = (row: PosRow) => row.receipt?.receiptPayment?.actualMethod || row.receipt?.receiptPayment?.provider || '-';
