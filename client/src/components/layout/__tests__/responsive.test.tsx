

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { renderHook } from "@testing-library/react"
import {
  Show,
  Hide,
  ResponsiveContainer,
  ResponsiveStack,
  ResponsiveGrid,
  ResponsiveSpacer,
  VisuallyHidden,
  AspectRatioBox,
} from "../responsive"
import {
  useBreakpoint,
  useMediaQuery,
  BREAKPOINTS,
  getDeviceType,
  getSidebarStateForWidth,
} from "@/hooks/use-breakpoint"

// Helper to set window width
function setWindowWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    writable: true,
    configurable: true,
  })
  window.dispatchEvent(new Event("resize"))
}

describe("useBreakpoint", () => {
  beforeEach(() => {
    setWindowWidth(1200)
  })

  it("returns current width", () => {
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.width).toBe(1200)
  })

  it("detects desktop device", () => {
    setWindowWidth(1200)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.device).toBe("desktop")
    expect(result.current.isDesktop).toBe(true)
    expect(result.current.isMobile).toBe(false)
  })

  it("detects tablet device", () => {
    setWindowWidth(900)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.device).toBe("tablet")
    expect(result.current.isTablet).toBe(true)
  })

  it("detects mobile device", () => {
    setWindowWidth(500)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.device).toBe("mobile")
    expect(result.current.isMobile).toBe(true)
  })

  it("isAbove returns true for larger widths", () => {
    setWindowWidth(1200)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isAbove("lg")).toBe(true)
    expect(result.current.isAbove("xl")).toBe(false)
  })

  it("isBelow returns true for smaller widths", () => {
    setWindowWidth(700)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isBelow("md")).toBe(true) // 700 < 768
    expect(result.current.isBelow("sm")).toBe(false) // 700 >= 640
  })

  it("isBetween checks range correctly", () => {
    setWindowWidth(900)
    const { result } = renderHook(() => useBreakpoint())
    expect(result.current.isBetween("md", "lg")).toBe(true)
    expect(result.current.isBetween("lg", "xl")).toBe(false)
  })
})

describe("getDeviceType", () => {
  it("returns mobile for width < 768", () => {
    expect(getDeviceType(500)).toBe("mobile")
    expect(getDeviceType(767)).toBe("mobile")
  })

  it("returns tablet for width 768-1023", () => {
    expect(getDeviceType(768)).toBe("tablet")
    expect(getDeviceType(900)).toBe("tablet")
    expect(getDeviceType(1023)).toBe("tablet")
  })

  it("returns desktop for width >= 1024", () => {
    expect(getDeviceType(1024)).toBe("desktop")
    expect(getDeviceType(1920)).toBe("desktop")
  })
})

describe("getSidebarStateForWidth", () => {
  it("returns hidden for mobile", () => {
    expect(getSidebarStateForWidth(500)).toBe("hidden")
  })

  it("returns collapsed for tablet", () => {
    expect(getSidebarStateForWidth(900)).toBe("collapsed")
  })

  it("returns expanded for desktop", () => {
    expect(getSidebarStateForWidth(1200)).toBe("expanded")
  })
})

describe("BREAKPOINTS", () => {
  it("has correct values", () => {
    expect(BREAKPOINTS.sm).toBe(640)
    expect(BREAKPOINTS.md).toBe(768)
    expect(BREAKPOINTS.lg).toBe(1024)
    expect(BREAKPOINTS.xl).toBe(1280)
    expect(BREAKPOINTS["2xl"]).toBe(1536)
  })
})

