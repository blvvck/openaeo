import * as React from "react";
import * as LabelBase from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

const Label = React.forwardRef<
  React.ElementRef<typeof LabelBase.Root>,
  React.ComponentPropsWithoutRef<typeof LabelBase.Root>
>(({ className, ...props }, ref) => (
  <LabelBase.Root
    ref={ref}
    className={cn("text-sm font-semibold leading-tight text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-60", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
