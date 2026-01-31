

import * as React from "react"
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion"
import { RefreshCw, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { DURATION, SPRING, prefersReducedMotion } from "@/lib/motion"

// ===== Types =====

export interface UsePullToRefreshOptions {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void> | void
  /** Pull distance threshold to trigger refresh (default: 80) */
  threshold?: number
  /** Maximum pull distance (default: 150) */
  maxPullDistance?: number
  /** Resistance factor for pull (0-1, default: 0.5) */
  resistance?: number
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean
}

export interface UsePullToRefreshReturn {
  /** Whether currently refreshing */
  isRefreshing: boolean
  /** Whether currently pulling */
  isPulling: boolean
  /** Current pull distance in pixels */
  pullDistance: number
  /** Progress toward threshold (0-1) */
  pullProgress: number
  /** Whether threshold is reached */
  isThresholdReached: boolean
  /** Ref to attach to the scrollable container */
  containerRef: React.RefObject<HTMLDivElement>
  /** Touch/mouse event handlers */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
    onMouseDown: (e: React.MouseEvent) => void
    onMouseMove: (e: React.MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
  }
}

// ===== usePullToRefresh Hook =====

export function usePullToRefresh(
  options: UsePullToRefreshOptions
): UsePullToRefreshReturn {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 150,
    resistance = 0.5,
    disabled = false,
  } = options

  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [isPulling, setIsPulling] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const startY = React.useRef(0)
  const currentY = React.useRef(0)
  const isDragging = React.useRef(false)

  // Calculate progress (0-1)
  const pullProgress = Math.min(pullDistance / threshold, 1)
  const isThresholdReached = pullDistance >= threshold

  // Apply resistance to pull distance
  const calculateResistance = React.useCallback(
    (distance: number): number => {
      if (distance <= 0) return 0
      // Apply diminishing returns as you pull further
      const factor = 1 - Math.min(distance / maxPullDistance, 1) * (1 - resistance)
      return Math.min(distance * factor, maxPullDistance)
    },
    [maxPullDistance, resistance]
  )

  // Check if container is at the top
  const isAtTop = React.useCallback((): boolean => {
    if (!containerRef.current) return true
    return containerRef.current.scrollTop <= 0
  }, [])

  // Handle refresh trigger
  const handleRefresh = React.useCallback(async () => {
    if (isRefreshing || disabled) return

    setIsRefreshing(true)
    setPullDistance(threshold) // Keep indicator visible during refresh

    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
    }
  }, [isRefreshing, disabled, onRefresh, threshold])

  // Touch handlers
  const handleTouchStart = React.useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || !isAtTop()) return

      startY.current = e.touches[0].clientY
      isDragging.current = true
      setIsPulling(true)
    },
    [disabled, isRefreshing, isAtTop]
  )

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current || disabled || isRefreshing) return

      currentY.current = e.touches[0].clientY
      const rawDistance = currentY.current - startY.current

      if (rawDistance > 0 && isAtTop()) {
        // Prevent default only when pulling down at top
        e.preventDefault()
        const resistedDistance = calculateResistance(rawDistance)
        setPullDistance(resistedDistance)
      } else if (rawDistance <= 0) {
        // Allow normal scrolling
        setPullDistance(0)
      }
    },
    [disabled, isRefreshing, isAtTop, calculateResistance]
  )

  const handleTouchEnd = React.useCallback(() => {
    if (!isDragging.current) return

    isDragging.current = false
    setIsPulling(false)

    if (isThresholdReached && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }, [isThresholdReached, isRefreshing, handleRefresh])

  // Mouse handlers (for desktop testing)
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      if (disabled || isRefreshing || !isAtTop()) return

      startY.current = e.clientY
      isDragging.current = true
      setIsPulling(true)
    },
    [disabled, isRefreshing, isAtTop]
  )

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current || disabled || isRefreshing) return

      currentY.current = e.clientY
      const rawDistance = currentY.current - startY.current

      if (rawDistance > 0 && isAtTop()) {
        e.preventDefault()
        const resistedDistance = calculateResistance(rawDistance)
        setPullDistance(resistedDistance)
      } else if (rawDistance <= 0) {
        setPullDistance(0)
      }
    },
    [disabled, isRefreshing, isAtTop, calculateResistance]
  )

  const handleMouseUp = React.useCallback(() => {
    if (!isDragging.current) return

    isDragging.current = false
    setIsPulling(false)

    if (isThresholdReached && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }, [isThresholdReached, isRefreshing, handleRefresh])

  const handleMouseLeave = React.useCallback(() => {
    if (isDragging.current) {
      isDragging.current = false
      setIsPulling(false)
      if (!isRefreshing) {
        setPullDistance(0)
      }
    }
  }, [isRefreshing])

  return {
    isRefreshing,
    isPulling,
    pullDistance,
    pullProgress,
    isThresholdReached,
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
    },
  }
}

