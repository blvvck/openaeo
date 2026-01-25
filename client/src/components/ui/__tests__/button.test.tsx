

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Button } from "../button"
import { Mail, ArrowRight } from "lucide-react"

describe("Button", () => {
  describe("Variants", () => {
    it("renders default variant with primary styles", () => {
      render(<Button>Click me</Button>)
      const button = screen.getByRole("button", { name: /click me/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveClass("bg-primary")
    })

    it("renders secondary variant", () => {
      render(<Button variant="secondary">Secondary</Button>)
      const button = screen.getByRole("button", { name: /secondary/i })
      expect(button).toHaveClass("bg-secondary")
    })

    it("renders destructive variant", () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByRole("button", { name: /delete/i })
      expect(button).toHaveClass("bg-destructive")
    })

    it("renders outline variant", () => {
      render(<Button variant="outline">Outline</Button>)
      const button = screen.getByRole("button", { name: /outline/i })
      expect(button).toHaveClass("border")
      expect(button).toHaveClass("bg-background")
    })

    it("renders ghost variant", () => {
      render(<Button variant="ghost">Ghost</Button>)
      const button = screen.getByRole("button", { name: /ghost/i })
      expect(button).toHaveClass("hover:bg-accent")
    })

    it("renders link variant", () => {
      render(<Button variant="link">Link</Button>)
      const button = screen.getByRole("button", { name: /link/i })
      expect(button).toHaveClass("text-primary")
      expect(button).toHaveClass("underline-offset-4")
    })
  })

  describe("Sizes", () => {
    it("renders small size", () => {
      render(<Button size="sm">Small</Button>)
      const button = screen.getByRole("button", { name: /small/i })
      expect(button).toHaveClass("h-9")
      expect(button).toHaveClass("px-3")
    })

    it("renders default (medium) size", () => {
      render(<Button size="default">Medium</Button>)
      const button = screen.getByRole("button", { name: /medium/i })
      expect(button).toHaveClass("h-10")
      expect(button).toHaveClass("px-4")
    })

    it("renders large size", () => {
      render(<Button size="lg">Large</Button>)
      const button = screen.getByRole("button", { name: /large/i })
      expect(button).toHaveClass("h-11")
      expect(button).toHaveClass("px-6")
    })

    it("renders icon size", () => {
      render(<Button size="icon" aria-label="Menu"><Mail /></Button>)
      const button = screen.getByRole("button", { name: /menu/i })
      expect(button).toHaveClass("h-10")
      expect(button).toHaveClass("w-10")
    })

    it("renders small icon size", () => {
      render(<Button size="icon-sm" aria-label="Menu"><Mail /></Button>)
      const button = screen.getByRole("button", { name: /menu/i })
      expect(button).toHaveClass("h-9")
      expect(button).toHaveClass("w-9")
    })

    it("renders large icon size", () => {
      render(<Button size="icon-lg" aria-label="Menu"><Mail /></Button>)
      const button = screen.getByRole("button", { name: /menu/i })
      expect(button).toHaveClass("h-11")
      expect(button).toHaveClass("w-11")
    })
  })

  describe("Loading State", () => {
    it("shows loading spinner when isLoading is true", () => {
      render(<Button isLoading>Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-busy", "true")
      expect(button).toHaveClass("pointer-events-none")
    })

    it("shows loading text when provided", () => {
      render(<Button isLoading loadingText="Saving...">Submit</Button>)
      expect(screen.getByText("Saving...")).toBeInTheDocument()
    })

    it("falls back to children when no loadingText provided", () => {
      render(<Button isLoading>Submit</Button>)
      expect(screen.getByText("Submit")).toBeInTheDocument()
    })

    it("disables button when loading", () => {
      render(<Button isLoading>Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toBeDisabled()
    })

    it("hides text for icon-only loading button", () => {
      render(<Button size="icon" isLoading aria-label="Save"><Mail /></Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-busy", "true")
    })
  })

  describe("Disabled State", () => {
    it("renders disabled state correctly", () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole("button", { name: /disabled/i })
      expect(button).toBeDisabled()
      expect(button).toHaveClass("disabled:opacity-50")
    })

    it("sets aria-disabled when disabled", () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("aria-disabled", "true")
    })
  })

  describe("Double-Click Prevention", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("prevents double-click when debounce is enabled", async () => {
      const handleClick = vi.fn()
      render(<Button debounce onClick={handleClick}>Submit</Button>)
      const button = screen.getByRole("button")

      // First click should work
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)

      // Second immediate click should be prevented
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)

      // After debounce period, should work again
      await vi.runAllTimersAsync()
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it("respects custom debounce time", async () => {
      const handleClick = vi.fn()
      render(<Button debounce={500} onClick={handleClick}>Submit</Button>)
      const button = screen.getByRole("button")

      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)

      // After 300ms, still debouncing
      await vi.advanceTimersByTimeAsync(300)
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)

      // After 500ms total, should work
      await vi.advanceTimersByTimeAsync(200)
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(2)
    })

    it("does not debounce when debounce is false", () => {
      const handleClick = vi.fn()
      render(<Button debounce={false} onClick={handleClick}>Submit</Button>)
      const button = screen.getByRole("button")

      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(3)
    })
  })

  describe("Icons", () => {
    it("renders left icon", () => {
      render(<Button leftIcon={<Mail data-testid="left-icon" />}>Email</Button>)
      expect(screen.getByTestId("left-icon")).toBeInTheDocument()
      expect(screen.getByText("Email")).toBeInTheDocument()
    })

    it("renders right icon", () => {
      render(<Button rightIcon={<ArrowRight data-testid="right-icon" />}>Next</Button>)
      expect(screen.getByTestId("right-icon")).toBeInTheDocument()
      expect(screen.getByText("Next")).toBeInTheDocument()
    })

    it("renders both icons", () => {
      render(
        <Button
          leftIcon={<Mail data-testid="left-icon" />}
          rightIcon={<ArrowRight data-testid="right-icon" />}
        >
          Send Email
        </Button>
      )
      expect(screen.getByTestId("left-icon")).toBeInTheDocument()
      expect(screen.getByTestId("right-icon")).toBeInTheDocument()
      expect(screen.getByText("Send Email")).toBeInTheDocument()
    })

    it("hides icons with aria-hidden", () => {
      render(<Button leftIcon={<Mail data-testid="left-icon" />}>Email</Button>)
      const iconWrapper = screen.getByTestId("left-icon").parentElement
      expect(iconWrapper).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("Accessibility", () => {
    it("has type=button by default", () => {
      render(<Button>Click</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "button")
    })

    it("can override type", () => {
      render(<Button type="submit">Submit</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveAttribute("type", "submit")
    })

    it("is keyboard focusable", () => {
      render(<Button>Focus me</Button>)
      const button = screen.getByRole("button")
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it("can be triggered with Enter key", async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Press Enter</Button>)
      const button = screen.getByRole("button")

      button.focus()
      await user.keyboard("{Enter}")
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("can be triggered with Space key", async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Press Space</Button>)
      const button = screen.getByRole("button")

      button.focus()
      await user.keyboard(" ")
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it("has visible focus ring styles", () => {
      render(<Button>Focus visible</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("focus-visible:ring-2")
      expect(button).toHaveClass("focus-visible:ring-ring")
    })
  })

  describe("asChild Pattern", () => {
    it("renders as child element when asChild is true", () => {
      render(
        <Button asChild>
          <a href="/link">Link Button</a>
        </Button>
      )
      const link = screen.getByRole("link", { name: /link button/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/link")
    })
  })

  describe("Custom className", () => {
    it("merges custom className with variants", () => {
      render(<Button className="custom-class">Custom</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("custom-class")
      expect(button).toHaveClass("bg-primary") // Still has variant class
    })
  })

  describe("Reduced Motion", () => {
    it("has motion-reduce classes for accessibility", () => {
      render(<Button>Reduced Motion</Button>)
      const button = screen.getByRole("button")
      expect(button).toHaveClass("motion-reduce:transition-none")
      expect(button).toHaveClass("motion-reduce:active:scale-100")
    })
  })
})
