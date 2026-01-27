import * as React from "react"
import { Link, useLocation } from "wouter"
import { cva, type VariantProps } from "class-variance-authority"
import { ChevronLeft, ChevronRight, PanelLeft, LogOut, Settings, ChevronsUpDown, Building2, UsersRound, Sliders } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { SimpleTooltip } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/action-menu"
import { useAppShell } from "./app-shell"



// ===== SidebarNav Root =====

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show collapse toggle button - now handled in header */
  showCollapseToggle?: boolean
  /** Position of collapse toggle - deprecated, always in header now */
  collapseTogglePosition?: "top" | "bottom"
}

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  (
    {
      className,
      children,
      showCollapseToggle = true,
      collapseTogglePosition = "top",
      ...props
    },
    ref
  ) => {
    const { sidebarState } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-full flex-col",
          "transition-all duration-200 ease-out",
          "motion-reduce:transition-none",
          className
        )}
        data-collapsed={isCollapsed}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SidebarNav.displayName = "SidebarNav"

// ===== Collapse Button =====

interface SidebarNavCollapseButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isCollapsed: boolean
}

const SidebarNavCollapseButton = React.forwardRef<
  HTMLButtonElement,
  SidebarNavCollapseButtonProps
>(({ className, isCollapsed, ...props }, ref) => {
  return (
    <SimpleTooltip
      content={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      side="right"
    >
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0",
          className
        )}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        {...props}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>
    </SimpleTooltip>
  )
})
SidebarNavCollapseButton.displayName = "SidebarNavCollapseButton"

// ===== SidebarNav Header =====

interface SidebarNavHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Logo or icon element */
  logo?: React.ReactNode
  /** Title text */
  title?: string
  /** Subtitle text */
  subtitle?: string
  /** Show collapse toggle button in header */
  showCollapseToggle?: boolean
}

const SidebarNavHeader = React.forwardRef<HTMLDivElement, SidebarNavHeaderProps>(
  ({ className, logo, title, subtitle, children, showCollapseToggle = true, ...props }, ref) => {
    const { sidebarState, toggleSidebar } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    return (
      <div
        ref={ref}
        className={cn(
          "flex h-14 items-center gap-3 px-3",
          "border-b border-sidebar-border",
          isCollapsed && "justify-center px-2",
          className
        )}
        {...props}
      >
        {logo && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {logo}
          </div>
        )}
        {!isCollapsed && (title || subtitle || children) && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {title && (
              <span className="truncate text-base font-medium text-sidebar-foreground">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="truncate text-xs text-muted-foreground">
                {subtitle}
              </span>
            )}
            {children}
          </div>
        )}
        {/* Collapse button only when expanded - when collapsed, toggle is in main header */}
        {showCollapseToggle && !isCollapsed && (
          <SidebarNavCollapseButton
            isCollapsed={isCollapsed}
            onClick={toggleSidebar}
            className="ml-auto"
          />
        )}
      </div>
    )
  }
)
SidebarNavHeader.displayName = "SidebarNavHeader"

// ===== SidebarNav Content =====

const SidebarNavContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-3 py-4",
        // Hide scrollbar by default, show on hover
        "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-transparent",
        "hover:scrollbar-thumb-sidebar-border/50",
        // Fallback for browsers without scrollbar utilities
        "[&::-webkit-scrollbar]:w-1.5",
        "[&::-webkit-scrollbar-track]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:bg-transparent",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        "hover:[&::-webkit-scrollbar-thumb]:bg-sidebar-border",
        className
      )}
      {...props}
    />
  )
})
SidebarNavContent.displayName = "SidebarNavContent"

// ===== SidebarNav Group =====

interface SidebarNavGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Group label */
  label?: string
}

const SidebarNavGroup = React.forwardRef<HTMLDivElement, SidebarNavGroupProps>(
  ({ className, label, children, ...props }, ref) => {
    const { sidebarState } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    return (
      <div
        ref={ref}
        className={cn(
          // First group has no top margin, others get pt-4 for section separation (tighter than items but still distinct)
          "mb-1 first:pt-0 [&:not(:first-child)]:pt-4",
          className
        )}
        role="group"
        aria-label={label}
        {...props}
      >
        {label && !isCollapsed && (
          <div className="mb-2 px-3">
            <span className="text-[10px] font-semibold tracking-wide text-figma-muted">
              {label}
            </span>
          </div>
        )}
        {label && isCollapsed && (
          <div className="mb-2 flex justify-center">
            <div className="h-px w-6 bg-figma-border-light" />
          </div>
        )}
        <nav className="space-y-0.5">{children}</nav>
      </div>
    )
  }
)
SidebarNavGroup.displayName = "SidebarNavGroup"

