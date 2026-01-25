

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  AppShellHeader,
  AppShellContent,
  AppShellFooter,
  useAppShell,
} from "../app-shell"

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Mock matchMedia
const createMatchMedia = (width: number) => {
  return (query: string) => ({
    matches: query.includes(`${width}`) ? true : width < 768,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })
}

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    Object.defineProperty(window, "innerWidth", { value: 1200, writable: true })
    window.matchMedia = createMatchMedia(1200) as typeof window.matchMedia
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Basic Rendering", () => {
    it("renders children", () => {
      render(
        <AppShell>
          <div>Content</div>
        </AppShell>
      )

      expect(screen.getByText("Content")).toBeInTheDocument()
    })

    it("renders with proper layout classes", () => {
      render(
        <AppShell data-testid="shell">
          <div>Content</div>
        </AppShell>
      )

      const shell = screen.getByTestId("shell")
      expect(shell).toHaveClass("relative")
      expect(shell).toHaveClass("min-h-screen")
      expect(shell).toHaveClass("w-full")
    })
  })

  describe("Sidebar States", () => {
    it("defaults to expanded state", () => {
      render(
        <AppShell data-testid="shell">
          <div>Content</div>
        </AppShell>
      )

      const shell = screen.getByTestId("shell")
      expect(shell).toHaveAttribute("data-sidebar-state", "expanded")
    })

    it("supports collapsed state", () => {
      render(
        <AppShell data-testid="shell" sidebarState="collapsed">
          <div>Content</div>
        </AppShell>
      )

      const shell = screen.getByTestId("shell")
      expect(shell).toHaveAttribute("data-sidebar-state", "collapsed")
    })

    it("supports hidden state", () => {
      render(
        <AppShell data-testid="shell" sidebarState="hidden">
          <div>Content</div>
        </AppShell>
      )

      const shell = screen.getByTestId("shell")
      expect(shell).toHaveAttribute("data-sidebar-state", "hidden")
    })

    it("uses defaultSidebarState", () => {
      render(
        <AppShell data-testid="shell" defaultSidebarState="collapsed">
          <div>Content</div>
        </AppShell>
      )

      const shell = screen.getByTestId("shell")
      expect(shell).toHaveAttribute("data-sidebar-state", "collapsed")
    })

    it("calls onSidebarStateChange when state changes", async () => {
      const onStateChange = vi.fn()

      // We need a component that can trigger the toggle
      function TestComponent() {
        const { toggleSidebar } = useAppShell()
        return <button onClick={toggleSidebar}>Toggle</button>
      }

      render(
        <AppShell onSidebarStateChange={onStateChange}>
          <TestComponent />
        </AppShell>
      )

      const button = screen.getByRole("button", { name: "Toggle" })
      await userEvent.click(button)

      expect(onStateChange).toHaveBeenCalled()
    })
  })

  describe("AppShellSidebar", () => {
    it("renders sidebar content", () => {
      render(
        <AppShell>
          <AppShellSidebar>
            <nav>Navigation</nav>
          </AppShellSidebar>
        </AppShell>
      )

      expect(screen.getByText("Navigation")).toBeInTheDocument()
    })

    it("has aside element with proper aria-label", () => {
      render(
        <AppShell>
          <AppShellSidebar data-testid="sidebar">
            <nav>Nav</nav>
          </AppShellSidebar>
        </AppShell>
      )

      const sidebar = screen.getByTestId("sidebar")
      expect(sidebar.tagName).toBe("ASIDE")
      expect(sidebar).toHaveAttribute("aria-label", "Main navigation")
    })

    it("applies expanded width", () => {
      render(
        <AppShell sidebarState="expanded">
          <AppShellSidebar data-testid="sidebar">
            <nav>Nav</nav>
          </AppShellSidebar>
        </AppShell>
      )

      const sidebar = screen.getByTestId("sidebar")
      expect(sidebar).toHaveClass("w-[240px]")
    })

    it("applies collapsed width", () => {
      render(
        <AppShell sidebarState="collapsed">
          <AppShellSidebar data-testid="sidebar">
            <nav>Nav</nav>
          </AppShellSidebar>
        </AppShell>
      )

      const sidebar = screen.getByTestId("sidebar")
      expect(sidebar).toHaveClass("w-[64px]")
    })

    it("has border styling", () => {
      render(
        <AppShell>
          <AppShellSidebar data-testid="sidebar">
            <nav>Nav</nav>
          </AppShellSidebar>
        </AppShell>
      )

      const sidebar = screen.getByTestId("sidebar")
      expect(sidebar).toHaveClass("border-r")
      expect(sidebar).toHaveClass("border-sidebar-border")
    })
  })

  describe("AppShellMain", () => {
    it("renders as main element", () => {
      render(
        <AppShell>
          <AppShellMain data-testid="main">
            <div>Content</div>
          </AppShellMain>
        </AppShell>
      )

      const main = screen.getByTestId("main")
      expect(main.tagName).toBe("MAIN")
    })

    it("has flex-1 for flexible sizing", () => {
      render(
        <AppShell>
          <AppShellMain data-testid="main">
            <div>Content</div>
          </AppShellMain>
        </AppShell>
      )

      const main = screen.getByTestId("main")
      expect(main).toHaveClass("flex-1")
    })

    it("applies margin offset for expanded sidebar", () => {
      render(
        <AppShell sidebarState="expanded">
          <AppShellMain data-testid="main">
            <div>Content</div>
          </AppShellMain>
        </AppShell>
      )

      const main = screen.getByTestId("main")
      expect(main).toHaveClass("ml-[240px]")
    })

    it("applies margin offset for collapsed sidebar", () => {
      render(
        <AppShell sidebarState="collapsed">
          <AppShellMain data-testid="main">
            <div>Content</div>
          </AppShellMain>
        </AppShell>
      )

      const main = screen.getByTestId("main")
      expect(main).toHaveClass("ml-[64px]")
    })

    it("can disable sidebar offset", () => {
      render(
        <AppShell sidebarState="expanded">
          <AppShellMain data-testid="main" withSidebarOffset={false}>
            <div>Content</div>
          </AppShellMain>
        </AppShell>
      )

      const main = screen.getByTestId("main")
      expect(main).not.toHaveClass("ml-[240px]")
    })
  })

  describe("AppShellHeader", () => {
    it("renders as header element", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellHeader data-testid="header">
              <h1>Title</h1>
            </AppShellHeader>
          </AppShellMain>
        </AppShell>
      )

      const header = screen.getByTestId("header")
      expect(header.tagName).toBe("HEADER")
    })

    it("is sticky positioned", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellHeader data-testid="header">
              <h1>Title</h1>
            </AppShellHeader>
          </AppShellMain>
        </AppShell>
      )

      const header = screen.getByTestId("header")
      expect(header).toHaveClass("sticky")
      expect(header).toHaveClass("top-0")
    })

    it("has backdrop blur effect", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellHeader data-testid="header">
              <h1>Title</h1>
            </AppShellHeader>
          </AppShellMain>
        </AppShell>
      )

      const header = screen.getByTestId("header")
      expect(header).toHaveClass("backdrop-blur")
    })

    it("has border by default", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellHeader data-testid="header">
              <h1>Title</h1>
            </AppShellHeader>
          </AppShellMain>
        </AppShell>
      )

      const header = screen.getByTestId("header")
      expect(header).toHaveClass("border-b")
    })

    it("can disable border", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellHeader data-testid="header" bordered={false}>
              <h1>Title</h1>
            </AppShellHeader>
          </AppShellMain>
        </AppShell>
      )

      const header = screen.getByTestId("header")
      expect(header).not.toHaveClass("border-b")
    })
  })

  describe("AppShellContent", () => {
    it("renders with default padding", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("pt-4", "px-6", "pb-6")
    })

    it("supports small padding", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content" padding="sm">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("p-4")
    })

    it("supports no padding", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content" padding="none">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).not.toHaveClass("p-4")
      expect(content).not.toHaveClass("p-6")
    })

    it("supports max-width constraint", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content" maxWidth="6xl">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("max-w-6xl")
    })

    it("supports centered content", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content" centered maxWidth="6xl">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("mx-auto")
    })

    it("has overflow-auto for scrolling", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellContent data-testid="content">
              <div>Content</div>
            </AppShellContent>
          </AppShellMain>
        </AppShell>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("overflow-auto")
    })
  })

  describe("AppShellFooter", () => {
    it("renders as footer element", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellFooter data-testid="footer">
              <span>Footer content</span>
            </AppShellFooter>
          </AppShellMain>
        </AppShell>
      )

      const footer = screen.getByTestId("footer")
      expect(footer.tagName).toBe("FOOTER")
    })

    it("has border styling", () => {
      render(
        <AppShell>
          <AppShellMain>
            <AppShellFooter data-testid="footer">
              <span>Footer</span>
            </AppShellFooter>
          </AppShellMain>
        </AppShell>
      )

      const footer = screen.getByTestId("footer")
      expect(footer).toHaveClass("border-t")
    })
  })

  describe("useAppShell Hook", () => {
    it("throws error when used outside AppShell", () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      function TestComponent() {
        useAppShell()
        return <div>Test</div>
      }

      expect(() => render(<TestComponent />)).toThrow(
        "useAppShell must be used within an AppShell"
      )

      consoleSpy.mockRestore()
    })

    it("provides sidebarState", () => {
      function TestComponent() {
        const { sidebarState } = useAppShell()
        return <div data-testid="state">{sidebarState}</div>
      }

      render(
        <AppShell sidebarState="collapsed">
          <TestComponent />
        </AppShell>
      )

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed")
    })

    it("provides toggleSidebar function", async () => {
      function TestComponent() {
        const { sidebarState, toggleSidebar } = useAppShell()
        return (
          <div>
            <span data-testid="state">{sidebarState}</span>
            <button onClick={toggleSidebar}>Toggle</button>
          </div>
        )
      }

      render(
        <AppShell defaultSidebarState="expanded">
          <TestComponent />
        </AppShell>
      )

      expect(screen.getByTestId("state")).toHaveTextContent("expanded")

      await userEvent.click(screen.getByRole("button", { name: "Toggle" }))

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed")
    })
  })

  describe("Keyboard Shortcuts", () => {
    it("toggles sidebar with Ctrl+B", async () => {
      function TestComponent() {
        const { sidebarState } = useAppShell()
        return <span data-testid="state">{sidebarState}</span>
      }

      render(
        <AppShell defaultSidebarState="expanded">
          <TestComponent />
        </AppShell>
      )

      expect(screen.getByTestId("state")).toHaveTextContent("expanded")

      // Simulate Ctrl+B
      fireEvent.keyDown(window, { key: "b", ctrlKey: true })

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed")
    })

    it("toggles sidebar with Cmd+B (Mac)", async () => {
      function TestComponent() {
        const { sidebarState } = useAppShell()
        return <span data-testid="state">{sidebarState}</span>
      }

      render(
        <AppShell defaultSidebarState="expanded">
          <TestComponent />
        </AppShell>
      )

      expect(screen.getByTestId("state")).toHaveTextContent("expanded")

      // Simulate Cmd+B (Mac)
      fireEvent.keyDown(window, { key: "b", metaKey: true })

      expect(screen.getByTestId("state")).toHaveTextContent("collapsed")
    })
  })

  describe("State Persistence", () => {
    it("persists state to localStorage when persistState is true", async () => {
      function TestComponent() {
        const { toggleSidebar } = useAppShell()
        return <button onClick={toggleSidebar}>Toggle</button>
      }

      render(
        <AppShell defaultSidebarState="expanded" persistState>
          <TestComponent />
        </AppShell>
      )

      await userEvent.click(screen.getByRole("button", { name: "Toggle" }))

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "app-shell-sidebar-state",
        "collapsed"
      )
    })

    it("uses custom storage key", async () => {
      function TestComponent() {
        const { toggleSidebar } = useAppShell()
        return <button onClick={toggleSidebar}>Toggle</button>
      }

      render(
        <AppShell
          defaultSidebarState="expanded"
          persistState
          storageKey="custom-key"
        >
          <TestComponent />
        </AppShell>
      )

      await userEvent.click(screen.getByRole("button", { name: "Toggle" }))

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "custom-key",
        "collapsed"
      )
    })

    it("does not persist when persistState is false", async () => {
      function TestComponent() {
        const { toggleSidebar } = useAppShell()
        return <button onClick={toggleSidebar}>Toggle</button>
      }

      render(
        <AppShell defaultSidebarState="expanded" persistState={false}>
          <TestComponent />
        </AppShell>
      )

      await userEvent.click(screen.getByRole("button", { name: "Toggle" }))

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })
  })

  describe("Complete Layout", () => {
    it("renders full layout structure", () => {
      render(
        <AppShell data-testid="shell">
          <AppShellSidebar data-testid="sidebar">
            <nav>Navigation</nav>
          </AppShellSidebar>
          <AppShellMain data-testid="main">
            <AppShellHeader data-testid="header">
              <h1>Header</h1>
            </AppShellHeader>
            <AppShellContent data-testid="content">
              <div>Page Content</div>
            </AppShellContent>
            <AppShellFooter data-testid="footer">
              <span>Footer</span>
            </AppShellFooter>
          </AppShellMain>
        </AppShell>
      )

      expect(screen.getByTestId("shell")).toBeInTheDocument()
      expect(screen.getByTestId("sidebar")).toBeInTheDocument()
      expect(screen.getByTestId("main")).toBeInTheDocument()
      expect(screen.getByTestId("header")).toBeInTheDocument()
      expect(screen.getByTestId("content")).toBeInTheDocument()
      expect(screen.getByTestId("footer")).toBeInTheDocument()
    })
  })
})
