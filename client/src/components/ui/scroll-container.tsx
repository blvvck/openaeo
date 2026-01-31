import * as React from "react";
import * as ScrollBase from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollBase.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollBase.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollBase.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollBase.Viewport className="size-full rounded-[inherit]">{children}</ScrollBase.Viewport>
    <ScrollBar />
    <ScrollBase.Corner />
  </ScrollBase.Root>
));
ScrollArea.displayName = "ScrollArea";

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollBase.Scrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollBase.Scrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollBase.Scrollbar
    ref={ref}
    orientation={orientation}
    className={cn("flex touch-none select-none p-px opacity-70 transition-opacity hover:opacity-100", orientation === "vertical" ? "h-full w-2" : "h-2 flex-col", className)}
    {...props}
  >
    <ScrollBase.Thumb className="flex-1 rounded-full bg-muted-foreground/50" />
  </ScrollBase.Scrollbar>
));
ScrollBar.displayName = "ScrollBar";

export { ScrollArea, ScrollBar };
