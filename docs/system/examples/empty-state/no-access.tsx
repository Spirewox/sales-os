// Caption: The person lacks the permission: the description names it and who can grant it
import { EmptyState } from "@/components/app";
import { BarChart3 } from "lucide-react";

export default function Example() {
  return <EmptyState icon={<BarChart3 />} title="No access to Analytics" description="Ask an admin for the View analytics and reports permission." />;
}
