import { useRef, useState } from "react";
import { Switch, Route, Redirect } from "wouter";
import { RedirectToSignIn, SignIn, SignUp, useAuth, useClerk, useUser } from "@clerk/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspaceSetup } from "@/components/onboarding/workspace-setup";
import { AppLoadingScreen } from "@/components/shared/app-loading";
import { CompetitorRangeMock } from "@/pages/competitor-range-mock";
import { APP_CONFIG } from "@/config/app";
import { getActiveWorkspaceId, setActiveWorkspace, workspaceQueryClient, type WorkspaceListResponse } from "./lib/workspace-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AppShell,
  AppShellSidebar,
  AppShellMain,
  AppShellHeader,
  AppShellContent,
} from "@/components/layout/app-shell";
import {
  SidebarNav,
  SidebarNavHeader,
  SidebarNavContent,
  SidebarNavGroup,
  SidebarNavItem,
  SidebarNavHeaderToggle,
} from "@/components/layout/sidebar-nav";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/action-menu";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useAppShell } from "@/components/layout/app-shell";
import {
  LayoutDashboard,
  Eye,
  Users,
  Bot,
  MessageSquare,
  Link2,
  Lightbulb,
  FileText,
  Bell,
  Settings,
  Building2,
  UsersRound,
  Plug,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useLocation as useWouterLocation } from "wouter";

// App Pages
import { DashboardPage } from "@/pages/app/dashboard";
import { VisibilityPage } from "@/pages/app/visibility";
import { CompetitorsPage } from "@/pages/app/competitors";
import { BotTrafficPage } from "@/pages/app/bot-traffic";
import { PromptsPage } from "@/pages/app/prompts";
import { CitationsPage } from "@/pages/app/citations";
import { EmptyState } from "@/components/shared/empty-state";
import { GlobalSearch } from "@/components/layout/global-search";
import { AccountMenu } from "@/components/layout/account-menu";

/**
 * Placeholder component for pages being built
 * Uses shared EmptyState for consistent styling
 */
function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState
      icon={Sparkles}
      title={title}
      description={description}
    />
  );
}

/**
 * Auth Layout - Full page without sidebar
 */
function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}

/**
 * Unified Sidebar Header Component
 * Combines app identity (logo) with brand switcher in ONE header area
 * Option B: Small app logo on left, brand name as primary element with dropdown
 */
