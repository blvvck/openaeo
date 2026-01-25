import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive" | "success" | "warning";
const appearances: Record<AlertVariant, string> = {
  default: "border-border bg-card text-card-foreground",
  destructive: "border-destructive/40 bg-destructive/5 text-destructive",
  success: "border-success/40 bg-success/5 text-success-700 dark:text-success-400",
  warning: "border-warning/40 bg-warning/5 text-warning-700 dark:text-warning-400",
};

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: AlertVariant }>(
  ({ className, variant = "default", ...props }, ref) => (
    <div ref={ref} role="alert" className={cn("w-full rounded-xl border px-4 py-3.5", appearances[variant], className)} {...props} />
  ),
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => <h5 ref={ref} className={cn("mb-1 font-semibold leading-tight", className)} {...props} />,
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn("text-sm leading-relaxed opacity-90", className)} {...props} />,
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
