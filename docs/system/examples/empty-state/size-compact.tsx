// Caption: Compact, inside a drawer panel: a supplier with no purchases yet
import { EmptyState } from "@/components/app";
import { ShoppingCart } from "lucide-react";

export default function Example() {
  return <EmptyState size="compact" icon={<ShoppingCart />} title="No purchases yet" description="Purchases recorded against this supplier show up here." />;
}