function UnifiedSidebarHeader({ workspaces, currentWorkspaceId, onSwitchWorkspace }: {
  workspaces: WorkspaceListResponse["workspaces"];
  currentWorkspaceId: string;
  onSwitchWorkspace: (workspaceId: string) => void;
}) {
  const [location, navigate] = useWouterLocation();
  const { sidebarState, toggleSidebar } = useAppShell();
  const isCollapsed = sidebarState === "collapsed";
  const [isBrandHovered, setIsBrandHovered] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHeaderActive = isBrandHovered || isMenuOpen;
  const headerRowRef = useRef<HTMLDivElement>(null);

  const handleHeaderPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = headerRowRef.current?.getBoundingClientRect();
    if (!rect) return;
    setIsBrandHovered(event.clientX < rect.right - 36);
  };

  const currentWorkspace = workspaces.find(({ id }) => id === currentWorkspaceId);
  const workspaceName = currentWorkspace?.name ?? "Your organization";

  const triggerContent = (
    <div className={cn(
      "flex w-full items-center gap-3",
      isCollapsed && "justify-center"
    )}>
      {/* App logo - always visible */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      {!isCollapsed && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-left">
          <span className="truncate text-sm font-medium text-sidebar-foreground">
            {workspaceName}
          </span>
          <span className="truncate text-xs text-figma-muted">
            {APP_CONFIG.name}
          </span>
        </div>
      )}
    </div>
  );

  const triggerButton = (
    <Button
      variant="ghost"
      className={cn(
        "h-10 px-2 justify-start rounded-md flex-1 min-w-0 active:scale-100",
        "hover:bg-transparent",
        isCollapsed && "justify-center"
      )}
    >
      {triggerContent}
    </Button>
  );

  return (
    <div
      ref={headerRowRef}
      className={cn(
        "relative flex items-center h-14 border-b border-sidebar-border transition-colors duration-150",
        isCollapsed ? "px-2" : "px-1",
        !isCollapsed && "pr-9",
        isHeaderActive && "bg-sidebar-accent"
      )}
      onPointerMove={handleHeaderPointerMove}
      onPointerLeave={() => setIsBrandHovered(false)}
    >
      <DropdownMenu
        modal={false}
        onOpenChange={(open) => {
          setIsMenuOpen(open);
          if (!open) setIsBrandHovered(false);
        }}
      >
        {isCollapsed ? (
          <SimpleTooltip content="Switch workspace" side="right">
            <DropdownMenuTrigger asChild>
              {triggerButton}
            </DropdownMenuTrigger>
          </SimpleTooltip>
        ) : (
          <DropdownMenuTrigger asChild>
            {triggerButton}
          </DropdownMenuTrigger>
        )}
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={4}
          className="w-[252px] py-2"
        >
          <DropdownMenuLabel className="text-figma-xs font-medium text-figma-secondary px-5 py-1.5">Your workspaces</DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              className="cursor-pointer gap-3 py-2.5 px-5"
              onSelect={() => {
                if (workspace.id !== currentWorkspaceId) onSwitchWorkspace(workspace.id);
              }}
            >
              <Building2 className="h-5 w-5 text-figma-secondary shrink-0" />
              <span className="flex-1 text-figma-sm">{workspace.is_demo ? 'Demo' : workspace.name}</span>
              {workspace.id === currentWorkspaceId && (
                <span className="text-figma-xs text-primary font-medium">Active</span>
              )}
            </DropdownMenuItem>
          ))}
          {!currentWorkspace?.is_demo && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-figma-xs font-medium text-figma-secondary px-5 py-1.5">Workspace settings</DropdownMenuLabel>
              <DropdownMenuItem
                className="cursor-pointer gap-3 py-2.5 px-5"
                onClick={() => navigate("/app/settings/brand")}
              >
                <Settings className="h-5 w-5 text-figma-secondary shrink-0" />
                <span className="text-figma-sm">Workspace setup</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-3 py-2.5 px-5"
                onClick={() => navigate("/app/settings/integrations")}
              >
                <Plug className="h-5 w-5 text-figma-secondary shrink-0" />
                <span className="text-figma-sm">Integrations</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Collapse button - visible when NOT hovering brand */}
      {!isCollapsed && (
        <SimpleTooltip content="Collapse sidebar" side="right">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-figma-muted hover:bg-sidebar-accent hover:text-sidebar-foreground",
              isHeaderActive && "pointer-events-none"
            )}
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-150",
              isHeaderActive ? "rotate-0" : "rotate-90"
            )} />
          </Button>
        </SimpleTooltip>
      )}
    </div>
  );
}

/**
 * App Layout - With sidebar navigation
 *
 * Navigation Structure (PAGE_STRUCTURE_MAP.md):
 * MONITOR: Dashboard, Visibility, Competitors, Bot traffic
 * ANALYZE: Prompts/queries, Topics, Citations, Sentiment, Site audit
 * ACT: Insights, Reports, Alerts
 *
 * Settings moved to:
 * - User profile dropdown (top header): Team, Preferences
 * - Brand switcher dropdown (top): Brand setup, Integrations
 */
function OnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useWouterLocation();
  const { data: workspaceData } = useQuery<WorkspaceListResponse>({
    queryKey: ["/api/workspaces"],
    enabled: isLoaded && Boolean(isSignedIn),
  });

  if (!isLoaded) return <AppLoadingScreen />;
  if (!isSignedIn) return <RedirectToSignIn />;
  if (!workspaceData) return <AppLoadingScreen label="Loading your organization" />;

  const activeWorkspace = workspaceData.workspaces.find(({ id }) => id === getActiveWorkspaceId())
    ?? workspaceData.workspaces.find(({ id }) => id === workspaceData.currentWorkspaceId)
    ?? workspaceData.workspaces[0];

  if (!activeWorkspace) return null;
  if (activeWorkspace.onboarding_completed_at) return <Redirect to="/app/dashboard" />;

  return (
    <WorkspaceSetup
      initialName={activeWorkspace.name}
      onComplete={async () => {
        await queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
        navigate("/app/dashboard");
      }}
    />
  );
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: workspaceData, isPending: workspacesPending, error: workspaceError } = useQuery<WorkspaceListResponse>({
    queryKey: ["/api/workspaces"],
    enabled: isLoaded && Boolean(isSignedIn),
  });

  const handleLogout = async () => {
    localStorage.removeItem('onboarding_completed_steps');
    localStorage.removeItem('onboarding_dismissed');
    await signOut({ redirectUrl: "/" });
  };

  if (!isLoaded || (isSignedIn && workspacesPending)) return <AppLoadingScreen />;
  if (!isSignedIn) return <RedirectToSignIn />;
  if (!workspaceData || workspaceError) {
    return <div className="p-6 text-sm text-destructive">Unable to load your workspaces. Refresh to try again.</div>;
  }

  const activeWorkspace = workspaceData.workspaces.find(({ id }) => id === getActiveWorkspaceId())
    ?? workspaceData.workspaces.find(({ id }) => id === workspaceData.currentWorkspaceId)
    ?? workspaceData.workspaces[0];

  if (activeWorkspace && !activeWorkspace.onboarding_completed_at) {
    return <Redirect to="/onboarding" />;
  }

  const handleSwitchWorkspace = (workspaceId: string) => {
    if (!workspaceData.workspaces.some(({ id }) => id === workspaceId)) return;
    setActiveWorkspace(workspaceId);
    window.location.reload();
  };

  return (
    <AppShell>
      <AppShellSidebar>
        <SidebarNav>
          {/* Unified header: app logo + brand switcher in ONE element */}
          <UnifiedSidebarHeader
            workspaces={workspaceData.workspaces}
            currentWorkspaceId={workspaceData.workspaces.find(({ id }) => id === getActiveWorkspaceId())?.id ?? workspaceData.currentWorkspaceId}
            onSwitchWorkspace={handleSwitchWorkspace}
          />

          <SidebarNavContent>
            {/* MONITOR Section */}
            <SidebarNavGroup label="Monitor">
              <SidebarNavItem href="/app/dashboard" icon={<LayoutDashboard className="h-4 w-4" />} exact>
                Dashboard
              </SidebarNavItem>
              <SidebarNavItem href="/app/visibility" icon={<Eye className="h-4 w-4" />}>
                Visibility
              </SidebarNavItem>
              <SidebarNavItem href="/app/competitors" icon={<Users className="h-4 w-4" />}>
                Competitors
              </SidebarNavItem>
              <SidebarNavItem href="/app/bots" icon={<Bot className="h-4 w-4" />}>
                Bot traffic
              </SidebarNavItem>
            </SidebarNavGroup>

            {/* ANALYZE Section */}
            <SidebarNavGroup label="Analyze">
              <SidebarNavItem href="/app/prompts" icon={<MessageSquare className="h-4 w-4" />}>
                Prompts/queries
              </SidebarNavItem>
              <SidebarNavItem href="/app/citations" icon={<Link2 className="h-4 w-4" />}>
                Citations
              </SidebarNavItem>
            </SidebarNavGroup>

            {/* ACT Section */}
            <SidebarNavGroup label="Act">
              <SidebarNavItem href="/app/insights" icon={<Lightbulb className="h-4 w-4" />}>
                Insights
              </SidebarNavItem>
              <SidebarNavItem href="/app/reports" icon={<FileText className="h-4 w-4" />}>
                Reports
              </SidebarNavItem>
              <SidebarNavItem href="/app/alerts" icon={<Bell className="h-4 w-4" />}>
                Alerts
              </SidebarNavItem>
            </SidebarNavGroup>
          </SidebarNavContent>

        </SidebarNav>
      </AppShellSidebar>

      <AppShellMain>
        <AppShellHeader className="pr-6 lg:pr-8">
          <SidebarNavHeaderToggle />
          <div className="flex-1" />
          <GlobalSearch />
          <div className="flex-1" />
          <AccountMenu
            name={user?.fullName || "Account"}
            email={user?.primaryEmailAddress?.emailAddress || "Email not provided"}
            imageUrl={user?.imageUrl}
            onLogout={handleLogout}
          />
        </AppShellHeader>
        <AppShellContent>
          {activeWorkspace?.is_demo && (
            <div className="mb-6 rounded-lg border border-figma-border bg-figma-blue-light px-4 py-3 text-figma-sm text-figma-secondary">
              You are viewing the read-only Demo workspace. Switch to your workspace to make changes.
            </div>
          )}
          {children}
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  );
}

/**
 * Page Components - Organized by navigation structure
 *
 * MONITOR Section
 */
// DashboardPage is imported from @/pages/app/dashboard
// VisibilityPage is imported from @/pages/app/visibility
// CompetitorsPage is imported from @/pages/app/competitors
// BotTrafficPage is imported from @/pages/app/bot-traffic

/**
 * ANALYZE Section
 */
// PromptsPage imported from @/pages/app/prompts

// CitationsPage imported from @/pages/app/citations
// Topics → merged into Prompts "By Topic" tab
// Sentiment → merged into Visibility + Prompts drawer
// Site Audit → merged into Bot Traffic

/**
 * ACT Section
 */
function InsightsPage() {
  return (
    <ComingSoon
      title="Insights"
      description="AI-generated insights and recommendations for improving your LLM visibility."
    />
  );
}

