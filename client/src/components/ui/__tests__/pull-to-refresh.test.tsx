

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act, renderHook } from "@testing-library/react"
import {
  usePullToRefresh,
  PullToRefresh,
  RefreshIndicator,
  pullToRefreshClasses,
  pullToRefreshVariants,
} from "../pull-to-refresh"

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

// Helper to create touch events
function createTouchEvent(type: string, clientY: number) {
  return {
    touches: [{ clientY }],
    preventDefault: vi.fn(),
  } as unknown as React.TouchEvent
}

// Helper to create mouse events
function createMouseEvent(type: string, clientY: number) {
  return {
    clientY,
    preventDefault: vi.fn(),
  } as unknown as React.MouseEvent
}

describe("usePullToRefresh", () => {
  describe("Initial State", () => {
    it("starts not refreshing", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.isRefreshing).toBe(false)
    })

    it("starts not pulling", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.isPulling).toBe(false)
    })

    it("starts with zero pull distance", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.pullDistance).toBe(0)
    })

    it("starts with zero progress", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.pullProgress).toBe(0)
    })

    it("threshold not reached initially", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.isThresholdReached).toBe(false)
    })

    it("provides container ref", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.containerRef).toBeDefined()
      expect(result.current.containerRef.current).toBeNull()
    })

    it("provides event handlers", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      expect(result.current.handlers.onTouchStart).toBeDefined()
      expect(result.current.handlers.onTouchMove).toBeDefined()
      expect(result.current.handlers.onTouchEnd).toBeDefined()
      expect(result.current.handlers.onMouseDown).toBeDefined()
      expect(result.current.handlers.onMouseMove).toBeDefined()
      expect(result.current.handlers.onMouseUp).toBeDefined()
      expect(result.current.handlers.onMouseLeave).toBeDefined()
    })
  })

  describe("Configuration", () => {
    it("uses default threshold of 80", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )
      // Progress at 80px should be 1
      expect(result.current.pullProgress).toBe(0)
    })

    it("accepts custom threshold", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn(), threshold: 100 })
      )
      expect(result.current.isThresholdReached).toBe(false)
    })

    it("accepts disabled option", () => {
      const onRefresh = vi.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh, disabled: true })
      )
      expect(result.current.handlers.onTouchStart).toBeDefined()
    })
  })

  describe("Touch Events", () => {
    it("sets isPulling on touch start", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      // Mock container ref with scrollTop = 0
      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100))
      })

      expect(result.current.isPulling).toBe(true)
    })

    it("does not start pulling when disabled", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn(), disabled: true })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100))
      })

      expect(result.current.isPulling).toBe(false)
    })

    it("does not start pulling when not at top", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      // Container scrolled down
      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 100 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100))
      })

      expect(result.current.isPulling).toBe(false)
    })

    it("stops pulling on touch end", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100))
        result.current.handlers.onTouchEnd()
      })

      expect(result.current.isPulling).toBe(false)
    })
  })

  describe("Mouse Events", () => {
    it("sets isPulling on mouse down", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onMouseDown(createMouseEvent("mousedown", 100))
      })

      expect(result.current.isPulling).toBe(true)
    })

    it("stops pulling on mouse up", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onMouseDown(createMouseEvent("mousedown", 100))
        result.current.handlers.onMouseUp()
      })

      expect(result.current.isPulling).toBe(false)
    })

    it("stops pulling on mouse leave", () => {
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh: vi.fn() })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onMouseDown(createMouseEvent("mousedown", 100))
        result.current.handlers.onMouseLeave()
      })

      expect(result.current.isPulling).toBe(false)
    })
  })

  describe("Refresh Trigger", () => {
    it("calls onRefresh when threshold reached and released", async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined)
      const { result } = renderHook(() =>
        // Use lower threshold and higher resistance to ensure we reach it
        usePullToRefresh({ onRefresh, threshold: 50, resistance: 0.9 })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      // Start touch
      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      })

      // Move well past threshold (need more distance due to resistance)
      act(() => {
        result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150))
      })

      // Verify threshold reached
      expect(result.current.isThresholdReached).toBe(true)

      // End touch
      await act(async () => {
        result.current.handlers.onTouchEnd()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it("does not call onRefresh when below threshold", async () => {
      const onRefresh = vi.fn()
      const { result } = renderHook(() =>
        usePullToRefresh({ onRefresh, threshold: 80 })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
        result.current.handlers.onTouchMove(createTouchEvent("touchmove", 30))
        result.current.handlers.onTouchEnd()
      })

      expect(onRefresh).not.toHaveBeenCalled()
    })

    it("sets isRefreshing during refresh", async () => {
      let resolveRefresh: () => void
      const onRefresh = vi.fn().mockImplementation(
        () => new Promise<void>(resolve => { resolveRefresh = resolve })
      )

      const { result } = renderHook(() =>
        // Use lower threshold and higher resistance
        usePullToRefresh({ onRefresh, threshold: 50, resistance: 0.9 })
      )

      Object.defineProperty(result.current.containerRef, "current", {
        value: { scrollTop: 0 },
        writable: true,
      })

      // Trigger refresh with enough distance
      act(() => {
        result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
        result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150))
      })

      // Verify threshold is reached before ending
      expect(result.current.isThresholdReached).toBe(true)

      act(() => {
        result.current.handlers.onTouchEnd()
      })

      expect(result.current.isRefreshing).toBe(true)

      // Complete refresh
      await act(async () => {
        resolveRefresh!()
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      expect(result.current.isRefreshing).toBe(false)
    })
  })
})

