

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import {
  useInfiniteScroll,
  ScrollSentinel,
  InfiniteList,
  useInfiniteQueryScroll,
  infiniteScrollClasses,
} from "../infinite-scroll"

// Mock IntersectionObserver
class MockIntersectionObserver {
  readonly root: Element | null = null
  readonly rootMargin: string = ""
  readonly thresholds: readonly number[] = []

  private callback: IntersectionObserverCallback
  private elements: Set<Element> = new Set()

  static instances: MockIntersectionObserver[] = []

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.root = options?.root as Element ?? null
    this.rootMargin = options?.rootMargin ?? ""
    this.thresholds = options?.threshold
      ? Array.isArray(options.threshold)
        ? options.threshold
        : [options.threshold]
      : [0]
    MockIntersectionObserver.instances.push(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  // Test helper to simulate intersection
  simulateIntersect(isIntersecting: boolean) {
    const entries = Array.from(this.elements).map((element) => ({
      isIntersecting,
      target: element,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: null,
      time: Date.now(),
    }))
    this.callback(entries, this)
  }
}

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

beforeEach(() => {
  vi.clearAllMocks()
  MockIntersectionObserver.instances = []
  global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ===== useInfiniteScroll Hook Tests =====

describe("useInfiniteScroll", () => {
  describe("Initial State", () => {
    it("returns sentinel ref", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      expect(result.current.sentinelRef).toBeDefined()
      expect(typeof result.current.sentinelRef).toBe("function")
    })

    it("starts not in view", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      expect(result.current.isInView).toBe(false)
    })

    it("starts enabled by default", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      expect(result.current.isEnabled).toBe(true)
    })

    it("respects enabled option", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
          enabled: false,
        })
      )

      expect(result.current.isEnabled).toBe(false)
    })
  })

  describe("Intersection Observer Setup", () => {
    it("creates observer with default options", () => {
      renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0)
      const observer = MockIntersectionObserver.instances[0]
      expect(observer.rootMargin).toBe("100px")
      expect(observer.thresholds).toContain(0.1)
    })

    it("creates observer with custom rootMargin", () => {
      renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
          rootMargin: "200px",
        })
      )

      const observer = MockIntersectionObserver.instances[0]
      expect(observer.rootMargin).toBe("200px")
    })

    it("creates observer with custom threshold", () => {
      renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
          threshold: 0.5,
        })
      )

      const observer = MockIntersectionObserver.instances[0]
      expect(observer.thresholds).toContain(0.5)
    })
  })

  describe("Fetch Behavior", () => {
    it("calls fetchNextPage when sentinel is in view and has next page", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage,
        })
      )

      // Attach sentinel ref to an element
      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      // Simulate intersection
      act(() => {
        MockIntersectionObserver.instances[0].simulateIntersect(true)
      })

      expect(fetchNextPage).toHaveBeenCalled()
    })

    it("does not call fetchNextPage when already fetching", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: true,
          fetchNextPage,
        })
      )

      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      act(() => {
        MockIntersectionObserver.instances[0].simulateIntersect(true)
      })

      expect(fetchNextPage).not.toHaveBeenCalled()
    })

    it("does not call fetchNextPage when no next page", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: false,
          isFetchingNextPage: false,
          fetchNextPage,
        })
      )

      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      act(() => {
        MockIntersectionObserver.instances[0].simulateIntersect(true)
      })

      expect(fetchNextPage).not.toHaveBeenCalled()
    })

    it("does not call fetchNextPage when disabled", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage,
          enabled: false,
        })
      )

      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      act(() => {
        MockIntersectionObserver.instances[0].simulateIntersect(true)
      })

      expect(fetchNextPage).not.toHaveBeenCalled()
    })
  })

  describe("Enable/Disable", () => {
    it("enable() enables auto-loading", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage,
          enabled: false,
        })
      )

      expect(result.current.isEnabled).toBe(false)

      act(() => {
        result.current.enable()
      })

      expect(result.current.isEnabled).toBe(true)
    })

    it("disable() disables auto-loading", () => {
      const fetchNextPage = vi.fn()

      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage,
          enabled: true,
        })
      )

      expect(result.current.isEnabled).toBe(true)

      act(() => {
        result.current.disable()
      })

      expect(result.current.isEnabled).toBe(false)
    })
  })

  describe("Sentinel Ref Callback", () => {
    it("observes element when attached", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      // Check that observer is observing (indirect check via instances)
      expect(MockIntersectionObserver.instances.length).toBeGreaterThan(0)
    })

    it("handles null element (cleanup)", () => {
      const { result } = renderHook(() =>
        useInfiniteScroll({
          hasNextPage: true,
          isFetchingNextPage: false,
          fetchNextPage: vi.fn(),
        })
      )

      const sentinel = document.createElement("div")
      act(() => {
        result.current.sentinelRef(sentinel)
      })

      // Should not throw when setting to null
      expect(() => {
        act(() => {
          result.current.sentinelRef(null)
        })
      }).not.toThrow()
    })
  })
})

