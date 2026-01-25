import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"



const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

interface TooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> {
  /** Maximum width for long content */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "none"
  /** Visual variant */
  variant?: "default" | "info" | "warning" | "error"
}

const maxWidthClasses = {
  sm: "max-w-[150px]",
  md: "max-w-[250px]",
  lg: "max-w-[350px]",
  xl: "max-w-[450px]",
  none: "",
}

const variantClasses = {
  default: "bg-popover text-popover-foreground border",
  info: "bg-info/10 text-info border-info/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
}

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(({ className, sideOffset = 4, maxWidth = "md", variant = "default", ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Base styles
      "z-50 overflow-hidden rounded-md px-3 py-1.5 text-sm shadow-md",
      // Variant styles
      variantClasses[variant],
      // Max width
      maxWidthClasses[maxWidth],
      // Animation (Radix handles the state)
      "animate-in fade-in-0 zoom-in-95",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
      // Slide based on side
      "data-[side=bottom]:slide-in-from-top-2",
      "data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2",
      "data-[side=top]:slide-in-from-bottom-2",
      // Transform origin for smooth scale
      "origin-[--radix-tooltip-content-transform-origin]",
      // Reduced motion
      "motion-reduce:animate-none",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * TooltipArrow Component
 *
 * Optional arrow pointing to the trigger.
 */
const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn("fill-popover", className)}
    {...props}
  />
))
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName

/**
 * SimpleTooltip Component
 *
 * A convenience wrapper for the common tooltip pattern.
 * Wraps children with tooltip that appears on hover/focus.
 */
interface SimpleTooltipProps {
  /** The element that triggers the tooltip */
  children: React.ReactNode
  /** Tooltip content (can be string or JSX) */
  content: React.ReactNode
  /** Tooltip placement */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment along the side */
  align?: "start" | "center" | "end"
  /** Delay before showing (ms) */
  delayDuration?: number
  /** Skip delay on consecutive tooltips */
  skipDelayDuration?: number
  /** Disable the tooltip */
  disabled?: boolean
  /** Open state for controlled mode */
  open?: boolean
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void
  /** Visual variant */
  variant?: "default" | "info" | "warning" | "error"
  /** Maximum width */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "none"
  /** Additional content className */
  contentClassName?: string
}

function SimpleTooltip({
  children,
  content,
  side = "top",
  align = "center",
  delayDuration = 200,
  skipDelayDuration = 100,
  disabled = false,
  open,
  onOpenChange,
  variant = "default",
  maxWidth = "md",
  contentClassName,
}: SimpleTooltipProps) {
  if (disabled) {
    return <>{children}</>
  }

  return (
    <TooltipProvider delayDuration={delayDuration} skipDelayDuration={skipDelayDuration}>
      <Tooltip open={open} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          variant={variant}
          maxWidth={maxWidth}
          className={contentClassName}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * HelpTooltip Component
 *
 * A small help icon with tooltip, common pattern for form hints.
 */
interface HelpTooltipProps extends Omit<SimpleTooltipProps, "children"> {
  /** Optional custom icon (defaults to question mark circle) */
  icon?: React.ReactNode
  /** Size of the icon */
  iconSize?: "sm" | "default" | "lg"
  /** Icon wrapper className */
  iconClassName?: string
}

function HelpTooltip({
  icon,
  iconSize = "default",
  iconClassName,
  ...tooltipProps
}: HelpTooltipProps) {
  const sizeClasses = {
    sm: "w-3.5 h-3.5",
    default: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <SimpleTooltip {...tooltipProps}>
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center rounded-full text-muted-foreground",
          "hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          iconClassName
        )}
        aria-label="Help"
      >
        {icon || (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={sizeClasses[iconSize]}
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </svg>
        )}
      </button>
    </SimpleTooltip>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipArrow,
  SimpleTooltip,
  HelpTooltip,
}
