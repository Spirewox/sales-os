// Caption: Icon-only 32px button with an accessible name, Close.
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ButtonSizeIcon() {
  return <Button size="icon" variant="ghost" aria-label="Close"><X aria-hidden /></Button>;
}