// ===== RefreshIndicator Component =====

export interface RefreshIndicatorProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Current pull distance */
  pullDistance: number
  /** Progress toward threshold (0-1) */
  pullProgress: number
  /** Whether threshold is reached */
  isThresholdReached: boolean
  /** Whether currently refreshing */
  isRefreshing: boolean
  /** Size of the indicator (default: 40) */
  size?: number
  /** Color when pulling */
  pullColor?: string
  /** Color when threshold reached */
  thresholdColor?: string
  /** Color when refreshing */
  refreshingColor?: string
}

const RefreshIndicator = React.forwardRef<HTMLDivElement, RefreshIndicatorProps>(
  (
    {
      pullDistance,
      pullProgress,
      isThresholdReached,
      isRefreshing,
      size = 40,
      pullColor = "text-muted-foreground",
      thresholdColor = "text-primary",
      refreshingColor = "text-primary",
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    // Spring-animated values for smooth transitions
    const springConfig = { stiffness: 300, damping: 30 }
    const animatedProgress = useSpring(pullProgress, springConfig)
    const animatedRotation = useTransform(animatedProgress, [0, 1], [0, 180])
    const animatedScale = useTransform(animatedProgress, [0, 0.5, 1], [0.5, 0.8, 1])

    // Determine current color based on state
    const currentColor = isRefreshing
      ? refreshingColor
      : isThresholdReached
        ? thresholdColor
        : pullColor

    // SVG circle properties for progress ring
    const strokeWidth = 3
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference * (1 - pullProgress)

    if (pullDistance <= 0 && !isRefreshing) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center",
          className
        )}
        style={{
          width: size,
          height: size,
        }}
        role="status"
        aria-label={isRefreshing ? "Refreshing" : isThresholdReached ? "Release to refresh" : "Pull to refresh"}
        {...props}
      >
        {isRefreshing ? (
          // Spinning refresh icon when refreshing
          <motion.div
            animate={reducedMotion ? {} : { rotate: 360 }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <RefreshCw
              className={cn("transition-colors", currentColor)}
              size={size * 0.6}
              aria-hidden="true"
            />
          </motion.div>
        ) : (
          // Progress ring with arrow when pulling
          <div className="relative">
            {/* Progress ring */}
            <svg
              width={size}
              height={size}
              className={cn("transition-colors", currentColor)}
            >
              {/* Background circle */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                opacity={0.2}
              />
              {/* Progress circle */}
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                style={{
                  strokeDashoffset: reducedMotion ? strokeDashoffset : undefined,
                  rotate: -90,
                  transformOrigin: "center",
                }}
                animate={
                  reducedMotion
                    ? {}
                    : { strokeDashoffset }
                }
                transition={{ duration: DURATION.fast }}
              />
            </svg>
            {/* Arrow icon in center */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={reducedMotion ? {} : { rotate: animatedRotation, scale: animatedScale }}
            >
              <ArrowDown
                size={size * 0.4}
                className={cn(
                  "transition-colors",
                  isThresholdReached && "rotate-180",
                  currentColor
                )}
                aria-hidden="true"
              />
            </motion.div>
          </div>
        )}
      </div>
    )
  }
)
RefreshIndicator.displayName = "RefreshIndicator"

// ===== PullToRefresh Component =====

export interface PullToRefreshProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Callback when refresh is triggered */
  onRefresh: () => Promise<void> | void
  /** Pull distance threshold to trigger refresh (default: 80) */
  threshold?: number
  /** Maximum pull distance (default: 150) */
  maxPullDistance?: number
  /** Resistance factor for pull (0-1, default: 0.5) */
  resistance?: number
  /** Whether pull-to-refresh is disabled */
  disabled?: boolean
  /** Custom refresh indicator */
  indicator?: React.ReactNode
  /** Indicator size (default: 40) */
  indicatorSize?: number
  /** Pull color */
  pullColor?: string
  /** Threshold color */
  thresholdColor?: string
  /** Refreshing color */
  refreshingColor?: string
  /** Whether to show default indicator */
  showIndicator?: boolean
}

