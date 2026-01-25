

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Settings, Plus, RefreshCw } from "lucide-react"
import {
  PageHeader,
  PageHeaderActions,
  SimpleBreadcrumbs,
  PageTitle,
  PageSection,
} from "../page-header"
import { AppShell } from "../app-shell"
import { Button } from "@/components/ui/button"

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
Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
})

// Helper to render with AppShell context
const renderWithAppShell = (children: React.ReactNode) => {
  return render(
    <AppShell sidebarState="expanded">
      {children}
    </AppShell>
  )
}

describe("PageHeader", () => {
  describe("Basic Rendering", () => {
    it("renders title", () => {
      renderWithAppShell(<PageHeader title="Dashboard" />)
      expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
    })

    it("renders description", () => {
      renderWithAppShell(
        <PageHeader
          title="Dashboard"
          description="View your analytics and metrics"
        />
      )
      expect(screen.getByText("View your analytics and metrics")).toBeInTheDocument()
    })

    it("renders with border by default", () => {
      renderWithAppShell(
        <PageHeader title="Test" data-testid="header" />
      )
      const header = screen.getByTestId("header")
      expect(header).toHaveClass("border-b")
    })

    it("can disable border", () => {
      renderWithAppShell(
        <PageHeader title="Test" bordered={false} data-testid="header" />
      )
      const header = screen.getByTestId("header")
      expect(header).not.toHaveClass("border-b")
    })

    it("supports sticky positioning", () => {
      renderWithAppShell(
        <PageHeader title="Test" sticky data-testid="header" />
      )
      const header = screen.getByTestId("header")
      expect(header).toHaveClass("sticky")
      expect(header).toHaveClass("top-0")
    })
  })

  describe("Breadcrumbs", () => {
    it("shows home breadcrumb by default", () => {
      renderWithAppShell(<PageHeader title="Settings" />)
      expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument()
    })

    it("can hide home breadcrumb", () => {
      renderWithAppShell(
        <PageHeader title="Settings" showHomeBreadcrumb={false} />
      )
      expect(screen.queryByRole("link", { name: /home/i })).not.toBeInTheDocument()
    })

    it("renders custom breadcrumb items", () => {
      renderWithAppShell(
        <PageHeader
          title="Edit User"
          breadcrumbs={[
            { label: "Users", href: "/users" },
            { label: "John Doe", href: "/users/1" },
          ]}
        />
      )
      expect(screen.getByText("Users")).toBeInTheDocument()
      expect(screen.getByText("John Doe")).toBeInTheDocument()
      // Title appears both in breadcrumb and h1, so use getAllByText
      const editUserElements = screen.getAllByText("Edit User")
      expect(editUserElements.length).toBeGreaterThanOrEqual(1)
    })

    it("makes breadcrumb items with href navigable", () => {
      renderWithAppShell(
        <PageHeader
          title="Settings"
          breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }]}
        />
      )
      const dashboardLink = screen.getByRole("link", { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute("href", "/dashboard")
    })

    it("shows current page as non-link", () => {
      renderWithAppShell(<PageHeader title="Current Page" />)
      // Current page should not be a link
      const currentPage = screen.getByText("Current Page", { selector: "span" })
      expect(currentPage).toBeInTheDocument()
    })
  })

  describe("Actions", () => {
    it("renders actions", () => {
      renderWithAppShell(
        <PageHeader
          title="Dashboard"
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          }
        />
      )
      expect(screen.getByRole("button", { name: /add new/i })).toBeInTheDocument()
    })

    it("renders multiple actions", () => {
      renderWithAppShell(
        <PageHeader
          title="Dashboard"
          actions={
            <>
              <Button variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add New
              </Button>
            </>
          }
        />
      )
      expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /add new/i })).toBeInTheDocument()
    })
  })
})

describe("PageHeaderActions", () => {
  it("renders children", () => {
    render(
      <PageHeaderActions>
        <Button>Action 1</Button>
        <Button>Action 2</Button>
      </PageHeaderActions>
    )
    expect(screen.getByRole("button", { name: "Action 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Action 2" })).toBeInTheDocument()
  })

  it("has flex layout", () => {
    render(
      <PageHeaderActions data-testid="actions">
        <Button>Test</Button>
      </PageHeaderActions>
    )
    const actions = screen.getByTestId("actions")
    expect(actions).toHaveClass("flex")
    expect(actions).toHaveClass("items-center")
    expect(actions).toHaveClass("gap-2")
  })
})

