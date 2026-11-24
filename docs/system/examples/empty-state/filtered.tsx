// Caption: Filters hide every row: the description names them and the action clears them
import { EmptyState } from "@/components/app";
import { Truck } from "lucide-react";

export default function Example() {
  return (
    <EmptyState
      size="compact"
      icon={<Truck />}
      title="No suppliers match"
      description="Nothing matches Inactive at Ikeja."
      action={<button type="button" onClick={() => {}} className="text-sm font-medium text-primary hover:underline">Clear filters</button>}
    />
  );
}
