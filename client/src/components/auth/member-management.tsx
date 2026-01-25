import * as React from "react"
import { format, formatDistanceToNow } from "date-fns"
import {
  Check,
  ChevronDown,
  Crown,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Shield,
  ShieldCheck,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/profile-mark"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/field-label"
import { Separator } from "@/components/ui/divider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/option-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/action-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/confirmation-modal"



// Types
export type Role = "owner" | "admin" | "member" | "viewer"

export interface Member {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: Role
  joinedAt: Date
}

export interface Invitation {
  id: string
  email: string
  role: Exclude<Role, "owner">
  status: "pending" | "expired"
  sentAt: Date
  expiresAt: Date
}

export interface MemberManagementProps {
  /** Workspace ID */
  workspaceId: string
  /** List of workspace members */
  members: Member[]
  /** List of pending invitations */
  invitations: Invitation[]
  /** Current user's role in the workspace */
  currentUserRole: Role
  /** Current user's member ID (to prevent self-removal) */
  currentUserId?: string
  /** Callback when inviting a member */
  onInvite: (email: string, role: Exclude<Role, "owner">) => Promise<void>
  /** Callback when removing a member */
  onRemove: (memberId: string) => Promise<void>
  /** Callback when updating a member's role */
  onUpdateRole: (memberId: string, role: Role) => Promise<void>
  /** Callback when resending an invitation */
  onResendInvite: (inviteId: string) => Promise<void>
  /** Callback when canceling an invitation */
  onCancelInvite: (inviteId: string) => Promise<void>
  /** Loading state for the entire component */
  isLoading?: boolean
  /** Error message to display */
  error?: string | null
  /** Additional className */
  className?: string
}

// Role configuration
const ROLE_CONFIG: Record<Role, { label: string; icon: React.ReactNode; description: string; badgeVariant: "default" | "secondary" | "outline" }> = {
  owner: {
    label: "Owner",
    icon: <Crown className="h-4 w-4" />,
    description: "Full access and billing control",
    badgeVariant: "default",
  },
  admin: {
    label: "Admin",
    icon: <ShieldCheck className="h-4 w-4" />,
    description: "Manage members and settings",
    badgeVariant: "secondary",
  },
  member: {
    label: "Member",
    icon: <User className="h-4 w-4" />,
    description: "Can view and edit content",
    badgeVariant: "outline",
  },
  viewer: {
    label: "Viewer",
    icon: <Shield className="h-4 w-4" />,
    description: "Read-only access",
    badgeVariant: "outline",
  },
}

// Invitation roles (excludes owner)
const INVITATION_ROLES: Exclude<Role, "owner">[] = ["admin", "member", "viewer"]

/**
 * MemberAvatar Component
 *
 * Displays member avatar with fallback initials.
 */
export interface MemberAvatarProps {
  /** Member name */
  name: string
  /** Avatar URL */
  avatarUrl?: string
  /** Size of avatar */
  size?: "sm" | "default" | "lg"
  /** Additional className */
  className?: string
}

export function MemberAvatar({
  name,
  avatarUrl,
  size = "default",
  className,
}: MemberAvatarProps) {
  const initials = React.useMemo(() => {
    const words = name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }, [name])

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    default: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  }

  return (
    <Avatar className={cn(sizeClasses[size], "shrink-0", className)}>
      <AvatarImage src={avatarUrl} alt={`${name}'s avatar`} />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * RoleSelector Component
 *
 * Dropdown for selecting a member's role.
 */
export interface RoleSelectorProps {
  /** Current role value */
  value: Role | Exclude<Role, "owner">
  /** Callback when role changes */
  onChange: (role: Role) => void
  /** Whether to include owner role */
  includeOwner?: boolean
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Current user's role (for RBAC) */
  currentUserRole?: Role
  /** Target member's current role (for RBAC) */
  targetRole?: Role
  /** Additional className */
  className?: string
}

export function RoleSelector({
  value,
  onChange,
  includeOwner = false,
  disabled = false,
  currentUserRole,
  targetRole,
  className,
}: RoleSelectorProps) {
  // Determine which roles can be selected based on RBAC
  const availableRoles = React.useMemo(() => {
    const roles: Role[] = includeOwner ? ["owner", "admin", "member", "viewer"] : ["admin", "member", "viewer"]

    if (!currentUserRole) return roles

    // Only owner can assign/change admin roles
    if (currentUserRole === "admin") {
      // Admin can only change member/viewer roles
      if (targetRole === "admin" || targetRole === "owner") {
        return [] // Can't change admin or owner roles
      }
      return ["member", "viewer"] as Role[]
    }

    // Owner can assign any role except owner to others
    if (currentUserRole === "owner") {
      return roles.filter((r) => r !== "owner") as Role[]
    }

    return []
  }, [includeOwner, currentUserRole, targetRole])

  const isDisabled = disabled || availableRoles.length === 0

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as Role)}
      disabled={isDisabled}
    >
      <SelectTrigger
        className={cn("w-[140px]", className)}
        aria-label="Select role"
      >
        <SelectValue placeholder="Select role">
          <span className="flex items-center gap-2">
            {ROLE_CONFIG[value].icon}
            {ROLE_CONFIG[value].label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => (
          <SelectItem key={role} value={role}>
            <div className="flex items-center gap-2">
              {ROLE_CONFIG[role].icon}
              <div>
                <div className="font-medium">{ROLE_CONFIG[role].label}</div>
                <div className="text-xs text-muted-foreground">
                  {ROLE_CONFIG[role].description}
                </div>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * MemberItem Component
 *
 * Individual member row in the members list.
 */
export interface MemberItemProps {
  /** Member data */
  member: Member
  /** Current user's role (for RBAC) */
  currentUserRole: Role
  /** Current user's member ID */
  currentUserId?: string
  /** Whether role change is in progress */
  isUpdatingRole?: boolean
  /** Whether removal is in progress */
  isRemoving?: boolean
  /** Callback when role changes */
  onUpdateRole: (role: Role) => void
  /** Callback when remove is clicked */
  onRemove: () => void
}

export function MemberItem({
  member,
  currentUserRole,
  currentUserId,
  isUpdatingRole = false,
  isRemoving = false,
  onUpdateRole,
  onRemove,
}: MemberItemProps) {
  const isOwner = member.role === "owner"
  const isSelf = member.id === currentUserId
  const canManage = currentUserRole === "owner" || currentUserRole === "admin"

  // Can only remove if: has permission, not owner, not self
  const canRemove = canManage && !isOwner && !isSelf

  // Can only change role if: has permission, not owner
  // Admin can only change member/viewer roles
  const canChangeRole =
    canManage &&
    !isOwner &&
    (currentUserRole === "owner" || (currentUserRole === "admin" && member.role !== "admin"))

  return (
    <div
      className="flex items-center justify-between gap-4 py-3 px-4 rounded-lg hover:bg-accent/50 transition-colors"
      data-testid={`member-item-${member.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <MemberAvatar name={member.name} avatarUrl={member.avatarUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{member.name}</span>
            {isSelf && (
              <Badge variant="outline" size="sm">
                You
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {member.email}
          </div>
          <div className="text-xs text-muted-foreground">
            Joined {formatDistanceToNow(member.joinedAt, { addSuffix: true })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canChangeRole ? (
          <div className="relative">
            <RoleSelector
              value={member.role}
              onChange={onUpdateRole}
              currentUserRole={currentUserRole}
              targetRole={member.role}
              disabled={isUpdatingRole}
            />
            {isUpdatingRole && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              </div>
            )}
          </div>
        ) : (
          <Badge variant={ROLE_CONFIG[member.role].badgeVariant}>
            <span className="flex items-center gap-1.5">
              {ROLE_CONFIG[member.role].icon}
              {ROLE_CONFIG[member.role].label}
            </span>
          </Badge>
        )}

        {canRemove && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${member.name}`}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onRemove}
              >
                <UserMinus className="h-4 w-4 mr-2" aria-hidden="true" />
                Remove from workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

/**
 * MemberList Component
 *
 * List of workspace members.
 */
export interface MemberListProps {
  /** List of members */
  members: Member[]
  /** Current user's role */
  currentUserRole: Role
  /** Current user's member ID */
  currentUserId?: string
  /** Member ID currently being updated */
  updatingMemberId?: string | null
  /** Member ID currently being removed */
  removingMemberId?: string | null
  /** Callback when role changes */
  onUpdateRole: (memberId: string, role: Role) => void
  /** Callback when remove is clicked */
  onRemove: (memberId: string) => void
}

export function MemberList({
  members,
  currentUserRole,
  currentUserId,
  updatingMemberId,
  removingMemberId,
  onUpdateRole,
  onRemove,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No members yet</h3>
        <p className="text-sm text-muted-foreground">
          Invite team members to collaborate in this workspace.
        </p>
      </div>
    )
  }

  // Sort members: owner first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === "owner") return -1
    if (b.role === "owner") return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="divide-y divide-border" role="list" aria-label="Workspace members">
      {sortedMembers.map((member) => (
        <MemberItem
          key={member.id}
          member={member}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          isUpdatingRole={updatingMemberId === member.id}
          isRemoving={removingMemberId === member.id}
          onUpdateRole={(role) => onUpdateRole(member.id, role)}
          onRemove={() => onRemove(member.id)}
        />
      ))}
    </div>
  )
}

/**
 * InviteMemberForm Component
 *
 * Form for inviting new members.
 */
export interface InviteMemberFormProps {
  /** Callback when form is submitted */
  onSubmit: (email: string, role: Exclude<Role, "owner">) => Promise<void>
  /** Whether submission is in progress */
  isSubmitting?: boolean
  /** Error message */
  error?: string | null
  /** Whether the form is disabled */
  disabled?: boolean
}

export function InviteMemberForm({
  onSubmit,
  isSubmitting = false,
  error,
  disabled = false,
}: InviteMemberFormProps) {
  const [email, setEmail] = React.useState("")
  const [role, setRole] = React.useState<Exclude<Role, "owner">>("member")
  const [localError, setLocalError] = React.useState<string | null>(null)

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setLocalError("Email is required")
      return
    }

    if (!validateEmail(trimmedEmail)) {
      setLocalError("Please enter a valid email address")
      return
    }

    try {
      await onSubmit(trimmedEmail, role)
      setEmail("")
      setRole("member")
    } catch (err: any) {
      // Error is handled by parent, but we can show it locally too
      setLocalError(err.message || "Failed to send invitation")
    }
  }

  const displayError = error || localError

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Label htmlFor="invite-email" className="sr-only">
            Email address
          </Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setLocalError(null)
            }}
            disabled={disabled || isSubmitting}
            error={Boolean(displayError)}
            leftAddon={<Mail className="h-4 w-4" aria-hidden="true" />}
            aria-describedby={displayError ? "invite-error" : undefined}
          />
        </div>

        <Select
          value={role}
          onValueChange={(v) => setRole(v as Exclude<Role, "owner">)}
          disabled={disabled || isSubmitting}
        >
          <SelectTrigger className="w-full sm:w-[140px]" aria-label="Select role for invitation">
            <SelectValue>
              <span className="flex items-center gap-2">
                {ROLE_CONFIG[role].icon}
                {ROLE_CONFIG[role].label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {INVITATION_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                <div className="flex items-center gap-2">
                  {ROLE_CONFIG[r].icon}
                  <div>
                    <div className="font-medium">{ROLE_CONFIG[r].label}</div>
                    <div className="text-xs text-muted-foreground">
                      {ROLE_CONFIG[r].description}
                    </div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="submit"
          disabled={disabled || isSubmitting || !email.trim()}
          isLoading={isSubmitting}
          loadingText="Sending..."
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Invite
        </Button>
      </div>

      {displayError && (
        <p
          id="invite-error"
          className="text-sm text-destructive"
          role="alert"
        >
          {displayError}
        </p>
      )}
    </form>
  )
}

