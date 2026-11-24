// Caption: A checkbox with a visible label joined by htmlFor, the way a filter option reads.
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function CheckboxDefault() {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id="overdue-only" />
      <Label htmlFor="overdue-only">Only show overdue jobs</Label>
    </div>
  )
}
