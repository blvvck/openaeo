

import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../action-menu"

describe("DropdownMenu", () => {
  describe("Basic Rendering", () => {
    it("renders trigger button", () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      expect(screen.getByText("Open Menu")).toBeInTheDocument()
    })

    it("shows content when open", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open Menu"))
      expect(screen.getByText("Item 1")).toBeInTheDocument()
    })
  })

  describe("DropdownMenuContent", () => {
    it("has proper styling classes", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent data-testid="content">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("rounded-md")
      expect(content).toHaveClass("border")
      expect(content).toHaveClass("bg-popover")
    })

    it("has reduced motion class", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent data-testid="content">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("motion-reduce:animate-none")
    })

    it("has animation classes", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent data-testid="content">
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const content = screen.getByTestId("content")
      expect(content).toHaveClass("data-[state=open]:animate-in")
    })
  })

  describe("DropdownMenuItem", () => {
    it("renders item with proper role", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Click me</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByRole("menuitem", { name: "Click me" })).toBeInTheDocument()
    })

    it("calls onSelect when clicked", async () => {
      const user = userEvent.setup()
      const onSelect = vi.fn()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={onSelect}>Click me</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      await user.click(screen.getByText("Click me"))
      expect(onSelect).toHaveBeenCalled()
    })

    it("supports disabled state", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const item = screen.getByRole("menuitem", { name: "Disabled" })
      expect(item).toHaveAttribute("data-disabled")
    })

    it("supports inset prop for alignment", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem inset data-testid="item">Inset</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const item = screen.getByTestId("item")
      expect(item).toHaveClass("pl-8")
    })
  })

  describe("DropdownMenuCheckboxItem", () => {
    it("renders checkbox item", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>Checked</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByRole("menuitemcheckbox")).toBeInTheDocument()
    })

    it("shows check icon when checked", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked data-testid="item">
              Checked
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const item = screen.getByTestId("item")
      const checkIcon = item.querySelector("svg")
      expect(checkIcon).toBeInTheDocument()
    })
  })

  describe("DropdownMenuRadioGroup", () => {
    it("renders radio items", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="1">
              <DropdownMenuRadioItem value="1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getAllByRole("menuitemradio")).toHaveLength(2)
    })
  })

  describe("DropdownMenuLabel", () => {
    it("renders label text", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Label</DropdownMenuLabel>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByText("Label")).toBeInTheDocument()
    })

    it("has semibold font weight", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel data-testid="label">Label</DropdownMenuLabel>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByTestId("label")).toHaveClass("font-semibold")
    })
  })

  describe("DropdownMenuSeparator", () => {
    it("renders separator line", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid="separator" />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const separator = screen.getByTestId("separator")
      expect(separator).toHaveClass("h-px")
      expect(separator).toHaveClass("bg-muted")
    })
  })

  describe("DropdownMenuShortcut", () => {
    it("renders shortcut text", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>Cmd+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByText("Cmd+S")).toBeInTheDocument()
    })

    it("has proper styling", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut data-testid="shortcut">Cmd+S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const shortcut = screen.getByTestId("shortcut")
      expect(shortcut).toHaveClass("ml-auto")
      expect(shortcut).toHaveClass("text-xs")
      expect(shortcut).toHaveClass("opacity-60")
    })
  })

  describe("DropdownMenuGroup", () => {
    it("renders group of items", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup data-testid="group">
              <DropdownMenuItem>Item 1</DropdownMenuItem>
              <DropdownMenuItem>Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByTestId("group")).toBeInTheDocument()
    })
  })

  describe("Submenu", () => {
    it("renders submenu trigger", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByText("More Options")).toBeInTheDocument()
    })

    it("shows chevron on sub trigger", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger data-testid="sub-trigger">
                More Options
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      const trigger = screen.getByTestId("sub-trigger")
      const chevron = trigger.querySelector("svg")
      expect(chevron).toBeInTheDocument()
    })
  })

  describe("Keyboard Navigation", () => {
    it("closes on Escape key", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByText("Item")).toBeInTheDocument()

      await user.keyboard("{Escape}")
      // Content should be removed from DOM when closed
      expect(screen.queryByText("Item")).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA attributes on trigger", async () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      const trigger = screen.getByText("Open")
      expect(trigger).toHaveAttribute("aria-haspopup", "menu")
    })

    it("has menu role on content", async () => {
      const user = userEvent.setup()
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )

      await user.click(screen.getByText("Open"))
      expect(screen.getByRole("menu")).toBeInTheDocument()
    })
  })
})
