/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  UsageDashboard,
  UsageOverview,
  UsageCard,
  UsageProgress,
  BillingInfo,
  UsageChart,
  UsageBreakdown,
  ExportButton,
  type UsageDashboardProps,
  type UsageData,
  type PlanInfo,
  type BreakdownItem,
} from "../usage-dashboard"

// Mock data
const mockUsageData: UsageData = {
  apiCalls: { used: 7500, limit: 10000, trend: "up" },
  storage: { used: 3.2, limit: 5, unit: "GB" },
  members: { used: 8, limit: 10 },
  workspaces: { used: 2, limit: 3 },
  history: [
    { date: new Date("2026-01-01"), apiCalls: 2000, storage: 2.1 },
    { date: new Date("2026-01-08"), apiCalls: 3500, storage: 2.5 },
    { date: new Date("2026-01-15"), apiCalls: 5200, storage: 2.8 },
    { date: new Date("2026-01-22"), apiCalls: 6800, storage: 3.0 },
    { date: new Date("2026-01-29"), apiCalls: 7500, storage: 3.2 },
  ],
}

const mockPlanInfo: PlanInfo = {
  tier: "pro",
  name: "Pro Plan",
  billingPeriod: {
    start: new Date("2026-01-01"),
    end: new Date("2026-02-01"),
  },
  price: 49,
  features: ["10K API calls/month", "5GB storage", "10 team members", "Priority support"],
}

const mockBreakdown: BreakdownItem[] = [
  { name: "Brand Analysis", endpoint: "/api/analyze", calls: 3500, percentage: 46.7 },
  { name: "Competitor Search", endpoint: "/api/search", calls: 2200, percentage: 29.3 },
  { name: "Reports", endpoint: "/api/reports", calls: 1200, percentage: 16.0 },
  { name: "Alerts", endpoint: "/api/alerts", calls: 600, percentage: 8.0 },
]

const defaultProps: UsageDashboardProps = {
  workspaceId: "workspace-1",
  usage: mockUsageData,
  plan: mockPlanInfo,
  breakdown: mockBreakdown,
}

// Mock ResizeObserver for Recharts
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