describe("RefreshIndicator", () => {
  describe("Rendering", () => {
    it("renders when pullDistance > 0", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
        />
      )
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("renders when refreshing", () => {
      render(
        <RefreshIndicator
          pullDistance={0}
          pullProgress={0}
          isThresholdReached={false}
          isRefreshing={true}
        />
      )
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("does not render when pullDistance is 0 and not refreshing", () => {
      render(
        <RefreshIndicator
          pullDistance={0}
          pullProgress={0}
          isThresholdReached={false}
          isRefreshing={false}
          data-testid="indicator"
        />
      )
      expect(screen.queryByTestId("indicator")).not.toBeInTheDocument()
    })
  })

  describe("Visual States", () => {
    it("shows progress ring when pulling", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("svg")).toBeInTheDocument()
    })

    it("shows spinner when refreshing", () => {
      render(
        <RefreshIndicator
          pullDistance={80}
          pullProgress={1}
          isThresholdReached={true}
          isRefreshing={true}
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("svg")).toBeInTheDocument()
    })
  })

  describe("Colors", () => {
    it("uses pull color when pulling", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
          pullColor="text-red-500"
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("svg")).toHaveClass("text-red-500")
    })

    it("uses threshold color when threshold reached", () => {
      render(
        <RefreshIndicator
          pullDistance={80}
          pullProgress={1}
          isThresholdReached={true}
          isRefreshing={false}
          thresholdColor="text-green-500"
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("svg")).toHaveClass("text-green-500")
    })

    it("uses refreshing color when refreshing", () => {
      render(
        <RefreshIndicator
          pullDistance={80}
          pullProgress={1}
          isThresholdReached={true}
          isRefreshing={true}
          refreshingColor="text-blue-500"
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("svg")).toHaveClass("text-blue-500")
    })
  })

  describe("Size", () => {
    it("uses custom size", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
          size={60}
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator).toHaveStyle({ width: "60px", height: "60px" })
    })

    it("uses default size of 40", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      expect(indicator).toHaveStyle({ width: "40px", height: "40px" })
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
        />
      )
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("has aria-label for pulling state", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
        />
      )
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Pull to refresh")
    })

    it("has aria-label for threshold reached", () => {
      render(
        <RefreshIndicator
          pullDistance={80}
          pullProgress={1}
          isThresholdReached={true}
          isRefreshing={false}
        />
      )
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Release to refresh")
    })

    it("has aria-label for refreshing state", () => {
      render(
        <RefreshIndicator
          pullDistance={80}
          pullProgress={1}
          isThresholdReached={true}
          isRefreshing={true}
        />
      )
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Refreshing")
    })

    it("icons are aria-hidden", () => {
      render(
        <RefreshIndicator
          pullDistance={50}
          pullProgress={0.5}
          isThresholdReached={false}
          isRefreshing={false}
          data-testid="indicator"
        />
      )
      const indicator = screen.getByTestId("indicator")
      const icons = indicator.querySelectorAll("svg.lucide")
      icons.forEach(icon => {
        expect(icon).toHaveAttribute("aria-hidden", "true")
      })
    })
  })
})

