import * as React from "react"
import { format, differenceInDays } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Calendar,
  CreditCard,
  Crown,
  Download,
  HardDrive,
  Loader2,
  Minus,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress-indicator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/divider"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-grid"
import { rechartsProps, chartColors } from "@/components/charts/chart-theme"



// Types
export type PlanTier = "free" | "pro" | "enterprise"
export type TrendDirection = "up" | "down" | "stable"

export interface UsageMetric {
  used: number
  limit: number
  trend?: TrendDirection
}

export interface StorageUsage extends UsageMetric {
  unit: "MB" | "GB" | "TB"
}

export interface HistoryPoint {
  date: Date
  apiCalls: number
  storage: number
}

export interface UsageData {
  apiCalls: UsageMetric & { trend: TrendDirection }
  storage: StorageUsage
  members: UsageMetric
  workspaces?: UsageMetric
  history: HistoryPoint[]
}

export interface PlanInfo {
  tier: PlanTier
  name: string
  billingPeriod: { start: Date; end: Date }
  price?: number
  features: string[]
}

export interface BreakdownItem {
  name: string
  endpoint?: string
  calls: number
  percentage: number
}

export interface UsageDashboardProps {
  /** Workspace ID */
  workspaceId: string
  /** Usage data including metrics and history */
  usage: UsageData
  /** Plan information */
  plan: PlanInfo
  /** Usage breakdown by feature/endpoint */
  breakdown?: BreakdownItem[]
  /** Callback when upgrade button is clicked */
  onUpgrade?: () => void
  /** Callback to export usage data, should return a Blob */
  onExportData?: () => Promise<Blob>
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string | null
  /** Additional className */
  className?: string
}

// Plan configuration
const PLAN_CONFIG: Record<PlanTier, { label: string; icon: React.ReactNode; badgeVariant: "default" | "secondary" | "outline" }> = {
  free: {
    label: "Free",
    icon: <Sparkles className="h-4 w-4" />,
    badgeVariant: "outline",
  },
  pro: {
    label: "Pro",
    icon: <Zap className="h-4 w-4" />,
    badgeVariant: "secondary",
  },
  enterprise: {
    label: "Enterprise",
    icon: <Crown className="h-4 w-4" />,
    badgeVariant: "default",
  },
}

