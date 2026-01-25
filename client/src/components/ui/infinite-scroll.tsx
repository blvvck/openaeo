

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, ChevronDown, Loader2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { DURATION, EASE, prefersReducedMotion } from "@/lib/motion"

// ===== Types =====

export interface UseInfiniteScrollOptions {
  /** Whether there's a next page to load */
  hasNextPage: boolean
  /** Whether currently fetching next page */
  isFetchingNextPage: boolean
  /** Function to fetch the next page */
  fetchNextPage: () => void
  /** Whether loading is enabled (default: true) */
  enabled?: boolean
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string
  /** Threshold for intersection observer (default: 0.1) */
  threshold?: number
  /** Custom root element for scroll container (default: null = viewport) */
  root?: React.RefObject<HTMLElement | null>
}

export interface UseInfiniteScrollReturn {
  /** Ref to attach to sentinel element */
  sentinelRef: React.RefCallback<HTMLElement>
  /** Whether sentinel is in view */
  isInView: boolean
  /** Whether auto-loading is enabled */
  isEnabled: boolean
  /** Enable auto-loading */
  enable: () => void
  /** Disable auto-loading */
  disable: () => void
}

// ===== useInfiniteScroll Hook =====

export function useInfiniteScroll(
  options: UseInfiniteScrollOptions
): UseInfiniteScrollReturn {
  const {
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled = true,
    rootMargin = "100px",
    threshold = 0.1,
    root,
  } = options

  const [isInView, setIsInView] = React.useState(false)
  const [isEnabled, setIsEnabled] = React.useState(enabled)
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const sentinelElementRef = React.useRef<HTMLElement | null>(null)

  // Update enabled state when prop changes
  React.useEffect(() => {
    setIsEnabled(enabled)
  }, [enabled])

  // Setup intersection observer
  React.useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === "undefined") {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsInView(entry.isIntersecting)
      },
      {
        root: root?.current ?? null,
        rootMargin,
        threshold,
      }
    )

    observerRef.current = observer

    // Observe sentinel if it exists
    if (sentinelElementRef.current) {
      observer.observe(sentinelElementRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [root, rootMargin, threshold])

  // Fetch next page when sentinel is in view
  React.useEffect(() => {
    if (isInView && hasNextPage && !isFetchingNextPage && isEnabled) {
      fetchNextPage()
    }
  }, [isInView, hasNextPage, isFetchingNextPage, isEnabled, fetchNextPage])

  // Sentinel ref callback
  const sentinelRef = React.useCallback((node: HTMLElement | null) => {
    sentinelElementRef.current = node
    if (observerRef.current) {
      // Disconnect from previous element
      observerRef.current.disconnect()
      // Observe new element
      if (node) {
        observerRef.current.observe(node)
      }
    }
  }, [])

  const enable = React.useCallback(() => setIsEnabled(true), [])
  const disable = React.useCallback(() => setIsEnabled(false), [])

  return {
    sentinelRef,
    isInView,
    isEnabled,
    enable,
    disable,
  }
}

// ===== ScrollSentinel Component =====

export interface ScrollSentinelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether currently loading */
  isLoading?: boolean
  /** Show loading spinner when active */
  showSpinner?: boolean
  /** Spinner size */
  spinnerSize?: "sm" | "md" | "lg"
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode
  /** Distance from bottom to trigger (passed to sentinelRef attachment point) */
  height?: number
  /** Accessible label */
  label?: string
}

