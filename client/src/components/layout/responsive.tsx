import * as React from "react"

import { cn } from "@/lib/utils"
import {
  useBreakpoint,
  useMediaQuery,
  BREAKPOINTS,
  type DeviceType,
  type BreakpointKey,
} from "@/hooks/use-breakpoint"



// ===== Show/Hide Components =====

interface ShowProps {
  /** Show on/above this breakpoint */
  above?: BreakpointKey
  /** Show below this breakpoint */
  below?: BreakpointKey
  /** Show only on specific device types */
  on?: DeviceType | DeviceType[]
  /** Children to render */
  children: React.ReactNode
  /** Fallback content when hidden */
  fallback?: React.ReactNode
}

/**
 * Show - Conditionally renders children based on breakpoint.
 *
 * @example
 * // Show only on desktop
 * <Show above="lg">Desktop content</Show>
 *
 * // Show only on mobile
 * <Show below="md">Mobile content</Show>
 *
 * // Show on tablet and desktop
 * <Show on={["tablet", "desktop"]}>Tablet+ content</Show>
 */
export function Show({
  above,
  below,
  on,
  children,
  fallback = null,
}: ShowProps) {
  const { device, isAbove, isBelow } = useBreakpoint()

  // Determine if we should show
  let shouldShow = true

  if (above) {
    shouldShow = shouldShow && isAbove(above)
  }

  if (below) {
    shouldShow = shouldShow && isBelow(below)
  }

  if (on) {
    const devices = Array.isArray(on) ? on : [on]
    shouldShow = shouldShow && devices.includes(device)
  }

  return <>{shouldShow ? children : fallback}</>
}

/**
 * Hide - Opposite of Show.
 */
export function Hide({
  above,
  below,
  on,
  children,
  fallback = null,
}: ShowProps) {
  const { device, isAbove, isBelow } = useBreakpoint()

  // Determine if we should hide
  let shouldHide = false

  if (above) {
    shouldHide = shouldHide || isAbove(above)
  }

  if (below) {
    shouldHide = shouldHide || isBelow(below)
  }

  if (on) {
    const devices = Array.isArray(on) ? on : [on]
    shouldHide = shouldHide || devices.includes(device)
  }

  return <>{shouldHide ? fallback : children}</>
}

// ===== Responsive Container =====

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum width constraint */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "prose"
  /** Horizontal padding */
  padding?: "none" | "sm" | "default" | "lg"
  /** Center the container */
  centered?: boolean
}

const maxWidthClasses = {
  sm: "max-w-screen-sm", // 640px
  md: "max-w-screen-md", // 768px
  lg: "max-w-screen-lg", // 1024px
  xl: "max-w-screen-xl", // 1280px
  "2xl": "max-w-screen-2xl", // 1536px
  full: "max-w-full",
  prose: "max-w-prose", // ~65ch
}

const paddingClasses = {
  none: "",
  sm: "px-4",
  default: "px-4 sm:px-6 lg:px-8",
  lg: "px-6 sm:px-8 lg:px-12",
}

export const ResponsiveContainer = React.forwardRef<
  HTMLDivElement,
  ResponsiveContainerProps
>(
  (
    {
      className,
      children,
      maxWidth = "xl",
      padding = "default",
      centered = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "w-full",
          maxWidthClasses[maxWidth],
          paddingClasses[padding],
          centered && "mx-auto",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveContainer.displayName = "ResponsiveContainer"

// ===== Responsive Stack =====

interface ResponsiveStackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Stack direction on mobile */
  mobileDirection?: "row" | "column"
  /** Stack direction on tablet and up */
  tabletDirection?: "row" | "column"
  /** Stack direction on desktop */
  desktopDirection?: "row" | "column"
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg" | "xl"
  /** Alignment */
  align?: "start" | "center" | "end" | "stretch"
  /** Justify */
  justify?: "start" | "center" | "end" | "between" | "around"
}

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
}

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
}

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
}

export const ResponsiveStack = React.forwardRef<
  HTMLDivElement,
  ResponsiveStackProps
>(
  (
    {
      className,
      children,
      mobileDirection = "column",
      tabletDirection,
      desktopDirection,
      gap = "md",
      align = "stretch",
      justify = "start",
      ...props
    },
    ref
  ) => {
    // Build responsive flex direction classes
    const directionClasses = [
      mobileDirection === "row" ? "flex-row" : "flex-col",
      tabletDirection &&
        (tabletDirection === "row" ? "md:flex-row" : "md:flex-col"),
      desktopDirection &&
        (desktopDirection === "row" ? "lg:flex-row" : "lg:flex-col"),
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          directionClasses,
          gapClasses[gap],
          alignClasses[align],
          justifyClasses[justify],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveStack.displayName = "ResponsiveStack"

// ===== Responsive Grid =====

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Columns on mobile */
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  /** Columns on tablet (md) */
  mdCols?: 1 | 2 | 3 | 4 | 6 | 12
  /** Columns on desktop (lg) */
  lgCols?: 1 | 2 | 3 | 4 | 6 | 12
  /** Columns on large desktop (xl) */
  xlCols?: 1 | 2 | 3 | 4 | 6 | 12
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg" | "xl"
}

const colClasses = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  6: "grid-cols-6",
  12: "grid-cols-12",
}

const mdColClasses = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  6: "md:grid-cols-6",
  12: "md:grid-cols-12",
}