const PullToRefresh = React.forwardRef<HTMLDivElement, PullToRefreshProps>(
  (
    {
      onRefresh,
      threshold = 80,
      maxPullDistance = 150,
      resistance = 0.5,
      disabled = false,
      indicator,
      indicatorSize = 40,
      pullColor,
      thresholdColor,
      refreshingColor,
      showIndicator = true,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    const {
      isRefreshing,
      isPulling,
      pullDistance,
      pullProgress,
      isThresholdReached,
      containerRef,
      handlers,
    } = usePullToRefresh({
      onRefresh,
      threshold,
      maxPullDistance,
      resistance,
      disabled,
    })

    // Merge refs
    const mergedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        // Update containerRef
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node
        // Update forwarded ref
        if (typeof ref === "function") {
          ref(node)
        } else if (ref) {
          ref.current = node
        }
      },
      [containerRef, ref]
    )

    // Calculate indicator offset (negative when not pulling)
    const indicatorOffset = Math.max(pullDistance - indicatorSize / 2, -indicatorSize)

    return (
      <div
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        {/* Refresh indicator */}
        {showIndicator && (
          <AnimatePresence>
            {(pullDistance > 0 || isRefreshing) && (
              <motion.div
                className="absolute left-0 right-0 flex justify-center z-10"
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -indicatorSize }}
                animate={{
                  opacity: 1,
                  y: indicatorOffset,
                }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -indicatorSize }}
                transition={
                  isPulling
                    ? { duration: 0 } // Immediate during pull
                    : reducedMotion
                      ? { duration: DURATION.fast }
                      : SPRING.snappy
                }
              >
                {indicator || (
                  <RefreshIndicator
                    pullDistance={pullDistance}
                    pullProgress={pullProgress}
                    isThresholdReached={isThresholdReached}
                    isRefreshing={isRefreshing}
                    size={indicatorSize}
                    pullColor={pullColor}
                    thresholdColor={thresholdColor}
                    refreshingColor={refreshingColor}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Scrollable content container */}
        <motion.div
          ref={mergedRef}
          className="h-full overflow-auto touch-pan-y"
          style={{
            transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          }}
          animate={
            !isPulling && !isRefreshing
              ? { y: 0 }
              : {}
          }
          transition={reducedMotion ? { duration: DURATION.fast } : SPRING.snappy}
          {...handlers}
          data-pulling={isPulling || undefined}
          data-refreshing={isRefreshing || undefined}
          data-threshold-reached={isThresholdReached || undefined}
        >
          {children}
        </motion.div>
      </div>
    )
  }
)
PullToRefresh.displayName = "PullToRefresh"

// ===== CSS Utility Classes =====

export const pullToRefreshClasses = {
  /** Container styles */
  container: "relative overflow-hidden",
  /** Scrollable content */
  content: "h-full overflow-auto touch-pan-y",
  /** Indicator container */
  indicator: "absolute left-0 right-0 flex justify-center z-10",
  /** Pulling state */
  pulling: "cursor-grabbing",
  /** Threshold reached state */
  thresholdReached: "scale-110",
  /** Refreshing state spinner */
  refreshingSpinner: "animate-spin",
}

// ===== Animation Variants =====

export const pullToRefreshVariants = {
  /** Indicator enter/exit */
  indicator: {
    hidden: { opacity: 0, y: -40 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -40 },
  },
  /** Content translation during pull */
  content: {
    rest: { y: 0 },
    pulling: (pullDistance: number) => ({ y: pullDistance }),
  },
  /** Spinner rotation */
  spinner: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      },
    },
  },
}

// ===== Exports =====

export { RefreshIndicator, PullToRefresh }