// ===== SidebarNav Item =====

const sidebarNavItemVariants = cva(
  [
    "group relative flex items-center gap-3 rounded-md px-3 py-1.5",
    "text-sm font-normal text-muted-foreground",
    "transition-all duration-150 ease-out",
    "motion-reduce:transition-none",
    "hover:bg-sidebar-accent hover:text-sidebar-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
  ],
  {
    variants: {
      /** Whether this item is currently active */
      isActive: {
        true: [
          "bg-figma-blue-light/50 text-figma-blue font-bold",
          "hover:bg-figma-blue-light/70 hover:text-figma-blue active:text-figma-blue",
        ],
        false: "",
      },
      /** Whether sidebar is collapsed */
      isCollapsed: {
        true: "justify-center px-2",
        false: "",
      },
      /** Disabled state */
      disabled: {
        true: "pointer-events-none opacity-50",
        false: "",
      },
    },
    defaultVariants: {
      isActive: false,
      isCollapsed: false,
      disabled: false,
    },
  }
)

interface SidebarNavItemProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
  Omit<VariantProps<typeof sidebarNavItemVariants>, "isCollapsed"> {
  /** Route path */
  href: string
  /** Icon component */
  icon?: React.ReactNode
  /** Badge content (e.g., notification count) */
  badge?: React.ReactNode
  /** Exact path match for active state */
  exact?: boolean
}

const SidebarNavItem = React.forwardRef<HTMLAnchorElement, SidebarNavItemProps>(
  (
    {
      className,
      href,
      icon,
      badge,
      isActive: isActiveProp,
      disabled = false,
      exact = false,
      children,
      ...props
    },
    ref
  ) => {
    const [location] = useLocation()
    const { sidebarState } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    // Determine active state
    const isActive =
      isActiveProp ??
      (exact ? location === href : location.startsWith(href))

    const itemContent = (
      <>
        {icon && (
          <span
            className={cn(
              "flex h-5 w-5 shrink-0 items-center justify-center",
              "transition-colors duration-150",
              isActive && "text-figma-blue"
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{children}</span>
            {badge && (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium text-primary">
                {badge}
              </span>
            )}
          </>
        )}
      </>
    )

    // When collapsed, wrap in tooltip
    if (isCollapsed) {
      return (
        <SimpleTooltip content={children} side="right">
          <Link
            ref={ref}
            href={href}
            className={cn(
              sidebarNavItemVariants({ isActive, isCollapsed, disabled }),
              className
            )}
            aria-current={isActive ? "page" : undefined}
            aria-disabled={disabled || undefined}
            {...props}
          >
            {itemContent}
          </Link>
        </SimpleTooltip>
      )
    }

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          sidebarNavItemVariants({ isActive, isCollapsed, disabled }),
          className
        )}
        aria-current={isActive ? "page" : undefined}
        aria-disabled={disabled || undefined}
        {...props}
      >
        {itemContent}
      </Link>
    )
  }
)
SidebarNavItem.displayName = "SidebarNavItem"

// ===== SidebarNav Footer =====

interface SidebarNavFooterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
  /** User avatar or icon */
  avatar?: React.ReactNode
  /** Primary text (e.g., user name) */
  primaryText?: string
  /** Secondary text (e.g., role/plan) */
  secondaryText?: string
  /** User email (shown in dropdown header) */
  email?: string
  /** Team page href */
  teamHref?: string
  /** Preferences page href */
  preferencesHref?: string
  /** Callback when logout is clicked */
  onLogout?: () => void
  /** Callback when switch workspace is clicked */
  onSwitchWorkspace?: () => void
  /** Whether to show workspace switcher option */
  showWorkspaceSwitcher?: boolean
  /** Custom menu items to render in dropdown */
  menuItems?: React.ReactNode
}

