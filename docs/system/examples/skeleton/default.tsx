// Caption: Two text-line skeletons, a 16px title bar and a 12px meta bar, inside a status region.
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonDefault() {
  return (
    <div role="status" aria-label="Loading customer" className="space-y-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}
