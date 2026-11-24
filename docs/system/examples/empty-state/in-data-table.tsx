// Caption: In the DataTable empty slot, shown only after loading ends with no rows
import { EmptyState } from "@/components/app";
import { DataTable, type Column } from "@/components/app/data-table";
import { Receipt } from "lucide-react";

type Sale = { id: string; customer: string };
const columns: Column<Sale>[] = [{ id: "customer", header: "Customer", cell: (r) => r.customer, mobile: "title" }];

export default function Example() {
  return (
    <DataTable
      label="Sales"
      columns={columns}
      rows={[]}
      getRowId={(r) => r.id}
      empty={
        <EmptyState
          size="compact"
          icon={<Receipt />}
          title="No sales to show"
          description="No sales match these filters for this week."
          action={<button type="button" onClick={() => {}} className="text-sm font-medium text-primary hover:underline">Clear filters</button>}
        />
      }
    />
  );
}
