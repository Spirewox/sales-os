// Caption: Disabled and invalid textareas, the invalid one tied to its error line by aria-describedby.
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function TextareaStates() {
  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="ta-locked">Method or notes</Label>
        <Textarea id="ta-locked" disabled defaultValue="Soak the beans overnight, then boil for 40 minutes." />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="ta-reason">Reason for cancelling</Label>
        <Textarea id="ta-reason" aria-invalid aria-describedby="ta-reason-error" required />
        <p id="ta-reason-error" className="text-xs text-destructive">Add a reason so the team knows why.</p>
      </div>
    </div>
  )
}