function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Generate and share visibility reports with your team."
    />
  );
}

function AlertsPage() {
  return (
    <ComingSoon
      title="Alerts"
      description="Configure alerts for visibility changes and brand mentions."
    />
  );
}

/**
 * SETTINGS Section
 */
function BrandSetupPage() {
  return (
    <ComingSoon
      title="Brand setup"
      description="Configure your brand profile, competitors, and tracking preferences."
    />
  );
}

function TeamPage() {
  return (
    <ComingSoon
      title="Team"
      description="Manage team members, roles, and permissions."
    />
  );
}

function IntegrationsPage() {
  return (
    <ComingSoon
      title="Integrations"
      description="Connect your tools and configure third-party integrations."
    />
  );
}

function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-muted-foreground">Page not found</p>
    </div>
  );
}

/**
 * Main Router
 *
 * Route structure matches PAGE_STRUCTURE_MAP.md:
 * MONITOR: /app/dashboard, /app/visibility, /app/competitors, /app/bots
 * ANALYZE: /app/prompts, /app/citations
 * ACT: /app/insights, /app/reports, /app/alerts
 * SETTINGS: /app/settings/brand, /app/settings/team, /app/settings/integrations, /app/settings/billing
 */
function Router() {
  return (
    <Switch>
      {import.meta.env.DEV && (
        <Route path="/mock/competitor-empty-range">
          <CompetitorRangeMock />
        </Route>
      )}

      <Route path="/onboarding">
        <OnboardingPage />
      </Route>

      {/* Auth Routes - No sidebar */}
      <Route path="/">
        <AuthLayout>
          <SignIn
            routing="hash"
            signUpUrl="/signup"
            forceRedirectUrl="/app/dashboard"
            appearance={{
              elements: {
                card: "shadow-sm rounded-2xl",
                headerTitle: "text-figma-xl font-semibold",
                headerSubtitle: "text-figma-sm text-figma-secondary",
                formButtonPrimary: "bg-primary hover:opacity-90",
              },
            }}
          />
        </AuthLayout>
      </Route>
      <Route path="/signup">
        <AuthLayout>
          <SignUp
            routing="hash"
            signInUrl="/"
            forceRedirectUrl="/onboarding"
            appearance={{
              elements: {
                card: "shadow-sm rounded-2xl",
                headerTitle: "text-figma-xl font-semibold",
                headerSubtitle: "text-figma-sm text-figma-secondary",
                formButtonPrimary: "bg-primary hover:opacity-90",
              },
            }}
          />
        </AuthLayout>
      </Route>

      {/* MONITOR Routes */}
      <Route path="/app/dashboard">
        <AppLayout><DashboardPage /></AppLayout>
      </Route>
      <Route path="/app/visibility">
        <AppLayout><VisibilityPage /></AppLayout>
      </Route>
      <Route path="/app/competitors">
        <AppLayout><CompetitorsPage /></AppLayout>
      </Route>
      <Route path="/app/bots">
        <AppLayout><BotTrafficPage /></AppLayout>
      </Route>
      <Route path="/app/bot-traffic">
        <AppLayout><BotTrafficPage /></AppLayout>
      </Route>

      {/* ANALYZE Routes */}
      <Route path="/app/prompts">
        <AppLayout><PromptsPage /></AppLayout>
      </Route>
      <Route path="/app/citations">
        <AppLayout><CitationsPage /></AppLayout>
      </Route>

      {/* ACT Routes */}
      <Route path="/app/insights">
        <AppLayout><InsightsPage /></AppLayout>
      </Route>
      <Route path="/app/reports">
        <AppLayout><ReportsPage /></AppLayout>
      </Route>
      <Route path="/app/alerts">
        <AppLayout><AlertsPage /></AppLayout>
      </Route>

      {/* SETTINGS Routes */}
      <Route path="/app/settings/brand">
        <AppLayout><BrandSetupPage /></AppLayout>
      </Route>
      <Route path="/app/settings/team">
        <AppLayout><TeamPage /></AppLayout>
      </Route>
      <Route path="/app/settings/integrations">
        <AppLayout><IntegrationsPage /></AppLayout>
      </Route>
      {/* Default settings route redirects to brand setup */}
      <Route path="/app/settings">
        <AppLayout><BrandSetupPage /></AppLayout>
      </Route>

      {/* Redirect /app to dashboard */}
      <Route path="/app">
        <AppLayout><DashboardPage /></AppLayout>
      </Route>

      {/* 404 */}
      <Route>
        <AppLayout><NotFoundPage /></AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={workspaceQueryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
