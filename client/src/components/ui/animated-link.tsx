import * as React from "react";
import { cn } from "@/lib/utils";

export interface AnimatedLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Animation variant: 'left' slides from left, 'center' from center, 'grow' scales up */
  variant?: "left" | "center" | "grow";
  /** External link opens in new tab */
  external?: boolean;
}

/**
 * AnimatedLink - Link with animated underline on hover
 *
 * Uses CSS transitions for smooth underline animation.
 * Respects prefers-reduced-motion via animation tokens.
 */
const AnimatedLink = React.forwardRef<HTMLAnchorElement, AnimatedLinkProps>(
  ({ className, variant = "left", external, children, ...props }, ref) => {
    const variantClass = {
      left: "link-animated",
      center: "link-animated link-animated-center",
      grow: "link-animated-grow",
    }[variant];

    return (
      <a
        ref={ref}
        className={cn(variantClass, className)}
        {...(external && {
          target: "_blank",
          rel: "noopener noreferrer",
        })}
        {...props}
      >
        {children}
      </a>
    );
  }
);
AnimatedLink.displayName = "AnimatedLink";

export { AnimatedLink };
