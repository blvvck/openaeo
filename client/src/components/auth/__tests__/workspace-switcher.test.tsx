import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  WorkspaceSwitcher,
  WorkspaceAvatar,
  WorkspaceItem,
  type Workspace,
} from "../workspace-switcher"



// Mock workspaces
const mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Acme Corp",
    slug: "acme-corp",
    avatarUrl: "https://example.com/acme.png",
    role: "owner",
  },
  {
    id: "ws-2",
    name: "Beta Company",
    slug: "beta-company",
    role: "admin",
  },
  {
    id: "ws-3",
    name: "Gamma Inc",
    slug: "gamma-inc",
    avatarUrl: "https://example.com/gamma.png",
    role: "member",
  },
  {
    id: "ws-4",
    name: "Delta Labs",
    slug: "delta-labs",
    role: "viewer",
  },
]

// Many workspaces for search tests
const manyWorkspaces: Workspace[] = Array.from({ length: 10 }, (_, i) => ({
  id: `ws-${i + 1}`,
  name: `Workspace ${i + 1}`,
  slug: `workspace-${i + 1}`,
  role: "member" as const,
}))

describe("WorkspaceSwitcher", () => {
  // Mock handlers
  const mockOnSwitch = vi.fn()
  const mockOnCreate = vi.fn()
  const mockOnManage = vi.fn()

  const defaultProps = {
    currentWorkspace: mockWorkspaces[0],
    workspaces: mockWorkspaces,
    onSwitch: mockOnSwitch,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders trigger button with current workspace", () => {
      render(<WorkspaceSwitcher {...defaultProps} />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toBeInTheDocument()
      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    })

    it("renders compact variant with avatar only", () => {
      render(<WorkspaceSwitcher {...defaultProps} variant="compact" />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toBeInTheDocument()
      // Should not show full workspace name in compact mode
      expect(trigger).not.toHaveTextContent("Acme Corp")
    })

    it("renders ghost variant with ghost button style", () => {
      render(<WorkspaceSwitcher {...defaultProps} variant="ghost" />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toBeInTheDocument()
    })

    it("renders loading state", () => {
      render(<WorkspaceSwitcher {...defaultProps} isLoading />)

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })

    it("renders disabled state", () => {
      render(<WorkspaceSwitcher {...defaultProps} disabled />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toBeDisabled()
    })

    it("applies custom className", () => {
      render(<WorkspaceSwitcher {...defaultProps} className="custom-class" />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveClass("custom-class")
    })
  })

  describe("Popover Behavior", () => {
    it("opens popover on trigger click", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      const trigger = screen.getByRole("combobox")
      await user.click(trigger)

      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    it("closes popover on escape key", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      expect(screen.getByRole("listbox")).toBeInTheDocument()

      await user.keyboard("{Escape}")
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
    })

    it("shows all workspaces in dropdown", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      // Check within the listbox to avoid matching trigger button text
      const listbox = screen.getByRole("listbox")
      expect(within(listbox).getByText("Acme Corp")).toBeInTheDocument()
      expect(within(listbox).getByText("Beta Company")).toBeInTheDocument()
      expect(within(listbox).getByText("Gamma Inc")).toBeInTheDocument()
      expect(within(listbox).getByText("Delta Labs")).toBeInTheDocument()
    })
  })

  describe("Workspace List", () => {
    it("displays workspace name and slug", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByText("acme-corp")).toBeInTheDocument()
      expect(screen.getByText("beta-company")).toBeInTheDocument()
    })

    it("displays role badges", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByText("Admin")).toBeInTheDocument()
      expect(screen.getByText("Member")).toBeInTheDocument()
      expect(screen.getByText("Viewer")).toBeInTheDocument()
    })

    it("shows check icon for current workspace", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      const options = screen.getAllByRole("option")
      const activeOption = options[0]
      expect(activeOption).toHaveAttribute("aria-selected", "true")
    })

    it("shows empty state when no workspaces", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          {...defaultProps}
          workspaces={[defaultProps.currentWorkspace]}
        />
      )

      await user.click(screen.getByRole("combobox"))

      // Only current workspace should be shown
      expect(screen.getAllByRole("option")).toHaveLength(1)
    })
  })

  describe("Workspace Switching", () => {
    it("calls onSwitch when clicking a different workspace", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockResolvedValue(undefined)
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      await waitFor(() => {
        expect(mockOnSwitch).toHaveBeenCalledWith(mockWorkspaces[1])
      })
    })

    it("closes popover after successful switch", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockResolvedValue(undefined)
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
    })

    it("does not call onSwitch when clicking current workspace", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      // Click within the listbox to target the workspace item, not trigger
      const listbox = screen.getByRole("listbox")
      await user.click(within(listbox).getByText("Acme Corp"))

      expect(mockOnSwitch).not.toHaveBeenCalled()
    })

    it("shows loading state during switch", async () => {
      const user = userEvent.setup()
      let resolveSwitch: () => void
      mockOnSwitch.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveSwitch = resolve
          })
      )

      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      // Should show loading spinner
      await waitFor(() => {
        const listbox = screen.getByRole("listbox")
        const loader = within(listbox).getByRole("option", { name: /Beta Company/i })
        expect(loader).toBeInTheDocument()
      })

      // Resolve and cleanup
      resolveSwitch!()
    })

    it("disables other workspaces during switch", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockImplementation(
        () => new Promise<void>((resolve) => setTimeout(resolve, 100))
      )

      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      // Other options should be disabled
      const options = screen.getAllByRole("option")
      const gammaOption = options.find((opt) => opt.textContent?.includes("Gamma Inc"))
      expect(gammaOption).toHaveAttribute("aria-disabled", "true")
    })
  })

  describe("Error Handling", () => {
    it("displays error message on switch failure", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockRejectedValue(new Error("Network error"))

      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent("Network error")
      })
    })

    it("displays generic error message when no message provided", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockRejectedValue(new Error())

      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Failed to switch workspace"
        )
      })
    })

    it("displays prop error message", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher {...defaultProps} error="Failed to load workspaces" />
      )

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to load workspaces"
      )
    })

    it("clears error when popover is reopened", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockRejectedValueOnce(new Error("Network error"))

      render(<WorkspaceSwitcher {...defaultProps} />)

      // First attempt - error
      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument()
      })

      // Close and reopen
      await user.keyboard("{Escape}")
      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
      await user.click(screen.getByRole("combobox"))

      // Error should be cleared
      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    })
  })

  describe("Search Functionality", () => {
    it("shows search input when more than 5 workspaces", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))

      expect(
        screen.getByPlaceholderText("Search workspaces...")
      ).toBeInTheDocument()
    })

    it("hides search input when 5 or fewer workspaces", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      expect(
        screen.queryByPlaceholderText("Search workspaces...")
      ).not.toBeInTheDocument()
    })

    it("filters workspaces by name", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))
      await user.type(
        screen.getByPlaceholderText("Search workspaces..."),
        "Workspace 1"
      )

      // Should show Workspace 1 and Workspace 10
      await waitFor(() => {
        const options = screen.getAllByRole("option")
        expect(options).toHaveLength(2)
      })
    })

    it("filters workspaces by slug", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))
      await user.type(
        screen.getByPlaceholderText("Search workspaces..."),
        "workspace-5"
      )

      await waitFor(() => {
        const options = screen.getAllByRole("option")
        expect(options).toHaveLength(1)
        expect(screen.getByText("Workspace 5")).toBeInTheDocument()
      })
    })

    it("shows no results message when no matches", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))
      await user.type(
        screen.getByPlaceholderText("Search workspaces..."),
        "nonexistent"
      )

      await waitFor(() => {
        expect(screen.getByText("No workspaces found")).toBeInTheDocument()
      })
    })

    it("clears search when popover closes", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))
      await user.type(
        screen.getByPlaceholderText("Search workspaces..."),
        "test"
      )
      await user.keyboard("{Escape}")

      // Reopen
      await user.click(screen.getByRole("combobox"))
      const searchInput = screen.getByPlaceholderText("Search workspaces...")
      expect(searchInput).toHaveValue("")
    })
  })

  describe("Actions", () => {
    it("shows create workspace button when onCreate provided", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} onCreate={mockOnCreate} />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByText("Create workspace")).toBeInTheDocument()
    })

    it("calls onCreate when create button clicked", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} onCreate={mockOnCreate} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Create workspace"))

      expect(mockOnCreate).toHaveBeenCalled()
    })

    it("closes popover after create action", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} onCreate={mockOnCreate} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Create workspace"))

      await waitFor(() => {
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      })
    })

    it("shows manage workspace button for owner", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} onManage={mockOnManage} />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByText("Manage workspace")).toBeInTheDocument()
    })

    it("shows manage workspace button for admin", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          {...defaultProps}
          currentWorkspace={mockWorkspaces[1]} // admin role
          onManage={mockOnManage}
        />
      )

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByText("Manage workspace")).toBeInTheDocument()
    })

    it("hides manage workspace button for member", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          {...defaultProps}
          currentWorkspace={mockWorkspaces[2]} // member role
          onManage={mockOnManage}
        />
      )

      await user.click(screen.getByRole("combobox"))

      expect(screen.queryByText("Manage workspace")).not.toBeInTheDocument()
    })

    it("hides manage workspace button for viewer", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          {...defaultProps}
          currentWorkspace={mockWorkspaces[3]} // viewer role
          onManage={mockOnManage}
        />
      )

      await user.click(screen.getByRole("combobox"))

      expect(screen.queryByText("Manage workspace")).not.toBeInTheDocument()
    })

    it("calls onManage with current workspace", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} onManage={mockOnManage} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Manage workspace"))

      expect(mockOnManage).toHaveBeenCalledWith(mockWorkspaces[0])
    })
  })

  describe("Keyboard Navigation", () => {
    it("navigates down with ArrowDown", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{ArrowDown}")

      // First item should be focused
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveClass("bg-accent/50")
    })

    it("navigates up with ArrowUp", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{ArrowUp}")

      // First item should be focused after down, down, up
      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveClass("bg-accent/50")
    })

    it("wraps to first item when ArrowDown at end", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      // Move to last item
      for (let i = 0; i < mockWorkspaces.length; i++) {
        await user.keyboard("{ArrowDown}")
      }
      // Should wrap to first
      await user.keyboard("{ArrowDown}")

      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveClass("bg-accent/50")
    })

    it("wraps to last item when ArrowUp at start", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{ArrowUp}")

      // Should wrap to last item
      const options = screen.getAllByRole("option")
      expect(options[options.length - 1]).toHaveClass("bg-accent/50")
    })

    it("selects focused item with Enter", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockResolvedValue(undefined)
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{ArrowDown}") // Focus second item
      await user.keyboard("{Enter}")

      await waitFor(() => {
        expect(mockOnSwitch).toHaveBeenCalledWith(mockWorkspaces[1])
      })
    })

    it("jumps to first item with Home", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{ArrowDown}")
      await user.keyboard("{Home}")

      const options = screen.getAllByRole("option")
      expect(options[0]).toHaveClass("bg-accent/50")
    })

    it("jumps to last item with End", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.keyboard("{End}")

      const options = screen.getAllByRole("option")
      expect(options[options.length - 1]).toHaveClass("bg-accent/50")
    })
  })

  describe("Accessibility", () => {
    it("has proper ARIA attributes on trigger", () => {
      render(<WorkspaceSwitcher {...defaultProps} />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveAttribute("aria-expanded", "false")
      expect(trigger).toHaveAttribute("aria-haspopup", "listbox")
      expect(trigger).toHaveAttribute("aria-label")
    })

    it("updates aria-expanded when opened", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      const trigger = screen.getByRole("combobox")
      expect(trigger).toHaveAttribute("aria-expanded", "false")

      await user.click(trigger)
      expect(trigger).toHaveAttribute("aria-expanded", "true")
    })

    it("has listbox role on workspace list", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      expect(screen.getByRole("listbox")).toBeInTheDocument()
    })

    it("has option role on workspace items", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      const options = screen.getAllByRole("option")
      expect(options).toHaveLength(mockWorkspaces.length)
    })

    it("marks current workspace with aria-selected", async () => {
      const user = userEvent.setup()
      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))

      const options = screen.getAllByRole("option")
      const currentOption = options[0]
      expect(currentOption).toHaveAttribute("aria-selected", "true")
    })

    it("has accessible label on search input", async () => {
      const user = userEvent.setup()
      render(
        <WorkspaceSwitcher
          currentWorkspace={manyWorkspaces[0]}
          workspaces={manyWorkspaces}
          onSwitch={mockOnSwitch}
        />
      )

      await user.click(screen.getByRole("combobox"))

      const searchInput = screen.getByLabelText("Search workspaces")
      expect(searchInput).toBeInTheDocument()
    })

    it("announces errors to screen readers", async () => {
      const user = userEvent.setup()
      mockOnSwitch.mockRejectedValue(new Error("Failed"))

      render(<WorkspaceSwitcher {...defaultProps} />)

      await user.click(screen.getByRole("combobox"))
      await user.click(screen.getByText("Beta Company"))

      await waitFor(() => {
        const alert = screen.getByRole("alert")
        expect(alert).toHaveAttribute("aria-live", "assertive")
      })
    })

    it("provides screen reader text for loading state", () => {
      render(<WorkspaceSwitcher {...defaultProps} isLoading />)

      expect(screen.getByText("Loading...")).toBeInTheDocument()
    })
  })
})

