import * as React from "react";
import * as SelectBase from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

const Select = SelectBase.Root;
const SelectGroup = SelectBase.Group;
const SelectValue = SelectBase.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectBase.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectBase.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectBase.Trigger ref={ref} className={cn("flex h-10 w-full items-center justify-between rounded-lg border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50", className)} {...props}>
    {children}
    <SelectBase.Icon><ChevronDown aria-hidden="true" className="size-4 text-muted-foreground" /></SelectBase.Icon>
  </SelectBase.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectBase.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectBase.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectBase.ScrollUpButton ref={ref} className={cn("flex items-center justify-center py-1", className)} {...props}><ChevronUp className="size-4" /></SelectBase.ScrollUpButton>
));
SelectScrollUpButton.displayName = "SelectScrollUpButton";

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectBase.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectBase.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectBase.ScrollDownButton ref={ref} className={cn("flex items-center justify-center py-1", className)} {...props}><ChevronDown className="size-4" /></SelectBase.ScrollDownButton>
));
SelectScrollDownButton.displayName = "SelectScrollDownButton";

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectBase.Content>,
  React.ComponentPropsWithoutRef<typeof SelectBase.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectBase.Portal>
    <SelectBase.Content ref={ref} position={position} className={cn("relative z-50 max-h-80 min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl", className)} {...props}>
      <SelectScrollUpButton />
      <SelectBase.Viewport className="p-1">{children}</SelectBase.Viewport>
      <SelectScrollDownButton />
    </SelectBase.Content>
  </SelectBase.Portal>
));
SelectContent.displayName = "SelectContent";

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectBase.Label>,
  React.ComponentPropsWithoutRef<typeof SelectBase.Label>
>(({ className, ...props }, ref) => (
  <SelectBase.Label ref={ref} className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...props} />
));
SelectLabel.displayName = "SelectLabel";

type SelectItemProps = React.ComponentPropsWithoutRef<typeof SelectBase.Item> & {
  indicatorPosition?: "left" | "right";
};

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectBase.Item>,
  SelectItemProps
>(({ className, children, indicatorPosition = "left", ...props }, ref) => (
  <SelectBase.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-md py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      indicatorPosition === "left" ? "pl-8 pr-2" : "pl-2 pr-8",
      className,
    )}
    {...props}
  >
    <span className={cn("absolute grid size-4 place-items-center", indicatorPosition === "left" ? "left-2" : "right-2")}><SelectBase.ItemIndicator><Check className="size-4" /></SelectBase.ItemIndicator></span>
    <SelectBase.ItemText>{children}</SelectBase.ItemText>
  </SelectBase.Item>
));
SelectItem.displayName = "SelectItem";

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectBase.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectBase.Separator>
>(({ className, ...props }, ref) => (
  <SelectBase.Separator ref={ref} className={cn("my-1 h-px bg-border", className)} {...props} />
));
SelectSeparator.displayName = "SelectSeparator";

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton };
