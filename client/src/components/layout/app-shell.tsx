/**
 * ⚠️ CRITICAL CODE - Do not modify without review
 *
 * This file is registered in .claude/CRITICAL_CODE.md
 *
 * Why critical: Main layout wrapper for entire app, padding system
 * Dependencies: All pages render inside this shell
 *
 * KNOWN GOTCHA: `paddingMap.default` controls ALL page content padding.
 * Changing it affects every single page. Make small changes only.
 *
 * Before changing: Read CRITICAL_CODE.md entry first.
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"



const appShellVariants = cva(
  [
    "relative min-h-screen w-full bg-background text-foreground",
  ],
  {
    variants: {
      /** Sidebar state - no longer using grid, sidebar is fixed */
      sidebarState: {
        expanded: "",
        collapsed: "",
        hidden: "",
      },
      /** Whether sidebar is fixed or scrolls with content */
      sidebarFixed: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      sidebarState: "expanded",
      sidebarFixed: true,
    },
  }
)

// Context for shell state
interface AppShellContextValue {
  sidebarState: "expanded" | "collapsed" | "hidden"
  setSidebarState: (state: "expanded" | "collapsed" | "hidden") => void
  toggleSidebar: () => void
  isMobile: boolean
}

const AppShellContext = React.createContext<AppShellContextValue | null>(null)

export function useAppShell() {
  const context = React.useContext(AppShellContext)
  if (!context) {
    throw new Error("useAppShell must be used within an AppShell")
  }
  return context
}

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export interface AppShellProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof appShellVariants>, "sidebarState"> {
  /** Initial sidebar state */
  defaultSidebarState?: "expanded" | "collapsed" | "hidden"
  /** Controlled sidebar state */
  sidebarState?: "expanded" | "collapsed" | "hidden"
  /** Callback when sidebar state changes */
  onSidebarStateChange?: (state: "expanded" | "collapsed" | "hidden") => void
  /** Persist sidebar state to localStorage */
  persistState?: boolean
  /** localStorage key for persisting state */
  storageKey?: string
}

const STORAGE_KEY_DEFAULT = "app-shell-sidebar-state"

