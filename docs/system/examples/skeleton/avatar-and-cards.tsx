// Caption: Skeletons that take the radius of what they stand for: a round avatar and rounded-xl stat cards.
import { Skeleton } from '@/components/ui/skeleton';

export default function SkeletonAvatarAndCards() {
  return (
    <div role="status" aria-label="Loading customer details" aria-busy="true" className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
    </div>
  );
}
