// Caption: Dashboard key figures, one boundary around the KPI strip so a bad summary leaves the charts below working
import { SectionErrorBoundary } from '@/components/app';
import { KpiStrip } from '@/components/app/kpi-strip';

export default function SectionErrorBoundaryInKpiStrip() {
  return (
    <SectionErrorBoundary label="Key figures">
      <KpiStrip
        label="Key figures"
        cells={[
          { label: 'Revenue', value: '₦1.2M', detail: 'This week' },
          { label: 'Sales', value: '84', detail: 'This week' },
          { label: 'Owed now', value: '₦215K', tone: 'warning', detail: 'All open credit' },
        ]}
      />
    </SectionErrorBoundary>
  );
}
