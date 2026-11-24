// Caption: Nothing recorded yet: the description says what makes rows appear and the action is that first step
import { EmptyState } from "@/components/app";
import { MapPin } from "lucide-react";

export default function Example() {
  return (
    <EmptyState
      size="compact"
      icon={<MapPin />}
      title="No locations yet"
      description="Add your first hub to get started."
      action={<button type="button" onClick={() => {}} className="text-sm font-medium text-primary hover:underline">Add location</button>}
    />
  );
}
