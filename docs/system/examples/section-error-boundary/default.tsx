// Caption: Credits list wrapped in a boundary, rendering its children normally because nothing threw
import { SectionErrorBoundary } from '@/components/app';

export default function SectionErrorBoundaryDefault() {
  return (
    <SectionErrorBoundary label="Credits list">
      <p className="text-sm">Ada Okafor owes ₦12,500, 9 days overdue.</p>
    </SectionErrorBoundary>
  );
}
