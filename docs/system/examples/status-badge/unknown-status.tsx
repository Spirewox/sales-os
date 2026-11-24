// Caption: A status the domain does not list falls back to neutral with its text unchanged
import { StatusBadge } from "@/components/app";

export default function Example() {
  return <StatusBadge domain="payment" status="Refunded" />;
}
