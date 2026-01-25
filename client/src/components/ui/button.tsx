import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"



type ButtonVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
type ButtonSize = "sm" | "default" | "lg" | "icon" | "icon-sm" | "icon-lg";

const buttonSurface: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-sm dark:hover:bg-primary/85",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/70",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-sm dark:hover:bg-destructive/85",
  outline: "border border-input bg-background hover:border-accent hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/80",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonDimensions: Record<ButtonSize, string> = {
  sm: "h-9 rounded-md px-3 text-xs",
  default: "h-10 px-4 py-2",
  lg: "h-11 rounded-md px-6 text-base",
  icon: "h-10 w-10 p-0",
  "icon-sm": "h-9 w-9 p-0",
  "icon-lg": "h-11 w-11 p-0",
};

type ButtonVariantOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
};

function buttonVariants({ variant = "default", size = "default", loading = false, className }: ButtonVariantOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
    buttonSurface[variant],
    buttonDimensions[size],
    loading && "pointer-events-none animate-pulse",
    className,
  );
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Render as a different element (e.g., Link) */
  asChild?: boolean
  /** Show loading spinner and disable button */
  isLoading?: boolean
  /** Text to show while loading (optional) */
  loadingText?: string
  /** Prevent double-clicks (debounce in ms, default 300ms) */
  debounce?: number | boolean
  /** Icon to show before text */
  leftIcon?: React.ReactNode
  /** Icon to show after text */
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      asChild = false,
      isLoading,
      loadingText,
      debounce = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      onClick,
      type = "button",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const showLoading = Boolean(isLoading || loading)

    // Double-click prevention state
    const [isDebouncing, setIsDebouncing] = React.useState(false)
    const debounceMs = typeof debounce === "number" ? debounce : debounce ? 300 : 0

    // Handle click with debounce
    const handleClick = React.useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        // Prevent double-click if debounce is enabled
        if (debounceMs > 0 && isDebouncing) {
          event.preventDefault()
          return
        }

        // Set debouncing state
        if (debounceMs > 0) {
          setIsDebouncing(true)
          setTimeout(() => setIsDebouncing(false), debounceMs)
        }

        // Call original onClick
        onClick?.(event)
      },
      [onClick, debounceMs, isDebouncing]
    )

    // Determine if button should be disabled
    const isDisabled = disabled || showLoading || isDebouncing

    // Determine icon size based on button size
    const isIconOnly = size === "icon" || size === "icon-sm" || size === "icon-lg"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading: showLoading, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={showLoading || undefined}
        aria-disabled={isDisabled || undefined}
        onClick={handleClick}
        type={type}
        {...props}
      >
        {showLoading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            {!isIconOnly && <span>{loadingText || children}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
