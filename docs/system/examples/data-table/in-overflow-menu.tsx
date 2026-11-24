// Caption: Row actions as the call sites write them: 1 or 2 labelled RowActions, the rest in an OverflowMenu
import { DataTable, RowAction, type Column } from "@/components/app";
import { OverflowMenu } from "@/components/app/overflow-menu";

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
      rowActions={(r) => (
        <>
          <RowAction tone="primary" onClick={() => {}} ariaLabel={`Record payment for ${r.customer}`}>Record payment</RowAction>
          <OverflowMenu
            label={`More actions for ${r.customer}`}
            items={[
              { label: "Open customer", onSelect: () => {} },
              { label: "Write off balance", onSelect: () => {}, destructive: true },
            ]}
          />
        </>
      )}
    />
  );
}
