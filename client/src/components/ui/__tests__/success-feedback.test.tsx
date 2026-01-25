// @vitest-environment jsdom



import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  SuccessIcon,
  SuccessMessage,
  SuccessBanner,
  SuccessCard,
  Confetti,
  useConfetti,
  hasMilestoneBeenAchieved,
  markMilestoneAchieved,
  clearMilestones,
  successClasses,
} from "../success-feedback"

// Mock prefersReducedMotion
vi.mock("@/lib/motion", async () => {
  const actual = await vi.importActual("@/lib/motion")
  return {
    ...actual,
    prefersReducedMotion: vi.fn(() => false),
  }
})

import { prefersReducedMotion } from "@/lib/motion"

describe("SuccessIcon", () => {
  describe("Rendering", () => {
    it("renders default size", () => {
      render(<SuccessIcon data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass("w-12", "h-12")
    })

    it("renders small size", () => {
      render(<SuccessIcon size="sm" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("w-8", "h-8")
    })

    it("renders large size", () => {
      render(<SuccessIcon size="lg" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("w-16", "h-16")
    })

    it("renders xl size", () => {
      render(<SuccessIcon size="xl" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("w-24", "h-24")
    })
  })

  describe("Variants", () => {
    it("renders default variant with background", () => {
      render(<SuccessIcon variant="default" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("bg-success/10")
    })

    it("renders outline variant with border", () => {
      render(<SuccessIcon variant="outline" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("border-2", "border-success")
    })

    it("renders solid variant", () => {
      render(<SuccessIcon variant="solid" data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon).toHaveClass("bg-success")
    })
  })

  describe("Accessibility", () => {
    it("has role=img", () => {
      render(<SuccessIcon />)
      expect(screen.getByRole("img")).toBeInTheDocument()
    })

    it("has aria-label", () => {
      render(<SuccessIcon />)
      expect(screen.getByRole("img")).toHaveAttribute("aria-label", "Success")
    })
  })

  describe("Animation", () => {
    it("renders without animation when animate=false", () => {
      render(<SuccessIcon animate={false} data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      // Should render static check icon
      expect(icon.querySelector("svg")).toBeInTheDocument()
    })

    it("renders without animation when reduced motion preferred", () => {
      vi.mocked(prefersReducedMotion).mockReturnValue(true)
      render(<SuccessIcon data-testid="icon" />)
      const icon = screen.getByTestId("icon")
      expect(icon.querySelector("svg")).toBeInTheDocument()
      vi.mocked(prefersReducedMotion).mockReturnValue(false)
    })
  })
})

describe("SuccessMessage", () => {
  describe("Rendering", () => {
    it("renders with title", () => {
      render(<SuccessMessage title="Success!" />)
      expect(screen.getByText("Success!")).toBeInTheDocument()
    })

    it("renders with description", () => {
      render(<SuccessMessage title="Done" description="Your changes have been saved." />)
      expect(screen.getByText("Your changes have been saved.")).toBeInTheDocument()
    })

    it("renders with children", () => {
      render(
        <SuccessMessage title="Done">
          <span data-testid="child">Custom content</span>
        </SuccessMessage>
      )
      expect(screen.getByTestId("child")).toBeInTheDocument()
    })

    it("renders icon by default", () => {
      render(<SuccessMessage title="Done" />)
      const container = screen.getByRole("status")
      expect(container.querySelector("svg")).toBeInTheDocument()
    })

    it("hides icon when hideIcon is true", () => {
      render(<SuccessMessage title="Done" hideIcon />)
      const container = screen.getByRole("status")
      // Only the dismiss button might have an svg, not the success icon
      const svgs = container.querySelectorAll("svg")
      // With hideIcon and no dismissible, should have no svgs
      expect(svgs.length).toBe(0)
    })
  })

  describe("Variants", () => {
    it("renders default variant", () => {
      render(<SuccessMessage title="Done" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("bg-success/10")
    })

    it("renders subtle variant", () => {
      render(<SuccessMessage title="Done" variant="subtle" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("bg-success/5")
    })

    it("renders outline variant", () => {
      render(<SuccessMessage title="Done" variant="outline" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("border-success")
    })

    it("renders solid variant", () => {
      render(<SuccessMessage title="Done" variant="solid" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("bg-success")
    })
  })

  describe("Sizes", () => {
    it("renders small size", () => {
      render(<SuccessMessage title="Done" size="sm" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("p-3", "text-sm")
    })

    it("renders large size", () => {
      render(<SuccessMessage title="Done" size="lg" data-testid="msg" />)
      const msg = screen.getByTestId("msg")
      expect(msg).toHaveClass("p-5", "text-lg")
    })
  })

  describe("Dismissible", () => {
    it("shows dismiss button when dismissible", () => {
      render(<SuccessMessage title="Done" dismissible />)
      expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument()
    })

    it("calls onDismiss when dismiss button clicked", async () => {
      const onDismiss = vi.fn()
      render(<SuccessMessage title="Done" dismissible onDismiss={onDismiss} />)

      await userEvent.click(screen.getByRole("button", { name: /dismiss/i }))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it("does not show dismiss button by default", () => {
      render(<SuccessMessage title="Done" />)
      expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument()
    })
  })

  describe("Auto Dismiss", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("auto dismisses after specified time", async () => {
      const onDismiss = vi.fn()
      render(<SuccessMessage title="Done" autoDismiss={3000} onDismiss={onDismiss} />)

      expect(onDismiss).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3000)
      })

      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it("does not auto dismiss without onDismiss", async () => {
      render(<SuccessMessage title="Done" autoDismiss={1000} />)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      // Should still be visible
      expect(screen.getByText("Done")).toBeInTheDocument()
    })
  })

  describe("Action Button", () => {
    it("renders action button", () => {
      const action = { label: "View details", onClick: vi.fn() }
      render(<SuccessMessage title="Done" action={action} />)
      expect(screen.getByRole("button", { name: /view details/i })).toBeInTheDocument()
    })

    it("calls action onClick when clicked", async () => {
      const action = { label: "View details", onClick: vi.fn() }
      render(<SuccessMessage title="Done" action={action} />)

      await userEvent.click(screen.getByRole("button", { name: /view details/i }))
      expect(action.onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<SuccessMessage title="Done" />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("has aria-live=polite", () => {
      render(<SuccessMessage title="Done" />)
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    })
  })
})

describe("SuccessBanner", () => {
  describe("Rendering", () => {
    it("renders message", () => {
      render(<SuccessBanner message="Operation successful!" />)
      expect(screen.getByText("Operation successful!")).toBeInTheDocument()
    })

    it("renders check icon", () => {
      render(<SuccessBanner message="Done" />)
      const container = screen.getByRole("status")
      expect(container.querySelector("svg")).toBeInTheDocument()
    })
  })

  describe("Position", () => {
    it("renders at top by default", () => {
      render(<SuccessBanner message="Done" data-testid="banner" />)
      const banner = screen.getByTestId("banner")
      expect(banner).toHaveClass("top-0")
    })

    it("renders at bottom when specified", () => {
      render(<SuccessBanner message="Done" position="bottom" data-testid="banner" />)
      const banner = screen.getByTestId("banner")
      expect(banner).toHaveClass("bottom-0")
    })
  })

  describe("Dismissible", () => {
    it("shows dismiss button by default", () => {
      render(<SuccessBanner message="Done" />)
      expect(screen.getByRole("button", { name: /dismiss/i })).toBeInTheDocument()
    })

    it("hides dismiss button when dismissible is false", () => {
      render(<SuccessBanner message="Done" dismissible={false} />)
      expect(screen.queryByRole("button", { name: /dismiss/i })).not.toBeInTheDocument()
    })

    it("calls onDismiss when clicked", async () => {
      const onDismiss = vi.fn()
      render(<SuccessBanner message="Done" onDismiss={onDismiss} />)

      await userEvent.click(screen.getByRole("button", { name: /dismiss/i }))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe("Action Button", () => {
    it("renders action button", () => {
      const action = { label: "Undo", onClick: vi.fn() }
      render(<SuccessBanner message="Deleted" action={action} />)
      expect(screen.getByRole("button", { name: /undo/i })).toBeInTheDocument()
    })

    it("calls action onClick", async () => {
      const action = { label: "Undo", onClick: vi.fn() }
      render(<SuccessBanner message="Deleted" action={action} />)

      await userEvent.click(screen.getByRole("button", { name: /undo/i }))
      expect(action.onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<SuccessBanner message="Done" />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })
  })
})

describe("SuccessCard", () => {
  describe("Rendering", () => {
    it("renders title", () => {
      render(<SuccessCard title="Payment Complete" />)
      expect(screen.getByText("Payment Complete")).toBeInTheDocument()
    })

    it("renders description", () => {
      render(
        <SuccessCard
          title="Done"
          description="Your order has been placed successfully."
        />
      )
      expect(screen.getByText("Your order has been placed successfully.")).toBeInTheDocument()
    })

    it("renders children", () => {
      render(
        <SuccessCard title="Done">
          <p data-testid="child">Order #12345</p>
        </SuccessCard>
      )
      expect(screen.getByTestId("child")).toBeInTheDocument()
    })

    it("renders success icon by default", () => {
      render(<SuccessCard title="Done" />)
      expect(screen.getByRole("img", { name: /success/i })).toBeInTheDocument()
    })

    it("renders celebration icon when celebrate is true", () => {
      render(<SuccessCard title="Done" celebrate />)
      // When celebrate is true, we show PartyPopper instead of SuccessIcon
      expect(screen.queryByRole("img", { name: /success/i })).not.toBeInTheDocument()
    })
  })

  describe("Actions", () => {
    it("renders primary action", () => {
      const primaryAction = { label: "Continue", onClick: vi.fn() }
      render(<SuccessCard title="Done" primaryAction={primaryAction} />)
      expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument()
    })

    it("renders secondary action", () => {
      const secondaryAction = { label: "Go Back", onClick: vi.fn() }
      render(<SuccessCard title="Done" secondaryAction={secondaryAction} />)
      expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument()
    })

    it("calls primaryAction onClick", async () => {
      const primaryAction = { label: "Continue", onClick: vi.fn() }
      render(<SuccessCard title="Done" primaryAction={primaryAction} />)

      await userEvent.click(screen.getByRole("button", { name: /continue/i }))
      expect(primaryAction.onClick).toHaveBeenCalledTimes(1)
    })

    it("calls secondaryAction onClick", async () => {
      const secondaryAction = { label: "Go Back", onClick: vi.fn() }
      render(<SuccessCard title="Done" secondaryAction={secondaryAction} />)

      await userEvent.click(screen.getByRole("button", { name: /go back/i }))
      expect(secondaryAction.onClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has role=status", () => {
      render(<SuccessCard title="Done" />)
      expect(screen.getByRole("status")).toBeInTheDocument()
    })

    it("has aria-live=polite", () => {
      render(<SuccessCard title="Done" />)
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite")
    })
  })
})

describe("Confetti", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders nothing when inactive", () => {
    const { container } = render(<Confetti active={false} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders confetti pieces when active", () => {
    render(<Confetti active count={10} />)
    const container = document.querySelector(".fixed.inset-0")
    expect(container).toBeInTheDocument()
  })

  it("calls onComplete after duration", async () => {
    const onComplete = vi.fn()
    render(<Confetti active duration={1000} onComplete={onComplete} />)

    expect(onComplete).not.toHaveBeenCalled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it("respects custom colors", () => {
    render(<Confetti active count={5} colors={["#ff0000", "#00ff00"]} />)
    const container = document.querySelector(".fixed.inset-0")
    expect(container).toBeInTheDocument()
  })

  it("is aria-hidden", () => {
    render(<Confetti active />)
    const container = document.querySelector(".fixed.inset-0")
    expect(container).toHaveAttribute("aria-hidden", "true")
  })

  it("does not render when reduced motion preferred", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    const { container } = render(<Confetti active />)
    expect(container.firstChild).toBeNull()
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })
})

describe("useConfetti", () => {
  function TestComponent({ options = {} }: { options?: Parameters<typeof useConfetti>[0] }) {
    const { active, fire, stop, ConfettiComponent } = useConfetti(options)
    return (
      <div>
        <span data-testid="active">{active ? "active" : "inactive"}</span>
        <button onClick={fire}>Fire</button>
        <button onClick={stop}>Stop</button>
        {ConfettiComponent}
      </div>
    )
  }

  it("starts inactive", () => {
    render(<TestComponent />)
    expect(screen.getByTestId("active")).toHaveTextContent("inactive")
  })

  it("becomes active when fire is called", () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByRole("button", { name: /fire/i }))
    expect(screen.getByTestId("active")).toHaveTextContent("active")
  })

  it("becomes inactive when stop is called", () => {
    render(<TestComponent />)

    fireEvent.click(screen.getByRole("button", { name: /fire/i }))
    expect(screen.getByTestId("active")).toHaveTextContent("active")

    fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    expect(screen.getByTestId("active")).toHaveTextContent("inactive")
  })

  it("auto-stops after duration", async () => {
    vi.useFakeTimers()
    render(<TestComponent options={{ duration: 1000 }} />)

    fireEvent.click(screen.getByRole("button", { name: /fire/i }))
    expect(screen.getByTestId("active")).toHaveTextContent("active")

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })

    expect(screen.getByTestId("active")).toHaveTextContent("inactive")
    vi.useRealTimers()
  })

  it("does not activate when reduced motion preferred", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    render(<TestComponent />)

    fireEvent.click(screen.getByRole("button", { name: /fire/i }))
    expect(screen.getByTestId("active")).toHaveTextContent("inactive")

    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })
})

describe("Milestone Helpers", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("hasMilestoneBeenAchieved", () => {
    it("returns false for new milestone", () => {
      expect(hasMilestoneBeenAchieved("firstAnalysis")).toBe(false)
    })

    it("returns true for achieved milestone", () => {
      markMilestoneAchieved("firstAnalysis")
      expect(hasMilestoneBeenAchieved("firstAnalysis")).toBe(true)
    })
  })

  describe("markMilestoneAchieved", () => {
    it("marks milestone as achieved", () => {
      markMilestoneAchieved("onboarding")
      expect(localStorage.getItem("milestone_onboarding_complete")).toBe("true")
    })

    it("works for all milestone types", () => {
      markMilestoneAchieved("firstAnalysis")
      markMilestoneAchieved("onboarding")
      markMilestoneAchieved("perfectScore")

      expect(hasMilestoneBeenAchieved("firstAnalysis")).toBe(true)
      expect(hasMilestoneBeenAchieved("onboarding")).toBe(true)
      expect(hasMilestoneBeenAchieved("perfectScore")).toBe(true)
    })
  })

  describe("clearMilestones", () => {
    it("clears all milestones", () => {
      markMilestoneAchieved("firstAnalysis")
      markMilestoneAchieved("onboarding")

      clearMilestones()

      expect(hasMilestoneBeenAchieved("firstAnalysis")).toBe(false)
      expect(hasMilestoneBeenAchieved("onboarding")).toBe(false)
    })
  })
})

describe("successClasses", () => {
  it("exports bg class", () => {
    expect(successClasses.bg).toBe("bg-success/10")
  })

  it("exports text class", () => {
    expect(successClasses.text).toBe("text-success")
  })

  it("exports border class", () => {
    expect(successClasses.border).toBe("border-success")
  })

  it("exports ring class", () => {
    expect(successClasses.ring).toBe("ring-success")
  })

  it("exports bgSolid class", () => {
    expect(successClasses.bgSolid).toBe("bg-success text-success-foreground")
  })
})

describe("Reduced Motion", () => {
  it("SuccessMessage renders without animation", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    render(<SuccessMessage title="Done" data-testid="msg" />)
    // Should still render, just without motion wrapper
    expect(screen.getByText("Done")).toBeInTheDocument()
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })

  it("SuccessBanner renders without animation", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    render(<SuccessBanner message="Done" />)
    expect(screen.getByText("Done")).toBeInTheDocument()
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })

  it("SuccessCard renders without animation", () => {
    vi.mocked(prefersReducedMotion).mockReturnValue(true)
    render(<SuccessCard title="Done" />)
    expect(screen.getByText("Done")).toBeInTheDocument()
    vi.mocked(prefersReducedMotion).mockReturnValue(false)
  })
})

describe("Custom className", () => {
  it("SuccessIcon accepts custom className", () => {
    render(<SuccessIcon className="custom-class" data-testid="icon" />)
    expect(screen.getByTestId("icon")).toHaveClass("custom-class")
  })

  it("SuccessMessage accepts custom className", () => {
    render(<SuccessMessage title="Done" className="custom-class" data-testid="msg" />)
    expect(screen.getByTestId("msg")).toHaveClass("custom-class")
  })

  it("SuccessBanner accepts custom className", () => {
    render(<SuccessBanner message="Done" className="custom-class" data-testid="banner" />)
    expect(screen.getByTestId("banner")).toHaveClass("custom-class")
  })

  it("SuccessCard accepts custom className", () => {
    render(<SuccessCard title="Done" className="custom-class" data-testid="card" />)
    expect(screen.getByTestId("card")).toHaveClass("custom-class")
  })
})
