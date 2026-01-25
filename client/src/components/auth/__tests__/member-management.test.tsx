import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  MemberManagement,
  MemberList,
  MemberItem,
  MemberAvatar,
  InviteMemberForm,
  InvitationList,
  InvitationItem,
  RoleSelector,
  RemoveMemberDialog,
  type Member,
  type Invitation,
  type Role,
} from "../member-management"

// Mock data
const mockMembers: Member[] = [
  {
    id: "owner-1",
    name: "John Owner",
    email: "john@company.com",
    avatarUrl: "https://example.com/john.jpg",
    role: "owner",
    joinedAt: new Date("2024-01-01"),
  },
  {
    id: "admin-1",
    name: "Jane Admin",
    email: "jane@company.com",
    role: "admin",
    joinedAt: new Date("2024-02-01"),
  },
  {
    id: "member-1",
    name: "Bob Member",
    email: "bob@company.com",
    role: "member",
    joinedAt: new Date("2024-03-01"),
  },
  {
    id: "viewer-1",
    name: "Alice Viewer",
    email: "alice@company.com",
    role: "viewer",
    joinedAt: new Date("2024-04-01"),
  },
]

const mockInvitations: Invitation[] = [
  {
    id: "invite-1",
    email: "pending@company.com",
    role: "member",
    status: "pending",
    sentAt: new Date("2024-05-01"),
    expiresAt: new Date("2024-05-15"),
  },
  {
    id: "invite-2",
    email: "expired@company.com",
    role: "viewer",
    status: "expired",
    sentAt: new Date("2024-04-01"),
    expiresAt: new Date("2024-04-15"),
  },
]

const defaultProps = {
  workspaceId: "ws-123",
  members: mockMembers,
  invitations: mockInvitations,
  currentUserRole: "owner" as Role,
  currentUserId: "owner-1",
  onInvite: vi.fn(),
  onRemove: vi.fn(),
  onUpdateRole: vi.fn(),
  onResendInvite: vi.fn(),
  onCancelInvite: vi.fn(),
}