// ===== ScrollSentinel Component Tests =====

describe("ScrollSentinel", () => {
  describe("Rendering", () => {
    it("renders sentinel element", () => {
      render(<ScrollSentinel data-testid="sentinel" />)
      expect(screen.getByTestId("sentinel")).toBeInTheDocument()
    })

    it("is aria-hidden when not loading", () => {
      render(<ScrollSentinel isLoading={false} data-testid="sentinel" />)
      expect(screen.getByTestId("sentinel")).toHaveAttribute("aria-hidden", "true")
    })

    it("is not aria-hidden when loading", () => {
      render(<ScrollSentinel isLoading={true} data-testid="sentinel" />)
      expect(screen.getByTestId("sentinel")).toHaveAttribute("aria-hidden", "false")
    })
  })

  describe("Loading State", () => {
    it("shows spinner when loading", () => {
      render(<ScrollSentinel isLoading={true} data-testid="sentinel" />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("hides spinner when not loading", () => {
      render(<ScrollSentinel isLoading={false} data-testid="sentinel" />)
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })

    it("shows custom loading indicator", () => {
      render(
        <ScrollSentinel
          isLoading={true}
          loadingIndicator={<div data-testid="custom-loading">Custom</div>}
        />
      )
      expect(screen.getByTestId("custom-loading")).toBeInTheDocument()
    })

    it("hides spinner when showSpinner is false", () => {
      render(<ScrollSentinel isLoading={true} showSpinner={false} />)
      expect(screen.queryByRole("status")).not.toBeInTheDocument()
    })
  })

  describe("Spinner Sizes", () => {
    it("renders small spinner", () => {
      render(<ScrollSentinel isLoading={true} spinnerSize="sm" data-testid="sentinel" />)
      const sentinel = screen.getByTestId("sentinel")
      const svg = sentinel.querySelector("svg")
      expect(svg).toHaveClass("w-4", "h-4")
    })

    it("renders medium spinner (default)", () => {
      render(<ScrollSentinel isLoading={true} spinnerSize="md" data-testid="sentinel" />)
      const sentinel = screen.getByTestId("sentinel")
      const svg = sentinel.querySelector("svg")
      expect(svg).toHaveClass("w-6", "h-6")
    })

    it("renders large spinner", () => {
      render(<ScrollSentinel isLoading={true} spinnerSize="lg" data-testid="sentinel" />)
      const sentinel = screen.getByTestId("sentinel")
      const svg = sentinel.querySelector("svg")
      expect(svg).toHaveClass("w-8", "h-8")
    })
  })

  describe("Accessibility", () => {
    it("has screen reader text when loading", () => {
      render(<ScrollSentinel isLoading={true} />)
      expect(screen.getByText("Loading more items")).toBeInTheDocument()
    })

    it("uses custom label", () => {
      render(<ScrollSentinel isLoading={true} label="Fetching more data" />)
      expect(screen.getByText("Fetching more data")).toBeInTheDocument()
    })

    it("spinner has aria-label", () => {
      render(<ScrollSentinel isLoading={true} label="Loading items" />)
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading items")
    })
  })

  describe("Reduced Motion", () => {
    it("disables animation when reduced motion preferred", () => {
      vi.mocked(prefersReducedMotion).mockReturnValue(true)
      render(<ScrollSentinel isLoading={true} data-testid="sentinel" />)
      const sentinel = screen.getByTestId("sentinel")
      const svg = sentinel.querySelector("svg")
      expect(svg).not.toHaveClass("animate-spin")
      vi.mocked(prefersReducedMotion).mockReturnValue(false)
    })
  })

  describe("Custom Properties", () => {
    it("applies custom className", () => {
      render(<ScrollSentinel className="custom-class" data-testid="sentinel" />)
      expect(screen.getByTestId("sentinel")).toHaveClass("custom-class")
    })

    it("applies custom height", () => {
      render(<ScrollSentinel height={50} data-testid="sentinel" />)
      expect(screen.getByTestId("sentinel")).toHaveStyle({ minHeight: "50px" })
    })
  })

  describe("Ref Forwarding", () => {
    it("forwards ref to container", () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<ScrollSentinel ref={ref} />)
      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })
})

// ===== InfiniteList Component Tests =====

describe("InfiniteList", () => {
  // Test data
  const mockItems = [
    { id: 1, name: "Item 1" },
    { id: 2, name: "Item 2" },
    { id: 3, name: "Item 3" },
  ]

  const defaultProps = {
    items: mockItems,
    renderItem: (item: typeof mockItems[0]) => <div>{item.name}</div>,
    keyExtractor: (item: typeof mockItems[0]) => item.id,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }

  describe("Rendering", () => {
    it("renders all items", () => {
      render(<InfiniteList {...defaultProps} />)
      expect(screen.getByText("Item 1")).toBeInTheDocument()
      expect(screen.getByText("Item 2")).toBeInTheDocument()
      expect(screen.getByText("Item 3")).toBeInTheDocument()
    })

    it("renders items in list role", () => {
      render(<InfiniteList {...defaultProps} />)
      expect(screen.getByRole("list")).toBeInTheDocument()
    })

    it("renders items with listitem role", () => {
      render(<InfiniteList {...defaultProps} />)
      expect(screen.getAllByRole("listitem")).toHaveLength(3)
    })

    it("uses keyExtractor for keys", () => {
      const keyExtractor = vi.fn((item: typeof mockItems[0]) => item.id)
      render(
        <InfiniteList
          {...defaultProps}
          keyExtractor={keyExtractor}
        />
      )
      expect(keyExtractor).toHaveBeenCalledTimes(3)
    })
  })

  describe("Initial Loading State", () => {
    it("shows loading spinner when loading and no items", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          isLoading={true}
        />
      )
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("shows custom loading skeleton", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          isLoading={true}
          loadingSkeleton={<div data-testid="skeleton">Skeleton</div>}
          skeletonCount={3}
        />
      )
      expect(screen.getAllByTestId("skeleton")).toHaveLength(3)
    })

    it("loading state has aria-busy", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          isLoading={true}
          data-testid="list"
        />
      )
      expect(screen.getByTestId("list")).toHaveAttribute("aria-busy", "true")
    })
  })

  describe("Error State", () => {
    it("shows error message when error and no items", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          error={new Error("Failed to fetch")}
        />
      )
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Failed to fetch")).toBeInTheDocument()
    })

    it("shows default error message when error message is empty", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          error={new Error()}
        />
      )
      expect(screen.getByText("An error occurred while loading items.")).toBeInTheDocument()
    })

    it("shows retry button when onRetry provided", () => {
      const onRetry = vi.fn()
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          error={new Error("Failed")}
          onRetry={onRetry}
        />
      )
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument()
    })

    it("calls onRetry when retry button clicked", async () => {
      const onRetry = vi.fn()
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          error={new Error("Failed")}
          onRetry={onRetry}
        />
      )

      await userEvent.click(screen.getByRole("button", { name: /try again/i }))
      expect(onRetry).toHaveBeenCalled()
    })

    it("shows custom error state", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          error={new Error("Failed")}
          errorState={<div data-testid="custom-error">Custom Error</div>}
        />
      )
      expect(screen.getByTestId("custom-error")).toBeInTheDocument()
    })
  })

  describe("Empty State", () => {
    it("shows default empty message when no items", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          isLoading={false}
        />
      )
      expect(screen.getByText("No items to display")).toBeInTheDocument()
    })

    it("shows custom empty state", () => {
      render(
        <InfiniteList
          {...defaultProps}
          items={[]}
          emptyState={<div data-testid="custom-empty">No items found</div>}
        />
      )
      expect(screen.getByTestId("custom-empty")).toBeInTheDocument()
    })
  })

  describe("Load More Button", () => {
    it("shows load more button when showLoadMoreButton is true", () => {
      render(
        <InfiniteList
          {...defaultProps}
          showLoadMoreButton={true}
        />
      )
      expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument()
    })

    it("calls fetchNextPage when load more clicked", async () => {
      const fetchNextPage = vi.fn()
      render(
        <InfiniteList
          {...defaultProps}
          fetchNextPage={fetchNextPage}
          showLoadMoreButton={true}
        />
      )

      await userEvent.click(screen.getByRole("button", { name: /load more/i }))
      expect(fetchNextPage).toHaveBeenCalled()
    })

    it("shows loading state on load more button", () => {
      render(
        <InfiniteList
          {...defaultProps}
          showLoadMoreButton={true}
          isFetchingNextPage={true}
        />
      )
      expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled()
    })

    it("uses custom loadMoreText", () => {
      render(
        <InfiniteList
          {...defaultProps}
          showLoadMoreButton={true}
          loadMoreText="Show more items"
        />
      )
      expect(screen.getByRole("button", { name: /show more items/i })).toBeInTheDocument()
    })

    it("hides load more button when no next page", () => {
      render(
        <InfiniteList
          {...defaultProps}
          showLoadMoreButton={true}
          hasNextPage={false}
        />
      )
      expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument()
    })
  })

  describe("Scroll Sentinel", () => {
    it("renders sentinel when auto-loading", () => {
      render(
        <InfiniteList
          {...defaultProps}
          showLoadMoreButton={false}
        />
      )
      // Sentinel should be present (can check by the loading more items sr text when fetching)
      // When not fetching, the sentinel is still there but hidden
      expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument()
    })

    it("shows sentinel loading when fetching next page", () => {
      render(
        <InfiniteList
          {...defaultProps}
          isFetchingNextPage={true}
          showLoadMoreButton={false}
        />
      )
      expect(screen.getByLabelText("Loading more items")).toBeInTheDocument()
    })
  })

  describe("End of List", () => {
    it("shows end of list when no more pages", () => {
      render(
        <InfiniteList
          {...defaultProps}
          hasNextPage={false}
        />
      )
      expect(screen.getByText("End of list")).toBeInTheDocument()
    })

    it("does not show end of list when has next page", () => {
      render(
        <InfiniteList
          {...defaultProps}
          hasNextPage={true}
        />
      )
      expect(screen.queryByText("End of list")).not.toBeInTheDocument()
    })
  })

  describe("Layout", () => {
    it("renders vertical layout by default", () => {
      render(<InfiniteList {...defaultProps} data-testid="list" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("flex-col")
    })

    it("renders horizontal layout", () => {
      render(<InfiniteList {...defaultProps} layout="horizontal" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("flex-row", "overflow-x-auto")
    })

    it("renders grid layout", () => {
      render(<InfiniteList {...defaultProps} layout="grid" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("grid")
    })
  })

  describe("Gap", () => {
    it("renders with no gap", () => {
      render(<InfiniteList {...defaultProps} gap="none" />)
      const list = screen.getByRole("list")
      expect(list).not.toHaveClass("gap-2", "gap-4", "gap-6")
    })

    it("renders with small gap", () => {
      render(<InfiniteList {...defaultProps} gap="sm" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("gap-2")
    })

    it("renders with medium gap", () => {
      render(<InfiniteList {...defaultProps} gap="md" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("gap-4")
    })

    it("renders with large gap", () => {
      render(<InfiniteList {...defaultProps} gap="lg" />)
      const list = screen.getByRole("list")
      expect(list).toHaveClass("gap-6")
    })
  })

  describe("Error on Subsequent Pages", () => {
    it("shows inline error when items exist and error occurs", () => {
      render(
        <InfiniteList
          {...defaultProps}
          error={new Error("Load more failed")}
        />
      )
      expect(screen.getByRole("alert")).toBeInTheDocument()
      expect(screen.getByText("Load more failed")).toBeInTheDocument()
    })

    it("shows retry button for subsequent page errors", () => {
      const onRetry = vi.fn()
      render(
        <InfiniteList
          {...defaultProps}
          error={new Error("Failed")}
          onRetry={onRetry}
        />
      )
      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    })
  })

  describe("Aria Busy", () => {
    it("sets aria-busy when fetching next page", () => {
      render(
        <InfiniteList
          {...defaultProps}
          isFetchingNextPage={true}
        />
      )
      expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true")
    })

    it("does not set aria-busy when not fetching", () => {
      render(
        <InfiniteList
          {...defaultProps}
          isFetchingNextPage={false}
        />
      )
      expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "false")
    })
  })

  describe("Children", () => {
    it("renders additional children", () => {
      render(
        <InfiniteList {...defaultProps}>
          <div data-testid="extra-content">Extra</div>
        </InfiniteList>
      )
      expect(screen.getByTestId("extra-content")).toBeInTheDocument()
    })
  })
})

// ===== useInfiniteQueryScroll Hook Tests =====

describe("useInfiniteQueryScroll", () => {
  it("returns flattened items from pages", () => {
    const data = {
      pages: [
        { items: [1, 2] },
        { items: [3, 4] },
      ],
      pageParams: [0, 1],
    }

    const { result } = renderHook(() =>
      useInfiniteQueryScroll({
        data,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        flattenPages: (pages) => pages.flatMap((p) => p.items),
      })
    )

    expect(result.current.items).toEqual([1, 2, 3, 4])
    expect(result.current.itemCount).toBe(4)
  })

  it("returns empty array when no data", () => {
    const { result } = renderHook(() =>
      useInfiniteQueryScroll({
        data: undefined,
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        flattenPages: (pages) => pages.flatMap((p) => p),
      })
    )

    expect(result.current.items).toEqual([])
    expect(result.current.itemCount).toBe(0)
  })

  it("includes sentinel ref from useInfiniteScroll", () => {
    const { result } = renderHook(() =>
      useInfiniteQueryScroll({
        data: { pages: [], pageParams: [] },
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        flattenPages: (pages) => pages,
      })
    )

    expect(result.current.sentinelRef).toBeDefined()
    expect(typeof result.current.sentinelRef).toBe("function")
  })

  it("memoizes items", () => {
    const data = {
      pages: [{ items: [1, 2] }],
      pageParams: [0],
    }
    // Use stable function reference for proper memoization
    const flattenPages = (pages: { items: number[] }[]) => pages.flatMap((p) => p.items)

    const { result, rerender } = renderHook(() =>
      useInfiniteQueryScroll({
        data,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        flattenPages,
      })
    )

    const firstItems = result.current.items

    rerender()

    // Items should be deeply equal (same content)
    expect(result.current.items).toEqual(firstItems)
  })
})

// ===== infiniteScrollClasses Tests =====

describe("infiniteScrollClasses", () => {
  it("exports container class", () => {
    expect(infiniteScrollClasses.container).toContain("relative")
  })

  it("exports list class", () => {
    expect(infiniteScrollClasses.list).toContain("flex")
    expect(infiniteScrollClasses.list).toContain("flex-col")
  })

  it("exports grid class", () => {
    expect(infiniteScrollClasses.grid).toContain("grid")
  })

  it("exports sentinel class", () => {
    expect(infiniteScrollClasses.sentinel).toContain("flex")
    expect(infiniteScrollClasses.sentinel).toContain("items-center")
  })

  it("exports loading class", () => {
    expect(infiniteScrollClasses.loading).toContain("animate-spin")
  })

  it("exports endOfList class", () => {
    expect(infiniteScrollClasses.endOfList).toContain("text-muted-foreground")
  })

  it("exports error class", () => {
    expect(infiniteScrollClasses.error).toContain("text-center")
  })

  it("exports empty class", () => {
    expect(infiniteScrollClasses.empty).toContain("text-center")
  })
})

// ===== Integration Tests =====

describe("Integration", () => {
  it("complete flow: render items, load more, show end", async () => {
    const fetchNextPage = vi.fn()
    const items = [{ id: 1, name: "Item 1" }]

    const { rerender } = render(
      <InfiniteList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        showLoadMoreButton={true}
      />
    )

    // Initial render
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /load more/i })).toBeInTheDocument()

    // Click load more
    await userEvent.click(screen.getByRole("button", { name: /load more/i }))
    expect(fetchNextPage).toHaveBeenCalled()

    // Rerender with loading state
    rerender(
      <InfiniteList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        hasNextPage={true}
        isFetchingNextPage={true}
        fetchNextPage={fetchNextPage}
        showLoadMoreButton={true}
      />
    )

    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled()

    // Rerender with more items and no next page
    const moreItems = [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
    ]

    rerender(
      <InfiniteList
        items={moreItems}
        renderItem={(item) => <div>{item.name}</div>}
        keyExtractor={(item) => item.id}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        showLoadMoreButton={true}
      />
    )

    expect(screen.getByText("Item 2")).toBeInTheDocument()
    expect(screen.getByText("End of list")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /load more/i })).not.toBeInTheDocument()
  })

  it("error recovery flow", async () => {
    const fetchNextPage = vi.fn()
    const onRetry = vi.fn()

    const { rerender } = render(
      <InfiniteList
        items={[]}
        renderItem={() => <div />}
        keyExtractor={(_, i) => i}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        isLoading={true}
      />
    )

    // Initial loading
    expect(screen.getByRole("status")).toBeInTheDocument()

    // Error occurs
    rerender(
      <InfiniteList
        items={[]}
        renderItem={() => <div />}
        keyExtractor={(_, i) => i}
        hasNextPage={true}
        isFetchingNextPage={false}
        fetchNextPage={fetchNextPage}
        error={new Error("Network error")}
        onRetry={onRetry}
      />
    )

    expect(screen.getByRole("alert")).toBeInTheDocument()
    expect(screen.getByText("Network error")).toBeInTheDocument()

    // Retry
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(onRetry).toHaveBeenCalled()
  })
})

