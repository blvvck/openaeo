

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button, ButtonProps } from "./button"
import { Skeleton, SkeletonText, SkeletonCard } from "./skeleton"
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion"

// ===== Loading Spinner =====

const spinnerVariants = cva(
  "animate-spin",
  {
    variants: {
      size: {
        xs: "w-3 h-3",
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
        xl: "w-12 h-12",
      },
      color: {
        default: "text-muted-foreground",
        primary: "text-primary",
        secondary: "text-secondary",
        white: "text-white",
        current: "text-current",
      },
    },
    defaultVariants: {
      size: "md",
      color: "default",
    },
  }
)

export interface LoadingSpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "color">,
    VariantProps<typeof spinnerVariants> {
  /** Accessible label */
  label?: string
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size, color, label = "Loading", className, ...props }, ref) => {
    const reducedMotion = prefersReducedMotion()

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn("inline-flex", className)}
        {...props}
      >
        <Loader2
          className={cn(
            spinnerVariants({ size, color }),
            reducedMotion && "animate-none"
          )}
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </div>
    )
  }
)
LoadingSpinner.displayName = "LoadingSpinner"

// ===== Loading Dots =====

export interface LoadingDotsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of dots */
  size?: "sm" | "md" | "lg"
  /** Color of dots */
  color?: "default" | "primary" | "white"
  /** Accessible label */
  label?: string
}

const dotSizes = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-3 h-3",
}

const dotColors = {
  default: "bg-muted-foreground",
  primary: "bg-primary",
  white: "bg-white",
}

const LoadingDots = React.forwardRef<HTMLDivElement, LoadingDotsProps>(
  ({ size = "md", color = "default", label = "Loading", className, ...props }, ref) => {
    const reducedMotion = prefersReducedMotion()

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn("inline-flex items-center gap-1", className)}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "rounded-full",
              dotSizes[size],
              dotColors[color],
              !reducedMotion && "animate-bounce",
            )}
            style={{
              animationDelay: reducedMotion ? undefined : `${i * 0.15}s`,
              animationDuration: "0.6s",
            }}
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    )
  }
)
LoadingDots.displayName = "LoadingDots"

// ===== Loading Bar =====

export interface LoadingBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value (0-100), undefined for indeterminate */
  progress?: number
  /** Height of the bar */
  height?: "sm" | "md" | "lg"
  /** Show percentage text */
  showPercentage?: boolean
  /** Accessible label */
  label?: string
}

const barHeights = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
}