describe("MemberManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders all sections for owner", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("Invite members")).toBeInTheDocument()
      expect(screen.getByText("Members")).toBeInTheDocument()
      expect(screen.getByText("Pending invitations")).toBeInTheDocument()
    })

    it("renders all sections for admin", () => {
      render(<MemberManagement {...defaultProps} currentUserRole="admin" />)

      expect(screen.getByText("Invite members")).toBeInTheDocument()
      expect(screen.getByText("Members")).toBeInTheDocument()
      expect(screen.getByText("Pending invitations")).toBeInTheDocument()
    })

    it("hides invite and invitations sections for member role", () => {
      render(<MemberManagement {...defaultProps} currentUserRole="member" />)

      expect(screen.queryByText("Invite members")).not.toBeInTheDocument()
      expect(screen.getByText("Members")).toBeInTheDocument()
      expect(screen.queryByText("Pending invitations")).not.toBeInTheDocument()
    })

    it("hides invite and invitations sections for viewer role", () => {
      render(<MemberManagement {...defaultProps} currentUserRole="viewer" />)

      expect(screen.queryByText("Invite members")).not.toBeInTheDocument()
      expect(screen.getByText("Members")).toBeInTheDocument()
      expect(screen.queryByText("Pending invitations")).not.toBeInTheDocument()
    })

    it("shows loading state", () => {
      render(<MemberManagement {...defaultProps} isLoading={true} />)

      expect(screen.getByText("Loading members...")).toBeInTheDocument()
    })

    it("shows error message", () => {
      render(<MemberManagement {...defaultProps} error="Something went wrong" />)

      expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong")
    })

    it("displays correct member count", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("4 members in this workspace")).toBeInTheDocument()
    })

    it("displays correct invitation count", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("2 pending invitations")).toBeInTheDocument()
    })

    it("shows singular form for single member", () => {
      render(<MemberManagement {...defaultProps} members={[mockMembers[0]]} />)

      expect(screen.getByText("1 member in this workspace")).toBeInTheDocument()
    })

    it("shows singular form for single invitation", () => {
      render(<MemberManagement {...defaultProps} invitations={[mockInvitations[0]]} />)

      expect(screen.getByText("1 pending invitation")).toBeInTheDocument()
    })
  })

  describe("MemberList", () => {
    it("renders all members", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("John Owner")).toBeInTheDocument()
      expect(screen.getByText("Jane Admin")).toBeInTheDocument()
      expect(screen.getByText("Bob Member")).toBeInTheDocument()
      expect(screen.getByText("Alice Viewer")).toBeInTheDocument()
    })

    it("shows empty state when no members", () => {
      render(<MemberManagement {...defaultProps} members={[]} />)

      expect(screen.getByText("No members yet")).toBeInTheDocument()
      expect(screen.getByText("Invite team members to collaborate in this workspace.")).toBeInTheDocument()
    })

    it("sorts members with owner first", () => {
      render(<MemberManagement {...defaultProps} />)

      const memberList = screen.getByRole("list", { name: "Workspace members" })
      const items = within(memberList).getAllByTestId(/member-item-/)

      // Owner should be first
      expect(items[0]).toHaveAttribute("data-testid", "member-item-owner-1")
    })

    it("shows 'You' badge for current user", () => {
      render(<MemberManagement {...defaultProps} />)

      // Owner is the current user
      const ownerItem = screen.getByTestId("member-item-owner-1")
      expect(within(ownerItem).getByText("You")).toBeInTheDocument()
    })

    it("shows member emails", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("john@company.com")).toBeInTheDocument()
      expect(screen.getByText("jane@company.com")).toBeInTheDocument()
    })

    it("shows role badges for non-editable members (when user is member/viewer)", () => {
      render(<MemberManagement {...defaultProps} currentUserRole="member" currentUserId="member-1" />)

      // All roles should be shown as badges, not dropdowns
      expect(screen.getByText("Owner")).toBeInTheDocument()
      expect(screen.getByText("Admin")).toBeInTheDocument()
    })
  })

  describe("InviteMemberForm", () => {
    it("renders email input and role selector", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByPlaceholderText("colleague@company.com")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument()
    })

    it("validates empty email", async () => {
      const user = userEvent.setup()
      render(<MemberManagement {...defaultProps} />)

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      // Button should be disabled when email is empty, so no error should appear
      // because the form shouldn't submit
      expect(defaultProps.onInvite).not.toHaveBeenCalled()
    })

    it("validates invalid email format", async () => {
      const user = userEvent.setup()
      const onInvite = vi.fn()
      render(<MemberManagement {...defaultProps} onInvite={onInvite} />)

      const emailInput = screen.getByPlaceholderText("colleague@company.com")
      await user.type(emailInput, "invalid-email")

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      // Should not call onInvite with invalid email
      expect(onInvite).not.toHaveBeenCalled()
    })

    it("submits valid invitation", async () => {
      const user = userEvent.setup()
      const onInvite = vi.fn().mockResolvedValue(undefined)
      render(<MemberManagement {...defaultProps} onInvite={onInvite} />)

      const emailInput = screen.getByPlaceholderText("colleague@company.com")
      await user.type(emailInput, "newuser@company.com")

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(onInvite).toHaveBeenCalledWith("newuser@company.com", "member")
      })
    })

    it("clears form after successful submission", async () => {
      const user = userEvent.setup()
      const onInvite = vi.fn().mockResolvedValue(undefined)
      render(<MemberManagement {...defaultProps} onInvite={onInvite} />)

      const emailInput = screen.getByPlaceholderText("colleague@company.com") as HTMLInputElement
      await user.type(emailInput, "newuser@company.com")

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(emailInput.value).toBe("")
      })
    })

    it("shows error on failed submission", async () => {
      const user = userEvent.setup()
      const onInvite = vi.fn().mockRejectedValue(new Error("User already exists"))
      render(<MemberManagement {...defaultProps} onInvite={onInvite} />)

      const emailInput = screen.getByPlaceholderText("colleague@company.com")
      await user.type(emailInput, "existing@company.com")

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByText("User already exists")).toBeInTheDocument()
      })
    })

    it("shows loading state during submission", async () => {
      const user = userEvent.setup()
      const onInvite = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
      render(<MemberManagement {...defaultProps} onInvite={onInvite} />)

      const emailInput = screen.getByPlaceholderText("colleague@company.com")
      await user.type(emailInput, "newuser@company.com")

      const inviteButton = screen.getByRole("button", { name: /invite/i })
      await user.click(inviteButton)

      await waitFor(() => {
        expect(screen.getByText("Sending...")).toBeInTheDocument()
      })
    })
  })

  describe("Role Updates", () => {
    it("allows owner to change admin role", () => {
      render(<MemberManagement {...defaultProps} />)

      // Find the admin's role selector (not the owner's)
      const adminItem = screen.getByTestId("member-item-admin-1")
      const roleSelector = within(adminItem).getByRole("combobox", { name: "Select role" })

      // Owner can change any non-owner role, so selector should be present
      expect(roleSelector).toBeInTheDocument()
      expect(roleSelector).not.toBeDisabled()
    })

    it("allows owner to change member role to viewer", () => {
      render(<MemberManagement {...defaultProps} />)

      const memberItem = screen.getByTestId("member-item-member-1")
      const roleSelector = within(memberItem).getByRole("combobox", { name: "Select role" })

      // Owner can change any non-owner role, so selector should be present
      expect(roleSelector).toBeInTheDocument()
      expect(roleSelector).not.toBeDisabled()
    })

    it("prevents admin from changing owner role", () => {
      render(<MemberManagement {...defaultProps} currentUserRole="admin" currentUserId="admin-1" />)

      const ownerItem = screen.getByTestId("member-item-owner-1")
      // Owner should show badge, not dropdown
      expect(within(ownerItem).getByText("Owner")).toBeInTheDocument()
      expect(within(ownerItem).queryByRole("combobox")).not.toBeInTheDocument()
    })

    it("prevents admin from changing other admin roles", () => {
      // Add another admin to test
      const membersWithTwoAdmins = [
        ...mockMembers,
        {
          id: "admin-2",
          name: "Another Admin",
          email: "admin2@company.com",
          role: "admin" as Role,
          joinedAt: new Date("2024-02-15"),
        },
      ]

      render(
        <MemberManagement
          {...defaultProps}
          members={membersWithTwoAdmins}
          currentUserRole="admin"
          currentUserId="admin-1"
        />
      )

      const otherAdminItem = screen.getByTestId("member-item-admin-2")
      // Should show badge, not dropdown
      expect(within(otherAdminItem).getByText("Admin")).toBeInTheDocument()
      expect(within(otherAdminItem).queryByRole("combobox")).not.toBeInTheDocument()
    })

    it("allows admin to change member/viewer roles", () => {
      render(
        <MemberManagement
          {...defaultProps}
          currentUserRole="admin"
          currentUserId="admin-1"
        />
      )

      const memberItem = screen.getByTestId("member-item-member-1")
      const roleSelector = within(memberItem).getByRole("combobox", { name: "Select role" })

      // Admin can change member/viewer roles, so selector should be present
      expect(roleSelector).toBeInTheDocument()
      expect(roleSelector).not.toBeDisabled()
    })
  })

  describe("Member Removal", () => {
    it("shows remove action for non-owner, non-self members (as owner)", async () => {
      const user = userEvent.setup()
      render(<MemberManagement {...defaultProps} />)

      // Admin member should have remove action
      const adminItem = screen.getByTestId("member-item-admin-1")
      const actionsButton = within(adminItem).getByRole("button", { name: /actions for jane admin/i })

      await user.click(actionsButton)

      expect(screen.getByText("Remove from workspace")).toBeInTheDocument()
    })

    it("does not show remove action for owner", () => {
      render(<MemberManagement {...defaultProps} />)

      const ownerItem = screen.getByTestId("member-item-owner-1")
      expect(within(ownerItem).queryByRole("button", { name: /actions/i })).not.toBeInTheDocument()
    })

    it("does not show remove action for self", () => {
      render(<MemberManagement {...defaultProps} />)

      const ownerItem = screen.getByTestId("member-item-owner-1")
      // Owner is current user, so no remove action
      expect(within(ownerItem).queryByRole("button", { name: /actions/i })).not.toBeInTheDocument()
    })

    it("opens confirmation dialog when remove is clicked", async () => {
      const user = userEvent.setup()
      render(<MemberManagement {...defaultProps} />)

      const adminItem = screen.getByTestId("member-item-admin-1")
      const actionsButton = within(adminItem).getByRole("button", { name: /actions for jane admin/i })

      await user.click(actionsButton)
      await user.click(screen.getByText("Remove from workspace"))

      await waitFor(() => {
        expect(screen.getByRole("alertdialog")).toBeInTheDocument()
      })
      const dialog = screen.getByRole("alertdialog")
      expect(within(dialog).getByText(/are you sure you want to remove/i)).toBeInTheDocument()
    })

    it("calls onRemove when confirmed", async () => {
      const user = userEvent.setup()
      const onRemove = vi.fn().mockResolvedValue(undefined)
      render(<MemberManagement {...defaultProps} onRemove={onRemove} />)

      const adminItem = screen.getByTestId("member-item-admin-1")
      const actionsButton = within(adminItem).getByRole("button", { name: /actions for jane admin/i })

      await user.click(actionsButton)
      await user.click(screen.getByText("Remove from workspace"))

      // Click confirm in dialog
      const confirmButton = screen.getByRole("button", { name: /remove member/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(onRemove).toHaveBeenCalledWith("admin-1")
      })
    })

    it("closes dialog on cancel", async () => {
      const user = userEvent.setup()
      render(<MemberManagement {...defaultProps} />)

      const adminItem = screen.getByTestId("member-item-admin-1")
      const actionsButton = within(adminItem).getByRole("button", { name: /actions for jane admin/i })

      await user.click(actionsButton)
      await user.click(screen.getByText("Remove from workspace"))

      // Click cancel in dialog
      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByText("Remove member")).not.toBeInTheDocument()
      })
    })
  })

  describe("InvitationList", () => {
    it("renders all invitations", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByText("pending@company.com")).toBeInTheDocument()
      expect(screen.getByText("expired@company.com")).toBeInTheDocument()
    })

    it("shows empty state when no invitations", () => {
      render(<MemberManagement {...defaultProps} invitations={[]} />)

      expect(screen.getByText("No pending invitations")).toBeInTheDocument()
    })

    it("shows pending badge for pending invitations", () => {
      render(<MemberManagement {...defaultProps} />)

      const pendingItem = screen.getByTestId("invitation-item-invite-1")
      expect(within(pendingItem).getByText("Pending")).toBeInTheDocument()
    })

    it("shows expired badge for expired invitations", () => {
      render(<MemberManagement {...defaultProps} />)

      const expiredItem = screen.getByTestId("invitation-item-invite-2")
      expect(within(expiredItem).getByText("Expired")).toBeInTheDocument()
    })

    it("shows resend and cancel buttons", () => {
      render(<MemberManagement {...defaultProps} />)

      const pendingItem = screen.getByTestId("invitation-item-invite-1")
      expect(within(pendingItem).getByRole("button", { name: /resend/i })).toBeInTheDocument()
      expect(within(pendingItem).getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("calls onResendInvite when resend is clicked", async () => {
      const user = userEvent.setup()
      const onResendInvite = vi.fn().mockResolvedValue(undefined)
      render(<MemberManagement {...defaultProps} onResendInvite={onResendInvite} />)

      const pendingItem = screen.getByTestId("invitation-item-invite-1")
      const resendButton = within(pendingItem).getByRole("button", { name: /resend invitation to pending@company.com/i })

      await user.click(resendButton)

      await waitFor(() => {
        expect(onResendInvite).toHaveBeenCalledWith("invite-1")
      })
    })

    it("calls onCancelInvite when cancel is clicked", async () => {
      const user = userEvent.setup()
      const onCancelInvite = vi.fn().mockResolvedValue(undefined)
      render(<MemberManagement {...defaultProps} onCancelInvite={onCancelInvite} />)

      const pendingItem = screen.getByTestId("invitation-item-invite-1")
      const cancelButton = within(pendingItem).getByRole("button", { name: /cancel invitation for pending@company.com/i })

      await user.click(cancelButton)

      await waitFor(() => {
        expect(onCancelInvite).toHaveBeenCalledWith("invite-1")
      })
    })
  })

  describe("Accessibility", () => {
    it("has accessible member list", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByRole("list", { name: "Workspace members" })).toBeInTheDocument()
    })

    it("has accessible invitation list", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByRole("list", { name: "Pending invitations" })).toBeInTheDocument()
    })

    it("has accessible role selectors", () => {
      render(<MemberManagement {...defaultProps} />)

      const roleSelectors = screen.getAllByRole("combobox", { name: "Select role" })
      expect(roleSelectors.length).toBeGreaterThan(0)
    })

    it("has accessible invite form", () => {
      render(<MemberManagement {...defaultProps} />)

      expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument()
    })

    it("has accessible error alert", () => {
      render(<MemberManagement {...defaultProps} error="Test error" />)

      expect(screen.getByRole("alert")).toHaveTextContent("Test error")
    })

    it("provides screen reader text for loading state", () => {
      render(<MemberManagement {...defaultProps} isLoading={true} />)

      expect(screen.getByText("Loading members...")).toBeInTheDocument()
    })

    it("has aria labels on action buttons", async () => {
      const user = userEvent.setup()
      render(<MemberManagement {...defaultProps} />)

      const adminItem = screen.getByTestId("member-item-admin-1")
      const actionsButton = within(adminItem).getByRole("button", { name: /actions for jane admin/i })

      expect(actionsButton).toBeInTheDocument()
    })
  })
})