function stubObjectUrl(url: string) {
  const MockURL = class extends URL {};
  Object.defineProperties(MockURL, {
    createObjectURL: { value: vi.fn().mockReturnValue(url) },
    revokeObjectURL: { value: vi.fn() },
  });
  vi.stubGlobal("URL", MockURL);
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("UsageDashboard", () => {
  describe("rendering", () => {
    it("renders all usage metric cards", () => {
      render(<UsageDashboard {...defaultProps} />)

      expect(screen.getByText("API Calls")).toBeInTheDocument()
      expect(screen.getByText("Storage")).toBeInTheDocument()
      expect(screen.getByText("Team Members")).toBeInTheDocument()
      expect(screen.getByText("Workspaces")).toBeInTheDocument()
    })

    it("renders billing information", () => {
      render(<UsageDashboard {...defaultProps} />)

      expect(screen.getByText("Billing")).toBeInTheDocument()
      expect(screen.getByText("Pro Plan")).toBeInTheDocument()
      expect(screen.getByText("$49")).toBeInTheDocument()
    })

    it("renders usage history section", () => {
      render(<UsageDashboard {...defaultProps} />)

      expect(screen.getByText("Usage History")).toBeInTheDocument()
      expect(screen.getByText("API calls and storage over the billing period")).toBeInTheDocument()
    })

    it("renders usage breakdown table", () => {
      render(<UsageDashboard {...defaultProps} />)

      expect(screen.getByText("Usage Breakdown")).toBeInTheDocument()
      expect(screen.getByText("Brand Analysis")).toBeInTheDocument()
      expect(screen.getByText("Competitor Search")).toBeInTheDocument()
    })

    it("hides breakdown section when empty", () => {
      render(<UsageDashboard {...defaultProps} breakdown={[]} />)

      expect(screen.queryByText("Usage Breakdown")).not.toBeInTheDocument()
    })

    it("renders loading state", () => {
      render(<UsageDashboard {...defaultProps} isLoading />)

      expect(screen.getByText("Loading usage data...")).toBeInTheDocument()
    })

    it("renders error message", () => {
      const error = "Failed to load usage data"
      render(<UsageDashboard {...defaultProps} error={error} />)

      expect(screen.getByRole("alert")).toHaveTextContent(error)
    })
  })

  describe("upgrade prompt", () => {
    it("shows upgrade prompt when approaching limits", () => {
      const highUsage: UsageData = {
        ...mockUsageData,
        apiCalls: { used: 8000, limit: 10000, trend: "up" }, // 80%
      }
      const onUpgrade = vi.fn()

      render(<UsageDashboard {...defaultProps} usage={highUsage} onUpgrade={onUpgrade} />)

      expect(screen.getByText("You're approaching your usage limits")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /upgrade now/i })).toBeInTheDocument()
    })

    it("calls onUpgrade when upgrade button clicked", async () => {
      const highUsage: UsageData = {
        ...mockUsageData,
        apiCalls: { used: 8000, limit: 10000, trend: "up" },
      }
      const onUpgrade = vi.fn()
      const user = userEvent.setup()

      render(<UsageDashboard {...defaultProps} usage={highUsage} onUpgrade={onUpgrade} />)

      await user.click(screen.getByRole("button", { name: /upgrade now/i }))
      expect(onUpgrade).toHaveBeenCalledTimes(1)
    })

    it("does not show upgrade prompt for enterprise plan", () => {
      const enterprisePlan: PlanInfo = { ...mockPlanInfo, tier: "enterprise", name: "Enterprise" }
      const highUsage: UsageData = {
        ...mockUsageData,
        apiCalls: { used: 9000, limit: 10000, trend: "up" },
      }

      render(<UsageDashboard {...defaultProps} plan={enterprisePlan} usage={highUsage} />)

      expect(screen.queryByText("You're approaching your usage limits")).not.toBeInTheDocument()
    })

    it("does not show upgrade prompt when usage is low", () => {
      const lowUsage: UsageData = {
        ...mockUsageData,
        apiCalls: { used: 3000, limit: 10000, trend: "up" },
        storage: { used: 1, limit: 5, unit: "GB" },
        members: { used: 3, limit: 10 },
      }

      render(<UsageDashboard {...defaultProps} usage={lowUsage} />)

      expect(screen.queryByText("You're approaching your usage limits")).not.toBeInTheDocument()
    })
  })

  describe("export functionality", () => {
    it("renders export button when onExportData provided", () => {
      const onExportData = vi.fn()
      render(<UsageDashboard {...defaultProps} onExportData={onExportData} />)

      expect(screen.getByRole("button", { name: /export data/i })).toBeInTheDocument()
    })

    it("does not render export button when onExportData not provided", () => {
      render(<UsageDashboard {...defaultProps} onExportData={undefined} />)

      expect(screen.queryByRole("button", { name: /export data/i })).not.toBeInTheDocument()
    })
  })
})

describe("UsageOverview", () => {
  it("renders all metric cards", () => {
    render(<UsageOverview usage={mockUsageData} />)

    expect(screen.getByText("API Calls")).toBeInTheDocument()
    expect(screen.getByText("Storage")).toBeInTheDocument()
    expect(screen.getByText("Team Members")).toBeInTheDocument()
    expect(screen.getByText("Workspaces")).toBeInTheDocument()
  })

  it("does not render workspaces card when not provided", () => {
    const usageWithoutWorkspaces: UsageData = {
      ...mockUsageData,
      workspaces: undefined,
    }

    render(<UsageOverview usage={usageWithoutWorkspaces} />)

    expect(screen.queryByText("Workspaces")).not.toBeInTheDocument()
  })

  it("shows trend indicators", () => {
    render(<UsageOverview usage={mockUsageData} />)

    // API calls has trend "up"
    expect(screen.getByLabelText("Trending up")).toBeInTheDocument()
  })
})

