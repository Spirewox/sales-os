// Caption: One block skeleton at the chart's own height, h-40, while ranked bars load.
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonChartBlock() {
  return (
    <div role="status" aria-label="Loading best sellers">
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