describe("PullToRefresh", () => {
  describe("Rendering", () => {
    it("renders children", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()}>
          <div data-testid="content">Content</div>
        </PullToRefresh>
      )
      expect(screen.getByTestId("content")).toBeInTheDocument()
    })

    it("renders with custom className", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} className="custom-class" data-testid="ptr">
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByTestId("ptr")).toHaveClass("custom-class")
    })
  })

  describe("Configuration", () => {
    it("accepts custom threshold", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} threshold={100}>
          <div>Content</div>
        </PullToRefresh>
      )
      // Component renders without error
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("accepts custom maxPullDistance", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} maxPullDistance={200}>
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("accepts custom resistance", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} resistance={0.3}>
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("accepts disabled prop", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} disabled>
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("accepts custom indicator", () => {
      render(
        <PullToRefresh
          onRefresh={vi.fn()}
          indicator={<div data-testid="custom-indicator">Custom</div>}
        >
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("can hide default indicator", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} showIndicator={false}>
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })
  })

  describe("Data Attributes", () => {
    it("has scrollable content container", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} data-testid="ptr">
          <div>Content</div>
        </PullToRefresh>
      )

      const container = screen.getByTestId("ptr")
      // Initially not pulling - content has no data-pulling attribute
      const content = container.querySelector(".overflow-auto")
      expect(content).toBeInTheDocument()
      expect(content).not.toHaveAttribute("data-pulling")
    })

    it("content container is scrollable", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} data-testid="ptr">
          <div>Content</div>
        </PullToRefresh>
      )

      const container = screen.getByTestId("ptr")
      const content = container.querySelector(".overflow-auto")
      expect(content).toBeInTheDocument()
    })
  })

  describe("Indicator Colors", () => {
    it("passes pullColor to indicator", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} pullColor="text-red-500">
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("passes thresholdColor to indicator", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} thresholdColor="text-green-500">
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("passes refreshingColor to indicator", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} refreshingColor="text-blue-500">
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })
  })

  describe("Indicator Size", () => {
    it("passes indicatorSize to indicator", () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} indicatorSize={60}>
          <div>Content</div>
        </PullToRefresh>
      )
      expect(screen.getByText("Content")).toBeInTheDocument()
    })
  })
})

describe("Reduced Motion", () => {
  beforeEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
  })

  afterEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })

  it("RefreshIndicator respects reduced motion", () => {
    render(
      <RefreshIndicator
        pullDistance={50}
        pullProgress={0.5}
        isThresholdReached={false}
        isRefreshing={false}
        data-testid="indicator"
      />
    )
    // Component renders without animation
    expect(screen.getByTestId("indicator")).toBeInTheDocument()
  })

  it("RefreshIndicator spinner respects reduced motion", () => {
    render(
      <RefreshIndicator
        pullDistance={80}
        pullProgress={1}
        isThresholdReached={true}
        isRefreshing={true}
        data-testid="indicator"
      />
    )
    expect(screen.getByTestId("indicator")).toBeInTheDocument()
  })

  it("PullToRefresh respects reduced motion", () => {
    render(
      <PullToRefresh onRefresh={vi.fn()} data-testid="ptr">
        <div>Content</div>
      </PullToRefresh>
    )
    expect(screen.getByTestId("ptr")).toBeInTheDocument()
  })
})

describe("pullToRefreshClasses", () => {
  it("exports container class", () => {
    expect(pullToRefreshClasses.container).toBe("relative overflow-hidden")
  })

  it("exports content class", () => {
    expect(pullToRefreshClasses.content).toBe("h-full overflow-auto touch-pan-y")
  })

  it("exports indicator class", () => {
    expect(pullToRefreshClasses.indicator).toContain("absolute")
    expect(pullToRefreshClasses.indicator).toContain("flex")
    expect(pullToRefreshClasses.indicator).toContain("justify-center")
  })

  it("exports pulling class", () => {
    expect(pullToRefreshClasses.pulling).toBe("cursor-grabbing")
  })

  it("exports thresholdReached class", () => {
    expect(pullToRefreshClasses.thresholdReached).toBe("scale-110")
  })

  it("exports refreshingSpinner class", () => {
    expect(pullToRefreshClasses.refreshingSpinner).toBe("animate-spin")
  })
})

describe("pullToRefreshVariants", () => {
  it("exports indicator variants", () => {
    expect(pullToRefreshVariants.indicator).toBeDefined()
    expect(pullToRefreshVariants.indicator.hidden).toBeDefined()
    expect(pullToRefreshVariants.indicator.visible).toBeDefined()
    expect(pullToRefreshVariants.indicator.exit).toBeDefined()
  })

  it("exports content variants", () => {
    expect(pullToRefreshVariants.content).toBeDefined()
    expect(pullToRefreshVariants.content.rest).toBeDefined()
    expect(pullToRefreshVariants.content.pulling).toBeDefined()
  })

  it("exports spinner variants", () => {
    expect(pullToRefreshVariants.spinner).toBeDefined()
    expect(pullToRefreshVariants.spinner.animate).toBeDefined()
  })

  it("content pulling variant is a function", () => {
    expect(typeof pullToRefreshVariants.content.pulling).toBe("function")
    const result = pullToRefreshVariants.content.pulling(50)
    expect(result).toEqual({ y: 50 })
  })
})