describe("UsageCard", () => {
  it("renders card with title and values", () => {
    render(
      <UsageCard
        title="API Calls"
        icon={<span data-testid="icon" />}
        used={7500}
        limit={10000}
      />
    )

    expect(screen.getByText("API Calls")).toBeInTheDocument()
    expect(screen.getByText("7.5K")).toBeInTheDocument()
    expect(screen.getByText(/10K/)).toBeInTheDocument()
  })

  it("shows warning badge when approaching limit (70-90%)", () => {
    render(
      <UsageCard
        title="Storage"
        icon={<span />}
        used={75}
        limit={100}
      />
    )

    expect(screen.getByText("Approaching limit")).toBeInTheDocument()
  })

  it("shows error badge when near limit (>90%)", () => {
    render(
      <UsageCard
        title="Storage"
        icon={<span />}
        used={95}
        limit={100}
      />
    )

    expect(screen.getByText("Near limit")).toBeInTheDocument()
  })

  it("does not show badges when usage is low (<70%)", () => {
    render(
      <UsageCard
        title="Storage"
        icon={<span />}
        used={50}
        limit={100}
      />
    )

    expect(screen.queryByText("Approaching limit")).not.toBeInTheDocument()
    expect(screen.queryByText("Near limit")).not.toBeInTheDocument()
  })

  it("shows trend indicator when provided", () => {
    render(
      <UsageCard
        title="API Calls"
        icon={<span />}
        used={7500}
        limit={10000}
        trend="up"
      />
    )

    expect(screen.getByLabelText("Trending up")).toBeInTheDocument()
  })

  it("shows description when provided", () => {
    render(
      <UsageCard
        title="API Calls"
        icon={<span />}
        used={7500}
        limit={10000}
        description="This billing period"
      />
    )

    expect(screen.getByText("This billing period")).toBeInTheDocument()
  })

  it("displays unit when provided", () => {
    render(
      <UsageCard
        title="Storage"
        icon={<span />}
        used={3}
        limit={5}
        unit="GB"
      />
    )

    expect(screen.getByText(/5 GB/)).toBeInTheDocument()
  })
})

describe("UsageProgress", () => {
  it("renders progress bar with correct percentage", () => {
    render(<UsageProgress used={75} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "75")
  })

  it("shows usage labels", () => {
    render(<UsageProgress used={750} limit={1000} unit="calls" />)

    // Text is split across elements, use regex or check for partial content
    expect(screen.getByText(/750/)).toBeInTheDocument()
    expect(screen.getByText(/used/)).toBeInTheDocument()
    expect(screen.getByText(/1K/)).toBeInTheDocument()
    expect(screen.getByText(/limit/)).toBeInTheDocument()
  })

  it("hides labels when showPercentage is false", () => {
    render(<UsageProgress used={75} limit={100} showPercentage={false} />)

    expect(screen.queryByText(/used/)).not.toBeInTheDocument()
    expect(screen.queryByText(/limit/)).not.toBeInTheDocument()
  })

  it("has green color when under 70%", () => {
    render(<UsageProgress used={50} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar.className).toContain("bg-success")
  })

  it("has yellow color when 70-90%", () => {
    render(<UsageProgress used={80} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar.className).toContain("bg-warning")
  })

  it("has red color and pulse animation when over 90%", () => {
    render(<UsageProgress used={95} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar.className).toContain("bg-destructive")
    expect(progressBar.className).toContain("animate-pulse")
  })

  it("caps percentage at 100%", () => {
    render(<UsageProgress used={150} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "100")
  })

  it("handles zero limit gracefully", () => {
    render(<UsageProgress used={50} limit={0} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "0")
  })
})

