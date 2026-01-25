import * as React from "react";
import * as Confirm from "@radix-ui/react-alert-dialog";

import { cn } from "@/lib/utils";

const AlertDialog = Confirm.Root;
const AlertDialogTrigger = Confirm.Trigger;
const AlertDialogPortal = Confirm.Portal;

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof Confirm.Overlay>,
  React.ComponentPropsWithoutRef<typeof Confirm.Overlay>
>(({ className, ...props }, ref) => (
  <Confirm.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm", className)} {...props} />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof Confirm.Content>,
  React.ComponentPropsWithoutRef<typeof Confirm.Content>
>(({ className, ...props }, ref) => (
  <Confirm.Portal>
    <AlertDialogOverlay />
    <Confirm.Content ref={ref} className={cn("fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl", className)} {...props} />
  </Confirm.Portal>
));
AlertDialogContent.displayName = "AlertDialogContent";

const AlertDialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("grid gap-2 text-left", className)} {...props} />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

const AlertDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof Confirm.Title>,
  React.ComponentPropsWithoutRef<typeof Confirm.Title>
>(({ className, ...props }, ref) => (
  <Confirm.Title ref={ref} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
));
AlertDialogTitle.displayName = "AlertDialogTitle";

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof Confirm.Description>,
  React.ComponentPropsWithoutRef<typeof Confirm.Description>
>(({ className, ...props }, ref) => (
  <Confirm.Description ref={ref} className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof Confirm.Action>,
  React.ComponentPropsWithoutRef<typeof Confirm.Action>
>(({ className, ...props }, ref) => (
  <Confirm.Action ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />
));
AlertDialogAction.displayName = "AlertDialogAction";

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof Confirm.Cancel>,
  React.ComponentPropsWithoutRef<typeof Confirm.Cancel>
>(({ className, ...props }, ref) => (
  <Confirm.Cancel ref={ref} className={cn("inline-flex h-10 items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-semibold transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...props} />
));
AlertDialogCancel.displayName = "AlertDialogCancel";

export { AlertDialog, AlertDialogPortal, AlertDialogOverlay, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel };
