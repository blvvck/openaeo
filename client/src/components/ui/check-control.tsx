import * as React from "react";
import * as CheckboxBase from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxBase.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxBase.Root>
>(({ className, ...props }, ref) => (
  <CheckboxBase.Root
    ref={ref}
    className={cn("inline-grid size-4 shrink-0 place-items-center rounded border border-input bg-background text-primary-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary", className)}
    {...props}
  >
    <CheckboxBase.Indicator className="grid place-items-center">
      <Check aria-hidden="true" className="size-3.5" />
    </CheckboxBase.Indicator>
  </CheckboxBase.Root>
));
Checkbox.displayName = "Checkbox";

export { Checkbox };