const AppShell = React.forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      className,
      children,
      defaultSidebarState = "expanded",
      sidebarState: controlledState,
      onSidebarStateChange,
      sidebarFixed = true,
      persistState = true,
      storageKey = STORAGE_KEY_DEFAULT,
      ...props
    },
    ref
  ) => {
    // Check for mobile
    const [isMobile, setIsMobile] = React.useState(false)

    // Internal state
    const [internalState, setInternalState] = React.useState<
      "expanded" | "collapsed" | "hidden"
    >(() => {
      // Try to load from localStorage on mount
      if (typeof window !== "undefined" && persistState) {
        const saved = localStorage.getItem(storageKey)
        if (saved && ["expanded", "collapsed", "hidden"].includes(saved)) {
          // On desktop, don't restore "hidden" state - it's only valid for mobile
          // This prevents stale localStorage from hiding the sidebar on desktop
          const isDesktop = window.innerWidth >= MOBILE_BREAKPOINT
          if (saved === "hidden" && isDesktop) {
            return "expanded"
          }
          return saved as "expanded" | "collapsed" | "hidden"
        }
      }
      return defaultSidebarState
    })

    // Use controlled state if provided
    const sidebarState = controlledState ?? internalState
    const isControlled = controlledState !== undefined

    // Handle state changes
    const setSidebarState = React.useCallback(
      (newState: "expanded" | "collapsed" | "hidden") => {
        if (!isControlled) {
          setInternalState(newState)
          if (persistState && typeof window !== "undefined") {
            localStorage.setItem(storageKey, newState)
          }
        }
        onSidebarStateChange?.(newState)
      },
      [isControlled, onSidebarStateChange, persistState, storageKey]
    )

    // Toggle function
    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        // On mobile, toggle between hidden and expanded (drawer mode)
        setSidebarState(sidebarState === "hidden" ? "expanded" : "hidden")
      } else {
        // On desktop, toggle between expanded and collapsed
        // If somehow hidden on desktop (e.g., from stale localStorage), restore to expanded
        if (sidebarState === "hidden") {
          setSidebarState("expanded")
        } else {
          setSidebarState(sidebarState === "expanded" ? "collapsed" : "expanded")
        }
      }
    }, [isMobile, sidebarState, setSidebarState])

    // Track previous mobile state to detect viewport changes
    const prevIsMobileRef = React.useRef<boolean | null>(null)

    // Handle responsive behavior
    React.useEffect(() => {
      const checkMobile = () => {
        const width = window.innerWidth
        const newIsMobile = width < MOBILE_BREAKPOINT
        const wasIsMobile = prevIsMobileRef.current

        setIsMobile(newIsMobile)
        prevIsMobileRef.current = newIsMobile

        // Only auto-adjust sidebar state on viewport TRANSITIONS, not on every check
        // This preserves user preference while still responding to breakpoint changes
        if (wasIsMobile !== null && wasIsMobile !== newIsMobile) {
          if (newIsMobile) {
            // Transitioned TO mobile: hide sidebar
            setSidebarState("hidden")
          } else {
            // Transitioned FROM mobile to desktop: restore to expanded
            setSidebarState("expanded")
          }
        } else if (wasIsMobile === null) {
          // Initial mount: only hide on mobile, otherwise respect persisted state
          if (newIsMobile) {
            setSidebarState("hidden")
          }
          // On desktop initial mount, trust the persisted state from localStorage
        }
      }

      checkMobile()
      window.addEventListener("resize", checkMobile)
      return () => window.removeEventListener("resize", checkMobile)
    }, [setSidebarState])

    // Keyboard shortcut (Cmd/Ctrl + B)
    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "b") {
          e.preventDefault()
          toggleSidebar()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    const contextValue = React.useMemo(
      () => ({
        sidebarState,
        setSidebarState,
        toggleSidebar,
        isMobile,
      }),
      [sidebarState, setSidebarState, toggleSidebar, isMobile]
    )

    return (
      <AppShellContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            appShellVariants({ sidebarState, sidebarFixed }),
            className
          )}
          data-sidebar-state={sidebarState}
          {...props}
        >
          {children}
        </div>
      </AppShellContext.Provider>
    )
  }
)
AppShell.displayName = "AppShell"

/**
 * AppShellSidebar - The sidebar slot
 *
 * Wraps sidebar content with proper styling and positioning.
 */
const appShellSidebarVariants = cva(
  [
    "flex flex-col bg-sidebar text-sidebar-foreground",
    "border-r border-sidebar-border",
    "transition-[width,transform] duration-200 ease-out",
    "motion-reduce:transition-none",
    "overflow-hidden",
  ],
  {
    variants: {
      state: {
        expanded: "w-[240px]",
        collapsed: "w-[64px]",
        hidden: "w-0 -translate-x-full",
      },
      fixed: {
        true: "fixed inset-y-0 left-0 z-30",
        false: "",
      },
    },
    defaultVariants: {
      state: "expanded",
      fixed: true,
    },
  }
)

interface AppShellSidebarProps extends React.HTMLAttributes<HTMLElement> {
  /** Whether sidebar is fixed position */
  fixed?: boolean
}

const AppShellSidebar = React.forwardRef<HTMLElement, AppShellSidebarProps>(
  ({ className, children, fixed = true, ...props }, ref) => {
    const { sidebarState, setSidebarState, isMobile } = useAppShell()

    // On mobile, render as overlay
    if (isMobile && sidebarState !== "hidden") {
      return (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-20 cursor-default border-0 bg-background/80 p-0 backdrop-blur-sm"
            onClick={() => setSidebarState("hidden")}
          />
          {/* Sidebar */}
          <aside
            ref={ref}
            className={cn(
              "fixed inset-y-0 left-0 z-30 w-[280px]",
              "flex flex-col bg-sidebar text-sidebar-foreground",
              "border-r border-sidebar-border",
              "animate-in slide-in-from-left duration-200",
              className
            )}
            {...props}
          >
            {children}
          </aside>
        </>
      )
    }

    return (
      <aside
        ref={ref}
        className={cn(
          appShellSidebarVariants({ state: sidebarState, fixed }),
          className
        )}
        aria-label="Main navigation"
        {...props}
      >
        {children}
      </aside>
    )
  }
)
AppShellSidebar.displayName = "AppShellSidebar"