describe("BillingInfo", () => {
  it("renders plan name and tier badge", () => {
    render(<BillingInfo plan={mockPlanInfo} />)

    expect(screen.getByText("Pro Plan")).toBeInTheDocument()
    expect(screen.getByText("Billing")).toBeInTheDocument()
  })

  it("renders billing period dates", () => {
    render(<BillingInfo plan={mockPlanInfo} />)

    expect(screen.getByText(/Jan 1, 2026/)).toBeInTheDocument()
    expect(screen.getByText(/Feb 1, 2026/)).toBeInTheDocument()
  })

  it("renders price when provided", () => {
    render(<BillingInfo plan={mockPlanInfo} />)

    expect(screen.getByText("$49")).toBeInTheDocument()
    expect(screen.getByText("/month")).toBeInTheDocument()
  })

  it("renders plan features", () => {
    render(<BillingInfo plan={mockPlanInfo} />)

    expect(screen.getByText("10K API calls/month")).toBeInTheDocument()
    expect(screen.getByText("5GB storage")).toBeInTheDocument()
  })

  it("shows upgrade button for non-enterprise plans", () => {
    const onUpgrade = vi.fn()
    render(<BillingInfo plan={mockPlanInfo} onUpgrade={onUpgrade} />)

    expect(screen.getByRole("button", { name: /upgrade plan/i })).toBeInTheDocument()
  })

  it("hides upgrade button for enterprise plan", () => {
    const enterprisePlan: PlanInfo = { ...mockPlanInfo, tier: "enterprise", name: "Enterprise" }
    const onUpgrade = vi.fn()

    render(<BillingInfo plan={enterprisePlan} onUpgrade={onUpgrade} />)

    expect(screen.queryByRole("button", { name: /upgrade plan/i })).not.toBeInTheDocument()
  })

  it("hides upgrade button when showUpgrade is false", () => {
    const onUpgrade = vi.fn()
    render(<BillingInfo plan={mockPlanInfo} onUpgrade={onUpgrade} showUpgrade={false} />)

    expect(screen.queryByRole("button", { name: /upgrade plan/i })).not.toBeInTheDocument()
  })

  it("calls onUpgrade when upgrade button clicked", async () => {
    const onUpgrade = vi.fn()
    const user = userEvent.setup()

    render(<BillingInfo plan={mockPlanInfo} onUpgrade={onUpgrade} />)

    await user.click(screen.getByRole("button", { name: /upgrade plan/i }))
    expect(onUpgrade).toHaveBeenCalledTimes(1)
  })

  it("shows warning when billing period ending soon", () => {
    const expiringPlan: PlanInfo = {
      ...mockPlanInfo,
      billingPeriod: {
        start: new Date("2026-01-01"),
        end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // ~3 days from now
      },
    }

    render(<BillingInfo plan={expiringPlan} />)

    expect(screen.getByText("Days Remaining")).toBeInTheDocument()
    // Check for any number of days (timing can vary slightly)
    expect(screen.getByText(/\d+ days/)).toBeInTheDocument()
  })
})

describe("UsageChart", () => {
  it("renders chart with history data", () => {
    render(<UsageChart history={mockUsageData.history} />)

    // Chart should be rendered (ResponsiveContainer)
    expect(screen.queryByText("No usage history available")).not.toBeInTheDocument()
  })

  it("shows empty state when no history", () => {
    render(<UsageChart history={[]} />)

    expect(screen.getByText("No usage history available")).toBeInTheDocument()
  })

  it("applies custom height", () => {
    const { container } = render(<UsageChart history={mockUsageData.history} height={400} />)

    const chartContainer = container.firstChild as HTMLElement
    expect(chartContainer.style.height).toBe("400px")
  })
})

