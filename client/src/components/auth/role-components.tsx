import * as React from "react"
import { Check, ChevronDown, Crown, Shield, ShieldCheck, User, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/option-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-grid"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"



// Types
export type Role = "owner" | "admin" | "member" | "viewer"

export type Permission =
  | "view_workspace"
  | "create_content"
  | "edit_content"
  | "delete_content"
  | "invite_members"
  | "manage_roles"
  | "billing_access"
  | "delete_workspace"

// Role configuration with icons and styling
export const ROLE_CONFIG: Record<
  Role,
  {
    label: string
    icon: React.ReactNode
    description: string
    badgeVariant: "default" | "secondary" | "outline" | "neutral"
    color: string
  }
> = {
  owner: {
    label: "Owner",
    icon: <Crown className="h-3.5 w-3.5" />,
    description: "Full access and billing control",
    badgeVariant: "default",
    color: "text-primary",
  },
  admin: {
    label: "Admin",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    description: "Manage members and settings",
    badgeVariant: "secondary",
    color: "text-blue-600 dark:text-blue-400",
  },
  member: {
    label: "Member",
    icon: <User className="h-3.5 w-3.5" />,
    description: "Can view and edit content",
    badgeVariant: "outline",
    color: "text-foreground",
  },
  viewer: {
    label: "Viewer",
    icon: <Shield className="h-3.5 w-3.5" />,
    description: "Read-only access",
    badgeVariant: "neutral",
    color: "text-muted-foreground",
  },
}

// Permission configuration
export const PERMISSION_CONFIG: Record<
  Permission,
  {
    label: string
    description: string
  }
> = {
  view_workspace: {
    label: "View workspace",
    description: "Access workspace data and content",
  },
  create_content: {
    label: "Create content",
    description: "Add new brands, competitors, and alerts",
  },
  edit_content: {
    label: "Edit content",
    description: "Modify existing workspace content",
  },
  delete_content: {
    label: "Delete content",
    description: "Remove workspace content permanently",
  },
  invite_members: {
    label: "Invite members",
    description: "Send invitations to join workspace",
  },
  manage_roles: {
    label: "Manage roles",
    description: "Change member roles and permissions",
  },
  billing_access: {
    label: "Billing access",
    description: "View and manage billing and subscription",
  },
  delete_workspace: {
    label: "Delete workspace",
    description: "Permanently delete the workspace",
  },
}

// Permission matrix defining what each role can do
export const PERMISSION_MATRIX: Record<Role, Record<Permission, boolean>> = {
  owner: {
    view_workspace: true,
    create_content: true,
    edit_content: true,
    delete_content: true,
    invite_members: true,
    manage_roles: true,
    billing_access: true,
    delete_workspace: true,
  },
  admin: {
    view_workspace: true,
    create_content: true,
    edit_content: true,
    delete_content: true,
    invite_members: true,
    manage_roles: true, // Limited: can only manage member/viewer
    billing_access: false,
    delete_workspace: false,
  },
  member: {
    view_workspace: true,
    create_content: true,
    edit_content: true,
    delete_content: false,
    invite_members: false,
    manage_roles: false,
    billing_access: false,
    delete_workspace: false,
  },
  viewer: {
    view_workspace: true,
    create_content: false,
    edit_content: false,
    delete_content: false,
    invite_members: false,
    manage_roles: false,
    billing_access: false,
    delete_workspace: false,
  },
}

// All permissions in display order
const ALL_PERMISSIONS: Permission[] = [
  "view_workspace",
  "create_content",
  "edit_content",
  "delete_content",
  "invite_members",
  "manage_roles",
  "billing_access",
  "delete_workspace",
]

// All roles in hierarchy order
const ALL_ROLES: Role[] = ["owner", "admin", "member", "viewer"]

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role][permission]
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: Role): Permission[] {
  return ALL_PERMISSIONS.filter((permission) => hasPermission(role, permission))
}

/**
 * Check if a user with one role can manage another role
 * Owner can manage all roles
 * Admin can manage member and viewer only
 * Member and viewer cannot manage any roles
 */
export function canManageRole(userRole: Role, targetRole: Role): boolean {
  if (userRole === "owner") return true
  if (userRole === "admin") {
    return targetRole === "member" || targetRole === "viewer"
  }
  return false
}

// ============================================================================
// RoleBadge Component
// ============================================================================

export interface RoleBadgeProps {
  /** The role to display */
  role: Role
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Show role icon */
  showIcon?: boolean
  /** Visual variant */
  variant?: "default" | "outline" | "subtle"
  /** Additional className */
  className?: string
}

