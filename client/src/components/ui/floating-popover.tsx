import * as React from "react";
import * as PopoverBase from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = PopoverBase.Root;
const PopoverTrigger = PopoverBase.Trigger;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverBase.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverBase.Content>
>(({ className, align = "center", sideOffset = 6, ...props }, ref) => (
  <PopoverBase.Portal>
    <PopoverBase.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn("z-50 min-w-48 rounded-xl border border-border bg-background p-4 text-foreground shadow-xl outline-none", className)}
      {...props}
    />
  </PopoverBase.Portal>
));
PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
