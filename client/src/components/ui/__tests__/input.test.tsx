

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Input } from "../input"
import { Search, Eye } from "lucide-react"

describe("Input", () => {
  describe("Base Rendering", () => {
    it("renders basic input", () => {
      render(<Input placeholder="Enter text" />)
      const input = screen.getByPlaceholderText("Enter text")
      expect(input).toBeInTheDocument()
      expect(input.tagName).toBe("INPUT")
    })

    it("forwards ref correctly", () => {
      const ref = vi.fn()
      render(<Input ref={ref} />)
      expect(ref).toHaveBeenCalled()
    })

    it("spreads additional props", () => {
      render(<Input data-testid="custom-input" name="test-input" />)
      const input = screen.getByTestId("custom-input")
      expect(input).toHaveAttribute("name", "test-input")
    })
  })

  describe("Sizes", () => {
    it("renders small size", () => {
      render(<Input size="sm" data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("h-9")
      expect(input).toHaveClass("text-sm")
    })

    it("renders default size", () => {
      render(<Input size="default" data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("h-10")
    })

    it("renders large size", () => {
      render(<Input size="lg" data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("h-12")
      expect(input).toHaveClass("text-base")
    })
  })

  describe("Error State", () => {
    it("shows error styling when error prop is true", () => {
      render(<Input error data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("border-destructive")
    })

    it("sets aria-invalid when error is true", () => {
      render(<Input error data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveAttribute("aria-invalid", "true")
    })

    it("renders error message when provided", () => {
      render(<Input error errorMessage="This field is required" id="test" />)
      const errorMsg = screen.getByRole("alert")
      expect(errorMsg).toHaveTextContent("This field is required")
    })

    it("links error message with aria-describedby", () => {
      render(<Input error errorMessage="Error message" id="my-input" data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveAttribute("aria-describedby", "my-input-error")
    })
  })

  describe("Character Counter", () => {
    it("shows character counter when showCounter and maxLength are set", () => {
      render(<Input showCounter maxLength={100} id="test" />)
      expect(screen.getByText("0/100")).toBeInTheDocument()
    })

    it("updates counter on input", async () => {
      const user = userEvent.setup()
      render(<Input showCounter maxLength={10} id="test" data-testid="input" />)

      const input = screen.getByTestId("input")
      await user.type(input, "Hello")

      expect(screen.getByText("5/10")).toBeInTheDocument()
    })

    it("shows warning color when approaching limit (over 90%)", async () => {
      const user = userEvent.setup()
      render(<Input showCounter maxLength={10} id="test" data-testid="input" />)

      const input = screen.getByTestId("input")
      await user.type(input, "1234567890") // 10 chars = 100% (over 90%, not over max)

      const counter = screen.getByText("10/10")
      expect(counter).toHaveClass("text-warning")
    })

    it("shows error color when over limit", async () => {
      render(<Input showCounter maxLength={5} id="test" data-testid="input" defaultValue="123456" />)
      const counter = screen.getByText("6/5")
      expect(counter).toHaveClass("text-destructive")
    })

    it("has aria-live for counter updates", () => {
      render(<Input showCounter maxLength={100} id="test" />)
      const counter = screen.getByText("0/100")
      expect(counter).toHaveAttribute("aria-live", "polite")
    })

    it("syncs counter with controlled value", () => {
      const { rerender } = render(<Input showCounter maxLength={100} value="Hello" id="test" />)
      expect(screen.getByText("5/100")).toBeInTheDocument()

      rerender(<Input showCounter maxLength={100} value="Hello World" id="test" />)
      expect(screen.getByText("11/100")).toBeInTheDocument()
    })
  })

  describe("inputMode for Mobile", () => {
    it("sets inputMode for email type", () => {
      render(<Input type="email" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "email")
    })

    it("sets inputMode for tel type", () => {
      render(<Input type="tel" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "tel")
    })

    it("sets inputMode for url type", () => {
      render(<Input type="url" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "url")
    })

    it("sets inputMode for number type", () => {
      render(<Input type="number" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "numeric")
    })

    it("sets inputMode for search type", () => {
      render(<Input type="search" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "search")
    })

    it("respects explicit inputMode override", () => {
      render(<Input type="text" inputMode="decimal" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("inputMode", "decimal")
    })
  })

  describe("Addons", () => {
    it("renders left addon", () => {
      render(<Input leftAddon={<Search data-testid="left-icon" />} />)
      expect(screen.getByTestId("left-icon")).toBeInTheDocument()
    })

    it("renders right addon", () => {
      render(<Input rightAddon={<Eye data-testid="right-icon" />} />)
      expect(screen.getByTestId("right-icon")).toBeInTheDocument()
    })

    it("renders both addons", () => {
      render(
        <Input
          leftAddon={<Search data-testid="left-icon" />}
          rightAddon={<Eye data-testid="right-icon" />}
        />
      )
      expect(screen.getByTestId("left-icon")).toBeInTheDocument()
      expect(screen.getByTestId("right-icon")).toBeInTheDocument()
    })

    it("adds left padding when left addon is present", () => {
      render(<Input leftAddon={<Search />} data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("pl-10")
    })

    it("adds right padding when right addon is present", () => {
      render(<Input rightAddon={<Eye />} data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("pr-10")
    })
  })

  describe("Disabled State", () => {
    it("renders disabled state", () => {
      render(<Input disabled data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toBeDisabled()
      expect(input).toHaveClass("disabled:opacity-50")
    })
  })

  describe("Shake Animation", () => {
    it("applies shake class when shake prop is true", () => {
      render(<Input shake data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("animate-shake")
    })

    it("does not apply shake class when shake prop is false", () => {
      render(<Input shake={false} data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).not.toHaveClass("animate-shake")
    })
  })

  describe("Input Types", () => {
    it("renders password type", () => {
      render(<Input type="password" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("type", "password")
    })

    it("renders file type", () => {
      render(<Input type="file" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("type", "file")
    })
  })

  describe("Accessibility", () => {
    it("can be focused", () => {
      render(<Input data-testid="input" />)
      const input = screen.getByTestId("input")
      input.focus()
      expect(document.activeElement).toBe(input)
    })

    it("has focus ring styles", () => {
      render(<Input data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("focus-visible:ring-2")
      expect(input).toHaveClass("focus-visible:ring-ring")
    })

    it("accepts aria-label", () => {
      render(<Input aria-label="Search input" data-testid="input" />)
      expect(screen.getByTestId("input")).toHaveAttribute("aria-label", "Search input")
    })
  })

  describe("Dark Mode Autofill", () => {
    it("has autofill styling classes", () => {
      render(<Input data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("autofill:bg-background")
    })
  })

  describe("Controlled and Uncontrolled", () => {
    it("works as controlled input", async () => {
      const handleChange = vi.fn()
      const { rerender } = render(
        <Input value="initial" onChange={handleChange} data-testid="input" />
      )
      const input = screen.getByTestId("input") as HTMLInputElement
      expect(input.value).toBe("initial")

      rerender(<Input value="updated" onChange={handleChange} data-testid="input" />)
      expect(input.value).toBe("updated")
    })

    it("works as uncontrolled input", async () => {
      const user = userEvent.setup()
      render(<Input defaultValue="default" data-testid="input" />)
      const input = screen.getByTestId("input") as HTMLInputElement

      expect(input.value).toBe("default")
      await user.clear(input)
      await user.type(input, "new value")
      expect(input.value).toBe("new value")
    })
  })

  describe("Custom className", () => {
    it("merges custom className", () => {
      render(<Input className="custom-class" data-testid="input" />)
      const input = screen.getByTestId("input")
      expect(input).toHaveClass("custom-class")
      expect(input).toHaveClass("border") // Still has base styles
    })
  })

  describe("wrapperClassName", () => {
    it("applies wrapperClassName to container", () => {
      render(
        <Input
          leftAddon={<Search />}
          wrapperClassName="custom-wrapper"
          data-testid="input"
        />
      )
      const wrapper = screen.getByTestId("input").parentElement
      expect(wrapper).toHaveClass("custom-wrapper")
    })
  })
})
