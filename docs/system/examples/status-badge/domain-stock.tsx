// Caption: Every stock status in its domain tone
import { StatusBadge } from "@/components/app";

export default function Example() {
  return (
    <div className="flex flex-wrap gap-2">
      {["In stock", "Low", "Out", "Expiring", "Expired"].map((s) => (
        <StatusBadge key={s} domain="stock" status={s} />
      ))}
    </div>
  );
}
