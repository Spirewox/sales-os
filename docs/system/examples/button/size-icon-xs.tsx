// Caption: Icon-only 24px button with an accessible name, Remove filter.
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ButtonSizeIconXs() {
  return <Button size="icon-xs" variant="ghost" aria-label="Remove filter"><X aria-hidden /></Button>;
}
