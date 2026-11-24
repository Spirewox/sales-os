// Caption: Every work status in its domain tone, for feedback, enquiries and requests
import { StatusBadge } from "@/components/app";

export default function Example() {
  return (
    <div className="flex flex-wrap gap-2">
      {["Open", "Pending", "In progress", "Approved", "Fulfilled", "Resolved", "Rejected", "Closed"].map((s) => (
        <StatusBadge key={s} domain="work" status={s} />
      ))}
    </div>
  );
}