// Helper functions
function getUsagePercentage(used: number, limit: number): number {
  if (limit === 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function getUsageStatus(percentage: number): "success" | "warning" | "error" {
  if (percentage >= 90) return "error"
  if (percentage >= 70) return "warning"
  return "success"
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    const value = num / 1000000
    return value % 1 === 0 ? `${value}M` : `${value.toFixed(1)}M`
  }
  if (num >= 1000) {
    const value = num / 1000
    return value % 1 === 0 ? `${value}K` : `${value.toFixed(1)}K`
  }
  return num.toLocaleString()
}

function formatDate(date: Date): string {
  return format(date, "MMM d, yyyy")
}

function formatChartDate(date: Date): string {
  return format(date, "MMM d")
}

/**
 * UsageProgress Component
 *
 * Progress bar with threshold warnings and visual status.
 */
export interface UsageProgressProps {
  /** Current used amount */
  used: number
  /** Maximum limit */
  limit: number
  /** Unit label (optional) */
  unit?: string
  /** Show percentage */
  showPercentage?: boolean
  /** Size variant */
  size?: "sm" | "default" | "lg"
  /** Additional className */
  className?: string
}

export function UsageProgress({
  used,
  limit,
  unit,
  showPercentage = true,
  size = "default",
  className,
}: UsageProgressProps) {
  const percentage = getUsagePercentage(used, limit)
  const status = getUsageStatus(percentage)
  const isNearLimit = percentage >= 90

  const sizeClasses = {
    sm: "h-1.5",
    default: "h-2",
    lg: "h-3",
  }

  const statusColors = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="relative w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            sizeClasses[size],
            statusColors[status],
            isNearLimit && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}% used`}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {formatNumber(used)}{unit ? ` ${unit}` : ""} used
          </span>
          <span>
            {formatNumber(limit)}{unit ? ` ${unit}` : ""} limit
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * TrendIndicator Component
 *
 * Shows trend direction with icon and color.
 */
function TrendIndicator({ trend }: { trend: TrendDirection }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center text-success" aria-label="Trending up">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    )
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center text-muted-foreground" aria-label="Trending down">
        <ArrowDownRight className="h-4 w-4" />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-muted-foreground" aria-label="Stable">
      <Minus className="h-4 w-4" />
    </span>
  )
}

/**
 * UsageCard Component
 *
 * Individual metric card with progress and trend.
 */
export interface UsageCardProps {
  /** Card title */
  title: string
  /** Icon to display */
  icon: React.ReactNode
  /** Current used amount */
  used: number
  /** Maximum limit */
  limit: number
  /** Unit label (optional) */
  unit?: string
  /** Trend direction (optional) */
  trend?: TrendDirection
  /** Description/helper text */
  description?: string
  /** Additional className */
  className?: string
}

export function UsageCard({
  title,
  icon,
  used,
  limit,
  unit,
  trend,
  description,
  className,
}: UsageCardProps) {
  const percentage = getUsagePercentage(used, limit)
  const status = getUsageStatus(percentage)

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-muted shrink-0" aria-hidden="true">
              {icon}
            </div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {trend && <TrendIndicator trend={trend} />}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">{formatNumber(used)}</span>
          <span className="text-sm text-muted-foreground">
            / {formatNumber(limit)}{unit ? ` ${unit}` : ""}
          </span>
        </div>
        <UsageProgress used={used} limit={limit} unit={unit} showPercentage={false} />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {percentage}% used
          </span>
          {status === "warning" && (
            <Badge variant="warning" size="sm">
              Approaching limit
            </Badge>
          )}
          {status === "error" && (
            <Badge variant="error" size="sm">
              Near limit
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * UsageOverview Component
 *
 * Grid of usage metric cards.
 */
export interface UsageOverviewProps {
  /** Usage data */
  usage: UsageData
  /** Additional className */
  className?: string
}

export function UsageOverview({ usage, className }: UsageOverviewProps) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      <UsageCard
        title="API Calls"
        icon={<Activity className="h-4 w-4 text-primary" />}
        used={usage.apiCalls.used}
        limit={usage.apiCalls.limit}
        trend={usage.apiCalls.trend}
        description="This billing period"
      />
      <UsageCard
        title="Storage"
        icon={<HardDrive className="h-4 w-4 text-primary" />}
        used={usage.storage.used}
        limit={usage.storage.limit}
        unit={usage.storage.unit}
        description="Total storage used"
      />
      <UsageCard
        title="Team Members"
        icon={<Users className="h-4 w-4 text-primary" />}
        used={usage.members.used}
        limit={usage.members.limit}
        description="Active members"
      />
      {usage.workspaces && (
        <UsageCard
          title="Workspaces"
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          used={usage.workspaces.used}
          limit={usage.workspaces.limit}
          description="Active workspaces"
        />
      )}
    </div>
  )
}

/**
 * BillingInfo Component
 *
 * Plan tier, billing dates, and upgrade button.
 */
export interface BillingInfoProps {
  /** Plan information */
  plan: PlanInfo
  /** Whether upgrade should be shown */
  showUpgrade?: boolean
  /** Callback when upgrade is clicked */
  onUpgrade?: () => void
  /** Additional className */
  className?: string
}

export function BillingInfo({
  plan,
  showUpgrade = true,
  onUpgrade,
  className,
}: BillingInfoProps) {
  const daysRemaining = differenceInDays(plan.billingPeriod.end, new Date())
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining > 0

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Billing</CardTitle>
              <CardDescription>Your current plan and billing period</CardDescription>
            </div>
          </div>
          <Badge variant={PLAN_CONFIG[plan.tier].badgeVariant}>
            <span className="flex items-center gap-1.5">
              {PLAN_CONFIG[plan.tier].icon}
              {plan.name}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Billing Period</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(plan.billingPeriod.start)} - {formatDate(plan.billingPeriod.end)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Days Remaining</p>
              <p className={cn(
                "text-xs",
                isExpiringSoon ? "text-warning font-medium" : "text-muted-foreground"
              )}>
                {daysRemaining > 0 ? `${daysRemaining} days` : "Renewal due"}
              </p>
            </div>
          </div>
        </div>

        {plan.price !== undefined && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">${plan.price}</span>
              <span className="text-sm text-muted-foreground">/month</span>
            </div>
          </div>
        )}

        {plan.features.length > 0 && (
          <div className="pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Plan includes:</p>
            <ul className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              {plan.features.slice(0, 6).map((feature, i) => (
                <li key={i} className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      {showUpgrade && plan.tier !== "enterprise" && onUpgrade && (
        <CardFooter className="pt-0">
          <Button onClick={onUpgrade} className="w-full" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Upgrade Plan
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * UsageChart Component
 *
 * Historical usage chart (area/bar).
 */
export interface UsageChartProps {
  /** History data points */
  history: HistoryPoint[]
  /** Chart type */
  type?: "area" | "bar"
  /** Chart height */
  height?: number
  /** Show API calls line */
  showApiCalls?: boolean
  /** Show storage line */
  showStorage?: boolean
  /** Additional className */
  className?: string
}

function UsageChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium">{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function UsageChart({
  history,
  type = "area",
  height = 300,
  showApiCalls = true,
  showStorage = true,
  className,
}: UsageChartProps) {
  // Transform data for chart
  const chartData = React.useMemo(() => {
    return history.map((point) => ({
      date: formatChartDate(point.date),
      "API Calls": point.apiCalls,
      "Storage (MB)": point.storage,
    }))
  }, [history])

  if (history.length === 0) {
    return (
      <div
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ height }}
      >
        <div className="text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No usage history available</p>
        </div>
      </div>
    )
  }

  const ChartComponent = type === "area" ? AreaChart : BarChart
  const DataComponent = type === "area" ? Area : Bar

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="apiCallsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...rechartsProps.cartesianGrid} />
          <XAxis
            dataKey="date"
            {...rechartsProps.xAxis}
            interval="preserveStartEnd"
          />
          <YAxis {...rechartsProps.yAxis} />
          <Tooltip content={<UsageChartTooltip />} />

          {showApiCalls && type === "area" && (
            <Area
              type="monotone"
              dataKey="API Calls"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#apiCallsGradient)"
              animationDuration={1000}
            />
          )}
          {showApiCalls && type === "bar" && (
            <Bar
              dataKey="API Calls"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          )}

          {showStorage && type === "area" && (
            <Area
              type="monotone"
              dataKey="Storage (MB)"
              stroke="hsl(var(--success))"
              strokeWidth={2}
              fill="url(#storageGradient)"
              animationDuration={1000}
            />
          )}
          {showStorage && type === "bar" && (
            <Bar
              dataKey="Storage (MB)"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * UsageBreakdown Component
 *
 * Table showing usage by feature/endpoint.
 */
export interface UsageBreakdownProps {
  /** Breakdown items */
  items: BreakdownItem[]
  /** Maximum items to show (default: all) */
  maxItems?: number
  /** Additional className */
  className?: string
}

export function UsageBreakdown({
  items,
  maxItems,
  className,
}: UsageBreakdownProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <div className="rounded-full bg-muted p-3 mb-4">
          <BarChart3 className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No usage breakdown available</p>
      </div>
    )
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feature / Endpoint</TableHead>
            <TableHead className="text-right">Calls</TableHead>
            <TableHead className="text-right">Usage %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayItems.map((item, i) => (
            <TableRow key={i}>
              <TableCell>
                <div>
                  <span className="font-medium">{item.name}</span>
                  {item.endpoint && (
                    <span className="block text-xs text-muted-foreground font-mono">
                      {item.endpoint}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(item.calls)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16">
                    <UsageProgress
                      used={item.percentage}
                      limit={100}
                      showPercentage={false}
                      size="sm"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * ExportButton Component
 *
 * Button to download usage data.
 */
export interface ExportButtonProps {
  /** Callback to generate export data */
  onExport: () => Promise<Blob>
  /** Button variant */
  variant?: "default" | "outline" | "ghost"
  /** Button size */
  size?: "sm" | "default" | "lg"
  /** Additional className */
  className?: string
}

export function ExportButton({
  onExport,
  variant = "outline",
  size = "default",
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await onExport()
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `usage-data-${format(new Date(), "yyyy-MM-dd")}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export usage data:", error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isExporting}
      isLoading={isExporting}
      loadingText="Exporting..."
      leftIcon={<Download className="h-4 w-4" />}
      className={className}
    >
      Export Data
    </Button>
  )
}