/**
 * InvitationItem Component
 *
 * Individual invitation row.
 */
export interface InvitationItemProps {
  /** Invitation data */
  invitation: Invitation
  /** Whether resend is in progress */
  isResending?: boolean
  /** Whether cancel is in progress */
  isCanceling?: boolean
  /** Callback when resend is clicked */
  onResend: () => void
  /** Callback when cancel is clicked */
  onCancel: () => void
}

export function InvitationItem({
  invitation,
  isResending = false,
  isCanceling = false,
  onResend,
  onCancel,
}: InvitationItemProps) {
  const isExpired = invitation.status === "expired"
  const isPending = isResending || isCanceling

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-3 px-4 rounded-lg transition-colors",
        isExpired ? "bg-muted/50" : "hover:bg-accent/50"
      )}
      data-testid={`invitation-item-${invitation.id}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="rounded-full bg-muted p-2 shrink-0">
          <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{invitation.email}</span>
            <Badge
              variant={isExpired ? "destructive" : "outline"}
              size="sm"
            >
              {isExpired ? "Expired" : "Pending"}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Invited as {ROLE_CONFIG[invitation.role].label.toLowerCase()} •{" "}
            {formatDistanceToNow(invitation.sentAt, { addSuffix: true })}
          </div>
          {!isExpired && (
            <div className="text-xs text-muted-foreground">
              Expires {format(invitation.expiresAt, "MMM d, yyyy")}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onResend}
          disabled={isPending}
          isLoading={isResending}
          leftIcon={<RefreshCw className="h-4 w-4" />}
          aria-label={`Resend invitation to ${invitation.email}`}
        >
          Resend
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          isLoading={isCanceling}
          leftIcon={<X className="h-4 w-4" />}
          aria-label={`Cancel invitation for ${invitation.email}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

/**
 * InvitationList Component
 *
 * List of pending invitations.
 */
export interface InvitationListProps {
  /** List of invitations */
  invitations: Invitation[]
  /** Invitation ID currently being resent */
  resendingInviteId?: string | null
  /** Invitation ID currently being canceled */
  cancelingInviteId?: string | null
  /** Callback when resend is clicked */
  onResend: (inviteId: string) => void
  /** Callback when cancel is clicked */
  onCancel: (inviteId: string) => void
}

export function InvitationList({
  invitations,
  resendingInviteId,
  cancelingInviteId,
  onResend,
  onCancel,
}: InvitationListProps) {
  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <Mail className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No pending invitations</h3>
        <p className="text-sm text-muted-foreground">
          Invitations you send will appear here until accepted.
        </p>
      </div>
    )
  }

  // Sort invitations: pending first, then by sentAt (newest first)
  const sortedInvitations = [...invitations].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1
    if (a.status !== "pending" && b.status === "pending") return 1
    return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  })

  return (
    <div className="divide-y divide-border" role="list" aria-label="Pending invitations">
      {sortedInvitations.map((invitation) => (
        <InvitationItem
          key={invitation.id}
          invitation={invitation}
          isResending={resendingInviteId === invitation.id}
          isCanceling={cancelingInviteId === invitation.id}
          onResend={() => onResend(invitation.id)}
          onCancel={() => onCancel(invitation.id)}
        />
      ))}
    </div>
  )
}