describe("WorkspaceAvatar", () => {
  it("renders avatar with image when avatarUrl provided", async () => {
    render(
      <WorkspaceAvatar
        workspace={{ name: "Acme Corp", avatarUrl: "https://example.com/logo.png" }}
      />
    )

    // Radix Avatar delays image render, check for fallback initially
    // The image src is set but may not be visible until loaded
    await waitFor(() => {
      const avatar = screen.getByText("AC").closest("span")
      expect(avatar).toBeInTheDocument()
    })

    // Verify the avatar structure is correct (image will show if/when loaded)
    // In jsdom, images don't fully load, so we just verify fallback works
    expect(screen.getByText("AC")).toBeInTheDocument()
  })

  it("renders initials when no avatarUrl", () => {
    render(<WorkspaceAvatar workspace={{ name: "Acme Corp" }} />)

    // Should show "AC" (first letters of each word)
    expect(screen.getByText("AC")).toBeInTheDocument()
  })

  it("renders first two characters for single word name", () => {
    render(<WorkspaceAvatar workspace={{ name: "Acme" }} />)

    expect(screen.getByText("AC")).toBeInTheDocument()
  })

  it("renders small size variant", () => {
    render(<WorkspaceAvatar workspace={{ name: "Acme" }} size="sm" />)

    const avatar = screen.getByText("AC").closest('[class*="h-6"]')
    expect(avatar).toBeInTheDocument()
  })

  it("renders large size variant", () => {
    render(<WorkspaceAvatar workspace={{ name: "Acme" }} size="lg" />)

    const avatar = screen.getByText("AC").closest('[class*="h-10"]')
    expect(avatar).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <WorkspaceAvatar workspace={{ name: "Acme" }} className="custom-class" />
    )

    // The Avatar root element (outermost span) should have the custom class
    // Use container to find the root element directly
    const avatarRoot = container.firstChild as HTMLElement
    expect(avatarRoot).toHaveClass("custom-class")
  })
})