const LoadingBar = React.forwardRef<HTMLDivElement, LoadingBarProps>(
  (
    {
      progress,
      height = "md",
      showPercentage = false,
      label = "Loading",
      className,
      ...props
    },
    ref
  ) => {
    const isIndeterminate = progress === undefined
    const reducedMotion = prefersReducedMotion()

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        <div
          role="progressbar"
          aria-label={label}
          aria-valuenow={isIndeterminate ? undefined : progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className={cn(
            "w-full overflow-hidden rounded-full bg-muted",
            barHeights[height]
          )}
        >
          <div
            className={cn(
              "h-full bg-primary rounded-full transition-all duration-300",
              isIndeterminate && !reducedMotion && "animate-[indeterminate_1.5s_ease-in-out_infinite]"
            )}
            style={{
              width: isIndeterminate ? "30%" : `${progress}%`,
              ...(isIndeterminate && reducedMotion ? { width: "50%" } : {}),
            }}
          />
        </div>
        {showPercentage && !isIndeterminate && (
          <span className="mt-1 text-xs text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>
    )
  }
)
LoadingBar.displayName = "LoadingBar"

// ===== Loading Overlay =====

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the overlay is visible */
  isLoading: boolean
  /** Loading message */
  message?: string
  /** Spinner size */
  spinnerSize?: "sm" | "md" | "lg" | "xl"
  /** Overlay opacity */
  opacity?: "light" | "medium" | "heavy"
  /** Whether to blur the background */
  blur?: boolean
  /** Whether to cover the full screen */
  fullScreen?: boolean
  /** Z-index */
  zIndex?: number
}

const overlayOpacity = {
  light: "bg-background/50",
  medium: "bg-background/70",
  heavy: "bg-background/90",
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      isLoading,
      message,
      spinnerSize = "lg",
      opacity = "medium",
      blur = true,
      fullScreen = false,
      zIndex = 50,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className={cn(
                "flex flex-col items-center justify-center gap-3",
                fullScreen ? "fixed inset-0" : "absolute inset-0",
                overlayOpacity[opacity],
                blur && "backdrop-blur-sm"
              )}
              style={{ zIndex }}
              role="status"
              aria-live="polite"
            >
              <LoadingSpinner size={spinnerSize} color="primary" />
              {message && (
                <p className="text-sm text-muted-foreground font-medium">
                  {message}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
LoadingOverlay.displayName = "LoadingOverlay"

// ===== Loading Button =====

export interface LoadingButtonProps extends ButtonProps {
  /** Whether the button is loading */
  isLoading?: boolean
  /** Loading text (replaces children when loading) */
  loadingText?: string
  /** Spinner position */
  spinnerPosition?: "left" | "right"
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  (
    {
      isLoading = false,
      loadingText,
      spinnerPosition = "left",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? (
          <>
            {spinnerPosition === "left" && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            <span>{loadingText || children}</span>
            {spinnerPosition === "right" && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" aria-hidden="true" />
            )}
          </>
        ) : (
          children
        )}
      </Button>
    )
  }
)
LoadingButton.displayName = "LoadingButton"

// ===== Loading Card =====

export interface LoadingCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Card width */
  width?: string | number
  /** Show header skeleton */
  showHeader?: boolean
  /** Show image skeleton */
  showImage?: boolean
  /** Image height */
  imageHeight?: number
  /** Number of body lines */
  bodyLines?: number
  /** Show footer skeleton */
  showFooter?: boolean
  /** Animation type */
  animation?: "pulse" | "shimmer" | "none"
}

const LoadingCard = React.forwardRef<HTMLDivElement, LoadingCardProps>(
  (
    {
      width,
      showHeader = true,
      showImage = false,
      imageHeight = 200,
      bodyLines = 3,
      showFooter = false,
      animation = "pulse",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <SkeletonCard
        ref={ref}
        width={width}
        showHeader={showHeader}
        showImage={showImage}
        imageHeight={imageHeight}
        bodyLines={bodyLines}
        showFooter={showFooter}
        animation={animation}
        className={className}
        {...props}
      />
    )
  }
)
LoadingCard.displayName = "LoadingCard"

// ===== Loading Page =====

export interface LoadingPageProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Loading message */
  message?: string
  /** Show logo/brand */
  showLogo?: boolean
  /** Logo element */
  logo?: React.ReactNode
  /** Whether to show progress bar */
  showProgress?: boolean
  /** Progress value */
  progress?: number
}

const LoadingPage = React.forwardRef<HTMLDivElement, LoadingPageProps>(
  (
    {
      message = "Loading...",
      showLogo = false,
      logo,
      showProgress = false,
      progress,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "min-h-screen flex flex-col items-center justify-center gap-4 bg-background",
          className
        )}
        role="status"
        aria-live="polite"
        {...props}
      >
        {showLogo && (
          <div className="mb-4">
            {logo || (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              </div>
            )}
          </div>
        )}
        <LoadingSpinner size="xl" color="primary" />
        <p className="text-muted-foreground font-medium">{message}</p>
        {showProgress && (
          <div className="w-64">
            <LoadingBar progress={progress} showPercentage />
          </div>
        )}
      </div>
    )
  }
)
LoadingPage.displayName = "LoadingPage"

// ===== Loading Inline =====

export interface LoadingInlineProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Loading text */
  text?: string
  /** Spinner size */
  size?: "xs" | "sm" | "md"
}

const LoadingInline = React.forwardRef<HTMLSpanElement, LoadingInlineProps>(
  ({ text = "Loading...", size = "sm", className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}
        role="status"
        {...props}
      >
        <LoadingSpinner size={size} color="current" label={text} />
        <span className="text-sm">{text}</span>
      </span>
    )
  }
)
LoadingInline.displayName = "LoadingInline"

// ===== Loading Skeleton List =====

export interface LoadingSkeletonListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of items */
  count?: number
  /** Item height */
  itemHeight?: number
  /** Gap between items */
  gap?: number
  /** Show avatar */
  showAvatar?: boolean
  /** Animation type */
  animation?: "pulse" | "shimmer" | "none"
}