const SidebarNavFooter = React.forwardRef<HTMLDivElement, SidebarNavFooterProps>(
  (
    {
      className,
      avatar,
      primaryText,
      secondaryText,
      email,
      teamHref = "/app/settings/team",
      preferencesHref = "/app/settings/preferences",
      onLogout,
      onSwitchWorkspace,
      showWorkspaceSwitcher = false,
      menuItems,
      children,
      ...props
    },
    ref
  ) => {
    const { sidebarState } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    // Trigger content (the footer display)
    const triggerContent = (
      <div
        className={cn(
          "flex w-full items-center gap-3",
          isCollapsed && "justify-center"
        )}
      >
        {avatar && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
            {avatar}
          </div>
        )}
        {!isCollapsed && (primaryText || secondaryText || children) && (
          <div className="flex flex-1 flex-col overflow-hidden text-left">
            {primaryText && (
              <span className="truncate text-sm font-medium text-sidebar-foreground">
                {primaryText}
              </span>
            )}
            {secondaryText && (
              <span className="truncate text-xs text-muted-foreground">
                {secondaryText}
              </span>
            )}
            {children}
          </div>
        )}
        {!isCollapsed && (
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-figma-muted" aria-hidden="true" />
        )}
      </div>
    )

    // Dropdown menu content
    const dropdownContent = (
      <DropdownMenuContent
        side={isCollapsed ? "right" : "top"}
        align={isCollapsed ? "end" : "start"}
        sideOffset={8}
        className="w-[252px] py-2"
      >
        {/* User info header */}
        <DropdownMenuLabel className="font-normal px-5 py-3">
          <div className="flex items-center gap-3">
            {avatar && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
                {avatar}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              {primaryText && (
                <span className="truncate text-figma-sm font-semibold text-figma-primary leading-tight">
                  {primaryText}
                </span>
              )}
              {email && (
                <span className="truncate text-figma-2xs text-figma-secondary leading-tight">
                  {email}
                </span>
              )}
              {secondaryText && !email && (
                <span className="truncate text-figma-2xs text-figma-secondary leading-tight">
                  {secondaryText}
                </span>
              )}
              {secondaryText && email && (
                <span className="truncate text-figma-2xs text-figma-blue font-medium leading-tight">
                  {secondaryText}
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Team */}
        {teamHref && (
          <DropdownMenuItem asChild>
            <Link
              href={teamHref}
              className="flex items-center gap-3 cursor-pointer py-2.5 px-5"
            >
              <UsersRound className="h-5 w-5 text-figma-secondary" aria-hidden="true" />
              <span className="text-figma-sm">Team</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Preferences */}
        {preferencesHref && (
          <DropdownMenuItem asChild>
            <Link
              href={preferencesHref}
              className="flex items-center gap-3 cursor-pointer py-2.5 px-5"
            >
              <Sliders className="h-5 w-5 text-figma-secondary" aria-hidden="true" />
              <span className="text-figma-sm">Preferences</span>
            </Link>
          </DropdownMenuItem>
        )}

        {/* Workspace switcher */}
        {showWorkspaceSwitcher && onSwitchWorkspace && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onSwitchWorkspace}
              className="flex items-center gap-3 cursor-pointer py-2.5 px-5"
            >
              <Building2 className="h-5 w-5 text-figma-secondary" aria-hidden="true" />
              <span className="text-figma-sm">Switch workspace</span>
            </DropdownMenuItem>
          </>
        )}

        {/* Custom menu items */}
        {menuItems}

        {/* Logout */}
        {onLogout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onLogout}
              className="flex items-center gap-3 cursor-pointer py-2.5 px-5 text-destructive [&]:hover:text-destructive [&]:hover:bg-destructive/10 [&]:focus:text-destructive [&]:focus:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              <span className="text-figma-sm">Log out</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    )

    // When collapsed, wrap trigger in tooltip
    const trigger = isCollapsed ? (
      <SimpleTooltip content={primaryText || "Account"} side="right">
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full items-center justify-center rounded-md px-2 py-2",
              "transition-colors duration-150",
              "bg-transparent hover:bg-sidebar-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
              className
            )}
            aria-label={`Account menu for ${primaryText || "user"}`}
          >
            {triggerContent}
          </button>
        </DropdownMenuTrigger>
      </SimpleTooltip>
    ) : (
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex w-full items-center rounded-md px-2 py-2",
            "transition-colors duration-150",
            "bg-transparent hover:bg-sidebar-accent",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
            className
          )}
          aria-label={`Account menu for ${primaryText || "user"}`}
        >
          {triggerContent}
        </button>
      </DropdownMenuTrigger>
    )

    return (
      <div ref={ref} className="border-t border-sidebar-border px-2 py-2" {...props}>
        <DropdownMenu>
          {trigger}
          {dropdownContent}
        </DropdownMenu>
      </div>
    )
  }
)
SidebarNavFooter.displayName = "SidebarNavFooter"

