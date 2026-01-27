import * as React from "react"
import { Link } from "wouter"
import { ChevronRight, Home } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/navigation-trail"
import { SidebarNavMobileToggle } from "./sidebar-nav"



// ===== Types =====

interface BreadcrumbItemData {
  /** Display label */
  label: string
  /** Route path (if navigable) */
  href?: string
  /** Icon to show before label */
  icon?: React.ReactNode
}

// ===== PageHeader =====

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string
  /** Page description/subtitle */
  description?: string
  /** Breadcrumb items */
  breadcrumbs?: BreadcrumbItemData[]
  /** Show home breadcrumb as first item */
  showHomeBreadcrumb?: boolean
  /** Actions area (buttons, etc.) */
  actions?: React.ReactNode
  /** Show mobile menu toggle */
  showMobileToggle?: boolean
  /** Border at bottom */
  bordered?: boolean
  /** Sticky positioning */
  sticky?: boolean
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    {
      className,
      title,
      description,
      breadcrumbs = [],
      showHomeBreadcrumb = true,
      actions,
      showMobileToggle = true,
      bordered = true,
      sticky = false,
      ...props
    },
    ref
  ) => {
    // Build full breadcrumb list
    const fullBreadcrumbs = React.useMemo(() => {
      const items: BreadcrumbItemData[] = []

      if (showHomeBreadcrumb) {
        items.push({
          label: "Home",
          href: "/",
          icon: <Home className="h-4 w-4" />,
        })
      }

      items.push(...breadcrumbs)

      // Add current page as last item (no href)
      items.push({ label: title })

      return items
    }, [breadcrumbs, showHomeBreadcrumb, title])

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col gap-4 bg-background px-4 py-4 lg:px-6",
          bordered && "border-b border-border",
          sticky && "sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          className
        )}
        {...props}
      >
        {/* Top row: Mobile toggle + Breadcrumbs */}
        <div className="flex items-center gap-2">
          {showMobileToggle && <SidebarNavMobileToggle />}

          {fullBreadcrumbs.length > 1 && (
            <Breadcrumb>
              <BreadcrumbList>
                {fullBreadcrumbs.map((item, index) => {
                  const isLast = index === fullBreadcrumbs.length - 1

                  return (
                    <React.Fragment key={index}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="flex items-center gap-1.5">
                            {item.icon}
                            <span className="truncate max-w-[200px]">
                              {item.label}
                            </span>
                          </BreadcrumbPage>
                        ) : item.href ? (
                          <BreadcrumbLink asChild>
                            <Link
                              href={item.href}
                              className="flex items-center gap-1.5"
                            >
                              {item.icon}
                              <span className="truncate max-w-[150px]">
                                {item.label}
                              </span>
                            </Link>
                          </BreadcrumbLink>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {item.icon}
                            <span className="truncate max-w-[150px]">
                              {item.label}
                            </span>
                          </span>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </BreadcrumbSeparator>
                      )}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
          )}
        </div>

        {/* Bottom row: Title + Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <p className="text-figma-sm text-figma-secondary">{description}</p>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>
    )
  }
)
PageHeader.displayName = "PageHeader"

// ===== PageHeaderActions =====

interface PageHeaderActionsProps extends React.HTMLAttributes<HTMLDivElement> {}

const PageHeaderActions = React.forwardRef<HTMLDivElement, PageHeaderActionsProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap items-center gap-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
PageHeaderActions.displayName = "PageHeaderActions"

// ===== SimpleBreadcrumbs =====

interface SimpleBreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  /** Breadcrumb items */
  items: BreadcrumbItemData[]
  /** Show home as first item */
  showHome?: boolean
  /** Separator element */
  separator?: React.ReactNode
}

const SimpleBreadcrumbs = React.forwardRef<HTMLElement, SimpleBreadcrumbsProps>(
  (
    {
      className,
      items,
      showHome = true,
      separator = <ChevronRight className="h-3.5 w-3.5" />,
      ...props
    },
    ref
  ) => {
    const fullItems = React.useMemo(() => {
      if (showHome) {
        return [
          { label: "Home", href: "/", icon: <Home className="h-4 w-4" /> },
          ...items,
        ]
      }
      return items
    }, [items, showHome])

    return (
      <Breadcrumb ref={ref} className={className} {...props}>
        <BreadcrumbList>
          {fullItems.map((item, index) => {
            const isLast = index === fullItems.length - 1

            return (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="flex items-center gap-1.5">
                      {item.icon}
                      <span className="truncate max-w-[200px]">
                        {item.label}
                      </span>
                    </BreadcrumbPage>
                  ) : item.href ? (
                    <BreadcrumbLink asChild>
                      <Link
                        href={item.href}
                        className="flex items-center gap-1.5"
                      >
                        {item.icon}
                        <span className="truncate max-w-[150px]">
                          {item.label}
                        </span>
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {item.icon}
                      <span className="truncate max-w-[150px]">
                        {item.label}
                      </span>
                    </span>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator>{separator}</BreadcrumbSeparator>}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }
)
SimpleBreadcrumbs.displayName = "SimpleBreadcrumbs"

// ===== PageTitle =====

interface PageTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Main title */
  title: string
  /** Subtitle/description */
  subtitle?: string
  /** Badge or status indicator */
  badge?: React.ReactNode
  /** Title heading level (for accessibility) */
  as?: "h1" | "h2" | "h3"
}

const PageTitle = React.forwardRef<HTMLDivElement, PageTitleProps>(
  ({ className, title, subtitle, badge, as: Tag = "h1", ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-1", className)} {...props}>
        <div className="flex items-center gap-3">
          <Tag className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </Tag>
          {badge}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
    )
  }
)
PageTitle.displayName = "PageTitle"

// ===== PageSection =====

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Actions for this section */
  actions?: React.ReactNode
  /** Add top border */
  bordered?: boolean
}

const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  (
    { className, title, description, actions, bordered = false, children, ...props },
    ref
  ) => {
    return (
      <section
        ref={ref}
        className={cn(
          "space-y-4",
          bordered && "border-t border-border pt-6",
          className
        )}
        {...props}
      >
        {(title || description || actions) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions && (
              <div className="flex items-center gap-2">{actions}</div>
            )}
          </div>
        )}
        {children}
      </section>
    )
  }
)
PageSection.displayName = "PageSection"

export {
  PageHeader,
  PageHeaderActions,
  SimpleBreadcrumbs,
  PageTitle,
  PageSection,
}
export type { BreadcrumbItemData }
