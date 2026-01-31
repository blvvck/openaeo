import * as React from "react";
import * as DialogBase from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Sheet = DialogBase.Root;
const SheetTrigger = DialogBase.Trigger;
const SheetClose = DialogBase.Close;
const SheetPortal = DialogBase.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogBase.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogBase.Overlay>
>(({ className, ...props }, ref) => (
  <DialogBase.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm", className)} {...props} />
));
SheetOverlay.displayName = "SheetOverlay";

const panelPlacement = cva("fixed z-50 flex flex-col gap-4 border-border bg-card p-6 text-card-foreground shadow-2xl outline-none", {
  variants: {
    side: {
      top: "inset-x-0 top-0 max-h-[85vh] rounded-b-2xl border-b",
      bottom: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl border-t",
      left: "inset-y-0 left-0 h-full w-[min(22rem,90vw)] border-r sm:w-96",
      right: "inset-y-0 right-0 h-full w-[min(22rem,90vw)] border-l sm:w-96",
    },
  },
  defaultVariants: { side: "right" },
});

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogBase.Content> & VariantProps<typeof panelPlacement>;

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogBase.Content>, SheetContentProps>(
  ({ side, className, children, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <DialogBase.Content ref={ref} className={cn(panelPlacement({ side }), className)} {...props}>
        {children}
        <DialogBase.Close aria-label="Close panel" className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
        </DialogBase.Close>
      </DialogBase.Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = "SheetContent";

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5", className)} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogBase.Title>,
  React.ComponentPropsWithoutRef<typeof DialogBase.Title>
>(({ className, ...props }, ref) => (
  <DialogBase.Title ref={ref} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogBase.Description>,
  React.ComponentPropsWithoutRef<typeof DialogBase.Description>
>(({ className, ...props }, ref) => (
  <DialogBase.Description ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = "SheetDescription";

export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
