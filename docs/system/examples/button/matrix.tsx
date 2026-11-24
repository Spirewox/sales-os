// Caption: Every variant at the sm, default and lg sizes, for side-by-side review.
import { Button } from "@/components/ui/button";

const variants = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const;
const sizes = ["sm", "default", "lg"] as const;

export default function ButtonMatrix() {
  return (
    <div className="grid gap-3">
      {sizes.map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-2">
          {variants.map((variant) => (
            <Button key={variant} variant={variant} size={size}>Record payment</Button>
          ))}
        </div>
      ))}
    </div>
  );
}
