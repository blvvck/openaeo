import * as React from "react"
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  Settings,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/floating-popover"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/profile-mark"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-container"
import { Separator } from "@/components/ui/divider"



// Types
export type WorkspaceRole = "owner" | "admin" | "member" | "viewer"

export interface Workspace {
  id: string
  name: string
  slug: string
  avatarUrl?: string
  role: WorkspaceRole
}

export interface WorkspaceSwitcherProps {
  /** Currently active workspace */
  currentWorkspace: Workspace
  /** All accessible workspaces */
  workspaces: Workspace[]
  /** Callback when switching workspace */
  onSwitch: (workspace: Workspace) => Promise<void>
  /** Callback when creating new workspace */
  onCreate?: () => void
  /** Callback when managing workspace settings */
  onManage?: (workspace: Workspace) => void
  /** Loading state for workspace list */
  isLoading?: boolean
  /** Error state */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Variant for trigger button */
  variant?: "default" | "compact" | "ghost"
  /** Additional className */
  className?: string
  /** Align popover */
  align?: "start" | "center" | "end"
  /** Side for popover */
  side?: "top" | "bottom" | "left" | "right"
}

/**
 * WorkspaceAvatar Component
 *
 * Displays workspace avatar with fallback initials.
 */
export interface WorkspaceAvatarProps {
  /** Workspace to display */
  workspace: Pick<Workspace, "name" | "avatarUrl">
  /** Size of avatar */
  size?: "sm" | "default" | "lg"
  /** Additional className */
  className?: string
}