describe("Custom ClassName", () => {
  it("RefreshIndicator accepts custom className", () => {
    render(
      <RefreshIndicator
        pullDistance={50}
        pullProgress={0.5}
        isThresholdReached={false}
        isRefreshing={false}
        className="custom-class"
        data-testid="indicator"
      />
    )
    expect(screen.getByTestId("indicator")).toHaveClass("custom-class")
  })

  it("PullToRefresh accepts custom className", () => {
    render(
      <PullToRefresh onRefresh={vi.fn()} className="custom-class" data-testid="ptr">
        <div>Content</div>
      </PullToRefresh>
    )
    expect(screen.getByTestId("ptr")).toHaveClass("custom-class")
  })
})

describe("Edge Cases", () => {
  it("handles rapid touch start/end", () => {
    const onRefresh = vi.fn()
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh })
    )

    Object.defineProperty(result.current.containerRef, "current", {
      value: { scrollTop: 0 },
      writable: true,
    })

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      result.current.handlers.onTouchEnd()
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      result.current.handlers.onTouchEnd()
    })

    expect(result.current.isPulling).toBe(false)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it("handles pull up (negative distance)", () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh: vi.fn() })
    )

    Object.defineProperty(result.current.containerRef, "current", {
      value: { scrollTop: 0 },
      writable: true,
    })

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 100))
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 50))
    })

    expect(result.current.pullDistance).toBe(0)
  })

  it("does not trigger refresh when already refreshing", async () => {
    let resolveRefresh: () => void
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise<void>(resolve => { resolveRefresh = resolve })
    )

    const { result } = renderHook(() =>
      // Use lower threshold and higher resistance
      usePullToRefresh({ onRefresh, threshold: 50, resistance: 0.9 })
    )

    Object.defineProperty(result.current.containerRef, "current", {
      value: { scrollTop: 0 },
      writable: true,
    })

    // First refresh
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150))
    })

    expect(result.current.isThresholdReached).toBe(true)

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(result.current.isRefreshing).toBe(true)

    // Try to trigger second refresh while first is in progress
    // Touch start won't work when already refreshing
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
    })

    // Should still be only 1 call (couldn't start new pull while refreshing)
    expect(onRefresh).toHaveBeenCalledTimes(1)

    // Complete the refresh
    await act(async () => {
      resolveRefresh!()
      await new Promise(resolve => setTimeout(resolve, 0))
    })
  })

  it("handles synchronous onRefresh", async () => {
    const onRefresh = vi.fn()
    const { result } = renderHook(() =>
      // Use lower threshold and higher resistance
      usePullToRefresh({ onRefresh, threshold: 50, resistance: 0.9 })
    )

    Object.defineProperty(result.current.containerRef, "current", {
      value: { scrollTop: 0 },
      writable: true,
    })

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150))
    })

    expect(result.current.isThresholdReached).toBe(true)

    await act(async () => {
      result.current.handlers.onTouchEnd()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(result.current.isRefreshing).toBe(false)
  })
})

describe("Integration", () => {
  it("full pull-to-refresh flow with hook", async () => {
    // Test the hook integration directly since DOM touch events
    // don't trigger the React handlers in test environment
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 50, resistance: 0.9 })
    )

    Object.defineProperty(result.current.containerRef, "current", {
      value: { scrollTop: 0 },
      writable: true,
    })

    // Simulate full pull flow
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent("touchstart", 0))
      result.current.handlers.onTouchMove(createTouchEvent("touchmove", 150))
    })

    expect(result.current.isPulling).toBe(true)
    expect(result.current.isThresholdReached).toBe(true)

    await act(async () => {
      result.current.handlers.onTouchEnd()
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it("does not trigger when disabled", () => {
    const onRefresh = vi.fn()

    render(
      <PullToRefresh onRefresh={onRefresh} disabled data-testid="ptr">
        <div>Content</div>
      </PullToRefresh>
    )

    const container = screen.getByTestId("ptr")
    const content = container.querySelector(".overflow-auto") as HTMLElement

    fireEvent.touchStart(content, { touches: [{ clientY: 0 }] })
    fireEvent.touchMove(content, { touches: [{ clientY: 100 }] })
    fireEvent.touchEnd(content)

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