const LoadingSkeletonList = React.forwardRef<HTMLDivElement, LoadingSkeletonListProps>(
  (
    {
      count = 5,
      itemHeight = 64,
      gap = 12,
      showAvatar = true,
      animation = "pulse",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col", className)}
        style={{ gap }}
        role="status"
        aria-label="Loading list..."
        {...props}
      >
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3"
            style={{ height: itemHeight }}
          >
            {showAvatar && (
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                animation={animation}
                aria-hidden="true"
              />
            )}
            <div className="flex-1 space-y-2">
              <Skeleton
                variant="text"
                width={`${60 + Math.random() * 20}%`}
                height={14}
                animation={animation}
                aria-hidden="true"
              />
              <Skeleton
                variant="text"
                width={`${40 + Math.random() * 20}%`}
                height={12}
                animation={animation}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
    )
  }
)
LoadingSkeletonList.displayName = "LoadingSkeletonList"

// ===== useLoadingState Hook =====

export interface UseLoadingStateOptions {
  /** Initial loading state */
  initialLoading?: boolean
  /** Minimum loading time in ms (prevents flash) */
  minLoadingTime?: number
}

export interface UseLoadingStateReturn {
  /** Whether currently loading */
  isLoading: boolean
  /** Error that occurred */
  error: Error | null
  /** Start loading */
  startLoading: () => void
  /** Stop loading with success */
  stopLoading: () => void
  /** Stop loading with error */
  setError: (error: Error) => void
  /** Clear error */
  clearError: () => void
  /** Reset to initial state */
  reset: () => void
  /** Execute async function with loading state */
  withLoading: <T>(fn: () => Promise<T>) => Promise<T | undefined>
}

export function useLoadingState(
  options: UseLoadingStateOptions = {}
): UseLoadingStateReturn {
  const { initialLoading = false, minLoadingTime = 0 } = options

  const [isLoading, setIsLoading] = React.useState(initialLoading)
  const [error, setErrorState] = React.useState<Error | null>(null)
  const loadingStartTime = React.useRef<number | null>(null)

  const startLoading = React.useCallback(() => {
    loadingStartTime.current = Date.now()
    setIsLoading(true)
    setErrorState(null)
  }, [])

  const stopLoading = React.useCallback(() => {
    if (minLoadingTime > 0 && loadingStartTime.current) {
      const elapsed = Date.now() - loadingStartTime.current
      if (elapsed < minLoadingTime) {
        setTimeout(() => {
          setIsLoading(false)
        }, minLoadingTime - elapsed)
        return
      }
    }
    setIsLoading(false)
  }, [minLoadingTime])

  const setError = React.useCallback((err: Error) => {
    setErrorState(err)
    setIsLoading(false)
  }, [])

  const clearError = React.useCallback(() => {
    setErrorState(null)
  }, [])

  const reset = React.useCallback(() => {
    setIsLoading(initialLoading)
    setErrorState(null)
    loadingStartTime.current = null
  }, [initialLoading])

  const withLoading = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      startLoading()
      try {
        const result = await fn()
        stopLoading()
        return result
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        return undefined
      }
    },
    [startLoading, stopLoading, setError]
  )

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError,
    clearError,
    reset,
    withLoading,
  }
}

// ===== CSS Utility Classes =====

export const loadingClasses = {
  /** Pulse animation */
  pulse: "animate-pulse",
  /** Spin animation */
  spin: "animate-spin",
  /** Bounce animation */
  bounce: "animate-bounce",
  /** Shimmer effect */
  shimmer: "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
  /** Overlay backdrop */
  overlay: "fixed inset-0 bg-background/70 backdrop-blur-sm z-50",
  /** Center content */
  center: "flex items-center justify-center",
}

// ===== Add indeterminate keyframes to global styles note =====
// Add this to your global CSS:
// @keyframes indeterminate {
//   0% { transform: translateX(-100%); }
//   50% { transform: translateX(0%); }
//   100% { transform: translateX(100%); }
// }

// ===== Exports =====

export {
  LoadingSpinner,
  spinnerVariants,
  LoadingDots,
  LoadingBar,
  LoadingOverlay,
  LoadingButton,
  LoadingCard,
  LoadingPage,
  LoadingInline,
  LoadingSkeletonList,
}