const ScrollSentinel = React.forwardRef<HTMLDivElement, ScrollSentinelProps>(
  (
    {
      isLoading = false,
      showSpinner = true,
      spinnerSize = "md",
      loadingIndicator,
      height = 1,
      label = "Loading more items",
      className,
      ...props
    },
    ref
  ) => {
    const reducedMotion = prefersReducedMotion()

    const spinnerSizes = {
      sm: "w-4 h-4",
      md: "w-6 h-6",
      lg: "w-8 h-8",
    }

    return (
      <div
        ref={ref}
        style={{ minHeight: height }}
        className={cn(
          "flex items-center justify-center py-4",
          className
        )}
        aria-hidden={!isLoading}
        {...props}
      >
        <AnimatePresence>
          {isLoading && showSpinner && (
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: DURATION.fast, ease: EASE.outExpo }}
              role="status"
              aria-label={label}
            >
              {loadingIndicator || (
                <Loader2
                  className={cn(
                    spinnerSizes[spinnerSize],
                    "text-muted-foreground",
                    !reducedMotion && "animate-spin"
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="sr-only">{label}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
ScrollSentinel.displayName = "ScrollSentinel"

// ===== InfiniteList Component =====

export interface InfiniteListProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  /** Array of items to render */
  items: T[]
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode
  /** Key extractor function */
  keyExtractor: (item: T, index: number) => string | number
  /** Whether there's a next page */
  hasNextPage: boolean
  /** Whether currently fetching next page */
  isFetchingNextPage: boolean
  /** Function to fetch next page */
  fetchNextPage: () => void
  /** Whether initial loading */
  isLoading?: boolean
  /** Error object if fetch failed */
  error?: Error | null
  /** Retry function for error state */
  onRetry?: () => void
  /** Empty state message or component */
  emptyState?: React.ReactNode
  /** Error state message or component */
  errorState?: React.ReactNode
  /** Show "Load more" button instead of auto-load */
  showLoadMoreButton?: boolean
  /** Load more button text */
  loadMoreText?: string
  /** Enable virtualization (for large lists) */
  virtualized?: boolean
  /** Estimated item height for virtualization */
  estimatedItemHeight?: number
  /** Root margin for intersection observer */
  rootMargin?: string
  /** Threshold for intersection observer */
  threshold?: number
  /** Custom root element for scroll container */
  scrollRoot?: React.RefObject<HTMLElement | null>
  /** Layout direction */
  layout?: "vertical" | "horizontal" | "grid"
  /** Grid columns (for grid layout) */
  gridCols?: number
  /** Gap between items */
  gap?: "none" | "sm" | "md" | "lg"
  /** Loading skeleton component for initial load */
  loadingSkeleton?: React.ReactNode
  /** Number of skeleton items to show */
  skeletonCount?: number
}

const gapClasses = {
  none: "",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
}

function InfiniteList<T>({
  items,
  renderItem,
  keyExtractor,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
  errorState,
  showLoadMoreButton = false,
  loadMoreText = "Load more",
  virtualized = false,
  estimatedItemHeight = 60,
  rootMargin = "100px",
  threshold = 0.1,
  scrollRoot,
  layout = "vertical",
  gridCols = 3,
  gap = "md",
  loadingSkeleton,
  skeletonCount = 5,
  className,
  children,
  ...props
}: InfiniteListProps<T>) {
  const { sentinelRef, isEnabled, enable, disable } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled: !showLoadMoreButton,
    rootMargin,
    threshold,
    root: scrollRoot,
  })

  const reducedMotion = prefersReducedMotion()

  // Handle initial loading state
  if (isLoading && items.length === 0) {
    if (loadingSkeleton) {
      return (
        <div
          className={cn(
            layout === "vertical" && "flex flex-col",
            layout === "horizontal" && "flex flex-row overflow-x-auto",
            layout === "grid" && `grid grid-cols-${gridCols}`,
            gapClasses[gap],
            className
          )}
          role="status"
          aria-busy="true"
          aria-label="Loading items"
          {...props}
        >
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <React.Fragment key={`skeleton-${index}`}>
              {loadingSkeleton}
            </React.Fragment>
          ))}
        </div>
      )
    }

    return (
      <div
        className={cn("flex items-center justify-center py-12", className)}
        role="status"
        aria-busy="true"
        {...props}
      >
        <Loader2
          className={cn(
            "w-8 h-8 text-muted-foreground",
            !reducedMotion && "animate-spin"
          )}
          aria-hidden="true"
        />
        <span className="sr-only">Loading items</span>
      </div>
    )
  }

  // Handle error state
  if (error && items.length === 0) {
    if (errorState) {
      return <>{errorState}</>
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
        role="alert"
        {...props}
      >
        <AlertCircle
          className="w-12 h-12 text-destructive mb-4"
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold mb-2">Failed to load items</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || "An error occurred while loading items."}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Try again
          </Button>
        )}
      </div>
    )
  }

  // Handle empty state
  if (!isLoading && items.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center py-12 text-center",
          className
        )}
        {...props}
      >
        <p className="text-muted-foreground">No items to display</p>
      </div>
    )
  }

  // Render virtualized list
  if (virtualized) {
    return (
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        estimatedItemHeight={estimatedItemHeight}
        rootMargin={rootMargin}
        threshold={threshold}
        showLoadMoreButton={showLoadMoreButton}
        loadMoreText={loadMoreText}
        gap={gap}
        className={className}
        {...props}
      />
    )
  }

  const layoutClasses = {
    vertical: "flex flex-col",
    horizontal: "flex flex-row overflow-x-auto",
    grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${gridCols}`,
  }

  return (
    <div className={cn("relative", className)} {...props}>
      {/* Item list */}
      <div
        className={cn(layoutClasses[layout], gapClasses[gap])}
        role="list"
        aria-busy={isFetchingNextPage}
      >
        {items.map((item, index) => (
          <div key={keyExtractor(item, index)} role="listitem">
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Error state for subsequent pages */}
      {error && items.length > 0 && (
        <div
          className="flex items-center justify-center gap-2 py-4 text-destructive"
          role="alert"
        >
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          <span className="text-sm">{error.message || "Failed to load more"}</span>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="ghost"
              size="sm"
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              Retry
            </Button>
          )}
        </div>
      )}

      {/* Load more button */}
      {showLoadMoreButton && hasNextPage && !error && (
        <div className="flex justify-center py-4">
          <Button
            onClick={fetchNextPage}
            variant="outline"
            isLoading={isFetchingNextPage}
            loadingText="Loading..."
            leftIcon={!isFetchingNextPage ? <ChevronDown className="w-4 h-4" /> : undefined}
          >
            {loadMoreText}
          </Button>
        </div>
      )}

      {/* Scroll sentinel for auto-load */}
      {!showLoadMoreButton && hasNextPage && !error && (
        <ScrollSentinel
          ref={sentinelRef}
          isLoading={isFetchingNextPage}
          showSpinner={true}
        />
      )}

      {/* End of list indicator */}
      {!hasNextPage && items.length > 0 && (
        <div
          className="flex justify-center py-4 text-sm text-muted-foreground"
          aria-live="polite"
        >
          End of list
        </div>
      )}

      {children}
    </div>
  )
}

// ===== VirtualizedList Component =====

interface VirtualizedListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  estimatedItemHeight: number
  rootMargin: string
  threshold: number
  showLoadMoreButton: boolean
  loadMoreText: string
  gap: "none" | "sm" | "md" | "lg"
  className?: string
}

function VirtualizedList<T>({
  items,
  renderItem,
  keyExtractor,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  estimatedItemHeight,
  rootMargin,
  threshold,
  showLoadMoreButton,
  loadMoreText,
  gap,
  className,
  ...props
}: VirtualizedListProps<T>) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [visibleRange, setVisibleRange] = React.useState({ start: 0, end: 20 })
  const [scrollTop, setScrollTop] = React.useState(0)

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    enabled: !showLoadMoreButton,
    rootMargin,
    threshold,
  })

  // Buffer items above and below visible area
  const buffer = 5
  const totalHeight = items.length * estimatedItemHeight

  // Calculate visible range based on scroll position
  React.useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const container = containerRef.current
      const scrollY = window.scrollY - container.offsetTop
      const viewportHeight = window.innerHeight

      const start = Math.max(0, Math.floor(scrollY / estimatedItemHeight) - buffer)
      const end = Math.min(
        items.length,
        Math.ceil((scrollY + viewportHeight) / estimatedItemHeight) + buffer
      )

      setScrollTop(scrollY)
      setVisibleRange({ start, end })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [items.length, estimatedItemHeight])

  const visibleItems = items.slice(visibleRange.start, visibleRange.end)
  const offsetTop = visibleRange.start * estimatedItemHeight

  const gapValue = gap === "none" ? 0 : gap === "sm" ? 8 : gap === "md" ? 16 : 24

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      style={{ height: totalHeight + gapValue * (items.length - 1) }}
      {...props}
    >
      <div
        className={cn("flex flex-col", gapClasses[gap])}
        style={{ transform: `translateY(${offsetTop + visibleRange.start * gapValue}px)` }}
        role="list"
        aria-busy={isFetchingNextPage}
      >
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.start + index
          return (
            <div
              key={keyExtractor(item, actualIndex)}
              style={{ height: estimatedItemHeight }}
              role="listitem"
            >
              {renderItem(item, actualIndex)}
            </div>
          )
        })}
      </div>

      {/* Load more button for virtualized list */}
      {showLoadMoreButton && hasNextPage && (
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center py-4"
          style={{ transform: `translateY(${totalHeight}px)` }}
        >
          <Button
            onClick={fetchNextPage}
            variant="outline"
            isLoading={isFetchingNextPage}
            loadingText="Loading..."
            leftIcon={!isFetchingNextPage ? <ChevronDown className="w-4 h-4" /> : undefined}
          >
            {loadMoreText}
          </Button>
        </div>
      )}

      {/* Scroll sentinel */}
      {!showLoadMoreButton && hasNextPage && (
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ transform: `translateY(${totalHeight}px)` }}
        >
          <ScrollSentinel
            ref={sentinelRef}
            isLoading={isFetchingNextPage}
            showSpinner={true}
          />
        </div>
      )}
    </div>
  )
}

// ===== useInfiniteQueryScroll Hook =====
// Convenience hook for TanStack Query integration

export interface UseInfiniteQueryScrollOptions<TData, TPageParam> {
  /** Data from useInfiniteQuery */
  data: { pages: TData[]; pageParams: TPageParam[] } | undefined
  /** hasNextPage from useInfiniteQuery */
  hasNextPage: boolean
  /** isFetchingNextPage from useInfiniteQuery */
  isFetchingNextPage: boolean
  /** fetchNextPage from useInfiniteQuery */
  fetchNextPage: () => void
  /** Function to flatten pages into items */
  flattenPages: (pages: TData[]) => unknown[]
  /** Root margin */
  rootMargin?: string
  /** Threshold */
  threshold?: number
  /** Scroll container ref */
  scrollRoot?: React.RefObject<HTMLElement | null>
}

export interface UseInfiniteQueryScrollReturn<TItem> extends UseInfiniteScrollReturn {
  /** Flattened items from all pages */
  items: TItem[]
  /** Total item count */
  itemCount: number
}

export function useInfiniteQueryScroll<TData, TPageParam, TItem>(
  options: UseInfiniteQueryScrollOptions<TData, TPageParam>
): UseInfiniteQueryScrollReturn<TItem> {
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    flattenPages,
    rootMargin,
    threshold,
    scrollRoot,
  } = options

  const items = React.useMemo(() => {
    if (!data?.pages) return [] as TItem[]
    return flattenPages(data.pages) as TItem[]
  }, [data?.pages, flattenPages])

  const scrollHook = useInfiniteScroll({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    rootMargin,
    threshold,
    root: scrollRoot,
  })

  return {
    ...scrollHook,
    items,
    itemCount: items.length,
  }
}

// ===== CSS Utility Classes =====

export const infiniteScrollClasses = {
  /** Container for infinite list */
  container: "relative min-h-[200px]",
  /** List wrapper */
  list: "flex flex-col gap-4",
  /** Grid layout */
  grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
  /** Sentinel container */
  sentinel: "flex items-center justify-center py-4",
  /** Loading indicator */
  loading: "animate-spin text-muted-foreground",
  /** End of list indicator */
  endOfList: "flex justify-center py-4 text-sm text-muted-foreground",
  /** Error state */
  error: "flex flex-col items-center justify-center py-12 text-center",
  /** Empty state */
  empty: "flex flex-col items-center justify-center py-12 text-center",
}

// ===== Exports =====

export { ScrollSentinel, InfiniteList }