describe("UsageBreakdown", () => {
  it("renders table with breakdown items", () => {
    render(<UsageBreakdown items={mockBreakdown} />)

    expect(screen.getByText("Brand Analysis")).toBeInTheDocument()
    expect(screen.getByText("Competitor Search")).toBeInTheDocument()
    expect(screen.getByText("Reports")).toBeInTheDocument()
    expect(screen.getByText("Alerts")).toBeInTheDocument()
  })

  it("renders endpoint paths", () => {
    render(<UsageBreakdown items={mockBreakdown} />)

    expect(screen.getByText("/api/analyze")).toBeInTheDocument()
    expect(screen.getByText("/api/search")).toBeInTheDocument()
  })

  it("renders call counts", () => {
    render(<UsageBreakdown items={mockBreakdown} />)

    expect(screen.getByText("3.5K")).toBeInTheDocument()
    expect(screen.getByText("2.2K")).toBeInTheDocument()
  })

  it("renders percentages", () => {
    render(<UsageBreakdown items={mockBreakdown} />)

    expect(screen.getByText("46.7%")).toBeInTheDocument()
    expect(screen.getByText("29.3%")).toBeInTheDocument()
  })

  it("limits items when maxItems provided", () => {
    render(<UsageBreakdown items={mockBreakdown} maxItems={2} />)

    expect(screen.getByText("Brand Analysis")).toBeInTheDocument()
    expect(screen.getByText("Competitor Search")).toBeInTheDocument()
    expect(screen.queryByText("Reports")).not.toBeInTheDocument()
    expect(screen.queryByText("Alerts")).not.toBeInTheDocument()
  })

  it("shows empty state when no items", () => {
    render(<UsageBreakdown items={[]} />)

    expect(screen.getByText("No usage breakdown available")).toBeInTheDocument()
  })
})

describe("ExportButton", () => {
  it("renders export button", () => {
    const onExport = vi.fn().mockResolvedValue(new Blob())
    render(<ExportButton onExport={onExport} />)

    expect(screen.getByRole("button", { name: /export data/i })).toBeInTheDocument()
  })

  it("calls onExport when clicked", async () => {
    const mockBlob = new Blob(["test data"], { type: "text/csv" })
    const onExport = vi.fn().mockResolvedValue(mockBlob)
    const user = userEvent.setup()

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockUrl = "blob:test"
    stubObjectUrl(mockUrl)

    render(<ExportButton onExport={onExport} />)

    await user.click(screen.getByRole("button", { name: /export data/i }))

    await waitFor(() => {
      expect(onExport).toHaveBeenCalledTimes(1)
    })
  })

  it("shows loading state while exporting", async () => {
    // Create a promise we can control
    let resolveExport: (value: Blob) => void = () => {}
    const exportPromise = new Promise<Blob>((resolve) => {
      resolveExport = resolve
    })
    const onExport = vi.fn().mockReturnValue(exportPromise)
    const user = userEvent.setup()

    // Mock URL APIs
    stubObjectUrl("blob:test")

    render(<ExportButton onExport={onExport} />)

    // Click export
    await user.click(screen.getByRole("button", { name: /export data/i }))

    // Should show loading text
    expect(screen.getByText("Exporting...")).toBeInTheDocument()

    // Resolve the export
    resolveExport(new Blob(["test"], { type: "text/csv" }))

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText("Export Data")).toBeInTheDocument()
    })
  })

  it("disables button while exporting", async () => {
    let resolveExport: (value: Blob) => void = () => {}
    const exportPromise = new Promise<Blob>((resolve) => {
      resolveExport = resolve
    })
    const onExport = vi.fn().mockReturnValue(exportPromise)
    const user = userEvent.setup()

    stubObjectUrl("blob:test")

    render(<ExportButton onExport={onExport} />)

    await user.click(screen.getByRole("button", { name: /export data/i }))

    // Button should be disabled while exporting
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()

    // Resolve and cleanup
    resolveExport(new Blob(["test"], { type: "text/csv" }))
    await waitFor(() => {
      expect(button).not.toBeDisabled()
    })
  })
})

