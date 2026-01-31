

import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipArrow,
  SimpleTooltip,
  HelpTooltip,
} from "../tooltip"

describe("Tooltip", () => {
  describe("TooltipContent", () => {
    it("applies default variant classes", () => {
      // Render in open state to inspect classes
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent data-testid="content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("bg-popover")
      expect(content).toHaveClass("text-popover-foreground")
      expect(content).toHaveClass("rounded-md")
    })

    it("applies info variant classes", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent variant="info" data-testid="content">Info</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("text-info")
    })

    it("applies warning variant classes", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent variant="warning" data-testid="content">Warning</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("text-warning")
    })

    it("applies error variant classes", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent variant="error" data-testid="content">Error</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("text-destructive")
    })

    it("applies small maxWidth", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent maxWidth="sm" data-testid="content">Small</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("max-w-[150px]")
    })

    it("applies large maxWidth", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent maxWidth="lg" data-testid="content">Large</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("max-w-[350px]")
    })

    it("has reduced motion class", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent data-testid="content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("motion-reduce:animate-none")
    })

    it("has animation classes", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent data-testid="content">Content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const content = screen.getByTestId("content")
      expect(content).toHaveClass("animate-in")
      expect(content).toHaveClass("fade-in-0")
    })
  })

  describe("TooltipArrow", () => {
    it("renders with fill class", () => {
      render(
        <TooltipProvider>
          <Tooltip open={true}>
            <TooltipTrigger>Trigger</TooltipTrigger>
            <TooltipContent>
              Content
              <TooltipArrow data-testid="arrow" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )

      const arrow = screen.getByTestId("arrow")
      expect(arrow).toHaveClass("fill-popover")
    })
  })
})

describe("SimpleTooltip", () => {
  it("renders children", () => {
    render(
      <SimpleTooltip content="Tooltip text">
        <button>Trigger</button>
      </SimpleTooltip>
    )

    expect(screen.getByText("Trigger")).toBeInTheDocument()
  })

  it("renders just children when disabled", () => {
    render(
      <SimpleTooltip content="Hidden" disabled>
        <button data-testid="btn">Trigger</button>
      </SimpleTooltip>
    )

    const button = screen.getByTestId("btn")
    expect(button).toBeInTheDocument()
    // When disabled, there should be no Radix wrapper
    expect(button.parentElement?.getAttribute("data-radix-tooltip-trigger")).toBeNull()
  })

  it("shows content when open is controlled to true", () => {
    render(
      <SimpleTooltip content="Controlled tooltip" open={true}>
        <button>Trigger</button>
      </SimpleTooltip>
    )

    // Content should be visible when controlled open=true
    // Radix renders content twice (once visible, once for screen readers)
    const contents = screen.getAllByText("Controlled tooltip")
    expect(contents.length).toBeGreaterThanOrEqual(1)
  })
})

describe("HelpTooltip", () => {
  it("renders help button with icon", () => {
    render(<HelpTooltip content="Help text" />)

    const button = screen.getByRole("button", { name: "Help" })
    expect(button).toBeInTheDocument()
  })

  it("has aria-label for accessibility", () => {
    render(<HelpTooltip content="Accessible" />)

    const button = screen.getByRole("button", { name: "Help" })
    expect(button).toHaveAttribute("aria-label", "Help")
  })

  it("has SVG icon by default", () => {
    render(<HelpTooltip content="Has icon" />)

    const button = screen.getByRole("button", { name: "Help" })
    const svg = button.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("supports custom icon", () => {
    render(
      <HelpTooltip
        content="Custom icon"
        icon={<span data-testid="custom-icon">?</span>}
      />
    )

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument()
  })

  it("supports small icon size", () => {
    render(<HelpTooltip content="Small" iconSize="sm" />)

    const button = screen.getByRole("button", { name: "Help" })
    const svg = button.querySelector("svg")
    expect(svg).toHaveClass("w-3.5")
    expect(svg).toHaveClass("h-3.5")
  })

  it("supports large icon size", () => {
    render(<HelpTooltip content="Large" iconSize="lg" />)

    const button = screen.getByRole("button", { name: "Help" })
    const svg = button.querySelector("svg")
    expect(svg).toHaveClass("w-5")
    expect(svg).toHaveClass("h-5")
  })

  it("has focus styles", () => {
    render(<HelpTooltip content="Focus styles" />)

    const button = screen.getByRole("button", { name: "Help" })
    expect(button).toHaveClass("focus-visible:ring-2")
  })

  it("has transition styles", () => {
    render(<HelpTooltip content="Transition" />)

    const button = screen.getByRole("button", { name: "Help" })
    expect(button).toHaveClass("transition-colors")
  })
})
