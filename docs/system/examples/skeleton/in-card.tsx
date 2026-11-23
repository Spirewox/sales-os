// Caption: Skeleton rows inside a Card while a dashboard panel loads, the way the top customers panel does.
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function SkeletonInCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top customers</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="status" aria-label="Loading top customers" className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      </CardContent>
    </Card>
  );
}
