import * as React from "react"

import { cn } from "@/lib/utils"


type BadgeVariant = "default" | "secondary" | "success" | "warning" | "error" | "destructive" | "info" | "neutral" | "outline" | "platform";
type BadgeSize = "sm" | "default" | "lg";

const badgeStyles: Record<BadgeVariant, string> = {
  default: "border border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  success: "border border-success/30 bg-success/15 text-success dark:border-success/40 dark:bg-success/20",
  warning: "border border-warning/30 bg-warning/15 text-warning dark:border-warning/40 dark:bg-warning/20",
  error: "border border-destructive/30 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
  destructive: "border border-destructive/30 bg-destructive/15 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
  info: "border border-info/30 bg-info/15 text-info dark:border-info/40 dark:bg-info/20",
  neutral: "border border-border bg-muted text-muted-foreground",
  outline: "border border-border bg-transparent text-foreground hover:bg-accent",
  platform: [
    "border border-transparent",
    "data-[platform=chatgpt]:border-[#10A37F]/30 data-[platform=chatgpt]:bg-[#10A37F]/15 data-[platform=chatgpt]:text-[#10A37F]",
    "data-[platform=claude]:border-[#D97706]/30 data-[platform=claude]:bg-[#D97706]/15 data-[platform=claude]:text-[#D97706]",
    "data-[platform=gemini]:border-[#4285F4]/30 data-[platform=gemini]:bg-[#4285F4]/15 data-[platform=gemini]:text-[#4285F4]",
    "data-[platform=perplexity]:border-[#20B2AA]/30 data-[platform=perplexity]:bg-[#20B2AA]/15 data-[platform=perplexity]:text-[#20B2AA]",
    "data-[platform=copilot]:border-[#0078D4]/30 data-[platform=copilot]:bg-[#0078D4]/15 data-[platform=copilot]:text-[#0078D4]",
    "data-[platform=llama]:border-[#0467DF]/30 data-[platform=llama]:bg-[#0467DF]/15 data-[platform=llama]:text-[#0467DF]",
    "data-[platform=mistral]:border-[#FF7000]/30 data-[platform=mistral]:bg-[#FF7000]/15 data-[platform=mistral]:text-[#FF7000]",
    "data-[platform=grok]:border-foreground/30 data-[platform=grok]:bg-[#000000]/15 data-[platform=grok]:text-foreground",
  ].join(" "),
};

const badgeDimensions: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  default: "px-2.5 py-0.5 text-xs",
  lg: "px-3 py-1 text-sm",
};

type BadgeVariantOptions = { variant?: BadgeVariant; size?: BadgeSize; interactive?: boolean; className?: string };

function badgeVariants({ variant = "default", size = "default", interactive = false, className }: BadgeVariantOptions = {}) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    badgeStyles[variant],
    badgeDimensions[size],
    interactive && "cursor-pointer active:scale-95",
    className,
  );
}

type Platform = "chatgpt" | "claude" | "gemini" | "perplexity" | "copilot" | "llama" | "mistral" | "grok"

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  interactive?: boolean;
  /** Icon to display before text */
  icon?: React.ReactNode
  /** Platform name for platform variant */
  platform?: Platform
  /** Show status indicator dot */
  showDot?: boolean
  /** Dot color (inherits from variant if not specified) */
  dotColor?: "success" | "warning" | "error" | "info" | "neutral"
  /** Make badge a button (for interactive badges) */
  asButton?: boolean
  /** onClick handler (automatically sets interactive=true) */
  onClick?: React.MouseEventHandler<HTMLDivElement | HTMLButtonElement>
}

function Badge({
  className,
  variant,
  size,
  interactive,
  icon,
  platform,
  showDot,
  dotColor,
  asButton = false,
  onClick,
  children,
  ...props
}: BadgeProps) {
  // Auto-enable interactive mode if onClick is provided
  const isInteractive = interactive ?? Boolean(onClick)

  // Determine dot color based on variant or explicit dotColor
  const getDotColorClass = () => {
    if (dotColor) {
      const colors = {
        success: "bg-success",
        warning: "bg-warning",
        error: "bg-destructive",
        info: "bg-info",
        neutral: "bg-muted-foreground",
      }
      return colors[dotColor]
    }
    // Inherit from variant
    if (variant === "success") return "bg-success"
    if (variant === "warning") return "bg-warning"
    if (variant === "error" || variant === "destructive") return "bg-destructive"
    if (variant === "info") return "bg-info"
    return "bg-current"
  }

  const content = (
    <>
      {/* Status dot */}
      {showDot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            getDotColorClass()
          )}
          aria-hidden="true"
        />
      )}
      {/* Icon */}
      {icon && (
        <span className="shrink-0 [&>svg]:w-3 [&>svg]:h-3" aria-hidden="true">
          {icon}
        </span>
      )}
      {/* Text */}
      {children}
    </>
  )

  const sharedClassName = cn(badgeVariants({ variant, size, interactive: isInteractive }), className)
  const platformData = variant === "platform" ? platform : undefined

  // Render as button if asButton is true or has onClick
  if (asButton || onClick) {
    // Extract only the props safe for button elements
    const { role, tabIndex, title, id, style, hidden, "aria-label": ariaLabel, "aria-describedby": ariaDescribedby, ...rest } = props
    return (
      <button
        type="button"
        onClick={onClick}
        className={sharedClassName}
        data-platform={platformData}
        role={role}
        tabIndex={tabIndex}
        title={title}
        id={id}
        style={style}
        hidden={hidden}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedby}
      >
        {content}
      </button>
    )
  }

  const sharedProps = {
    className: sharedClassName,
    "data-platform": platformData,
    ...props,
  }

  return (
    <div {...sharedProps}>
      {content}
    </div>
  )
}

/**
 * StatusIndicator Component
 *
 * A simple status dot with optional label for inline status display.
 */
export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status type determines color */
  status: "online" | "offline" | "busy" | "away" | "success" | "warning" | "error" | "neutral"
  /** Size of the indicator */
  size?: "sm" | "default" | "lg"
  /** Optional label text */
  label?: string
  /** Pulse animation for "live" statuses */
  pulse?: boolean
}

function StatusIndicator({
  status,
  size = "default",
  label,
  pulse = false,
  className,
  ...props
}: StatusIndicatorProps) {
  const statusColors = {
    online: "bg-success",
    success: "bg-success",
    offline: "bg-muted-foreground",
    neutral: "bg-muted-foreground",
    busy: "bg-destructive",
    error: "bg-destructive",
    away: "bg-warning",
    warning: "bg-warning",
  }

  const sizeClasses = {
    sm: "w-1.5 h-1.5",
    default: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  }

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <span
        className={cn(
          "rounded-full shrink-0",
          sizeClasses[size],
          statusColors[status],
          pulse && "animate-pulse"
        )}
        role="status"
        aria-label={label || status}
      />
      {label && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </span>
  )
}

export { Badge, badgeVariants, StatusIndicator }