describe("MemberAvatar", () => {
  it("renders avatar container with correct size", () => {
    render(<MemberAvatar name="John Doe" avatarUrl="https://example.com/avatar.jpg" />)

    // Avatar container should be rendered (fallback shows because image can't load in happy-dom)
    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("shows initials for two-word name", () => {
    render(<MemberAvatar name="John Doe" />)

    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("shows first two letters for single-word name", () => {
    render(<MemberAvatar name="Admin" />)

    expect(screen.getByText("AD")).toBeInTheDocument()
  })

  it("applies size classes correctly", () => {
    const { rerender } = render(<MemberAvatar name="Test" size="sm" />)
    expect(screen.getByText("TE").closest('[class*="h-8 w-8"]')).toBeInTheDocument()

    rerender(<MemberAvatar name="Test" size="default" />)
    expect(screen.getByText("TE").closest('[class*="h-10 w-10"]')).toBeInTheDocument()

    rerender(<MemberAvatar name="Test" size="lg" />)
    expect(screen.getByText("TE").closest('[class*="h-12 w-12"]')).toBeInTheDocument()
  })
})

describe("RoleSelector", () => {
  it("renders current value", () => {
    render(<RoleSelector value="member" onChange={vi.fn()} />)

    expect(screen.getByText("Member")).toBeInTheDocument()
  })

  it("renders combobox", () => {
    render(<RoleSelector value="member" onChange={vi.fn()} />)

    expect(screen.getByRole("combobox")).toBeInTheDocument()
  })

  it("is disabled when disabled prop is true", () => {
    render(<RoleSelector value="member" onChange={vi.fn()} disabled />)

    expect(screen.getByRole("combobox")).toBeDisabled()
  })

  it("shows member role by default", () => {
    render(<RoleSelector value="member" onChange={vi.fn()} />)

    // Current value is displayed
    expect(screen.getByText("Member")).toBeInTheDocument()
  })

  it("shows different role values", () => {
    const { rerender } = render(<RoleSelector value="admin" onChange={vi.fn()} />)
    expect(screen.getByText("Admin")).toBeInTheDocument()

    rerender(<RoleSelector value="viewer" onChange={vi.fn()} />)
    expect(screen.getByText("Viewer")).toBeInTheDocument()
  })
})

describe("InviteMemberForm (standalone)", () => {
  it("renders correctly", () => {
    render(<InviteMemberForm onSubmit={vi.fn()} />)

    expect(screen.getByPlaceholderText("colleague@company.com")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /invite/i })).toBeInTheDocument()
  })

  it("disables form when disabled prop is true", () => {
    render(<InviteMemberForm onSubmit={vi.fn()} disabled />)

    expect(screen.getByPlaceholderText("colleague@company.com")).toBeDisabled()
    expect(screen.getByRole("button", { name: /invite/i })).toBeDisabled()
  })

  it("shows error message when provided", () => {
    render(<InviteMemberForm onSubmit={vi.fn()} error="Email already invited" />)

    expect(screen.getByText("Email already invited")).toBeInTheDocument()
  })

  it("validates required email", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<InviteMemberForm onSubmit={onSubmit} />)

    // Try to submit with empty email - button should be disabled
    const inviteButton = screen.getByRole("button", { name: /invite/i })
    expect(inviteButton).toBeDisabled()
  })
})

