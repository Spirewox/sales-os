// Caption: Checked, indeterminate, disabled and invalid checkboxes side by side, each with its own label.
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function CheckboxStates() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox id="cb-checked" defaultChecked />
        <Label htmlFor="cb-checked">Include running costs</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-some" indeterminate />
        <Label htmlFor="cb-some">Select all on this page</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-off" disabled />
        <Label htmlFor="cb-off">Post sales when a job is complete</Label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cb-terms" aria-invalid aria-describedby="cb-terms-error" />
        <Label htmlFor="cb-terms">Confirm the stock count</Label>
      </div>
      <p id="cb-terms-error" className="text-xs text-destructive">Confirm the count before you save.</p>
    </div>
  )
}