const lgColClasses = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  6: "lg:grid-cols-6",
  12: "lg:grid-cols-12",
}

const xlColClasses = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  6: "xl:grid-cols-6",
  12: "xl:grid-cols-12",
}

export const ResponsiveGrid = React.forwardRef<
  HTMLDivElement,
  ResponsiveGridProps
>(
  (
    {
      className,
      children,
      cols = 1,
      mdCols,
      lgCols,
      xlCols,
      gap = "md",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "grid",
          colClasses[cols],
          mdCols && mdColClasses[mdCols],
          lgCols && lgColClasses[lgCols],
          xlCols && xlColClasses[xlCols],
          gapClasses[gap],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ResponsiveGrid.displayName = "ResponsiveGrid"

// ===== VisuallyHidden =====

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {}

/**
 * VisuallyHidden - Content hidden visually but available to screen readers.
 */
export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  VisuallyHiddenProps
>(({ className, ...props }, ref) => {
  return (
    <span
      ref={ref}
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        "[clip:rect(0,0,0,0)]",
        className
      )}
      {...props}
    />
  )
})
VisuallyHidden.displayName = "VisuallyHidden"

// ===== AspectRatio Helper =====

interface AspectRatioBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Aspect ratio (e.g., 16/9, 4/3, 1) */
  ratio?: number
  /** Predefined aspect ratios */
  preset?: "square" | "video" | "portrait" | "wide"
}

const presetRatios = {
  square: 1,
  video: 16 / 9,
  portrait: 3 / 4,
  wide: 21 / 9,
}

export const AspectRatioBox = React.forwardRef<
  HTMLDivElement,
  AspectRatioBoxProps
>(({ className, children, ratio, preset = "video", style, ...props }, ref) => {
  const aspectRatio = ratio ?? presetRatios[preset]

  return (
    <div
      ref={ref}
      className={cn("relative w-full", className)}
      style={{
        ...style,
        paddingBottom: `${(1 / aspectRatio) * 100}%`,
      }}
      {...props}
    >
      <div className="absolute inset-0">{children}</div>
    </div>
  )
})
AspectRatioBox.displayName = "AspectRatioBox"

// ===== Responsive Spacer =====

interface ResponsiveSpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Space on mobile */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  /** Space on tablet */
  mdSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  /** Space on desktop */
  lgSize?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  /** Axis */
  axis?: "horizontal" | "vertical"
}

const spacerSizes = {
  xs: { vertical: "h-2", horizontal: "w-2" },
  sm: { vertical: "h-4", horizontal: "w-4" },
  md: { vertical: "h-6", horizontal: "w-6" },
  lg: { vertical: "h-8", horizontal: "w-8" },
  xl: { vertical: "h-12", horizontal: "w-12" },
  "2xl": { vertical: "h-16", horizontal: "w-16" },
}

const mdSpacerSizes = {
  xs: { vertical: "md:h-2", horizontal: "md:w-2" },
  sm: { vertical: "md:h-4", horizontal: "md:w-4" },
  md: { vertical: "md:h-6", horizontal: "md:w-6" },
  lg: { vertical: "md:h-8", horizontal: "md:w-8" },
  xl: { vertical: "md:h-12", horizontal: "md:w-12" },
  "2xl": { vertical: "md:h-16", horizontal: "md:w-16" },
}

const lgSpacerSizes = {
  xs: { vertical: "lg:h-2", horizontal: "lg:w-2" },
  sm: { vertical: "lg:h-4", horizontal: "lg:w-4" },
  md: { vertical: "lg:h-6", horizontal: "lg:w-6" },
  lg: { vertical: "lg:h-8", horizontal: "lg:w-8" },
  xl: { vertical: "lg:h-12", horizontal: "lg:w-12" },
  "2xl": { vertical: "lg:h-16", horizontal: "lg:w-16" },
}

export const ResponsiveSpacer = React.forwardRef<
  HTMLDivElement,
  ResponsiveSpacerProps
>(
  (
    { className, size = "md", mdSize, lgSize, axis = "vertical", ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          spacerSizes[size][axis],
          mdSize && mdSpacerSizes[mdSize][axis],
          lgSize && lgSpacerSizes[lgSize][axis],
          className
        )}
        aria-hidden="true"
        {...props}
      />
    )
  }
)
ResponsiveSpacer.displayName = "ResponsiveSpacer"

// Re-export hooks for convenience
export {
  useBreakpoint,
  useMediaQuery,
  BREAKPOINTS,
  type DeviceType,
  type BreakpointKey,
}
