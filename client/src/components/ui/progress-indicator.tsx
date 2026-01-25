import * as React from "react";
import * as ProgressBase from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressBase.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressBase.Root>
>(({ className, value = 0, ...props }, ref) => (
  <ProgressBase.Root
    ref={ref}
    className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-muted", className)}
    {...props}
  >
    <ProgressBase.Indicator
      className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300"
      style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
    />
  </ProgressBase.Root>
));
Progress.displayName = "Progress";

export { Progress };