/**
 * RemoveMemberDialog Component
 *
 * Confirmation dialog for removing a member.
 */
export interface RemoveMemberDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Member being removed */
  member: Member | null
  /** Whether removal is in progress */
  isRemoving?: boolean
  /** Callback when confirmed */
  onConfirm: () => void
}

export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  isRemoving = false,
  onConfirm,
}: RemoveMemberDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove member</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove{" "}
            <span className="font-medium text-foreground">{member?.name}</span>{" "}
            from this workspace? They will lose access to all workspace content
            and will need to be re-invited.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isRemoving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isRemoving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Remove member
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/**
 * MemberManagement Component
 *
 * Main component for managing workspace members and invitations.
 */
export function MemberManagement({
  workspaceId,
  members,
  invitations,
  currentUserRole,
  currentUserId,
  onInvite,
  onRemove,
  onUpdateRole,
  onResendInvite,
  onCancelInvite,
  isLoading = false,
  error,
  className,
}: MemberManagementProps) {
  // State for async operations
  const [inviteError, setInviteError] = React.useState<string | null>(null)
  const [isInviting, setIsInviting] = React.useState(false)
  const [updatingMemberId, setUpdatingMemberId] = React.useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = React.useState<string | null>(null)
  const [resendingInviteId, setResendingInviteId] = React.useState<string | null>(null)
  const [cancelingInviteId, setCancelingInviteId] = React.useState<string | null>(null)

  // State for remove dialog
  const [memberToRemove, setMemberToRemove] = React.useState<Member | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false)

  // RBAC: Can current user invite members?
  const canInvite = currentUserRole === "owner" || currentUserRole === "admin"

  // Handle invite
  const handleInvite = React.useCallback(
    async (email: string, role: Exclude<Role, "owner">) => {
      setInviteError(null)
      setIsInviting(true)
      try {
        await onInvite(email, role)
      } catch (err: any) {
        setInviteError(err.message || "Failed to send invitation")
        throw err
      } finally {
        setIsInviting(false)
      }
    },
    [onInvite]
  )

  // Handle role update
  const handleUpdateRole = React.useCallback(
    async (memberId: string, role: Role) => {
      setUpdatingMemberId(memberId)
      try {
        await onUpdateRole(memberId, role)
      } finally {
        setUpdatingMemberId(null)
      }
    },
    [onUpdateRole]
  )

  // Handle remove member (opens dialog)
  const handleRemoveClick = React.useCallback(
    (memberId: string) => {
      const member = members.find((m) => m.id === memberId)
      if (member) {
        setMemberToRemove(member)
        setShowRemoveDialog(true)
      }
    },
    [members]
  )

  // Handle remove confirmation
  const handleRemoveConfirm = React.useCallback(async () => {
    if (!memberToRemove) return
    setRemovingMemberId(memberToRemove.id)
    try {
      await onRemove(memberToRemove.id)
      setShowRemoveDialog(false)
      setMemberToRemove(null)
    } finally {
      setRemovingMemberId(null)
    }
  }, [memberToRemove, onRemove])

  // Handle resend invite
  const handleResendInvite = React.useCallback(
    async (inviteId: string) => {
      setResendingInviteId(inviteId)
      try {
        await onResendInvite(inviteId)
      } finally {
        setResendingInviteId(null)
      }
    },
    [onResendInvite]
  )

  // Handle cancel invite
  const handleCancelInvite = React.useCallback(
    async (inviteId: string) => {
      setCancelingInviteId(inviteId)
      try {
        await onCancelInvite(inviteId)
      } finally {
        setCancelingInviteId(null)
      }
    },
    [onCancelInvite]
  )

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading members...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Error alert */}
      {error && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Invite form (only for owner/admin) */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invite members</CardTitle>
            <CardDescription>
              Send invitations to team members to join this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm
              onSubmit={handleInvite}
              isSubmitting={isInviting}
              error={inviteError}
            />
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Members</CardTitle>
              <CardDescription>
                {members.length} {members.length === 1 ? "member" : "members"} in this workspace
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MemberList
            members={members}
            currentUserRole={currentUserRole}
            currentUserId={currentUserId}
            updatingMemberId={updatingMemberId}
            removingMemberId={removingMemberId}
            onUpdateRole={handleUpdateRole}
            onRemove={handleRemoveClick}
          />
        </CardContent>
      </Card>

      {/* Pending invitations (only for owner/admin) */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending invitations</CardTitle>
            <CardDescription>
              {invitations.length} pending{" "}
              {invitations.length === 1 ? "invitation" : "invitations"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvitationList
              invitations={invitations}
              resendingInviteId={resendingInviteId}
              cancelingInviteId={cancelingInviteId}
              onResend={handleResendInvite}
              onCancel={handleCancelInvite}
            />
          </CardContent>
        </Card>
      )}

      {/* Remove member confirmation dialog */}
      <RemoveMemberDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        member={memberToRemove}
        isRemoving={removingMemberId !== null}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  )
}
