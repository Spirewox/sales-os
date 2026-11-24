// Caption: A load failed and the caller shows it in the empty slot, with what to try
import { EmptyState } from "@/components/app";

export default function Example() {
  return <EmptyState size="compact" title="Couldn’t load churn" description="Check your connection and try again." />;
}
