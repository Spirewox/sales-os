// Caption: Button in an EntityDrawer actions row: one default action and one outline action.
import { Button } from "@/components/ui/button";
import { EntityDrawer } from "@/components/app/entity-drawer";

export default function ButtonInEntityDrawer() {
  return (
    <EntityDrawer
      onClose={() => {}}
      title="Sale S-10482"
      actions={
        <>
          <Button size="sm">Record payment</Button>
          <Button size="sm" variant="outline">Print receipt</Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">Line items.</p>
    </EntityDrawer>
  );
}
