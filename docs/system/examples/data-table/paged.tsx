// Caption: Server pages: rows are one page, the footer shows the range and page buttons
import { DataTable, type Column } from "@/components/app";

type Credit = { id: string; customer: string; owed: number; days: number };

const rows: Credit[] = [
  { id: "c1", customer: "Mama Put Kitchen", owed: 48500, days: 12 },
  { id: "c2", customer: "Lagos Grill House", owed: 12000, days: 3 },
  { id: "c3", customer: "Ada Foods", owed: 90250, days: 41 },
];

const columns: Column<Credit>[] = [
  { id: "customer", header: "Customer", cell: (r) => r.customer, sortValue: (r) => r.customer, mobile: "title" },
  { id: "days", header: "Days open", cell: (r) => r.days, sortValue: (r) => r.days, align: "right", mobile: "subtitle" },
  { id: "owed", header: "Owed", cell: (r) => `₦${r.owed.toLocaleString()}`, sortValue: (r) => r.owed, align: "right", mobile: "value" },
];

export default function Example() {
  return (
    <DataTable
      label="Customers with credit"
      columns={columns}
      rows={rows}
      getRowId={(r) => r.id}
      manualSort
      pagination={{ page: 2, totalPages: 5, onPageChange: () => {}, pageSize: 25, onPageSizeChange: () => {}, total: 110 }}
    />
  );
}