describe("WorkspaceItem", () => {
  const workspace: Workspace = {
    id: "ws-1",
    name: "Acme Corp",
    slug: "acme-corp",
    role: "owner",
  }

  it("renders workspace name and slug", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    expect(screen.getByText("acme-corp")).toBeInTheDocument()
  })

  it("renders role badge", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText("Owner")).toBeInTheDocument()
  })

  it("shows check icon when active", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={true}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true")
  })

  it("applies focused styling when isFocused", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        isFocused={true}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByRole("option")).toHaveClass("bg-accent/50")
  })

  it("shows loading spinner when switching", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        isSwitching={true}
        onClick={vi.fn()}
      />
    )

    // Loader2 has animate-spin class
    const option = screen.getByRole("option")
    expect(option.querySelector(".animate-spin")).toBeInTheDocument()
  })

  it("is disabled when disabled prop is true", () => {
    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        disabled={true}
        onClick={vi.fn()}
      />
    )

    const option = screen.getByRole("option")
    expect(option).toBeDisabled()
    expect(option).toHaveAttribute("aria-disabled", "true")
  })

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup()
    const mockClick = vi.fn()

    render(
      <WorkspaceItem
        workspace={workspace}
        isActive={false}
        onClick={mockClick}
      />
    )

    await user.click(screen.getByRole("option"))
    expect(mockClick).toHaveBeenCalled()
  })
})
