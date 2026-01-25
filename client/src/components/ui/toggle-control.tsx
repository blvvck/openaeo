import * as React from "react";
import * as SwitchBase from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchBase.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchBase.Root>
>(({ className, ...props }, ref) => (
  <SwitchBase.Root
    ref={ref}
    className={cn("inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary", className)}
    {...props}
  >
    <SwitchBase.Thumb className="pointer-events-none block size-4 translate-x-0 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-4" />
  </SwitchBase.Root>
));
Switch.displayName = "Switch";

export { Switch };
