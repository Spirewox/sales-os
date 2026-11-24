// Caption: A textarea with a visible label joined by htmlFor and a placeholder hint, the way kitchen notes read.
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TextareaDefault() {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor="kitchen-notes">Notes for the kitchen</Label>
      <Textarea id="kitchen-notes" placeholder="Allergies, packaging, timing" maxLength={2000} />
    </div>
  )
}
