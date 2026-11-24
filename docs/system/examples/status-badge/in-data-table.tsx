// Caption: In a DataTable status column, placed in the phone card's meta line
import { StatusBadge } from "@/components/app";
import { DataTable, type Column } from "@/components/app/data-table";

type Sale = { id: string; customer: string; status: string };
const rows: Sale[] = [
  { id: "s1", customer: "Mama Put Kitchen", status: "Paid" },
  { id: "s2", customer: "Ada Foods", status: "Overdue" },
];
const columns: Column<Sale>[] = [
  { id: "customer", header: "Customer", cell: (r) => r.customer, mobile: "title" },
  { id: "status", header: "Status", cell: (r) => <StatusBadge domain="payment" status={r.status} />, mobile: "meta" },
];

export default function Example() {
  return <DataTable label="Sales" columns={columns} rows={rows} getRowId={(r) => r.id} />;
}
