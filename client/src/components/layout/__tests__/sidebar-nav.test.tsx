

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  Home,
  Settings,
  Users,
  ChartLine,
  User,
} from "lucide-react"
import {
  SidebarNav,
  SidebarNavHeader,
  SidebarNavContent,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavFooter,
  SidebarNavStatus,
  SidebarNavMobileToggle,
} from "../sidebar-nav"
import { AppShell, AppShellSidebar } from "../app-shell"

// Mock wouter
vi.mock("wouter", () => ({
  Link: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ["/", vi.fn()],
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, "localStorage", { value: localStorageMock })

// Helper to render with AppShell context
const renderWithAppShell = (
  children: React.ReactNode,
  sidebarState: "expanded" | "collapsed" | "hidden" = "expanded"
) => {
  return render(
    <AppShell sidebarState={sidebarState}>
      <AppShellSidebar>{children}</AppShellSidebar>
    </AppShell>
  )
}

describe("SidebarNav", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, "innerWidth", { value: 1200, writable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("Basic Rendering", () => {
    it("renders children", () => {
      renderWithAppShell(
        <SidebarNav>
          <div>Nav content</div>
        </SidebarNav>
      )

      expect(screen.getByText("Nav content")).toBeInTheDocument()
    })

    it("has transition classes", () => {
      renderWithAppShell(
        <SidebarNav data-testid="nav">
          <div>Content</div>
        </SidebarNav>
      )

      const nav = screen.getByTestId("nav")
      expect(nav).toHaveClass("transition-all")
    })

    it("has reduced motion support", () => {
      renderWithAppShell(
        <SidebarNav data-testid="nav">
          <div>Content</div>
        </SidebarNav>
      )

      const nav = screen.getByTestId("nav")
      expect(nav).toHaveClass("motion-reduce:transition-none")
    })
  })

  describe("SidebarNavHeader", () => {
    it("renders logo", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader
            logo={<ChartLine data-testid="logo" className="w-4 h-4" />}
            title="Brand Tracker"
          />
        </SidebarNav>
      )

      expect(screen.getByTestId("logo")).toBeInTheDocument()
    })

    it("renders title", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Brand Tracker" subtitle="Analytics" />
        </SidebarNav>
      )

      expect(screen.getByText("Brand Tracker")).toBeInTheDocument()
    })

    it("renders subtitle", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Brand" subtitle="Analytics" />
        </SidebarNav>
      )

      expect(screen.getByText("Analytics")).toBeInTheDocument()
    })

    it("hides text when collapsed", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Brand Tracker" subtitle="Analytics" />
        </SidebarNav>,
        "collapsed"
      )

      expect(screen.queryByText("Brand Tracker")).not.toBeInTheDocument()
      expect(screen.queryByText("Analytics")).not.toBeInTheDocument()
    })

    it("has border styling", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader data-testid="header" title="Title" />
        </SidebarNav>
      )

      const header = screen.getByTestId("header")
      expect(header).toHaveClass("border-b")
    })
  })

  describe("SidebarNavContent", () => {
    it("renders content", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <div>Items here</div>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(screen.getByText("Items here")).toBeInTheDocument()
    })

    it("has overflow-y-auto for scrolling", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent data-testid="content">
            <div>Content</div>
          </SidebarNavContent>
        </SidebarNav>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("overflow-y-auto")
    })
  })

  describe("SidebarNavGroup", () => {
    it("renders group label when expanded", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavGroup label="Navigation">
              <SidebarNavItem href="/" icon={<Home />}>
                Home
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(screen.getByText("Navigation")).toBeInTheDocument()
    })

    it("hides label text when collapsed", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavGroup label="Navigation">
              <SidebarNavItem href="/" icon={<Home />}>
                Home
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNavContent>
        </SidebarNav>,
        "collapsed"
      )

      expect(screen.queryByText("Navigation")).not.toBeInTheDocument()
    })

    it("has group role", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavGroup label="Main" data-testid="group">
              <SidebarNavItem href="/" icon={<Home />}>
                Home
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNavContent>
        </SidebarNav>
      )

      const group = screen.getByTestId("group")
      expect(group).toHaveAttribute("role", "group")
      expect(group).toHaveAttribute("aria-label", "Main")
    })
  })

  describe("SidebarNavItem", () => {
    it("renders as link", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/dashboard" icon={<Home />}>
              Dashboard
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      const link = screen.getByRole("link", { name: /dashboard/i })
      expect(link).toHaveAttribute("href", "/dashboard")
    })

    it("renders icon", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/" icon={<Home data-testid="icon" />}>
              Home
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(screen.getByTestId("icon")).toBeInTheDocument()
    })

    it("renders label text when expanded", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/" icon={<Home />}>
              Dashboard
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(screen.getByText("Dashboard")).toBeInTheDocument()
    })

    it("hides label when collapsed (icon only)", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/" icon={<Home data-testid="icon" />}>
              Dashboard
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>,
        "collapsed"
      )

      // Icon should still be visible
      expect(screen.getByTestId("icon")).toBeInTheDocument()
      // Text should be hidden but available for tooltip
      // The text is used in the tooltip but not visible directly
    })

    it("supports badge", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/" icon={<Home />} badge="5">
              Notifications
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(screen.getByText("5")).toBeInTheDocument()
    })

    it("applies active styling when isActive prop is true", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/dashboard" icon={<Home />} isActive>
              Dashboard
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      const link = screen.getByRole("link", { name: /dashboard/i })
      expect(link).toHaveClass("font-bold")
      expect(link).toHaveAttribute("aria-current", "page")
    })

    it("supports disabled state", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavContent>
            <SidebarNavItem href="/disabled" icon={<Home />} disabled>
              Disabled
            </SidebarNavItem>
          </SidebarNavContent>
        </SidebarNav>
      )

      const link = screen.getByRole("link", { name: /disabled/i })
      expect(link).toHaveClass("pointer-events-none")
      expect(link).toHaveClass("opacity-50")
    })
  })

  describe("SidebarNavFooter", () => {
    it("renders avatar", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavFooter
            avatar={<User data-testid="avatar" />}
            primaryText="John Doe"
          />
        </SidebarNav>
      )

      expect(screen.getByTestId("avatar")).toBeInTheDocument()
    })

    it("renders primary text", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavFooter primaryText="John Doe" secondaryText="Admin" />
        </SidebarNav>
      )

      expect(screen.getByText("John Doe")).toBeInTheDocument()
    })

    it("renders secondary text", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavFooter primaryText="John Doe" secondaryText="Admin" />
        </SidebarNav>
      )

      expect(screen.getByText("Admin")).toBeInTheDocument()
    })

    it("hides text when collapsed", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavFooter
            avatar={<User />}
            primaryText="John Doe"
            secondaryText="Admin"
          />
        </SidebarNav>,
        "collapsed"
      )

      expect(screen.queryByText("John Doe")).not.toBeInTheDocument()
      expect(screen.queryByText("Admin")).not.toBeInTheDocument()
    })

    it("has border styling on trigger button", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavFooter data-testid="footer" primaryText="User" />
        </SidebarNav>
      )

      const footer = screen.getByTestId("footer")
      expect(footer).toHaveClass("border-t")
    })
  })

  describe("SidebarNavStatus", () => {
    it("renders success status", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavStatus
            status="success"
            label="Connected"
            info="Last sync: 2 min ago"
            data-testid="status"
          />
        </SidebarNav>
      )

      expect(screen.getByText("Connected")).toBeInTheDocument()
      expect(screen.getByText("Last sync: 2 min ago")).toBeInTheDocument()
    })

    it("applies success styling", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavStatus status="success" label="OK" data-testid="status" />
        </SidebarNav>
      )

      const status = screen.getByTestId("status")
      expect(status).toHaveClass("border-success/20")
      expect(status).toHaveClass("bg-success/10")
    })

    it("applies warning styling", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavStatus
            status="warning"
            label="Warning"
            data-testid="status"
          />
        </SidebarNav>
      )

      const status = screen.getByTestId("status")
      expect(status).toHaveClass("border-warning/20")
    })

    it("applies error styling", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavStatus status="error" label="Error" data-testid="status" />
        </SidebarNav>
      )

      const status = screen.getByTestId("status")
      expect(status).toHaveClass("border-destructive/20")
    })

    it("shows only indicator dot when collapsed", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavStatus
            status="success"
            label="Connected"
            info="Details"
          />
        </SidebarNav>,
        "collapsed"
      )

      // Label and info should not be visible
      expect(screen.queryByText("Connected")).not.toBeInTheDocument()
      expect(screen.queryByText("Details")).not.toBeInTheDocument()
    })
  })

  describe("Collapse Toggle", () => {
    it("shows collapse button when header has showCollapseToggle", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Test" showCollapseToggle />
          <SidebarNavContent>
            <div>Content</div>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(
        screen.getByRole("button", { name: /collapse sidebar/i })
      ).toBeInTheDocument()
    })

    it("can hide collapse button", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Test" showCollapseToggle={false} />
          <SidebarNavContent>
            <div>Content</div>
          </SidebarNavContent>
        </SidebarNav>
      )

      expect(
        screen.queryByRole("button", { name: /collapse sidebar/i })
      ).not.toBeInTheDocument()
    })

    it("hides collapse button in header when collapsed (toggle is in main header)", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader title="Test" showCollapseToggle />
          <SidebarNavContent>
            <div>Content</div>
          </SidebarNavContent>
        </SidebarNav>,
        "collapsed"
      )

      // When collapsed, the toggle button is NOT in the sidebar header
      // It's in the main AppShellHeader (SidebarNavHeaderToggle)
      expect(
        screen.queryByRole("button", { name: /collapse sidebar/i })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole("button", { name: /expand sidebar/i })
      ).not.toBeInTheDocument()
    })
  })

  describe("Complete Sidebar", () => {
    it("renders full sidebar structure", () => {
      renderWithAppShell(
        <SidebarNav>
          <SidebarNavHeader
            logo={<ChartLine className="w-4 h-4" />}
            title="Brand Tracker"
            subtitle="Analytics"
          />
          <SidebarNavContent>
            <SidebarNavGroup label="Main">
              <SidebarNavItem href="/" icon={<Home />} isActive>
                Dashboard
              </SidebarNavItem>
              <SidebarNavItem href="/users" icon={<Users />}>
                Users
              </SidebarNavItem>
              <SidebarNavItem href="/settings" icon={<Settings />}>
                Settings
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNavContent>
          <SidebarNavStatus status="success" label="API Connected" />
          <SidebarNavFooter
            avatar={<User className="w-4 h-4" />}
            primaryText="John Doe"
            secondaryText="Admin"
          />
        </SidebarNav>
      )

      // Header
      expect(screen.getByText("Brand Tracker")).toBeInTheDocument()
      expect(screen.getByText("Analytics")).toBeInTheDocument()

      // Navigation
      expect(screen.getByText("Main")).toBeInTheDocument()
      expect(screen.getByText("Dashboard")).toBeInTheDocument()
      expect(screen.getByText("Users")).toBeInTheDocument()
      expect(screen.getByText("Settings")).toBeInTheDocument()

      // Status
      expect(screen.getByText("API Connected")).toBeInTheDocument()

      // Footer
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      expect(screen.getByText("Admin")).toBeInTheDocument()
    })
  })
})
