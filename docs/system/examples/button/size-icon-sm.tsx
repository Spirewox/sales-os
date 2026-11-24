// Caption: Icon-only 28px button with an accessible name, More actions.
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ButtonSizeIconSm() {
  return <Button size="icon-sm" variant="ghost" aria-label="More actions"><MoreHorizontal aria-hidden /></Button>;
}
