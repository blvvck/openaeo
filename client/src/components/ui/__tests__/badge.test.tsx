

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { Badge, StatusIndicator } from "../badge"
import { CheckCircle, AlertTriangle } from "lucide-react"

describe("Badge", () => {
  describe("Variants", () => {
    it("renders default variant", () => {
      render(<Badge>Default</Badge>)
      const badge = screen.getByText("Default")
      expect(badge).toHaveClass("bg-primary")
    })

    it("renders secondary variant", () => {
      render(<Badge variant="secondary">Secondary</Badge>)
      const badge = screen.getByText("Secondary")
      expect(badge).toHaveClass("bg-secondary")
    })

    it("renders success variant", () => {
      render(<Badge variant="success">Success</Badge>)
      const badge = screen.getByText("Success")
      expect(badge).toHaveClass("text-success")
    })

    it("renders warning variant", () => {
      render(<Badge variant="warning">Warning</Badge>)
      const badge = screen.getByText("Warning")
      expect(badge).toHaveClass("text-warning")
    })

    it("renders error variant", () => {
      render(<Badge variant="error">Error</Badge>)
      const badge = screen.getByText("Error")
      expect(badge).toHaveClass("text-destructive")
    })

    it("renders destructive variant (alias for error)", () => {
      render(<Badge variant="destructive">Destructive</Badge>)
      const badge = screen.getByText("Destructive")
      expect(badge).toHaveClass("text-destructive")
    })

    it("renders info variant", () => {
      render(<Badge variant="info">Info</Badge>)
      const badge = screen.getByText("Info")
      expect(badge).toHaveClass("text-info")
    })

    it("renders neutral variant", () => {
      render(<Badge variant="neutral">Neutral</Badge>)
      const badge = screen.getByText("Neutral")
      expect(badge).toHaveClass("bg-muted")
    })

    it("renders outline variant", () => {
      render(<Badge variant="outline">Outline</Badge>)
      const badge = screen.getByText("Outline")
      expect(badge).toHaveClass("bg-transparent")
      expect(badge).toHaveClass("border-border")
    })
  })

  describe("Platform Variant", () => {
    it("renders platform variant with ChatGPT", () => {
      render(<Badge variant="platform" platform="chatgpt">ChatGPT</Badge>)
      const badge = screen.getByText("ChatGPT")
      expect(badge).toHaveAttribute("data-platform", "chatgpt")
    })

    it("renders platform variant with Claude", () => {
      render(<Badge variant="platform" platform="claude">Claude</Badge>)
      const badge = screen.getByText("Claude")
      expect(badge).toHaveAttribute("data-platform", "claude")
    })

    it("renders platform variant with Gemini", () => {
      render(<Badge variant="platform" platform="gemini">Gemini</Badge>)
      const badge = screen.getByText("Gemini")
      expect(badge).toHaveAttribute("data-platform", "gemini")
    })

    it("renders platform variant with Perplexity", () => {
      render(<Badge variant="platform" platform="perplexity">Perplexity</Badge>)
      const badge = screen.getByText("Perplexity")
      expect(badge).toHaveAttribute("data-platform", "perplexity")
    })
  })

  describe("Sizes", () => {
    it("renders small size", () => {
      render(<Badge size="sm">Small</Badge>)
      const badge = screen.getByText("Small")
      expect(badge).toHaveClass("px-2")
      expect(badge).toHaveClass("text-xs")
    })

    it("renders default size", () => {
      render(<Badge size="default">Default</Badge>)
      const badge = screen.getByText("Default")
      expect(badge).toHaveClass("px-2.5")
    })

    it("renders large size", () => {
      render(<Badge size="lg">Large</Badge>)
      const badge = screen.getByText("Large")
      expect(badge).toHaveClass("px-3")
      expect(badge).toHaveClass("text-sm")
    })
  })

  describe("Icon + Text Pattern", () => {
    it("renders icon before text", () => {
      render(
        <Badge icon={<CheckCircle data-testid="icon" />}>
          With Icon
        </Badge>
      )
      expect(screen.getByTestId("icon")).toBeInTheDocument()
      expect(screen.getByText("With Icon")).toBeInTheDocument()
    })

    it("hides icon from screen readers", () => {
      render(
        <Badge icon={<CheckCircle data-testid="icon" />}>
          With Icon
        </Badge>
      )
      const iconWrapper = screen.getByTestId("icon").parentElement
      expect(iconWrapper).toHaveAttribute("aria-hidden", "true")
    })

    it("renders icon without text", () => {
      render(
        <Badge icon={<CheckCircle data-testid="icon" />} aria-label="Success" />
      )
      expect(screen.getByTestId("icon")).toBeInTheDocument()
    })
  })

  describe("Status Dot", () => {
    it("renders status dot when showDot is true", () => {
      render(<Badge showDot>With Dot</Badge>)
      const badge = screen.getByText("With Dot").parentElement || screen.getByText("With Dot")
      // Find the dot element (small circle, not the badge itself)
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toBeInTheDocument()
    })

    it("hides dot from screen readers", () => {
      render(<Badge showDot>With Dot</Badge>)
      const badge = screen.getByText("With Dot").parentElement || screen.getByText("With Dot")
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toHaveAttribute("aria-hidden", "true")
    })

    it("applies success dot color", () => {
      render(<Badge showDot dotColor="success">Success</Badge>)
      const badge = screen.getByText("Success").parentElement || screen.getByText("Success")
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toHaveClass("bg-success")
    })

    it("applies warning dot color", () => {
      render(<Badge showDot dotColor="warning">Warning</Badge>)
      const badge = screen.getByText("Warning").parentElement || screen.getByText("Warning")
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toHaveClass("bg-warning")
    })

    it("applies error dot color", () => {
      render(<Badge showDot dotColor="error">Error</Badge>)
      const badge = screen.getByText("Error").parentElement || screen.getByText("Error")
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toHaveClass("bg-destructive")
    })

    it("inherits dot color from variant", () => {
      render(<Badge variant="success" showDot>Success Badge</Badge>)
      const badge = screen.getByText("Success Badge").parentElement || screen.getByText("Success Badge")
      const dot = badge.querySelector(".w-1\\.5.h-1\\.5")
      expect(dot).toHaveClass("bg-success")
    })
  })

  describe("Interactive Badge", () => {
    it("applies interactive class when interactive=true", () => {
      render(<Badge interactive>Interactive</Badge>)
      const badge = screen.getByText("Interactive")
      expect(badge).toHaveClass("cursor-pointer")
    })

    it("automatically enables interactive when onClick provided", () => {
      const handleClick = vi.fn()
      render(<Badge onClick={handleClick}>Clickable</Badge>)
      const badge = screen.getByRole("button")
      expect(badge).toHaveClass("cursor-pointer")
    })

    it("renders as button when onClick provided", () => {
      const handleClick = vi.fn()
      render(<Badge onClick={handleClick}>Clickable</Badge>)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("renders as button when asButton=true", () => {
      render(<Badge asButton>Button Badge</Badge>)
      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("calls onClick when clicked", () => {
      const handleClick = vi.fn()
      render(<Badge onClick={handleClick}>Clickable</Badge>)
      fireEvent.click(screen.getByRole("button"))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe("Accessibility", () => {
    it("has focus ring styles", () => {
      render(<Badge>Focusable</Badge>)
      const badge = screen.getByText("Focusable")
      expect(badge).toHaveClass("focus:ring-2")
    })

    it("renders as div by default", () => {
      render(<Badge>Badge</Badge>)
      const badge = screen.getByText("Badge")
      expect(badge.tagName).toBe("DIV")
    })

    it("supports aria-label", () => {
      render(<Badge aria-label="Custom label">Badge</Badge>)
      const badge = screen.getByText("Badge")
      expect(badge).toHaveAttribute("aria-label", "Custom label")
    })
  })

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(<Badge className="custom-class">Custom</Badge>)
      const badge = screen.getByText("Custom")
      expect(badge).toHaveClass("custom-class")
      expect(badge).toHaveClass("rounded-full") // Still has base styles
    })
  })
})

describe("StatusIndicator", () => {
  describe("Status Colors", () => {
    it("renders online status with success color", () => {
      render(<StatusIndicator status="online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("bg-success")
    })

    it("renders offline status with muted color", () => {
      render(<StatusIndicator status="offline" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("bg-muted-foreground")
    })

    it("renders busy status with error color", () => {
      render(<StatusIndicator status="busy" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("bg-destructive")
    })

    it("renders away status with warning color", () => {
      render(<StatusIndicator status="away" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("bg-warning")
    })
  })

  describe("Sizes", () => {
    it("renders small size", () => {
      render(<StatusIndicator status="online" size="sm" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("w-1.5")
      expect(dot).toHaveClass("h-1.5")
    })

    it("renders default size", () => {
      render(<StatusIndicator status="online" size="default" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("w-2")
      expect(dot).toHaveClass("h-2")
    })

    it("renders large size", () => {
      render(<StatusIndicator status="online" size="lg" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("w-2.5")
      expect(dot).toHaveClass("h-2.5")
    })
  })

  describe("Label", () => {
    it("renders label when provided", () => {
      render(<StatusIndicator status="online" label="Active" />)
      expect(screen.getByText("Active")).toBeInTheDocument()
    })

    it("does not render label when not provided", () => {
      render(<StatusIndicator status="online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      expect(indicator.querySelector("span:not(.rounded-full)")).toBeNull()
    })
  })

  describe("Pulse Animation", () => {
    it("applies pulse animation when pulse=true", () => {
      render(<StatusIndicator status="online" pulse data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).toHaveClass("animate-pulse")
    })

    it("does not apply pulse animation by default", () => {
      render(<StatusIndicator status="online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector(".rounded-full")
      expect(dot).not.toHaveClass("animate-pulse")
    })
  })

  describe("Accessibility", () => {
    it("has role=status on dot", () => {
      render(<StatusIndicator status="online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector("[role='status']")
      expect(dot).toBeInTheDocument()
    })

    it("has aria-label on dot", () => {
      render(<StatusIndicator status="online" label="User is online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector("[role='status']")
      expect(dot).toHaveAttribute("aria-label", "User is online")
    })

    it("defaults aria-label to status when no label provided", () => {
      render(<StatusIndicator status="online" data-testid="indicator" />)
      const indicator = screen.getByTestId("indicator")
      const dot = indicator.querySelector("[role='status']")
      expect(dot).toHaveAttribute("aria-label", "online")
    })
  })
})
