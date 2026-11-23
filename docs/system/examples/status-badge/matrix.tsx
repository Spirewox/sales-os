// Caption: All five tones beside the three domains, light and dark
import { StatusBadge } from "@/components/app";

const TONES = ["neutral", "good", "warning", "danger", "info"] as const;

export default function Example() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TONES.map((t) => (
          <StatusBadge key={t} tone={t}>{t[0].toUpperCase() + t.slice(1)}</StatusBadge>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge domain="payment" status="Paid" />
        <StatusBadge domain="stock" status="Low" />
        <StatusBadge domain="work" status="Rejected" />
      </div>
    </div>
  );
}