export function WorkspaceAvatar({
  workspace,
  size = "default",
  className,
}: WorkspaceAvatarProps) {
  // Generate initials from workspace name
  const initials = React.useMemo(() => {
    const words = workspace.name.trim().split(/\s+/)
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase()
    }
    return workspace.name.slice(0, 2).toUpperCase()
  }, [workspace.name])

  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    default: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  }

  return (
    <Avatar className={cn(sizeClasses[size], "shrink-0", className)}>
      <AvatarImage
        src={workspace.avatarUrl}
        alt={`${workspace.name} workspace`}
      />
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * WorkspaceItem Component
 *
 * Individual workspace item in the dropdown list.
 */
export interface WorkspaceItemProps {
  /** Workspace to display */
  workspace: Workspace
  /** Whether this is the current workspace */
  isActive: boolean
  /** Whether this item is focused (keyboard nav) */
  isFocused?: boolean
  /** Whether the item is disabled */
  disabled?: boolean
  /** Click handler */
  onClick: () => void
  /** Whether switching is in progress */
  isSwitching?: boolean
}

export function WorkspaceItem({
  workspace,
  isActive,
  isFocused = false,
  disabled = false,
  onClick,
  isSwitching = false,
}: WorkspaceItemProps) {
  const roleLabels: Record<WorkspaceRole, string> = {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
    viewer: "Viewer",
  }

  const roleVariants: Record<WorkspaceRole, "default" | "secondary" | "outline"> = {
    owner: "default",
    admin: "secondary",
    member: "outline",
    viewer: "outline",
  }

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isActive
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent/50",
        isFocused && "bg-accent/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={onClick}
      disabled={disabled || isSwitching}
      role="option"
      aria-selected={isActive}
      aria-disabled={disabled}
    >
      <WorkspaceAvatar workspace={workspace} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{workspace.name}</span>
          {isActive && (
            <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          )}
          {isSwitching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" aria-hidden="true" />
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{workspace.slug}</span>
          <Badge variant={roleVariants[workspace.role]} size="sm" className="shrink-0">
            {roleLabels[workspace.role]}
          </Badge>
        </div>
      </div>
    </button>
  )
}

/**
 * WorkspaceSwitcher Component
 *
 * Main workspace switcher with popover dropdown.
 */
export function WorkspaceSwitcher({
  currentWorkspace,
  workspaces,
  onSwitch,
  onCreate,
  onManage,
  isLoading = false,
  error,
  disabled = false,
  variant = "default",
  className,
  align = "start",
  side = "bottom",
}: WorkspaceSwitcherProps) {
  // State
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [switchingWorkspaceId, setSwitchingWorkspaceId] = React.useState<string | null>(null)
  const [switchError, setSwitchError] = React.useState<string | null>(null)
  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  // Refs
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)

  // Filter workspaces by search query
  const filteredWorkspaces = React.useMemo(() => {
    if (!searchQuery.trim()) return workspaces
    const query = searchQuery.toLowerCase()
    return workspaces.filter(
      (ws) =>
        ws.name.toLowerCase().includes(query) ||
        ws.slug.toLowerCase().includes(query)
    )
  }, [workspaces, searchQuery])

  // Show search only if many workspaces
  const showSearch = workspaces.length > 5

  // Check if current user can manage the current workspace
  const canManageCurrentWorkspace =
    currentWorkspace.role === "owner" || currentWorkspace.role === "admin"

  // Handle workspace switch
  const handleSwitch = React.useCallback(
    async (workspace: Workspace) => {
      if (workspace.id === currentWorkspace.id) {
        setOpen(false)
        return
      }

      setSwitchingWorkspaceId(workspace.id)
      setSwitchError(null)

      try {
        await onSwitch(workspace)
        setOpen(false)
        setSearchQuery("")
      } catch (err: any) {
        setSwitchError(
          err.message || "Failed to switch workspace. Please try again."
        )
      } finally {
        setSwitchingWorkspaceId(null)
      }
    },
    [currentWorkspace.id, onSwitch]
  )

  // Handle create new workspace
  const handleCreate = React.useCallback(() => {
    onCreate?.()
    setOpen(false)
    setSearchQuery("")
  }, [onCreate])

  // Handle manage workspace
  const handleManage = React.useCallback(() => {
    onManage?.(currentWorkspace)
    setOpen(false)
    setSearchQuery("")
  }, [onManage, currentWorkspace])

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          setFocusedIndex((prev) =>
            prev < filteredWorkspaces.length - 1 ? prev + 1 : 0
          )
          break
        case "ArrowUp":
          event.preventDefault()
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredWorkspaces.length - 1
          )
          break
        case "Enter":
          event.preventDefault()
          if (focusedIndex >= 0 && focusedIndex < filteredWorkspaces.length) {
            handleSwitch(filteredWorkspaces[focusedIndex])
          }
          break
        case "Escape":
          event.preventDefault()
          setOpen(false)
          break
        case "Home":
          event.preventDefault()
          setFocusedIndex(0)
          break
        case "End":
          event.preventDefault()
          setFocusedIndex(filteredWorkspaces.length - 1)
          break
      }
    },
    [filteredWorkspaces, focusedIndex, handleSwitch]
  )

  // Reset state when popover opens/closes
  React.useEffect(() => {
    if (open) {
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 0)
      setFocusedIndex(-1)
      setSwitchError(null)
    } else {
      setSearchQuery("")
      setFocusedIndex(-1)
    }
  }, [open])

  // Scroll focused item into view
  React.useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]')
      const focusedItem = items[focusedIndex] as HTMLElement
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: "nearest" })
      }
    }
  }, [focusedIndex])

  // Trigger button content based on variant
  const triggerContent = React.useMemo(() => {
    if (variant === "compact") {
      return (
        <>
          <WorkspaceAvatar workspace={currentWorkspace} size="sm" />
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </>
      )
    }

    return (
      <>
        <WorkspaceAvatar workspace={currentWorkspace} size="sm" />
        <div className="flex-1 text-left min-w-0">
          <span className="font-medium truncate block">{currentWorkspace.name}</span>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      </>
    )
  }, [variant, currentWorkspace])

  const triggerVariant = variant === "ghost" ? "ghost" : "outline"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={triggerVariant}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Current workspace: ${currentWorkspace.name}. Click to switch workspace.`}
          disabled={disabled || isLoading}
          className={cn(
            "justify-start gap-2",
            variant === "compact" ? "w-auto px-2" : "w-full max-w-[240px]",
            className
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Loading...</span>
            </>
          ) : (
            triggerContent
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-0"
        align={align}
        side={side}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        {showSearch && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={searchInputRef}
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
                aria-label="Search workspaces"
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {(error || switchError) && (
          <div
            className="px-3 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20"
            role="alert"
            aria-live="assertive"
          >
            {error || switchError}
          </div>
        )}

        {/* Workspace list */}
        <ScrollArea className="max-h-[280px]">
          <div
            ref={listRef}
            className="p-2"
            role="listbox"
            aria-label="Workspaces"
            aria-activedescendant={
              focusedIndex >= 0
                ? `workspace-${filteredWorkspaces[focusedIndex]?.id}`
                : undefined
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Loading workspaces...</span>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "No workspaces found" : "No workspaces available"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredWorkspaces.map((workspace, index) => (
                  <WorkspaceItem
                    key={workspace.id}
                    workspace={workspace}
                    isActive={workspace.id === currentWorkspace.id}
                    isFocused={index === focusedIndex}
                    isSwitching={switchingWorkspaceId === workspace.id}
                    disabled={switchingWorkspaceId !== null && switchingWorkspaceId !== workspace.id}
                    onClick={() => handleSwitch(workspace)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions section */}
        {(onCreate || (onManage && canManageCurrentWorkspace)) && (
          <>
            <Separator />
            <div className="p-2 space-y-1">
              {onCreate && (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                    "hover:bg-accent transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>Create workspace</span>
                </button>
              )}
              {onManage && canManageCurrentWorkspace && (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                    "hover:bg-accent transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  )}
                  onClick={handleManage}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>Manage workspace</span>
                </button>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
