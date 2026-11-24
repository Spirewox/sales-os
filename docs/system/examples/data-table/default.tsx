// Caption: Customers with credit, sortable, rows open a drawer, one WhatsApp action per row
import { DataTable, RowAction, type Column } from "@/components/app";

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
      onRowClick={() => {}}
      defaultSort={{ id: "days", dir: "desc" }}
      rowActions={(r) => (
        <RowAction href="https://wa.me/2348000000000" external ariaLabel={`WhatsApp ${r.customer}`}>WhatsApp</RowAction>
      )}
    />
  );
}