describe("accessibility", () => {
  it("has accessible progress bars", () => {
    render(<UsageProgress used={75} limit={100} />)

    const progressBar = screen.getByRole("progressbar")
    expect(progressBar).toHaveAttribute("aria-valuenow", "75")
    expect(progressBar).toHaveAttribute("aria-valuemin", "0")
    expect(progressBar).toHaveAttribute("aria-valuemax", "100")
    expect(progressBar).toHaveAttribute("aria-label", "75% used")
  })

  it("has accessible error alert", () => {
    render(<UsageDashboard {...defaultProps} error="Something went wrong" />)

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong")
  })

  it("has accessible loading state", () => {
    render(<UsageDashboard {...defaultProps} isLoading />)

    expect(screen.getByText("Loading usage data...")).toBeInTheDocument()
  })

  it("has accessible trend indicators", () => {
    render(<UsageOverview usage={mockUsageData} />)

    expect(screen.getByLabelText("Trending up")).toBeInTheDocument()
  })

  it("has accessible table structure", () => {
    render(<UsageBreakdown items={mockBreakdown} />)

    expect(screen.getByRole("table")).toBeInTheDocument()
    expect(screen.getAllByRole("columnheader")).toHaveLength(3)
    expect(screen.getAllByRole("row")).toHaveLength(5) // header + 4 data rows
  })
})

describe("plan tiers", () => {
  it("renders free plan correctly", () => {
    const freePlan: PlanInfo = {
      ...mockPlanInfo,
      tier: "free",
      name: "Free",
      price: 0,
    }

    render(<BillingInfo plan={freePlan} />)

    expect(screen.getByText("Free")).toBeInTheDocument()
    expect(screen.getByText("$0")).toBeInTheDocument()
  })

  it("renders pro plan correctly", () => {
    render(<BillingInfo plan={mockPlanInfo} />)

    expect(screen.getByText("Pro Plan")).toBeInTheDocument()
  })

  it("renders enterprise plan correctly", () => {
    const enterprisePlan: PlanInfo = {
      ...mockPlanInfo,
      tier: "enterprise",
      name: "Enterprise",
      price: 299,
    }

    render(<BillingInfo plan={enterprisePlan} />)

    expect(screen.getByText("Enterprise")).toBeInTheDocument()
  })
})

describe("trend directions", () => {
  it("shows up arrow for upward trend", () => {
    const upTrendUsage: UsageData = {
      ...mockUsageData,
      apiCalls: { used: 7500, limit: 10000, trend: "up" },
    }

    render(<UsageOverview usage={upTrendUsage} />)

    expect(screen.getByLabelText("Trending up")).toBeInTheDocument()
  })

  it("shows down arrow for downward trend", () => {
    const downTrendUsage: UsageData = {
      ...mockUsageData,
      apiCalls: { used: 7500, limit: 10000, trend: "down" },
    }

    render(<UsageOverview usage={downTrendUsage} />)

    expect(screen.getByLabelText("Trending down")).toBeInTheDocument()
  })

  it("shows stable indicator for stable trend", () => {
    const stableTrendUsage: UsageData = {
      ...mockUsageData,
      apiCalls: { used: 7500, limit: 10000, trend: "stable" },
    }

    render(<UsageOverview usage={stableTrendUsage} />)

    expect(screen.getByLabelText("Stable")).toBeInTheDocument()
  })
})

describe("number formatting", () => {
  it("formats thousands with K suffix", () => {
    render(
      <UsageCard
        title="API Calls"
        icon={<span />}
        used={7500}
        limit={10000}
      />
    )

    expect(screen.getByText("7.5K")).toBeInTheDocument()
    expect(screen.getByText(/10K/)).toBeInTheDocument()
  })

  it("formats millions with M suffix", () => {
    render(
      <UsageCard
        title="API Calls"
        icon={<span />}
        used={1500000}
        limit={2000000}
      />
    )

    expect(screen.getByText("1.5M")).toBeInTheDocument()
    expect(screen.getByText(/2M/)).toBeInTheDocument()
  })

  it("displays small numbers without suffix", () => {
    render(
      <UsageCard
        title="Members"
        icon={<span />}
        used={8}
        limit={10}
      />
    )

    expect(screen.getByText("8")).toBeInTheDocument()
    expect(screen.getByText(/10/)).toBeInTheDocument()
  })
})