export function RoleBadge({
  role,
  size = "md",
  showIcon = true,
  variant = "default",
  className,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role]

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  }

  const iconSizeClasses = {
    sm: "[&>svg]:w-3 [&>svg]:h-3",
    md: "[&>svg]:w-3.5 [&>svg]:h-3.5",
    lg: "[&>svg]:w-4 [&>svg]:h-4",
  }

  // Map variant to Badge variant
  const badgeVariant =
    variant === "outline"
      ? "outline"
      : variant === "subtle"
        ? "neutral"
        : config.badgeVariant

  return (
    <Badge
      variant={badgeVariant}
      className={cn(
        "inline-flex items-center gap-1",
        sizeClasses[size],
        showIcon && iconSizeClasses[size],
        className
      )}
      aria-label={`Role: ${config.label}`}
    >
      {showIcon && (
        <span className="shrink-0" aria-hidden="true">
          {config.icon}
        </span>
      )}
      <span>{config.label}</span>
    </Badge>
  )
}

// ============================================================================
// RolePermissions Component
// ============================================================================

export interface RolePermissionsProps {
  /** The role to show permissions for */
  role: Role
  /** Compact display (just icons, no descriptions) */
  compact?: boolean
  /** Additional className */
  className?: string
}

export function RolePermissions({
  role,
  compact = false,
  className,
}: RolePermissionsProps) {
  const permissions = getPermissions(role)
  const config = ROLE_CONFIG[role]

  if (compact) {
    return (
      <div
        className={cn("flex flex-wrap gap-2", className)}
        role="list"
        aria-label={`Permissions for ${config.label} role`}
      >
        {ALL_PERMISSIONS.map((permission) => {
          const hasIt = permissions.includes(permission)
          const permConfig = PERMISSION_CONFIG[permission]

          return (
            <div
              key={permission}
              role="listitem"
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md",
                hasIt
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground line-through"
              )}
              title={permConfig.description}
            >
              {hasIt ? (
                <Check className="w-3 h-3" aria-hidden="true" />
              ) : (
                <X className="w-3 h-3" aria-hidden="true" />
              )}
              <span>{permConfig.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <RoleBadge role={role} size="md" />
        <span className="text-sm text-muted-foreground">{config.description}</span>
      </div>
      <ul
        className="space-y-2"
        role="list"
        aria-label={`Permissions for ${config.label} role`}
      >
        {ALL_PERMISSIONS.map((permission) => {
          const hasIt = permissions.includes(permission)
          const permConfig = PERMISSION_CONFIG[permission]
          const isLimited = role === "admin" && permission === "manage_roles"

          return (
            <li
              key={permission}
              className={cn(
                "flex items-start gap-2 text-sm",
                !hasIt && "text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 shrink-0",
                  hasIt ? "text-success" : "text-muted-foreground"
                )}
                aria-hidden="true"
              >
                {hasIt ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </span>
              <div>
                <span className={cn(!hasIt && "line-through")}>
                  {permConfig.label}
                </span>
                {isLimited && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (member/viewer only)
                  </span>
                )}
                {!compact && hasIt && (
                  <p className="text-xs text-muted-foreground">
                    {permConfig.description}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ============================================================================
// RoleComparison Component
// ============================================================================

export interface RoleComparisonProps {
  /** Highlight a specific role column */
  highlightRole?: Role
  /** Callback when a role is selected */
  onSelectRole?: (role: Role) => void
  /** Roles to exclude from display */
  excludeRoles?: Role[]
  /** Additional className */
  className?: string
}

export function RoleComparison({
  highlightRole,
  onSelectRole,
  excludeRoles = [],
  className,
}: RoleComparisonProps) {
  const displayedRoles = ALL_ROLES.filter((role) => !excludeRoles.includes(role))

  return (
    <div className={cn("rounded-lg border", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Permission</TableHead>
            {displayedRoles.map((role) => {
              const config = ROLE_CONFIG[role]
              const isHighlighted = role === highlightRole
              const isClickable = Boolean(onSelectRole)

              return (
                <TableHead
                  key={role}
                  className={cn(
                    "text-center",
                    isHighlighted && "bg-primary/5",
                    isClickable && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={isClickable ? () => onSelectRole?.(role) : undefined}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className={config.color} aria-hidden="true">
                      {config.icon}
                    </span>
                    <span className="font-medium">{config.label}</span>
                  </div>
                </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ALL_PERMISSIONS.map((permission) => {
            const permConfig = PERMISSION_CONFIG[permission]
            const isLimited = permission === "manage_roles"

            return (
              <TableRow key={permission}>
                <TableCell>
                  <div>
                    <span className="font-medium">{permConfig.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {permConfig.description}
                    </p>
                  </div>
                </TableCell>
                {displayedRoles.map((role) => {
                  const hasIt = hasPermission(role, permission)
                  const isHighlighted = role === highlightRole
                  const showLimited = isLimited && role === "admin"

                  return (
                    <TableCell
                      key={`${permission}-${role}`}
                      className={cn(
                        "text-center",
                        isHighlighted && "bg-primary/5"
                      )}
                    >
                      {hasIt ? (
                        <div className="flex flex-col items-center">
                          <Check
                            className="w-5 h-5 text-success"
                            aria-label="Yes"
                          />
                          {showLimited && (
                            <span className="text-xs text-muted-foreground">
                              Limited
                            </span>
                          )}
                        </div>
                      ) : (
                        <X
                          className="w-5 h-5 text-muted-foreground mx-auto"
                          aria-label="No"
                        />
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

// ============================================================================
// RoleSelector Component
// ============================================================================

export interface RoleSelectorProps {
  /** Currently selected role */
  value: Role
  /** Callback when role changes */
  onChange: (role: Role) => void
  /** Roles to exclude from selection */
  excludeRoles?: Role[]
  /** Disable the selector */
  disabled?: boolean
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** The current user's role (for RBAC filtering) */
  currentUserRole?: Role
  /** Additional className */
  className?: string
  /** ARIA label */
  "aria-label"?: string
}

export function RoleSelector({
  value,
  onChange,
  excludeRoles = [],
  disabled = false,
  size = "md",
  currentUserRole,
  className,
  "aria-label": ariaLabel = "Select role",
}: RoleSelectorProps) {
  // Filter out excluded roles
  let availableRoles = ALL_ROLES.filter((role) => !excludeRoles.includes(role))

  // If currentUserRole is provided, filter based on what they can manage
  if (currentUserRole) {
    availableRoles = availableRoles.filter((role) =>
      canManageRole(currentUserRole, role)
    )
  }

  const sizeClasses = {
    sm: "h-8 text-xs",
    md: "h-9 text-sm",
    lg: "h-10 text-sm",
  }

  const config = ROLE_CONFIG[value]

  return (
    <Select
      value={value}
      onValueChange={(newValue) => onChange(newValue as Role)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(sizeClasses[size], className)}
        aria-label={ariaLabel}
      >
        <SelectValue>
          <span className="flex items-center gap-2">
            <span className={config.color} aria-hidden="true">
              {config.icon}
            </span>
            <span>{config.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {availableRoles.map((role) => {
          const roleConfig = ROLE_CONFIG[role]

          return (
            <SelectItem key={role} value={role}>
              <span className="flex items-center gap-2">
                <span className={roleConfig.color} aria-hidden="true">
                  {roleConfig.icon}
                </span>
                <span>{roleConfig.label}</span>
                <span className="text-xs text-muted-foreground">
                  - {roleConfig.description}
                </span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

// ============================================================================
// RoleGuard Component
// ============================================================================

export interface RoleGuardProps {
  /** The user's current role */
  userRole: Role
  /** Roles that are allowed to see the children */
  allowedRoles: Role[]
  /** Content to render if allowed */
  children: React.ReactNode
  /** Content to render if not allowed (default: nothing) */
  fallback?: React.ReactNode
}

export function RoleGuard({
  userRole,
  allowedRoles,
  children,
  fallback = null,
}: RoleGuardProps) {
  const isAllowed = allowedRoles.includes(userRole)

  if (isAllowed) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

// ============================================================================
// RoleTooltip Component
// ============================================================================

export interface RoleTooltipProps {
  /** The role to show permissions for */
  role: Role
  /** Content that triggers the tooltip */
  children: React.ReactNode
  /** Tooltip placement */
  side?: "top" | "right" | "bottom" | "left"
  /** Alignment */
  align?: "start" | "center" | "end"
  /** Delay before showing (ms) */
  delayDuration?: number
}

export function RoleTooltip({
  role,
  children,
  side = "top",
  align = "center",
  delayDuration = 200,
}: RoleTooltipProps) {
  const config = ROLE_CONFIG[role]
  const permissions = getPermissions(role)

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="max-w-[280px] p-3"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <span className={config.color} aria-hidden="true">
                {config.icon}
              </span>
              <span>{config.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            <div className="pt-1 border-t">
              <p className="text-xs font-medium mb-1">Permissions:</p>
              <ul className="space-y-0.5">
                {permissions.slice(0, 5).map((permission) => (
                  <li
                    key={permission}
                    className="flex items-center gap-1 text-xs"
                  >
                    <Check className="w-3 h-3 text-success" aria-hidden="true" />
                    <span>{PERMISSION_CONFIG[permission].label}</span>
                  </li>
                ))}
                {permissions.length > 5 && (
                  <li className="text-xs text-muted-foreground">
                    +{permissions.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ============================================================================
// Exports
// ============================================================================

export {
  ALL_PERMISSIONS,
  ALL_ROLES,
}
