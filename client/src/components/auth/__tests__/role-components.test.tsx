import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, within, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  RoleBadge,
  RolePermissions,
  RoleComparison,
  RoleSelector,
  RoleGuard,
  RoleTooltip,
  hasPermission,
  getPermissions,
  canManageRole,
  ROLE_CONFIG,
  PERMISSION_CONFIG,
  PERMISSION_MATRIX,
  ALL_PERMISSIONS,
  ALL_ROLES,
  type Role,
  type Permission,
} from "../role-components"

describe("Role Components - fe-S147", () => {
  // ============================================================================
  // Utility Functions Tests
  // ============================================================================
  describe("Utility Functions", () => {
    describe("hasPermission", () => {
      it("returns true for owner with all permissions", () => {
        ALL_PERMISSIONS.forEach((permission) => {
          expect(hasPermission("owner", permission)).toBe(true)
        })
      })

      it("returns correct permissions for admin", () => {
        expect(hasPermission("admin", "view_workspace")).toBe(true)
        expect(hasPermission("admin", "create_content")).toBe(true)
        expect(hasPermission("admin", "delete_content")).toBe(true)
        expect(hasPermission("admin", "invite_members")).toBe(true)
        expect(hasPermission("admin", "manage_roles")).toBe(true)
        expect(hasPermission("admin", "billing_access")).toBe(false)
        expect(hasPermission("admin", "delete_workspace")).toBe(false)
      })

      it("returns correct permissions for member", () => {
        expect(hasPermission("member", "view_workspace")).toBe(true)
        expect(hasPermission("member", "create_content")).toBe(true)
        expect(hasPermission("member", "edit_content")).toBe(true)
        expect(hasPermission("member", "delete_content")).toBe(false)
        expect(hasPermission("member", "invite_members")).toBe(false)
        expect(hasPermission("member", "manage_roles")).toBe(false)
      })

      it("returns only view_workspace for viewer", () => {
        expect(hasPermission("viewer", "view_workspace")).toBe(true)
        expect(hasPermission("viewer", "create_content")).toBe(false)
        expect(hasPermission("viewer", "edit_content")).toBe(false)
        expect(hasPermission("viewer", "delete_content")).toBe(false)
        expect(hasPermission("viewer", "invite_members")).toBe(false)
      })
    })

    describe("getPermissions", () => {
      it("returns all permissions for owner", () => {
        const permissions = getPermissions("owner")
        expect(permissions).toHaveLength(8)
        expect(permissions).toContain("view_workspace")
        expect(permissions).toContain("delete_workspace")
        expect(permissions).toContain("billing_access")
      })

      it("returns 6 permissions for admin", () => {
        const permissions = getPermissions("admin")
        expect(permissions).toHaveLength(6)
        expect(permissions).toContain("view_workspace")
        expect(permissions).toContain("manage_roles")
        expect(permissions).not.toContain("billing_access")
        expect(permissions).not.toContain("delete_workspace")
      })

      it("returns 3 permissions for member", () => {
        const permissions = getPermissions("member")
        expect(permissions).toHaveLength(3)
        expect(permissions).toContain("view_workspace")
        expect(permissions).toContain("create_content")
        expect(permissions).toContain("edit_content")
      })

      it("returns only view_workspace for viewer", () => {
        const permissions = getPermissions("viewer")
        expect(permissions).toHaveLength(1)
        expect(permissions).toContain("view_workspace")
      })
    })

    describe("canManageRole", () => {
      it("owner can manage all roles", () => {
        expect(canManageRole("owner", "owner")).toBe(true)
        expect(canManageRole("owner", "admin")).toBe(true)
        expect(canManageRole("owner", "member")).toBe(true)
        expect(canManageRole("owner", "viewer")).toBe(true)
      })

      it("admin can only manage member and viewer", () => {
        expect(canManageRole("admin", "owner")).toBe(false)
        expect(canManageRole("admin", "admin")).toBe(false)
        expect(canManageRole("admin", "member")).toBe(true)
        expect(canManageRole("admin", "viewer")).toBe(true)
      })

      it("member cannot manage any roles", () => {
        expect(canManageRole("member", "owner")).toBe(false)
        expect(canManageRole("member", "admin")).toBe(false)
        expect(canManageRole("member", "member")).toBe(false)
        expect(canManageRole("member", "viewer")).toBe(false)
      })

      it("viewer cannot manage any roles", () => {
        expect(canManageRole("viewer", "owner")).toBe(false)
        expect(canManageRole("viewer", "admin")).toBe(false)
        expect(canManageRole("viewer", "member")).toBe(false)
        expect(canManageRole("viewer", "viewer")).toBe(false)
      })
    })
  })

  // ============================================================================
  // RoleBadge Tests
  // ============================================================================
  describe("RoleBadge", () => {
    it("renders owner badge with correct styling", () => {
      render(<RoleBadge role="owner" />)
      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByLabelText("Role: Owner")).toBeInTheDocument()
    })

    it("renders admin badge", () => {
      render(<RoleBadge role="admin" />)
      expect(screen.getByText("Admin")).toBeInTheDocument()
    })

    it("renders member badge", () => {
      render(<RoleBadge role="member" />)
      expect(screen.getByText("Member")).toBeInTheDocument()
    })

    it("renders viewer badge", () => {
      render(<RoleBadge role="viewer" />)
      expect(screen.getByText("Viewer")).toBeInTheDocument()
    })

    describe("size variants", () => {
      it("renders sm size", () => {
        const { container } = render(<RoleBadge role="owner" size="sm" />)
        expect(container.firstChild).toHaveClass("text-xs")
        expect(container.firstChild).toHaveClass("px-1.5")
      })

      it("renders md size (default)", () => {
        const { container } = render(<RoleBadge role="owner" size="md" />)
        expect(container.firstChild).toHaveClass("px-2")
      })

      it("renders lg size", () => {
        const { container } = render(<RoleBadge role="owner" size="lg" />)
        expect(container.firstChild).toHaveClass("text-sm")
        expect(container.firstChild).toHaveClass("px-2.5")
      })
    })

    it("hides icon when showIcon is false", () => {
      render(<RoleBadge role="owner" showIcon={false} />)
      expect(screen.getByText("Owner")).toBeInTheDocument()
      // The icon span should not be present
      const badge = screen.getByLabelText("Role: Owner")
      expect(badge.querySelector("[aria-hidden='true']")).not.toBeInTheDocument()
    })

    it("shows icon by default", () => {
      render(<RoleBadge role="owner" />)
      const badge = screen.getByLabelText("Role: Owner")
      expect(badge.querySelector("[aria-hidden='true']")).toBeInTheDocument()
    })

    describe("variant prop", () => {
      it("renders default variant", () => {
        render(<RoleBadge role="owner" variant="default" />)
        expect(screen.getByLabelText("Role: Owner")).toBeInTheDocument()
      })

      it("renders outline variant", () => {
        render(<RoleBadge role="owner" variant="outline" />)
        expect(screen.getByLabelText("Role: Owner")).toBeInTheDocument()
      })

      it("renders subtle variant", () => {
        render(<RoleBadge role="admin" variant="subtle" />)
        expect(screen.getByLabelText("Role: Admin")).toBeInTheDocument()
      })
    })

    it("applies custom className", () => {
      const { container } = render(<RoleBadge role="owner" className="custom-class" />)
      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  // ============================================================================
  // RolePermissions Tests
  // ============================================================================
  describe("RolePermissions", () => {
    it("renders role badge and description", () => {
      render(<RolePermissions role="owner" />)
      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByText("Full access and billing control")).toBeInTheDocument()
    })

    it("renders all permissions as a list", () => {
      render(<RolePermissions role="owner" />)
      expect(screen.getByRole("list", { name: /permissions for owner/i })).toBeInTheDocument()
      expect(screen.getByText("View workspace")).toBeInTheDocument()
      expect(screen.getByText("Create content")).toBeInTheDocument()
      expect(screen.getByText("Delete workspace")).toBeInTheDocument()
    })

    it("shows permission descriptions", () => {
      render(<RolePermissions role="owner" />)
      expect(screen.getByText("Access workspace data and content")).toBeInTheDocument()
      expect(screen.getByText("Permanently delete the workspace")).toBeInTheDocument()
    })

    it("shows check icons for granted permissions", () => {
      const { container } = render(<RolePermissions role="owner" />)
      // All permissions have check icons for owner
      const checkIcons = container.querySelectorAll(".text-success")
      expect(checkIcons.length).toBe(8)
    })

    it("shows X icons for denied permissions", () => {
      const { container } = render(<RolePermissions role="viewer" />)
      // 7 denied permissions for viewer
      const deniedItems = container.querySelectorAll(".line-through")
      expect(deniedItems.length).toBe(7)
    })

    it("shows limited note for admin manage_roles", () => {
      render(<RolePermissions role="admin" />)
      expect(screen.getByText("(member/viewer only)")).toBeInTheDocument()
    })

    describe("compact mode", () => {
      it("renders compact view without descriptions", () => {
        render(<RolePermissions role="owner" compact />)
        expect(screen.getByRole("list", { name: /permissions for owner/i })).toBeInTheDocument()
        // No descriptions in compact mode
        expect(screen.queryByText("Access workspace data and content")).not.toBeInTheDocument()
      })

      it("shows all permissions with check/X icons", () => {
        render(<RolePermissions role="member" compact />)
        const list = screen.getByRole("list")
        expect(within(list).getAllByRole("listitem")).toHaveLength(8)
      })

      it("shows strikethrough for denied permissions in compact mode", () => {
        const { container } = render(<RolePermissions role="viewer" compact />)
        const strikethrough = container.querySelectorAll(".line-through")
        expect(strikethrough.length).toBe(7)
      })
    })

    it("applies custom className", () => {
      const { container } = render(<RolePermissions role="owner" className="custom-class" />)
      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  // ============================================================================
  // RoleComparison Tests
  // ============================================================================
  describe("RoleComparison", () => {
    it("renders a table with all roles", () => {
      render(<RoleComparison />)
      expect(screen.getByRole("table")).toBeInTheDocument()
      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByText("Admin")).toBeInTheDocument()
      expect(screen.getByText("Member")).toBeInTheDocument()
      expect(screen.getByText("Viewer")).toBeInTheDocument()
    })

    it("renders all permission rows", () => {
      render(<RoleComparison />)
      expect(screen.getByText("View workspace")).toBeInTheDocument()
      expect(screen.getByText("Create content")).toBeInTheDocument()
      expect(screen.getByText("Edit content")).toBeInTheDocument()
      expect(screen.getByText("Delete content")).toBeInTheDocument()
      expect(screen.getByText("Invite members")).toBeInTheDocument()
      expect(screen.getByText("Manage roles")).toBeInTheDocument()
      expect(screen.getByText("Billing access")).toBeInTheDocument()
      expect(screen.getByText("Delete workspace")).toBeInTheDocument()
    })

    it("shows permission descriptions", () => {
      render(<RoleComparison />)
      expect(screen.getByText("Access workspace data and content")).toBeInTheDocument()
      expect(screen.getByText("View and manage billing and subscription")).toBeInTheDocument()
    })

    it("shows check marks for allowed permissions", () => {
      render(<RoleComparison />)
      const checkIcons = screen.getAllByLabelText("Yes")
      // Count of all allowed permissions across all roles
      // Owner: 8, Admin: 6, Member: 3, Viewer: 1 = 18 checks
      expect(checkIcons.length).toBe(18)
    })

    it("shows X marks for denied permissions", () => {
      render(<RoleComparison />)
      const xIcons = screen.getAllByLabelText("No")
      // Count of denied permissions: Owner: 0, Admin: 2, Member: 5, Viewer: 7 = 14
      expect(xIcons.length).toBe(14)
    })

    it("shows Limited text for admin manage_roles", () => {
      render(<RoleComparison />)
      expect(screen.getByText("Limited")).toBeInTheDocument()
    })

    describe("highlightRole prop", () => {
      it("highlights the specified role column", () => {
        const { container } = render(<RoleComparison highlightRole="admin" />)
        const highlightedCells = container.querySelectorAll(".bg-primary\\/5")
        // Header + 8 permission rows = 9 highlighted cells
        expect(highlightedCells.length).toBe(9)
      })
    })

    describe("onSelectRole prop", () => {
      it("calls onSelectRole when clicking a role header", async () => {
        const user = userEvent.setup()
        const handleSelect = vi.fn()
        render(<RoleComparison onSelectRole={handleSelect} />)

        const adminHeader = screen.getByText("Admin").closest("th")
        await user.click(adminHeader!)

        expect(handleSelect).toHaveBeenCalledWith("admin")
      })

      it("makes headers clickable when onSelectRole is provided", () => {
        const handleSelect = vi.fn()
        render(<RoleComparison onSelectRole={handleSelect} />)

        const ownerHeader = screen.getByText("Owner").closest("th")
        expect(ownerHeader).toHaveClass("cursor-pointer")
      })
    })

    describe("excludeRoles prop", () => {
      it("excludes specified roles from display", () => {
        render(<RoleComparison excludeRoles={["owner", "viewer"]} />)
        expect(screen.queryByText("Owner")).not.toBeInTheDocument()
        expect(screen.queryByText("Viewer")).not.toBeInTheDocument()
        expect(screen.getByText("Admin")).toBeInTheDocument()
        expect(screen.getByText("Member")).toBeInTheDocument()
      })
    })

    it("applies custom className", () => {
      const { container } = render(<RoleComparison className="custom-class" />)
      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  // ============================================================================
  // RoleSelector Tests
  // ============================================================================
  describe("RoleSelector", () => {
    const defaultProps = {
      value: "member" as Role,
      onChange: vi.fn(),
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it("renders with current value displayed", () => {
      render(<RoleSelector {...defaultProps} />)
      expect(screen.getByText("Member")).toBeInTheDocument()
    })

    it("renders combobox trigger", () => {
      render(<RoleSelector {...defaultProps} />)
      expect(screen.getByRole("combobox")).toBeInTheDocument()
    })

    it("shows role icon in trigger", () => {
      const { container } = render(<RoleSelector {...defaultProps} />)
      const trigger = container.querySelector("[role='combobox']")
      expect(trigger?.querySelector("[aria-hidden='true']")).toBeInTheDocument()
    })

    describe("disabled prop", () => {
      it("disables the selector when true", () => {
        render(<RoleSelector {...defaultProps} disabled />)
        expect(screen.getByRole("combobox")).toBeDisabled()
      })

      it("is not disabled by default", () => {
        render(<RoleSelector {...defaultProps} />)
        expect(screen.getByRole("combobox")).not.toBeDisabled()
      })
    })

    describe("size variants", () => {
      it("renders sm size", () => {
        render(<RoleSelector {...defaultProps} size="sm" />)
        expect(screen.getByRole("combobox")).toHaveClass("h-8")
      })

      it("renders md size (default)", () => {
        render(<RoleSelector {...defaultProps} size="md" />)
        expect(screen.getByRole("combobox")).toHaveClass("h-9")
      })

      it("renders lg size", () => {
        render(<RoleSelector {...defaultProps} size="lg" />)
        expect(screen.getByRole("combobox")).toHaveClass("h-10")
      })
    })

    it("applies custom aria-label", () => {
      render(<RoleSelector {...defaultProps} aria-label="Choose user role" />)
      expect(screen.getByLabelText("Choose user role")).toBeInTheDocument()
    })

    it("applies custom className", () => {
      render(<RoleSelector {...defaultProps} className="custom-class" />)
      expect(screen.getByRole("combobox")).toHaveClass("custom-class")
    })

    it("has default aria-label of Select role", () => {
      render(<RoleSelector {...defaultProps} />)
      expect(screen.getByLabelText("Select role")).toBeInTheDocument()
    })

    // Note: happy-dom doesn't support pointer capture events needed for full dropdown interaction
    // The following tests verify the component renders correctly with different props
    describe("value rendering", () => {
      it("displays owner value", () => {
        render(<RoleSelector {...defaultProps} value="owner" />)
        expect(screen.getByText("Owner")).toBeInTheDocument()
      })

      it("displays admin value", () => {
        render(<RoleSelector {...defaultProps} value="admin" />)
        expect(screen.getByText("Admin")).toBeInTheDocument()
      })

      it("displays viewer value", () => {
        render(<RoleSelector {...defaultProps} value="viewer" />)
        expect(screen.getByText("Viewer")).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // RoleGuard Tests
  // ============================================================================
  describe("RoleGuard", () => {
    it("renders children when user role is in allowedRoles", () => {
      render(
        <RoleGuard userRole="owner" allowedRoles={["owner", "admin"]}>
          <div data-testid="protected">Protected Content</div>
        </RoleGuard>
      )
      expect(screen.getByTestId("protected")).toBeInTheDocument()
    })

    it("does not render children when user role is not in allowedRoles", () => {
      render(
        <RoleGuard userRole="viewer" allowedRoles={["owner", "admin"]}>
          <div data-testid="protected">Protected Content</div>
        </RoleGuard>
      )
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument()
    })

    it("renders fallback when user role is not allowed", () => {
      render(
        <RoleGuard
          userRole="viewer"
          allowedRoles={["owner", "admin"]}
          fallback={<div data-testid="fallback">Access Denied</div>}
        >
          <div data-testid="protected">Protected Content</div>
        </RoleGuard>
      )
      expect(screen.queryByTestId("protected")).not.toBeInTheDocument()
      expect(screen.getByTestId("fallback")).toBeInTheDocument()
    })

    it("renders nothing when not allowed and no fallback", () => {
      const { container } = render(
        <RoleGuard userRole="viewer" allowedRoles={["owner", "admin"]}>
          <div data-testid="protected">Protected Content</div>
        </RoleGuard>
      )
      expect(container).toBeEmptyDOMElement()
    })

    describe("role permissions", () => {
      it("owner can access owner-only content", () => {
        render(
          <RoleGuard userRole="owner" allowedRoles={["owner"]}>
            <div data-testid="owner-only">Owner Only</div>
          </RoleGuard>
        )
        expect(screen.getByTestId("owner-only")).toBeInTheDocument()
      })

      it("admin cannot access owner-only content", () => {
        render(
          <RoleGuard userRole="admin" allowedRoles={["owner"]}>
            <div data-testid="owner-only">Owner Only</div>
          </RoleGuard>
        )
        expect(screen.queryByTestId("owner-only")).not.toBeInTheDocument()
      })

      it("member can access member-accessible content", () => {
        render(
          <RoleGuard userRole="member" allowedRoles={["owner", "admin", "member"]}>
            <div data-testid="member-content">Member Content</div>
          </RoleGuard>
        )
        expect(screen.getByTestId("member-content")).toBeInTheDocument()
      })

      it("viewer can access viewer-accessible content", () => {
        render(
          <RoleGuard userRole="viewer" allowedRoles={["owner", "admin", "member", "viewer"]}>
            <div data-testid="all-content">All Users Content</div>
          </RoleGuard>
        )
        expect(screen.getByTestId("all-content")).toBeInTheDocument()
      })
    })

    it("handles single allowed role", () => {
      render(
        <RoleGuard userRole="admin" allowedRoles={["admin"]}>
          <div data-testid="admin-only">Admin Only</div>
        </RoleGuard>
      )
      expect(screen.getByTestId("admin-only")).toBeInTheDocument()
    })

    it("handles empty allowedRoles array", () => {
      const { container } = render(
        <RoleGuard userRole="owner" allowedRoles={[]}>
          <div data-testid="content">Content</div>
        </RoleGuard>
      )
      expect(container).toBeEmptyDOMElement()
    })
  })

  // ============================================================================
  // RoleTooltip Tests
  // ============================================================================
  describe("RoleTooltip", () => {
    it("renders children", () => {
      render(
        <RoleTooltip role="owner">
          <button>Hover me</button>
        </RoleTooltip>
      )
      expect(screen.getByText("Hover me")).toBeInTheDocument()
    })

    it("renders trigger as button", () => {
      render(
        <RoleTooltip role="owner">
          <button>Hover me</button>
        </RoleTooltip>
      )
      expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument()
    })

    // Note: Radix UI Tooltip requires pointer events which happy-dom doesn't fully support
    // The tooltip interaction is tested via the TooltipProvider rendering correctly
    it("wraps children with tooltip provider", () => {
      const { container } = render(
        <RoleTooltip role="owner">
          <button>Hover me</button>
        </RoleTooltip>
      )
      // Tooltip wrapper should exist
      expect(container.querySelector("button")).toBeInTheDocument()
    })

    describe("positioning props", () => {
      it("accepts side prop", () => {
        render(
          <RoleTooltip role="owner" side="bottom">
            <button>Hover me</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Hover me")).toBeInTheDocument()
      })

      it("accepts align prop", () => {
        render(
          <RoleTooltip role="owner" align="start">
            <button>Hover me</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Hover me")).toBeInTheDocument()
      })

      it("accepts delayDuration prop", () => {
        render(
          <RoleTooltip role="owner" delayDuration={500}>
            <button>Hover me</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Hover me")).toBeInTheDocument()
      })
    })

    describe("different roles", () => {
      it("renders admin tooltip", () => {
        render(
          <RoleTooltip role="admin">
            <button>Admin User</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Admin User")).toBeInTheDocument()
      })

      it("renders member tooltip", () => {
        render(
          <RoleTooltip role="member">
            <button>Member User</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Member User")).toBeInTheDocument()
      })

      it("renders viewer tooltip", () => {
        render(
          <RoleTooltip role="viewer">
            <button>Viewer User</button>
          </RoleTooltip>
        )
        expect(screen.getByText("Viewer User")).toBeInTheDocument()
      })
    })

    it("accepts all role types without error", () => {
      ALL_ROLES.forEach((role) => {
        const { unmount } = render(
          <RoleTooltip role={role}>
            <span>{role}</span>
          </RoleTooltip>
        )
        expect(screen.getByText(role)).toBeInTheDocument()
        unmount()
      })
    })
  })

  // ============================================================================
  // Configuration Objects Tests
  // ============================================================================
  describe("Configuration Objects", () => {
    describe("ROLE_CONFIG", () => {
      it("has config for all roles", () => {
        expect(ROLE_CONFIG.owner).toBeDefined()
        expect(ROLE_CONFIG.admin).toBeDefined()
        expect(ROLE_CONFIG.member).toBeDefined()
        expect(ROLE_CONFIG.viewer).toBeDefined()
      })

      it("each role has required properties", () => {
        ALL_ROLES.forEach((role) => {
          const config = ROLE_CONFIG[role]
          expect(config.label).toBeDefined()
          expect(config.icon).toBeDefined()
          expect(config.description).toBeDefined()
          expect(config.badgeVariant).toBeDefined()
          expect(config.color).toBeDefined()
        })
      })

      it("owner has correct label", () => {
        expect(ROLE_CONFIG.owner.label).toBe("Owner")
      })

      it("admin has correct label", () => {
        expect(ROLE_CONFIG.admin.label).toBe("Admin")
      })

      it("member has correct label", () => {
        expect(ROLE_CONFIG.member.label).toBe("Member")
      })

      it("viewer has correct label", () => {
        expect(ROLE_CONFIG.viewer.label).toBe("Viewer")
      })
    })

    describe("PERMISSION_CONFIG", () => {
      it("has config for all permissions", () => {
        ALL_PERMISSIONS.forEach((permission) => {
          expect(PERMISSION_CONFIG[permission]).toBeDefined()
          expect(PERMISSION_CONFIG[permission].label).toBeDefined()
          expect(PERMISSION_CONFIG[permission].description).toBeDefined()
        })
      })

      it("view_workspace has correct label", () => {
        expect(PERMISSION_CONFIG.view_workspace.label).toBe("View workspace")
      })

      it("delete_workspace has correct description", () => {
        expect(PERMISSION_CONFIG.delete_workspace.description).toBe("Permanently delete the workspace")
      })
    })

    describe("PERMISSION_MATRIX", () => {
      it("has entries for all roles", () => {
        ALL_ROLES.forEach((role) => {
          expect(PERMISSION_MATRIX[role]).toBeDefined()
        })
      })

      it("has all permissions for each role", () => {
        ALL_ROLES.forEach((role) => {
          ALL_PERMISSIONS.forEach((permission) => {
            expect(typeof PERMISSION_MATRIX[role][permission]).toBe("boolean")
          })
        })
      })

      it("owner has all permissions true", () => {
        ALL_PERMISSIONS.forEach((permission) => {
          expect(PERMISSION_MATRIX.owner[permission]).toBe(true)
        })
      })

      it("viewer has only view_workspace true", () => {
        expect(PERMISSION_MATRIX.viewer.view_workspace).toBe(true)
        expect(PERMISSION_MATRIX.viewer.create_content).toBe(false)
        expect(PERMISSION_MATRIX.viewer.delete_workspace).toBe(false)
      })
    })

    describe("ALL_ROLES", () => {
      it("contains all four roles in hierarchy order", () => {
        expect(ALL_ROLES).toEqual(["owner", "admin", "member", "viewer"])
      })

      it("has length of 4", () => {
        expect(ALL_ROLES).toHaveLength(4)
      })
    })

    describe("ALL_PERMISSIONS", () => {
      it("contains all eight permissions", () => {
        expect(ALL_PERMISSIONS).toHaveLength(8)
        expect(ALL_PERMISSIONS).toContain("view_workspace")
        expect(ALL_PERMISSIONS).toContain("create_content")
        expect(ALL_PERMISSIONS).toContain("edit_content")
        expect(ALL_PERMISSIONS).toContain("delete_content")
        expect(ALL_PERMISSIONS).toContain("invite_members")
        expect(ALL_PERMISSIONS).toContain("manage_roles")
        expect(ALL_PERMISSIONS).toContain("billing_access")
        expect(ALL_PERMISSIONS).toContain("delete_workspace")
      })
    })
  })

  // ============================================================================
  // Accessibility Tests
  // ============================================================================
  describe("Accessibility", () => {
    describe("RoleBadge", () => {
      it("has aria-label describing the role", () => {
        render(<RoleBadge role="admin" />)
        expect(screen.getByLabelText("Role: Admin")).toBeInTheDocument()
      })

      it("marks icon as aria-hidden", () => {
        const { container } = render(<RoleBadge role="owner" />)
        const icon = container.querySelector("[aria-hidden='true']")
        expect(icon).toBeInTheDocument()
      })

      it("has different aria-labels for each role", () => {
        const { rerender } = render(<RoleBadge role="owner" />)
        expect(screen.getByLabelText("Role: Owner")).toBeInTheDocument()

        rerender(<RoleBadge role="viewer" />)
        expect(screen.getByLabelText("Role: Viewer")).toBeInTheDocument()
      })
    })

    describe("RolePermissions", () => {
      it("uses role=list with accessible name", () => {
        render(<RolePermissions role="member" />)
        expect(screen.getByRole("list", { name: /permissions for member/i })).toBeInTheDocument()
      })

      it("marks icons as aria-hidden", () => {
        const { container } = render(<RolePermissions role="owner" />)
        const hiddenIcons = container.querySelectorAll("[aria-hidden='true']")
        expect(hiddenIcons.length).toBeGreaterThan(0)
      })

      it("uses list semantics for permissions", () => {
        render(<RolePermissions role="owner" />)
        const list = screen.getByRole("list")
        expect(list).toBeInTheDocument()
      })
    })

    describe("RoleComparison", () => {
      it("uses semantic table elements", () => {
        render(<RoleComparison />)
        expect(screen.getByRole("table")).toBeInTheDocument()
        expect(screen.getAllByRole("columnheader").length).toBe(5) // Permission + 4 roles
        expect(screen.getAllByRole("row").length).toBe(9) // Header + 8 permissions
      })

      it("has aria-labels on check/X icons", () => {
        render(<RoleComparison />)
        expect(screen.getAllByLabelText("Yes").length).toBeGreaterThan(0)
        expect(screen.getAllByLabelText("No").length).toBeGreaterThan(0)
      })

      it("table has proper structure", () => {
        render(<RoleComparison />)
        const table = screen.getByRole("table")
        expect(within(table).getAllByRole("row").length).toBe(9)
      })
    })

    describe("RoleSelector", () => {
      it("has default aria-label", () => {
        render(<RoleSelector value="member" onChange={vi.fn()} />)
        expect(screen.getByLabelText("Select role")).toBeInTheDocument()
      })

      it("supports custom aria-label", () => {
        render(
          <RoleSelector
            value="member"
            onChange={vi.fn()}
            aria-label="Assign team role"
          />
        )
        expect(screen.getByLabelText("Assign team role")).toBeInTheDocument()
      })

      it("marks icons as aria-hidden", () => {
        const { container } = render(<RoleSelector value="member" onChange={vi.fn()} />)
        const triggerIcon = container.querySelector("[aria-hidden='true']")
        expect(triggerIcon).toBeInTheDocument()
      })

      it("uses combobox role", () => {
        render(<RoleSelector value="member" onChange={vi.fn()} />)
        expect(screen.getByRole("combobox")).toBeInTheDocument()
      })
    })

    describe("RoleGuard", () => {
      it("does not affect child accessibility", () => {
        render(
          <RoleGuard userRole="owner" allowedRoles={["owner"]}>
            <button>Protected Button</button>
          </RoleGuard>
        )
        expect(screen.getByRole("button", { name: "Protected Button" })).toBeInTheDocument()
      })
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe("Integration", () => {
    it("RoleGuard respects permission matrix", () => {
      // Test that RoleGuard works correctly with the permission matrix
      const ProtectedDeleteButton = ({ userRole }: { userRole: Role }) => (
        <RoleGuard
          userRole={userRole}
          allowedRoles={ALL_ROLES.filter((r) => hasPermission(r, "delete_content"))}
        >
          <button>Delete</button>
        </RoleGuard>
      )

      // Owner can delete
      const { rerender } = render(<ProtectedDeleteButton userRole="owner" />)
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()

      // Admin can delete
      rerender(<ProtectedDeleteButton userRole="admin" />)
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument()

      // Member cannot delete
      rerender(<ProtectedDeleteButton userRole="member" />)
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()

      // Viewer cannot delete
      rerender(<ProtectedDeleteButton userRole="viewer" />)
      expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument()
    })

    it("RoleBadge displays correct badge for each role", () => {
      ALL_ROLES.forEach((role) => {
        const { unmount } = render(<RoleBadge role={role} />)
        expect(screen.getByText(ROLE_CONFIG[role].label)).toBeInTheDocument()
        unmount()
      })
    })

    it("RoleComparison reflects permission matrix accurately", () => {
      render(<RoleComparison />)

      // Count checks and X's
      const checks = screen.getAllByLabelText("Yes")
      const xs = screen.getAllByLabelText("No")

      // Total should be 32 (8 permissions x 4 roles)
      expect(checks.length + xs.length).toBe(32)

      // Calculate expected checks from matrix
      let expectedChecks = 0
      ALL_ROLES.forEach((role) => {
        ALL_PERMISSIONS.forEach((permission) => {
          if (PERMISSION_MATRIX[role][permission]) {
            expectedChecks++
          }
        })
      })
      expect(checks.length).toBe(expectedChecks)
    })
  })
})