/**
 * UsageDashboard Component
 *
 * Main container for workspace usage metrics.
 */
export function UsageDashboard({
  workspaceId,
  usage,
  plan,
  breakdown = [],
  onUpgrade,
  onExportData,
  isLoading = false,
  error,
  className,
}: UsageDashboardProps) {
  // Check if user is approaching any limits
  const isApproachingLimits = React.useMemo(() => {
    const apiPercentage = getUsagePercentage(usage.apiCalls.used, usage.apiCalls.limit)
    const storagePercentage = getUsagePercentage(usage.storage.used, usage.storage.limit)
    const membersPercentage = getUsagePercentage(usage.members.used, usage.members.limit)
    return apiPercentage >= 70 || storagePercentage >= 70 || membersPercentage >= 70
  }, [usage])

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Loading usage data...</span>
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

      {/* Upgrade prompt when approaching limits */}
      {isApproachingLimits && plan.tier !== "enterprise" && onUpgrade && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-warning/20">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  You&apos;re approaching your usage limits
                </p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to get more resources and unlock additional features.
                </p>
              </div>
            </div>
            <Button onClick={onUpgrade} rightIcon={<ArrowRight className="h-4 w-4" />}>
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Usage overview cards */}
      <UsageOverview usage={usage} />

      {/* Billing info and chart row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Billing info */}
        <BillingInfo
          plan={plan}
          showUpgrade={!isApproachingLimits && plan.tier !== "enterprise"}
          onUpgrade={onUpgrade}
        />

        {/* Usage chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Usage History</CardTitle>
                <CardDescription>
                  API calls and storage over the billing period
                </CardDescription>
              </div>
              {onExportData && (
                <ExportButton onExport={onExportData} variant="ghost" size="sm" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <UsageChart history={usage.history} height={250} />
          </CardContent>
        </Card>
      </div>

      {/* Usage breakdown */}
      {breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage Breakdown</CardTitle>
            <CardDescription>
              API usage by feature and endpoint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageBreakdown items={breakdown} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