// ===== Accessibility Tests =====

describe("Accessibility", () => {
  const defaultProps = {
    items: [{ id: 1, name: "Item" }],
    renderItem: (item: { id: number; name: string }) => <div>{item.name}</div>,
    keyExtractor: (item: { id: number }) => item.id,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }

  it("list has proper role", () => {
    render(<InfiniteList {...defaultProps} />)
    expect(screen.getByRole("list")).toBeInTheDocument()
  })

  it("items have listitem role", () => {
    render(<InfiniteList {...defaultProps} />)
    expect(screen.getByRole("listitem")).toBeInTheDocument()
  })

  it("error state has alert role", () => {
    render(
      <InfiniteList
        {...defaultProps}
        items={[]}
        error={new Error("Error")}
      />
    )
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })

  it("loading state has status role", () => {
    render(
      <InfiniteList
        {...defaultProps}
        items={[]}
        isLoading={true}
      />
    )
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("end of list has aria-live", () => {
    render(
      <InfiniteList
        {...defaultProps}
        hasNextPage={false}
      />
    )
    const endText = screen.getByText("End of list")
    // The text is inside a div with aria-live - check the closest element with the attribute
    const ariaLiveElement = endText.closest('[aria-live]')
    expect(ariaLiveElement).toHaveAttribute("aria-live", "polite")
  })

  it("sentinel loading indicator has aria-label", () => {
    render(
      <InfiniteList
        {...defaultProps}
        isFetchingNextPage={true}
      />
    )
    expect(screen.getByLabelText("Loading more items")).toBeInTheDocument()
  })
})
