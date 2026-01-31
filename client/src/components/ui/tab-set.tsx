import * as React from "react";
import * as TabsBase from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

const Tabs = TabsBase.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsBase.List>,
  React.ComponentPropsWithoutRef<typeof TabsBase.List>
>(({ className, ...props }, ref) => (
  <TabsBase.List ref={ref} className={cn("inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground", className)} {...props} />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsBase.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsBase.Trigger>
>(({ className, ...props }, ref) => (
  <TabsBase.Trigger
    ref={ref}
    className={cn("inline-flex min-h-8 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm", className)}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsBase.Content>,
  React.ComponentPropsWithoutRef<typeof TabsBase.Content>
>(({ className, ...props }, ref) => (
  <TabsBase.Content ref={ref} className={cn("mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
