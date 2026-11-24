// Caption: Every payment status in its domain tone
import { StatusBadge } from "@/components/app";

export default function Example() {
  return (
    <div className="flex flex-wrap gap-2">
      {["Paid", "Partial", "Credit", "Unpaid", "Overdue", "Voided"].map((s) => (
        <StatusBadge key={s} domain="payment" status={s} />
      ))}
    </div>
  );
}
