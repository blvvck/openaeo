import * as React from "react"



// ===== Breakpoint Constants =====

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const

export type BreakpointKey = keyof typeof BREAKPOINTS

// ===== Layout Breakpoints =====

/** Breakpoint below which sidebar becomes a drawer */
export const MOBILE_BREAKPOINT = BREAKPOINTS.md // 768px

/** Breakpoint below which sidebar collapses */
export const TABLET_BREAKPOINT = BREAKPOINTS.lg // 1024px

/** Breakpoint above which sidebar is fully expanded */
export const DESKTOP_BREAKPOINT = BREAKPOINTS.lg // 1024px

// ===== Device Type =====

export type DeviceType = "mobile" | "tablet" | "desktop"

export function getDeviceType(width: number): DeviceType {
  if (width < MOBILE_BREAKPOINT) return "mobile"
  if (width < TABLET_BREAKPOINT) return "tablet"
  return "desktop"
}

// ===== useBreakpoint Hook =====

interface BreakpointState {
  /** Current window width */
  width: number
  /** Current window height */
  height: number
  /** Current device type */
  device: DeviceType
  /** Is mobile viewport */
  isMobile: boolean
  /** Is tablet viewport */
  isTablet: boolean
  /** Is desktop viewport */
  isDesktop: boolean
  /** Is at or above given breakpoint */
  isAbove: (breakpoint: BreakpointKey) => boolean
  /** Is at or below given breakpoint */
  isBelow: (breakpoint: BreakpointKey) => boolean
  /** Is between two breakpoints */
  isBetween: (min: BreakpointKey, max: BreakpointKey) => boolean
}

export function useBreakpoint(): BreakpointState {
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  })

  React.useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Set initial dimensions
    handleResize()

    // Use ResizeObserver for better performance if available
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(handleResize)
      observer.observe(document.documentElement)
      return () => observer.disconnect()
    } else {
      // Fallback to resize event
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }
  }, [])

  const device = getDeviceType(dimensions.width)

  const isAbove = React.useCallback(
    (breakpoint: BreakpointKey) => dimensions.width >= BREAKPOINTS[breakpoint],
    [dimensions.width]
  )

  const isBelow = React.useCallback(
    (breakpoint: BreakpointKey) => dimensions.width < BREAKPOINTS[breakpoint],
    [dimensions.width]
  )

  const isBetween = React.useCallback(
    (min: BreakpointKey, max: BreakpointKey) =>
      dimensions.width >= BREAKPOINTS[min] &&
      dimensions.width < BREAKPOINTS[max],
    [dimensions.width]
  )

  return {
    width: dimensions.width,
    height: dimensions.height,
    device,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
    isAbove,
    isBelow,
    isBetween,
  }
}

// ===== useMediaQuery Hook =====

/**
 * Low-level hook for custom media queries.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)

    // Set initial value
    setMatches(mql.matches)

    // Add listener
    mql.addEventListener("change", handler)
    return () => mql.removeEventListener("change", handler)
  }, [query])

  return matches
}

// ===== Sidebar State Helper =====

/**
 * Determines the appropriate sidebar state based on viewport width.
 */
export function getSidebarStateForWidth(
  width: number
): "expanded" | "collapsed" | "hidden" {
  const device = getDeviceType(width)

  switch (device) {
    case "mobile":
      return "hidden" // Drawer mode
    case "tablet":
      return "collapsed" // Icon-only sidebar
    case "desktop":
    default:
      return "expanded" // Full sidebar
  }
}

// ===== Responsive Container Width =====

/**
 * Get appropriate container max-width class based on viewport.
 */
export function getContainerMaxWidth(width: number): string {
  if (width >= BREAKPOINTS["2xl"]) return "max-w-7xl"
  if (width >= BREAKPOINTS.xl) return "max-w-6xl"
  if (width >= BREAKPOINTS.lg) return "max-w-5xl"
  if (width >= BREAKPOINTS.md) return "max-w-4xl"
  return "max-w-full"
}

// ===== Sidebar Width Constants =====

export const SIDEBAR_WIDTHS = {
  expanded: 240,
  collapsed: 64,
  hidden: 0,
  mobile: 280, // Wider on mobile for touch targets
} as const

// ===== Responsive Value Helper =====

type ResponsiveValue<T> = {
  base?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  "2xl"?: T
}

/**
 * Get the appropriate value for the current breakpoint.
 */
export function useResponsiveValue<T>(values: ResponsiveValue<T>): T | undefined {
  const { width } = useBreakpoint()

  // Find the highest matching breakpoint
  if (values["2xl"] !== undefined && width >= BREAKPOINTS["2xl"]) {
    return values["2xl"]
  }
  if (values.xl !== undefined && width >= BREAKPOINTS.xl) {
    return values.xl
  }
  if (values.lg !== undefined && width >= BREAKPOINTS.lg) {
    return values.lg
  }
  if (values.md !== undefined && width >= BREAKPOINTS.md) {
    return values.md
  }
  if (values.sm !== undefined && width >= BREAKPOINTS.sm) {
    return values.sm
  }

  return values.base
}
