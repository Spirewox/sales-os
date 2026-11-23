// Caption: Pending action that keeps focus and shows a spinner before the caller's label, Saving….
import { Button } from "@/components/ui/button";

export default function ButtonLoading() {
  return (
    <Button size="control" loading>
      Saving…
    </Button>
  );
}