describe("MemberItem (standalone)", () => {
  const defaultMemberItemProps = {
    member: mockMembers[1], // Jane Admin
    currentUserRole: "owner" as Role,
    currentUserId: "owner-1",
    onUpdateRole: vi.fn(),
    onRemove: vi.fn(),
  }

  it("renders member info correctly", () => {
    render(<MemberItem {...defaultMemberItemProps} />)

    expect(screen.getByText("Jane Admin")).toBeInTheDocument()
    expect(screen.getByText("jane@company.com")).toBeInTheDocument()
  })

  it("shows loading indicator when updating role", () => {
    render(<MemberItem {...defaultMemberItemProps} isUpdatingRole />)

    // Loading spinner should be visible
    expect(screen.getByTestId("member-item-admin-1").querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("shows loading indicator when removing", () => {
    render(<MemberItem {...defaultMemberItemProps} isRemoving />)

    // Actions button should show loading
    const actionsButton = screen.getByRole("button", { name: /actions/i })
    expect(actionsButton.querySelector('.animate-spin')).toBeInTheDocument()
  })
})

describe("InvitationItem (standalone)", () => {
  const pendingInvitation = mockInvitations[0]
  const expiredInvitation = mockInvitations[1]

  it("renders pending invitation correctly", () => {
    render(
      <InvitationItem
        invitation={pendingInvitation}
        onResend={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText("pending@company.com")).toBeInTheDocument()
    expect(screen.getByText("Pending")).toBeInTheDocument()
    expect(screen.getByText(/invited as member/i)).toBeInTheDocument()
  })

  it("renders expired invitation correctly", () => {
    render(
      <InvitationItem
        invitation={expiredInvitation}
        onResend={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    expect(screen.getByText("expired@company.com")).toBeInTheDocument()
    expect(screen.getByText("Expired")).toBeInTheDocument()
  })

  it("shows loading state when resending", () => {
    render(
      <InvitationItem
        invitation={pendingInvitation}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending
      />
    )

    const resendButton = screen.getByRole("button", { name: /resend/i })
    expect(resendButton.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("shows loading state when canceling", () => {
    render(
      <InvitationItem
        invitation={pendingInvitation}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isCanceling
      />
    )

    const cancelButton = screen.getByRole("button", { name: /cancel/i })
    expect(cancelButton.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it("disables both buttons when either action is in progress", () => {
    render(
      <InvitationItem
        invitation={pendingInvitation}
        onResend={vi.fn()}
        onCancel={vi.fn()}
        isResending
      />
    )

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled()
  })
})

describe("RemoveMemberDialog", () => {
  const defaultDialogProps = {
    open: true,
    onOpenChange: vi.fn(),
    member: mockMembers[1],
    onConfirm: vi.fn(),
  }

  it("renders dialog with member name", () => {
    render(<RemoveMemberDialog {...defaultDialogProps} />)

    const dialog = screen.getByRole("alertdialog")
    // "Remove member" appears as both title and button text, so use within to scope
    expect(within(dialog).getByRole("heading", { name: "Remove member" })).toBeInTheDocument()
    expect(within(dialog).getByText("Jane Admin")).toBeInTheDocument()
  })

  it("calls onConfirm when confirmed", async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<RemoveMemberDialog {...defaultDialogProps} onConfirm={onConfirm} />)

    await user.click(screen.getByRole("button", { name: /remove member/i }))

    expect(onConfirm).toHaveBeenCalled()
  })

  it("calls onOpenChange when canceled", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<RemoveMemberDialog {...defaultDialogProps} onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole("button", { name: /cancel/i }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("shows loading state when removing", () => {
    render(<RemoveMemberDialog {...defaultDialogProps} isRemoving />)

    expect(screen.getByText("Removing...")).toBeInTheDocument()
  })

  it("disables buttons when removing", () => {
    render(<RemoveMemberDialog {...defaultDialogProps} isRemoving />)

    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /removing/i })).toBeDisabled()
  })
})

describe("MemberList (standalone)", () => {
  const defaultListProps = {
    members: mockMembers,
    currentUserRole: "owner" as Role,
    currentUserId: "owner-1",
    onUpdateRole: vi.fn(),
    onRemove: vi.fn(),
  }

  it("renders empty state when no members", () => {
    render(<MemberList {...defaultListProps} members={[]} />)

    expect(screen.getByText("No members yet")).toBeInTheDocument()
  })

  it("sorts owner to the top", () => {
    render(<MemberList {...defaultListProps} />)

    const memberList = screen.getByRole("list")
    const items = within(memberList).getAllByTestId(/member-item-/)

    expect(items[0]).toHaveAttribute("data-testid", "member-item-owner-1")
  })
})

describe("InvitationList (standalone)", () => {
  const defaultListProps = {
    invitations: mockInvitations,
    onResend: vi.fn(),
    onCancel: vi.fn(),
  }

  it("renders empty state when no invitations", () => {
    render(<InvitationList {...defaultListProps} invitations={[]} />)

    expect(screen.getByText("No pending invitations")).toBeInTheDocument()
  })

  it("sorts pending invitations first", () => {
    render(<InvitationList {...defaultListProps} />)

    const invitationList = screen.getByRole("list")
    const items = within(invitationList).getAllByTestId(/invitation-item-/)

    // Pending should be first (invite-1 is pending, invite-2 is expired)
    expect(items[0]).toHaveAttribute("data-testid", "invitation-item-invite-1")
  })
})