// ===== SidebarNav Status =====

interface SidebarNavStatusProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status indicator color */
  status?: "success" | "warning" | "error" | "info"
  /** Status label */
  label?: string
  /** Additional info text */
  info?: string
}

const statusColors = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
}

const SidebarNavStatus = React.forwardRef<HTMLDivElement, SidebarNavStatusProps>(
  ({ className, status = "success", label, info, children, ...props }, ref) => {
    const { sidebarState } = useAppShell()
    const isCollapsed = sidebarState === "collapsed"

    if (isCollapsed) {
      return (
        <SimpleTooltip content={label || "Status"} side="right">
          <div
            ref={ref}
            className={cn(
              "flex justify-center px-2 py-2",
              className
            )}
            {...props}
          >
            <div
              className={cn(
                "h-2 w-2 rounded-full animate-pulse",
                statusColors[status]
              )}
              aria-label={label}
            />
          </div>
        </SimpleTooltip>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          "mx-2 rounded-lg border p-3",
          status === "success" && "border-success/20 bg-success/10",
          status === "warning" && "border-warning/20 bg-warning/10",
          status === "error" && "border-destructive/20 bg-destructive/10",
          status === "info" && "border-info/20 bg-info/10",
          className
        )}
        {...props}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              statusColors[status]
            )}
            aria-hidden="true"
          />
          {label && (
            <span
              className={cn(
                "text-sm font-medium",
                status === "success" && "text-success",
                status === "warning" && "text-warning",
                status === "error" && "text-destructive",
                status === "info" && "text-info"
              )}
            >
              {label}
            </span>
          )}
        </div>
        {info && (
          <p
            className={cn(
              "mt-1 text-xs",
              status === "success" && "text-success/80",
              status === "warning" && "text-warning/80",
              status === "error" && "text-destructive/80",
              status === "info" && "text-info/80"
            )}
          >
            {info}
          </p>
        )}
        {children}
      </div>
    )
  }
)
SidebarNavStatus.displayName = "SidebarNavStatus"

// ===== Header Toggle Button =====
// Shows in main header when: mobile OR desktop collapsed

interface SidebarNavHeaderToggleProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> { }

const SidebarNavHeaderToggle = React.forwardRef<
  HTMLButtonElement,
  SidebarNavHeaderToggleProps
>(({ className, ...props }, ref) => {
  const { toggleSidebar, isMobile, sidebarState } = useAppShell()
  const isCollapsed = sidebarState === "collapsed"
  const isHidden = sidebarState === "hidden"

  // Show when mobile, OR when desktop sidebar is collapsed/hidden
  // This ensures user can always access the sidebar toggle
  if (!isMobile && !isCollapsed && !isHidden) return null

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("h-9 w-9", className)}
      onClick={toggleSidebar}
      aria-label={isCollapsed || isHidden ? "Expand sidebar" : "Toggle navigation menu"}
      {...props}
    >
      {isCollapsed || isHidden ? (
        <ChevronRight className="h-5 w-5" />
      ) : (
        <PanelLeft className="h-5 w-5" />
      )}
    </Button>
  )
})
SidebarNavHeaderToggle.displayName = "SidebarNavHeaderToggle"

// Legacy alias for backwards compatibility
const SidebarNavMobileToggle = SidebarNavHeaderToggle

export {
  SidebarNav,
  SidebarNavHeader,
  SidebarNavContent,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavFooter,
  SidebarNavStatus,
  SidebarNavHeaderToggle,
  SidebarNavMobileToggle,
  sidebarNavItemVariants,
}
