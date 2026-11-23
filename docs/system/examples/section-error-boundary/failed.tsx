// Caption: Supplier list whose child threw while rendering, so the contained message and Try again show in its place
import { SectionErrorBoundary } from '@/components/app';

function BrokenList(): never {
  throw new Error('Supplier response had no rows');
}

export default function SectionErrorBoundaryFailed() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">The filters above still work.</p>
      <SectionErrorBoundary label="Supplier list">
        <BrokenList />
      </SectionErrorBoundary>
    </div>
  );
}
