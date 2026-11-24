// Caption: One element that navigates: Button rendered as a Next.js link, Record sale.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ButtonAsLink() {
  return <Button nativeButton={false} render={<Link href="/sales/new" />}>Record sale</Button>;
}