describe("SimpleBreadcrumbs", () => {
  it("renders items", () => {
    render(
      <SimpleBreadcrumbs
        items={[
          { label: "Category", href: "/category" },
          { label: "Current" },
        ]}
      />
    )
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Current")).toBeInTheDocument()
  })

  it("can hide home", () => {
    render(
      <SimpleBreadcrumbs
        items={[{ label: "Page" }]}
        showHome={false}
      />
    )
    expect(screen.queryByText("Home")).not.toBeInTheDocument()
    expect(screen.getByText("Page")).toBeInTheDocument()
  })

  it("renders with custom separator", () => {
    render(
      <SimpleBreadcrumbs
        items={[{ label: "Page" }]}
        separator={<span>/</span>}
      />
    )
    expect(screen.getByText("/")).toBeInTheDocument()
  })

  it("has proper nav structure", () => {
    render(
      <SimpleBreadcrumbs items={[{ label: "Page" }]} />
    )
    expect(screen.getByRole("navigation", { name: "breadcrumb" })).toBeInTheDocument()
  })
})

describe("PageTitle", () => {
  it("renders title", () => {
    render(<PageTitle title="My Page" />)
    expect(screen.getByRole("heading", { name: "My Page" })).toBeInTheDocument()
  })

  it("renders subtitle", () => {
    render(<PageTitle title="Title" subtitle="Subtitle text" />)
    expect(screen.getByText("Subtitle text")).toBeInTheDocument()
  })

  it("renders badge", () => {
    render(
      <PageTitle
        title="Users"
        badge={<span data-testid="badge">Active</span>}
      />
    )
    expect(screen.getByTestId("badge")).toBeInTheDocument()
  })

  it("uses h1 by default", () => {
    render(<PageTitle title="Heading" />)
    const heading = screen.getByRole("heading", { name: "Heading" })
    expect(heading.tagName).toBe("H1")
  })

  it("supports custom heading level", () => {
    render(<PageTitle title="Heading" as="h2" />)
    const heading = screen.getByRole("heading", { name: "Heading" })
    expect(heading.tagName).toBe("H2")
  })
})

describe("PageSection", () => {
  it("renders children", () => {
    render(
      <PageSection>
        <div>Section content</div>
      </PageSection>
    )
    expect(screen.getByText("Section content")).toBeInTheDocument()
  })

  it("renders title", () => {
    render(
      <PageSection title="Section Title">
        <div>Content</div>
      </PageSection>
    )
    expect(screen.getByRole("heading", { name: "Section Title" })).toBeInTheDocument()
  })

  it("renders description", () => {
    render(
      <PageSection title="Title" description="Section description">
        <div>Content</div>
      </PageSection>
    )
    expect(screen.getByText("Section description")).toBeInTheDocument()
  })

  it("renders actions", () => {
    render(
      <PageSection
        title="Section"
        actions={<Button>Action</Button>}
      >
        <div>Content</div>
      </PageSection>
    )
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument()
  })

  it("has section element", () => {
    render(
      <PageSection data-testid="section">
        <div>Content</div>
      </PageSection>
    )
    const section = screen.getByTestId("section")
    expect(section.tagName).toBe("SECTION")
  })

  it("supports bordered variant", () => {
    render(
      <PageSection bordered data-testid="section">
        <div>Content</div>
      </PageSection>
    )
    const section = screen.getByTestId("section")
    expect(section).toHaveClass("border-t")
  })
})

describe("Full Page Layout", () => {
  it("renders complete page structure", () => {
    renderWithAppShell(
      <>
        <PageHeader
          title="Users"
          description="Manage your team members"
          breadcrumbs={[{ label: "Settings", href: "/settings" }]}
          actions={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          }
        />
        <div className="p-6">
          <PageSection title="Active Users" description="Currently active team members">
            <div>User list here</div>
          </PageSection>
          <PageSection title="Pending Invites" bordered>
            <div>Invites list here</div>
          </PageSection>
        </div>
      </>
    )

    // Header elements
    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument()
    expect(screen.getByText("Manage your team members")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add user/i })).toBeInTheDocument()

    // Breadcrumbs
    expect(screen.getByText("Home")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()

    // Sections
    expect(screen.getByRole("heading", { name: "Active Users" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Pending Invites" })).toBeInTheDocument()
  })
})
