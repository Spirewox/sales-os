// Caption: Drawer whose record is still loading, so the body shows three skeleton bars inside a status region.
import { EntityDrawer } from '@/components/app';

export default function EntityDrawerLoading() {
  return (
    <EntityDrawer onClose={() => {}} title="Mama Put Kitchen" loading>
      <p className="text-sm">Not shown while loading.</p>
    </EntityDrawer>
  );
}
