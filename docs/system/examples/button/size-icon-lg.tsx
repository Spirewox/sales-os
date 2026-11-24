// Caption: Icon-only 36px button with an accessible name, Refresh.
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ButtonSizeIconLg() {
  return <Button size="icon-lg" variant="outline" aria-label="Refresh"><RefreshCw aria-hidden /></Button>;
}
