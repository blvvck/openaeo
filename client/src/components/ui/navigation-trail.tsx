import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";

const Breadcrumb = React.forwardRef<HTMLElement, React.ComponentPropsWithoutRef<"nav">>(
  ({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />,
);
Breadcrumb.displayName = "Breadcrumb";

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.ComponentPropsWithoutRef<"ol">>(
  ({ className, ...props }, ref) => <ol ref={ref} className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", className)} {...props} />,
);
BreadcrumbList.displayName = "BreadcrumbList";

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.ComponentPropsWithoutRef<"li">>(
  ({ className, ...props }, ref) => <li ref={ref} className={cn("inline-flex items-center gap-2", className)} {...props} />,
);
BreadcrumbItem.displayName = "BreadcrumbItem";

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.ComponentPropsWithoutRef<"a"> & { asChild?: boolean }>(
  ({ asChild, className, ...props }, ref) => {
    const Component = asChild ? Slot : "a";
    return <Component ref={ref} className={cn("transition-colors hover:text-foreground", className)} {...props} />;
  },
);
BreadcrumbLink.displayName = "BreadcrumbLink";

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  ({ className, ...props }, ref) => <span ref={ref} aria-current="page" aria-disabled="true" className={cn("font-medium text-foreground", className)} {...props} />,
);
BreadcrumbPage.displayName = "BreadcrumbPage";

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return <li role="presentation" aria-hidden="true" className={cn("[&>svg]:size-3.5", className)} {...props}>{children ?? <ChevronRight />}</li>;
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return <span role="presentation" aria-hidden="true" className={cn("grid size-8 place-items-center", className)} {...props}><MoreHorizontal className="size-4" /><span className="sr-only">More pages</span></span>;
}

export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
