// Caption: A boundary with no label, so the message falls back to This section couldn't load
import { SectionErrorBoundary } from '@/components/app';

function Broken(): never {
  throw new Error('Bad payment mix response');
}

export default function SectionErrorBoundaryUnlabelled() {
  return (
    <SectionErrorBoundary>
      <Broken />
    </SectionErrorBoundary>
  );
}
