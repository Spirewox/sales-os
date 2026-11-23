// Caption: A whole section with nothing in it: the Analytics tab before any kitchen job in the period
import { EmptyState } from "@/components/app";

export default function Example() {
  return (
    <EmptyState
      title="No kitchen activity in this period"
      description="No kitchen jobs were completed, quoted or cancelled. Try a longer period."
      action={<a href="/kitchen?tab=jobs" className="text-sm font-medium text-primary hover:underline">Open kitchen jobs</a>}
    />
  );
}