describe("Show", () => {
  beforeEach(() => {
    setWindowWidth(1200)
  })

  it("renders children by default", () => {
    render(<Show>Content</Show>)
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("shows content above breakpoint", () => {
    setWindowWidth(1200)
    render(<Show above="lg">Desktop content</Show>)
    expect(screen.getByText("Desktop content")).toBeInTheDocument()
  })

  it("hides content below breakpoint threshold", () => {
    setWindowWidth(500)
    render(
      <Show above="lg" fallback={<span>Fallback</span>}>
        Desktop content
      </Show>
    )
    expect(screen.queryByText("Desktop content")).not.toBeInTheDocument()
    expect(screen.getByText("Fallback")).toBeInTheDocument()
  })

  it("shows content below breakpoint", () => {
    setWindowWidth(500)
    render(<Show below="md">Mobile content</Show>)
    expect(screen.getByText("Mobile content")).toBeInTheDocument()
  })

  it("shows content for specific device", () => {
    setWindowWidth(1200)
    render(<Show on="desktop">Desktop only</Show>)
    expect(screen.getByText("Desktop only")).toBeInTheDocument()
  })

  it("shows content for multiple devices", () => {
    setWindowWidth(900)
    render(<Show on={["tablet", "desktop"]}>Tablet+</Show>)
    expect(screen.getByText("Tablet+")).toBeInTheDocument()
  })
})

describe("Hide", () => {
  beforeEach(() => {
    setWindowWidth(1200)
  })

  it("renders children by default", () => {
    render(<Hide>Content</Hide>)
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("hides content above breakpoint", () => {
    setWindowWidth(1200)
    render(
      <Hide above="lg" fallback={<span>Hidden</span>}>
        Should hide
      </Hide>
    )
    expect(screen.queryByText("Should hide")).not.toBeInTheDocument()
    expect(screen.getByText("Hidden")).toBeInTheDocument()
  })

  it("hides content for specific device", () => {
    setWindowWidth(500)
    render(
      <Hide on="mobile" fallback={<span>Hidden on mobile</span>}>
        Desktop content
      </Hide>
    )
    expect(screen.queryByText("Desktop content")).not.toBeInTheDocument()
    expect(screen.getByText("Hidden on mobile")).toBeInTheDocument()
  })
})

describe("ResponsiveContainer", () => {
  it("renders children", () => {
    render(<ResponsiveContainer>Content</ResponsiveContainer>)
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("applies max-width class", () => {
    render(
      <ResponsiveContainer maxWidth="lg" data-testid="container">
        Content
      </ResponsiveContainer>
    )
    const container = screen.getByTestId("container")
    expect(container).toHaveClass("max-w-screen-lg")
  })

  it("applies padding classes", () => {
    render(
      <ResponsiveContainer padding="lg" data-testid="container">
        Content
      </ResponsiveContainer>
    )
    const container = screen.getByTestId("container")
    expect(container).toHaveClass("px-6")
  })

  it("centers by default", () => {
    render(
      <ResponsiveContainer data-testid="container">Content</ResponsiveContainer>
    )
    const container = screen.getByTestId("container")
    expect(container).toHaveClass("mx-auto")
  })

  it("can disable centering", () => {
    render(
      <ResponsiveContainer centered={false} data-testid="container">
        Content
      </ResponsiveContainer>
    )
    const container = screen.getByTestId("container")
    expect(container).not.toHaveClass("mx-auto")
  })
})

describe("ResponsiveStack", () => {
  it("renders children", () => {
    render(
      <ResponsiveStack>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveStack>
    )
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("applies flex layout", () => {
    render(
      <ResponsiveStack data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("flex")
  })

  it("defaults to column direction", () => {
    render(
      <ResponsiveStack data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("flex-col")
  })

  it("applies row direction", () => {
    render(
      <ResponsiveStack mobileDirection="row" data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("flex-row")
  })

  it("applies gap", () => {
    render(
      <ResponsiveStack gap="lg" data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("gap-6")
  })

  it("applies alignment", () => {
    render(
      <ResponsiveStack align="center" data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("items-center")
  })

  it("applies justify", () => {
    render(
      <ResponsiveStack justify="between" data-testid="stack">
        <div>Item</div>
      </ResponsiveStack>
    )
    const stack = screen.getByTestId("stack")
    expect(stack).toHaveClass("justify-between")
  })
})

describe("ResponsiveGrid", () => {
  it("renders children", () => {
    render(
      <ResponsiveGrid>
        <div>Item 1</div>
        <div>Item 2</div>
      </ResponsiveGrid>
    )
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("applies grid layout", () => {
    render(
      <ResponsiveGrid data-testid="grid">
        <div>Item</div>
      </ResponsiveGrid>
    )
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveClass("grid")
  })

  it("applies column count", () => {
    render(
      <ResponsiveGrid cols={3} data-testid="grid">
        <div>Item</div>
      </ResponsiveGrid>
    )
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveClass("grid-cols-3")
  })

  it("applies responsive columns", () => {
    render(
      <ResponsiveGrid cols={1} mdCols={2} lgCols={3} data-testid="grid">
        <div>Item</div>
      </ResponsiveGrid>
    )
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveClass("grid-cols-1")
    expect(grid).toHaveClass("md:grid-cols-2")
    expect(grid).toHaveClass("lg:grid-cols-3")
  })

  it("applies gap", () => {
    render(
      <ResponsiveGrid gap="lg" data-testid="grid">
        <div>Item</div>
      </ResponsiveGrid>
    )
    const grid = screen.getByTestId("grid")
    expect(grid).toHaveClass("gap-6")
  })
})

describe("ResponsiveSpacer", () => {
  it("renders as hidden element", () => {
    render(<ResponsiveSpacer data-testid="spacer" />)
    const spacer = screen.getByTestId("spacer")
    expect(spacer).toHaveAttribute("aria-hidden", "true")
  })

  it("applies vertical size", () => {
    render(<ResponsiveSpacer size="lg" data-testid="spacer" />)
    const spacer = screen.getByTestId("spacer")
    expect(spacer).toHaveClass("h-8")
  })

  it("applies horizontal size", () => {
    render(<ResponsiveSpacer size="lg" axis="horizontal" data-testid="spacer" />)
    const spacer = screen.getByTestId("spacer")
    expect(spacer).toHaveClass("w-8")
  })

  it("applies responsive sizes", () => {
    render(
      <ResponsiveSpacer
        size="sm"
        mdSize="md"
        lgSize="lg"
        data-testid="spacer"
      />
    )
    const spacer = screen.getByTestId("spacer")
    expect(spacer).toHaveClass("h-4")
    expect(spacer).toHaveClass("md:h-6")
    expect(spacer).toHaveClass("lg:h-8")
  })
})

describe("VisuallyHidden", () => {
  it("renders content", () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>)
    expect(screen.getByText("Hidden text")).toBeInTheDocument()
  })

  it("has visually hidden styles", () => {
    render(<VisuallyHidden data-testid="hidden">Text</VisuallyHidden>)
    const hidden = screen.getByTestId("hidden")
    expect(hidden).toHaveClass("absolute")
    expect(hidden).toHaveClass("w-px")
    expect(hidden).toHaveClass("h-px")
    expect(hidden).toHaveClass("overflow-hidden")
  })
})

describe("AspectRatioBox", () => {
  it("renders children", () => {
    render(
      <AspectRatioBox>
        <div>Content</div>
      </AspectRatioBox>
    )
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("has relative positioning", () => {
    render(
      <AspectRatioBox data-testid="box">
        <div>Content</div>
      </AspectRatioBox>
    )
    const box = screen.getByTestId("box")
    expect(box).toHaveClass("relative")
  })

  it("applies video aspect ratio by default", () => {
    render(
      <AspectRatioBox data-testid="box">
        <div>Content</div>
      </AspectRatioBox>
    )
    const box = screen.getByTestId("box")
    // 16:9 = 56.25%
    expect(box.style.paddingBottom).toBe("56.25%")
  })

  it("applies square aspect ratio", () => {
    render(
      <AspectRatioBox preset="square" data-testid="box">
        <div>Content</div>
      </AspectRatioBox>
    )
    const box = screen.getByTestId("box")
    // 1:1 = 100%
    expect(box.style.paddingBottom).toBe("100%")
  })

  it("applies custom aspect ratio", () => {
    render(
      <AspectRatioBox ratio={4 / 3} data-testid="box">
        <div>Content</div>
      </AspectRatioBox>
    )
    const box = screen.getByTestId("box")
    // 4:3 = 75%
    expect(box.style.paddingBottom).toBe("75%")
  })
})

describe("useMediaQuery", () => {
  beforeEach(() => {
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("1200"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it("returns match state", () => {
    const { result } = renderHook(() =>
      useMediaQuery("(min-width: 1200px)")
    )
    expect(result.current).toBe(true)
  })
})
