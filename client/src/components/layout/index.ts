/**
 * Layout Components - fe-E003
 *
 * App shell and layout primitives for building consistent page layouts.
 */


export {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  AppShellHeader,
  AppShellContent,
  AppShellFooter,
  useAppShell,
  appShellVariants,
} from "./app-shell"
export type { AppShellProps } from "./app-shell"


export {
  SidebarNav,
  SidebarNavHeader,
  SidebarNavContent,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavFooter,
  SidebarNavStatus,
  SidebarNavMobileToggle,
  sidebarNavItemVariants,
} from "./sidebar-nav"


export {
  PageHeader,
  PageHeaderActions,
  SimpleBreadcrumbs,
  PageTitle,
  PageSection,
} from "./page-header"
export type { BreadcrumbItemData } from "./page-header"


export {
  Show,
  Hide,
  ResponsiveContainer,
  ResponsiveStack,
  ResponsiveGrid,
  ResponsiveSpacer,
  VisuallyHidden,
  AspectRatioBox,
  useBreakpoint,
  useMediaQuery,
  BREAKPOINTS,
} from "./responsive"
export type { DeviceType, BreakpointKey } from "./responsive"

// Page Transitions
export { PageTransition, PageFadeIn } from "./page-transition"
