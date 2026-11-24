// Caption: A sale's payment status from the payment domain: Overdue in the danger tone
import { StatusBadge } from "@/components/app";

export default function Example() {
  return <StatusBadge domain="payment" status="Overdue" />;
}
