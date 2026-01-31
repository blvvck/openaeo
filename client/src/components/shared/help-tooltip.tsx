import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HelpTooltipProps {
  /** Help text to display */
  content: React.ReactNode;
  /** Side of the trigger to show tooltip */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment relative to trigger */
  align?: "start" | "center" | "end";
  /** Icon size */
  iconSize?: number;
  /** Additional classes for the icon button */
  className?: string;
  /** Delay before showing (ms) */
  delayDuration?: number;
}

/**
 * HelpTooltip - Contextual help tooltip with "?" icon
 *
 * Uses Radix UI Tooltip for accessibility and positioning.
 * Supports rich content (text, links, etc).
 *
 * @example
 * <HelpTooltip content="This is helpful information about this feature." />
 *
 * @example
 * <HelpTooltip
 *   content={
 *     <>
 *       Learn more about <a href="/docs">visibility scores</a>.
 *     </>
 *   }
 * />
 */
export function HelpTooltip({
  content,
  side = "top",
  align = "center",
  iconSize = 14,
  className,
  delayDuration = 300,
}: HelpTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={delayDuration}>
        <TooltipPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center",
              "rounded-full p-0.5",
              "text-muted-foreground hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "transition-colors",
              className
            )}
            aria-label="Help"
          >
            <HelpCircle
              size={iconSize}
              className="opacity-70 hover:opacity-100 transition-opacity"
            />
          </button>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={5}
            className={cn(
              "z-50 overflow-hidden rounded-md",
              "bg-popover text-popover-foreground",
              "border border-border shadow-md",
              "px-3 py-2 text-sm max-w-[280px]",
              // Animation
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2",
              "data-[side=left]:slide-in-from-right-2",
              "data-[side=right]:slide-in-from-left-2",
              "data-[side=top]:slide-in-from-bottom-2"
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/**
 * HelpLabel - Label text with an inline help tooltip
 *
 * Convenience component for form labels with help text.
 *
 * @example
 * <HelpLabel
 *   label="Visibility Score"
 *   help="A score from 0-100 indicating how visible your brand is in AI responses."
 * />
 */
export interface HelpLabelProps {
  /** Label text */
  label: string;
  /** Help text for tooltip */
  help: React.ReactNode;
  /** Use htmlFor to associate with form control */
  htmlFor?: string;
  /** Additional classes */
  className?: string;
}

export function HelpLabel({ label, help, htmlFor, className }: HelpLabelProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
      ) : (
        <span className="text-sm font-medium">{label}</span>
      )}
      <HelpTooltip content={help} iconSize={12} />
    </div>
  );
}