/**
 * AppShellMain - The main content area
 *
 * Flex-1 container for page content.
 */
interface AppShellMainProps extends React.HTMLAttributes<HTMLElement> {
  /** Add left margin to account for fixed sidebar */
  withSidebarOffset?: boolean
}

const AppShellMain = React.forwardRef<HTMLElement, AppShellMainProps>(
  ({ className, children, withSidebarOffset = true, ...props }, ref) => {
    const { sidebarState, isMobile } = useAppShell()

    // Calculate left margin based on sidebar state
    const marginClass = React.useMemo(() => {
      if (!withSidebarOffset || isMobile) return ""
      switch (sidebarState) {
        case "expanded":
          return "ml-[240px]"
        case "collapsed":
          return "ml-[64px]"
        case "hidden":
          return "ml-0"
        default:
          return ""
      }
    }, [sidebarState, withSidebarOffset, isMobile])

    return (
      <main
        ref={ref}
        className={cn(
          "flex flex-1 flex-col min-h-screen",
          "transition-[margin-left] duration-200 ease-out",
          "motion-reduce:transition-none",
          marginClass,
          className
        )}
        {...props}
      >
        {children}
      </main>
    )
  }
)
AppShellMain.displayName = "AppShellMain"

/**
 * AppShellHeader - Fixed header within main content
 *
 * Sticky header that stays at top of main content area.
 */
interface AppShellHeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Border style */
  bordered?: boolean
}

const AppShellHeader = React.forwardRef<HTMLElement, AppShellHeaderProps>(
  ({ className, children, bordered = true, ...props }, ref) => {
    return (
      <header
        ref={ref}
        className={cn(
          "sticky top-0 z-20 flex h-14 items-center gap-4 px-4 lg:px-6",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          bordered && "border-b border-border",
          className
        )}
        {...props}
      >
        {children}
      </header>
    )
  }
)
AppShellHeader.displayName = "AppShellHeader"

/**
 * AppShellContent - Scrollable content area
 *
 * Main scrollable container for page content.
 */
interface AppShellContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Padding size */
  padding?: "none" | "sm" | "default" | "lg"
  /** Maximum width constraint */
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl"
  /** Center content horizontally */
  centered?: boolean
}

const paddingMap = {
  none: "",
  sm: "p-4",
  default: "pt-4 px-6 pb-6 lg:px-8 lg:pb-8",  // pt-4 aligns with sidebar content (py-4)
  lg: "p-8 lg:p-12",
}

const maxWidthMap = {
  full: "",
  "7xl": "max-w-7xl",
  "6xl": "max-w-6xl",
  "5xl": "max-w-5xl",
  "4xl": "max-w-4xl",
}

const AppShellContent = React.forwardRef<HTMLDivElement, AppShellContentProps>(
  (
    {
      className,
      children,
      padding = "default",
      maxWidth = "full",
      centered = false,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex-1 overflow-auto",
          paddingMap[padding],
          maxWidth !== "full" && maxWidthMap[maxWidth],
          centered && "mx-auto w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
AppShellContent.displayName = "AppShellContent"

/**
 * AppShellFooter - Optional footer
 */
const AppShellFooter = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  return (
    <footer
      ref={ref}
      className={cn(
        "flex items-center gap-4 px-4 py-3 lg:px-6",
        "border-t border-border bg-background",
        className
      )}
      {...props}
    >
      {children}
    </footer>
  )
})
AppShellFooter.displayName = "AppShellFooter"

export {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  AppShellHeader,
  AppShellContent,
  AppShellFooter,
  appShellVariants,
}
