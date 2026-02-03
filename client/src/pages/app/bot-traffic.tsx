import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * Bot Traffic Page
 *
 * Track AI crawler activity on your website.
 * Shows which AI bots are crawling your site and what pages they visit.
 *
 * Route: /app/bot-traffic (also /app/bots)
 *
 * Data Sources:
 * - GET /api/bot-traffic/stats — aggregated statistics
 * - GET /api/bot-traffic/ai-bots — AI bot-specific stats
 * - GET /api/bot-traffic/recent — recent visits
 *
 * Bot metrics and history are loaded from the active workspace API.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useSearch } from 'wouter';
import {
  Info,
  Bot,
  Globe,
  Loader2,
  SearchCheck,
  CheckCircle,
  AlertCircle,
  XCircle,
  Check,
  AlertTriangle,
  X,
  ExternalLink,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tab-set';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/option-picker';
import { Input } from '@/components/ui/input';
import { FilterSearch, FilterSelect } from '@/components/shared/filter-bar';
import { MetricListScroller } from '@/components/shared/stat-metric';
import {
  TimeRangeSelector,
  useTimeRange,
  getPeriodLabel,
  type TimeRange,
} from '@/components/charts/time-range-selector';
import { CardEmptyState, ErrorState } from '@/components/shared/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// Shared components
import {
  PageHeader,
  ContentCard,
  MetricCard,
  StatMetric,
  CardLabel,
  CardSubtitle,
  CardDivider,
  PlatformRow,
  TableHeader,
  TablePagination,
  Skeleton,
  ChartSkeleton,
  InsightBox,
} from '@/components/shared';

// Chart Components
import { BotTrafficChart } from '@/components/bots/bot-traffic-chart';

// Platform Icon & Bot Constants
import { PlatformIcon, getPlatformInfo, getPlatformColor, getBotIconId, AI_BOTS, SEARCH_BOTS, SOCIAL_BOTS } from '@/components/ui/platform-icon';
import { useIsDemoWorkspace } from '@/hooks/use-active-workspace';

// Types
import type { TimeRangePreset } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface BotStats {
  botType: string;
  category: string;
  visitCount: number;
  uniqueUrls: number;
  lastVisit: string | null;
}

interface TrafficSummary {
  totalVisits: number;
  aiVisits: number;
  searchVisits: number;
  socialVisits: number;
  otherVisits: number;
  byBot: BotStats[];
  period: {
    from: string;
    to: string;
    hasHistoricalData: boolean;
    hasDataInRange: boolean;
  };
  trends: {
    totalVisits: number;
    aiVisits: number;
    searchVisits: number;
    socialVisits: number;
    otherVisits: number;
    uniqueAiPages: number;
    byBot: Record<string, number>;
  };
}

interface AIBotStats {
  aiBots: BotStats[];
  totalAIVisits: number;
}

interface BotVisit {
  id: number;
  botType: string;
  userAgent: string;
  url: string;
  visitedAt: string;
  // CDN metadata fields (nullable - may not be available)
  statusCode?: number | null;
  responseTimeMs?: number | null;
  contentType?: string | null;
  contentLengthBytes?: number | null;
}

interface RecentVisitsResponse {
  visits: BotVisit[];
  count: number;
}

interface TopCrawledPage {
  path: string;
  visits: number;
}

// ============================================================================
// Bot to Icon Mapping - derived from constants
// ============================================================================

function botToIcon(botName: string): string | null {
  return getBotIconId(botName);
}

// Get display name for a bot (e.g., 'facebookexternalhit' -> 'Facebook')
function botToDisplayName(botId: string): string {
  const normalizedId = botId.toLowerCase();
  const aiBot = AI_BOTS.find(b => b.id.toLowerCase() === normalizedId || b.name.toLowerCase() === normalizedId);
  if (aiBot) return aiBot.name;

  const searchBot = SEARCH_BOTS.find(b => b.id.toLowerCase() === normalizedId || b.name.toLowerCase() === normalizedId);
  if (searchBot) return searchBot.name;

  const socialBot = SOCIAL_BOTS.find(b => b.id.toLowerCase() === normalizedId || b.name.toLowerCase() === normalizedId);
  if (socialBot) return socialBot.name;

  return botId; // Fallback to raw ID
}

function findBotStats<T extends { botType: string }>(bots: T[], botType: string): T | undefined {
  const normalizedType = botType.toLowerCase();
  return bots.find(bot => bot.botType.toLowerCase() === normalizedType);
}

// Helper to render bot icon - uses PlatformIcon if available, Globe fallback
function BotIcon({ botType, size = 'xs' }: { botType: string; size?: 'xs' | 'sm' | 'md' }) {
  const icon = botToIcon(botType);
  if (!icon) {
    // Globe icon for bots without platform icons
    return <Globe className={cn('text-figma-muted', size === 'xs' ? 'w-3 h-3' : size === 'sm' ? 'w-4 h-4' : 'w-5 h-5')} />;
  }
  return <PlatformIcon platform={icon} size={size} />;
}

// Bot colors for chart - derived from constants via getPlatformColor
function getBotColor(botType: string): string {
  const icon = botToIcon(botType);
  if (icon) {
    return getPlatformColor(icon);
  }
  return '#6B7280'; // fallback gray
}

// ============================================================================
// API Hooks
// ============================================================================

function getDateRange(range: TimeRange): { from: Date; to: Date } {
  return { from: range.from, to: range.to };
}

type BotStatsResponse = TrafficSummary & {
  cdnConfigured?: boolean;
  configuredProviders?: string[];
};

function useBotStats(range: TimeRange) {
  const { from, to } = getDateRange(range);

  return useQuery<BotStatsResponse>({
    queryKey: ['bot-traffic', 'stats', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/bot-traffic/stats?${params}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load bot traffic stats');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

function useAIBotStats(range: TimeRange) {
  const { from, to } = getDateRange(range);

  return useQuery<AIBotStats>({
    queryKey: ['bot-traffic', 'ai-bots', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const res = await fetch(`/api/bot-traffic/ai-bots?${params}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load AI bot stats');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

function useRecentBotVisits(range: TimeRange, limit: number = 10, botType?: string) {
  const { from, to } = getDateRange(range);

  return useQuery<RecentVisitsResponse>({
    queryKey: ['bot-traffic', 'recent', from.toISOString(), to.toISOString(), limit, botType],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(limit),
        from: from.toISOString(),
        to: to.toISOString(),
      });
      if (botType && botType !== 'all') {
        params.set('botType', botType);
      }
      const res = await fetch(`/api/bot-traffic/recent?${params}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load recent bot visits');
      }
      return res.json();
    },
    staleTime: 60 * 1000, // 1 minute - recent data updates more frequently
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

function useBotTimeline(range: TimeRange) {
  const { from, to } = getDateRange(range);

  return useQuery<{ points: Array<{ date: string; visits: Record<string, number> }> }>({
    queryKey: ['bot-traffic', 'timeline', from.toISOString(), to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const res = await fetch(`/api/bot-traffic/timeline?${params}`);
      if (!res.ok) throw new Error('Failed to load bot traffic timeline');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCompact(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBotCategory(botType: string): 'ai' | 'search' | 'social' | 'other' {
  const normalizedType = botType.toLowerCase();
  if (AI_BOTS.some(bot => normalizedType.includes(bot.id.toLowerCase()))) return 'ai';
  if (SEARCH_BOTS.some(bot => normalizedType.includes(bot.id.toLowerCase()))) return 'search';
  if (SOCIAL_BOTS.some(bot => normalizedType.includes(bot.id.toLowerCase()))) return 'social';
  return 'other';
}

// ============================================================================
// Site Health Types (from shared)
// ============================================================================

import type {
  HealthStatus,
  CheckStatus,
  SiteHealthAudit,
  SiteHealthAuditResponse,
  SiteHealthStatusResponse,
  SiteHealthAction,
  HealthCheck as SHHealthCheck,
  Recommendation as SHRecommendation,
} from '@shared/types/site-health';

// ============================================================================
// Site Health Hook
// ============================================================================

function useSiteHealth() {
  const [audit, setAudit] = useState<SiteHealthAudit | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();
  const readOnlyDemo = useIsDemoWorkspace();

  useEffect(() => {
    fetch('/api/site-health/status')
      .then(res => res.json())
      .then((data: SiteHealthStatusResponse) => {
        if (data.hasAudit && data.audit) {
          setAudit(data.audit);
        }
      })
      .catch(() => {
        // No cached audit, that's fine
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const runAudit = async () => {
    if (readOnlyDemo) return;
    setIsAuditing(true);
    try {
      const res = await fetch('/api/site-health/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Will use brand config domain
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to run audit');
      }
      const data: SiteHealthAuditResponse = await res.json();
      setAudit(data);
    } catch (err: any) {
      toast({
        title: 'Couldn\'t run the audit',
        description: err.message === 'No domain provided and no brand configured'
          ? 'You must set up your domain to run site audit.'
          : err.message || 'Something went wrong. Try again in a moment.',
        variant: 'warning',
      });
    } finally {
      setIsAuditing(false);
    }
  };

  return { audit, isAuditing, initialLoading, runAudit, readOnlyDemo };
}

// ============================================================================
// Skeleton Components (leaf content only — rendered inside real layout)
// ============================================================================

function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
    </div>
  );
}

function NoPeriodRows() {
  return (
    <div className="flex h-full min-h-[100px] items-center justify-center text-center text-figma-2xs text-figma-muted">
      No results in this period
    </div>
  );
}

function NoPeriodState({ onAdjustDateRange }: { onAdjustDateRange: () => void }) {
  return (
    <CardEmptyState
      icon={Search}
      title="No results in this period"
      description="Change the date range to view results from another period."
      action={{ label: 'Adjust date filter', onClick: onAdjustDateRange }}
      className="min-h-[260px]"
    />
  );
}

// ============================================================================
// Info Tooltip Helper
// ============================================================================

function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 text-figma-muted hover:text-figma-secondary transition-colors">
            <Info className="w-3.5 h-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-figma-2xs">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Site Health Section
// ============================================================================

// Status helpers
const getStatusColor = (status: HealthStatus) => {
  switch (status) {
    case 'good': return 'border-green-200 bg-green-50';
    case 'warning': return 'border-amber-200 bg-amber-50';
    case 'issue': return 'border-red-200 bg-red-50';
  }
};

const getStatusText = (status: HealthStatus) => {
  switch (status) {
    case 'good': return 'Good';
    case 'warning': return 'Warning';
    case 'issue': return 'Issue';
  }
};

const getStatusTextColor = (status: HealthStatus) => {
  switch (status) {
    case 'good': return 'text-figma-green';
    case 'warning': return 'text-figma-orange';
    case 'issue': return 'text-figma-red';
  }
};

const getCheckIcon = (status: CheckStatus) => {
  switch (status) {
    case 'pass': return <Check className="w-4 h-4 text-figma-green" />;
    case 'warn': return <AlertTriangle className="w-4 h-4 text-figma-orange" />;
    case 'fail': return <X className="w-4 h-4 text-figma-red" />;
    case 'pending': return <Loader2 className="w-4 h-4 text-figma-muted animate-spin" />;
  }
};

// Handle check action (link opens URL, copy writes to clipboard)
async function handleCheckAction(
  action: SiteHealthAction,
  toast: ReturnType<typeof useToast>['toast'],
) {
  if (action.type === 'link') {
    window.open(action.value.startsWith('http') ? action.value : `https://${action.value}`, '_blank', 'noopener,noreferrer');
  } else if (action.type === 'copy') {
    if (!navigator.clipboard?.writeText) {
      toast({ title: 'Could not copy', description: 'Clipboard access is unavailable in this browser.', variant: 'warning' });
      return;
    }

    try {
      await navigator.clipboard.writeText(action.value);
      toast(action.copyFeedback);
    } catch {
      toast({ title: 'Could not copy', description: 'Your browser did not allow clipboard access.', variant: 'warning' });
    }
  }
}

const AUDIT_STEPS = [
  'Checking for llms.txt file...',
  'Scanning robots.txt for AI bot rules...',
  'Validating sitemap accessibility...',
  'Inspecting schema markup...',
  'Checking page meta tags...',
  'Analyzing AI crawler permissions...',
  'Compiling recommendations...',
];

interface SiteHealthSectionProps {
  audit: SiteHealthAudit | null;
  isAuditing: boolean;
  initialLoading: boolean;
  onRunAudit: () => void;
  readOnlyDemo: boolean;
}

function SiteHealthSection({ audit, isAuditing, initialLoading, onRunAudit, readOnlyDemo }: SiteHealthSectionProps) {
  const { toast } = useToast();
  const [auditStepIndex, setAuditStepIndex] = useState(0);

  useEffect(() => {
    if (!isAuditing) {
      setAuditStepIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setAuditStepIndex(index => (index + 1) % AUDIT_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [isAuditing]);

  // Initial loading — skeleton
  if (initialLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <ContentCard title="AI accessibility">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </ContentCard>
      </div>
    );
  }

  // No audit run yet — empty state
  if (!audit) {
    return (
      <div className="flex min-h-[45vh] items-center justify-center px-4">
        <div className="w-full max-w-md rounded-xl border border-figma-border bg-figma-card p-8">
          <SearchCheck className="mx-auto mb-3 h-8 w-8 text-figma-muted" aria-hidden="true" />
          <h2 className="text-h3 text-center font-semibold text-figma-primary">
            See how AI crawlers read your site
          </h2>
          <p className="mt-2 text-center text-figma-sm text-figma-secondary">
            Check your llms.txt, robots.txt, sitemap, and schema markup to see how AI crawlers find and understand your content.
          </p>
          <Button onClick={onRunAudit} disabled={isAuditing || readOnlyDemo} className="mt-8 w-full">
            {isAuditing && <Loader2 className="h-4 w-4 animate-spin" />}
            {readOnlyDemo ? 'Unavailable in Demo' : isAuditing ? AUDIT_STEPS[auditStepIndex] : 'Run audit'}
          </Button>
        </div>
      </div>
    );
  }

  // Real audit results
  const { summary, checks, recommendations } = audit;

  // Group checks by category for the cards
  const checksByCategory = {
    llms: checks.filter(c => c.category === 'llms'),
    robots: checks.filter(c => c.category === 'robots'),
    sitemap: checks.filter(c => c.category === 'sitemap'),
    schema: checks.filter(c => c.category === 'schema'),
    other: checks.filter(c => c.category === 'other'),
  };

  // Compute per-card subtitles from check details
  const passCount = (items: typeof checks) => items.filter(c => c.status === 'pass').length;

  // Card color tinting by status
  const getCardColors = (status: HealthStatus) => {
    switch (status) {
      case 'good': return 'bg-green-50/60 border-green-200';
      case 'warning': return 'bg-amber-50/60 border-amber-200';
      case 'issue': return 'bg-red-50/60 border-red-200';
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-5 h-5 text-figma-green" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-figma-orange" />;
      case 'issue': return <XCircle className="w-5 h-5 text-figma-red" />;
    }
  };

  const summaryCards = [
    {
      key: 'llmsTxt',
      label: 'llms.txt',
      status: summary.llmsTxt,
      subtitle: checksByCategory.llms.find(c => c.id === 'llms-txt-present')?.status === 'pass'
        ? 'File found'
        : 'Not found',
      checks: checksByCategory.llms,
    },
    {
      key: 'robotsTxt',
      label: 'robots.txt',
      status: summary.robotsTxt,
      subtitle: (() => {
        const botCheck = checksByCategory.robots.find(c => c.id === 'robots-txt-ai-bots');
        return botCheck?.details || 'Checking bot access';
      })(),
      checks: checksByCategory.robots,
    },
    {
      key: 'sitemap',
      label: 'Sitemap',
      status: summary.sitemap,
      subtitle: checksByCategory.sitemap.find(c => c.id === 'sitemap-present')?.details || 'Checking sitemap',
      checks: checksByCategory.sitemap,
    },
    {
      key: 'schema',
      label: 'Schema',
      status: summary.schema,
      subtitle: `${passCount(checksByCategory.schema)} of ${checksByCategory.schema.length} types found`,
      checks: checksByCategory.schema,
    },
    {
      key: 'pageMeta',
      label: 'Page Meta',
      status: summary.pageMeta,
      subtitle: `${passCount(checksByCategory.other)} of ${checksByCategory.other.length} tags present`,
      checks: checksByCategory.other,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Summary Cards — MetricCard pattern with status color tinting */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map(card => (
          <MetricCard
            key={card.key}
            className={cn('h-auto min-h-[200px]', getCardColors(card.status))}
          >
            <CardLabel>{card.label}</CardLabel>
            <div className="flex items-center gap-2 mt-2 mb-1">
              {getStatusIcon(card.status)}
              <span className={cn('text-figma-lg font-bold', getStatusTextColor(card.status))}>
                {getStatusText(card.status)}
              </span>
            </div>
            <CardSubtitle>{card.subtitle}</CardSubtitle>
            <CardDivider variant="light" className="mt-4 mb-3" />
            <div className="flex-1 space-y-2">
              {card.checks.map(check => (
                <div key={check.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    {getCheckIcon(check.status)}
                  </div>
                  <span className="text-figma-2xs text-figma-secondary truncate flex-1">
                    {check.name}
                  </span>
                </div>
              ))}
            </div>
          </MetricCard>
        ))}
      </div>

      {/* AI Accessibility Checks */}
      <ContentCard
        title="AI accessibility"
        subtitle="Detailed check results"
      >
        <TableHeader
          gridCols="grid-cols-[minmax(0,0.7fr)_80px_minmax(0,1.3fr)_80px]"
          columns={[
            { label: 'Check' },
            { label: 'Status' },
            { label: 'Details' },
            { label: 'Action', align: 'right' },
          ]}
        />
        <div className="space-y-0">
          {checks.map(check => (
            <div
              key={check.id}
              className="grid grid-cols-[minmax(0,0.7fr)_80px_minmax(0,1.3fr)_80px] gap-3 items-center py-3 px-2 border-b border-figma-border-light last:border-0"
            >
              <span className="text-figma-sm text-figma-primary">{check.name}</span>
              <div className="flex justify-center">
                {getCheckIcon(check.status)}
              </div>
              <span className="text-figma-sm text-figma-secondary truncate">{check.details}</span>
              <div className="flex justify-end">
                {check.action ? (
                  <button
                    onClick={() => handleCheckAction(check.action!, toast)}
                    className="text-figma-xs font-medium text-figma-blue hover:underline"
                  >
                    {check.action.label}
                  </button>
                ) : <span className="text-figma-xs text-figma-muted">—</span>}
              </div>
            </div>
          ))}
        </div>
      </ContentCard>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <ContentCard
          title="Top priorities to improve AI visibility"
          subtitle={`${recommendations.length} recommendation${recommendations.length !== 1 ? 's' : ''}`}
        >
          <div className="space-y-4 pt-2">
            {recommendations.map((rec, i) => (
              <div key={rec.id} className="flex gap-3">
                <span className="text-figma-sm font-semibold text-figma-primary shrink-0 w-5">
                  {i + 1}.
                </span>
                <div className="flex-1 space-y-1">
                  <p className="text-figma-sm font-medium text-figma-primary">
                    {rec.title}
                  </p>
                  <p className="text-figma-xs text-figma-secondary">
                    {rec.description}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className={cn(
                      'inline-block text-figma-2xs font-medium px-2 py-0.5 rounded',
                      rec.impact === 'high' && 'bg-red-50 text-figma-red',
                      rec.impact === 'medium' && 'bg-amber-50 text-figma-orange',
                      rec.impact === 'low' && 'bg-blue-50 text-figma-blue'
                    )}>
                      {rec.impact.charAt(0).toUpperCase() + rec.impact.slice(1)} impact
                    </span>
                    {rec.actions?.map(action => (
                      <button
                        key={action.label}
                        onClick={() => handleCheckAction(action, toast)}
                        className="text-figma-xs font-medium text-figma-blue underline underline-offset-2"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ContentCard>
      )}

      {/* Last audited */}
      {audit.auditedAt && (
        <p className="text-figma-xs text-figma-muted text-center">
          Last audited: {new Date(audit.auditedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function BotTrafficPage() {
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');

  // Get initial tab from URL
  const urlParams = new URLSearchParams(search);
  const mockEmptyPeriod = import.meta.env.DEV && urlParams.get('mock') === 'empty-period';
  const tabParam = urlParams.get('tab');
  const initialTab = tabParam === 'by-type' ? 'by-type' : tabParam === 'site-health' ? 'site-health' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [scrollToRecentActivity, setScrollToRecentActivity] = useState(false);
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const [botFilter, setBotFilter] = useState<string>('all');

  // Site health audit
  const { audit, isAuditing, initialLoading: healthLoading, runAudit, readOnlyDemo } = useSiteHealth();

  // Data fetching
  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
    refetch: refetchStats,
  } = useBotStats(range);

  const {
    data: aiBotsData,
    isLoading: aiBotsLoading,
    isFetching: aiBotsFetching,
    error: aiBotsError,
    refetch: refetchAIBots,
  } = useAIBotStats(range);

  const {
    data: recentData,
    isLoading: recentLoading,
    isFetching: recentFetching,
    error: recentError,
    refetch: refetchRecent,
  } = useRecentBotVisits(range, 100, botFilter); // Fetch more for client-side pagination

  // Table state for Recent Activity
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ai' | 'search' | 'social' | 'other'>('all');
  const [sortField, setSortField] = useState<'visitedAt' | 'botType' | 'url'>('visitedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: timelineData } = useBotTimeline(range);
  const rawRecentVisits = recentData?.visits ?? [];

  // Process recent visits: filter, sort, paginate (must be before early returns)
  const { recentVisits, totalFiltered, totalPages } = useMemo(() => {
    let filtered = [...rawRecentVisits];

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(v => getBotCategory(v.botType) === typeFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.botType.toLowerCase().includes(q) ||
        v.url.toLowerCase().includes(q)
      );
    }

    const totalFiltered = filtered.length;

    // Sort
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'visitedAt') {
        cmp = new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime();
      } else if (sortField === 'botType') {
        cmp = a.botType.localeCompare(b.botType);
      } else if (sortField === 'url') {
        cmp = a.url.localeCompare(b.url);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // Paginate
    const totalPages = Math.ceil(filtered.length / pageSize);
    const start = (currentPage - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return { recentVisits: paginated, totalFiltered, totalPages };
  }, [rawRecentVisits, typeFilter, searchQuery, sortField, sortDir, currentPage, pageSize]);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Toggle sort
  const handleSort = (field: 'visitedAt' | 'botType' | 'url') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExport = () => {
    const headers = ['Time', 'Bot', 'URL', 'Category'];
    const rows = rawRecentVisits.map(v => [
      new Date(v.visitedAt).toISOString(),
      v.botType,
      v.url,
      getBotCategory(v.botType),
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bot-traffic-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sort icon helper
  const SortIcon = ({ field }: { field: 'visitedAt' | 'botType' | 'url' }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-figma-muted" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-figma-primary" />
      : <ArrowDown className="w-3 h-3 text-figma-primary" />;
  };

  // Handlers
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  const handleAdjustDateRange = () => {
    document.querySelector('main[aria-label="Bot traffic"]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setDateFilterOpen(true);
  };

  const handleRetryAll = () => {
    refetchStats();
    refetchAIBots();
    refetchRecent();
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    if (!scrollToRecentActivity || activeTab !== 'by-type') return;
    document.getElementById('bot-recent-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setScrollToRecentActivity(false);
  }, [activeTab, scrollToRecentActivity]);

  // Combined loading state
  const isLoading = statsLoading || aiBotsLoading || recentLoading;
  const isFetching = statsFetching || aiBotsFetching || recentFetching;
  const isRefreshing = isFetching && !isLoading;

  // Error state — show first error encountered
  const error = statsError || aiBotsError || recentError;

  // Error state (non-loading)
  if (error && !isLoading) {
    const errorMessage = error instanceof Error
      ? error.message
      : 'Failed to load bot traffic data';

    return (
      <main role="main" aria-label="Bot traffic">
        <PageHeader
          title="Bot traffic"
          subtitle="AI crawler activity on your website"
          action={<TimeRangeSelector value={range} onChange={handleTimeRangeChange} />}
        />
        <ErrorState
          title="Couldn't load bot traffic data"
          error={errorMessage}
          onRetry={handleRetryAll}
        />
      </main>
    );
  }

  // Guarded with defaults so they don't crash during loading
  const noResultsForRange = mockEmptyPeriod || Boolean(
    statsData?.period?.hasHistoricalData && !statsData.period.hasDataInRange
  );
  const allBots = statsData?.byBot || [];

  // Show supported bot types with counts returned by the API.
  const aiBots: BotStats[] = AI_BOTS.map(bot => {
    const real = findBotStats(aiBotsData?.aiBots ?? [], bot.id);
    return {
      botType: bot.id,
      category: 'ai',
      visitCount: real?.visitCount ?? 0,
      uniqueUrls: real?.uniqueUrls ?? 0,
      lastVisit: real?.lastVisit ?? null,
    };
  });

  const searchBots: BotStats[] = SEARCH_BOTS.map(bot => {
    const real = findBotStats(allBots, bot.id);
    return {
      botType: bot.id,
      category: 'search',
      visitCount: real?.visitCount ?? 0,
      uniqueUrls: real?.uniqueUrls ?? 0,
      lastVisit: real?.lastVisit ?? null,
    };
  });

  const socialBots: BotStats[] = SOCIAL_BOTS.map(bot => {
    const real = findBotStats(allBots, bot.id);
    return {
      botType: bot.id,
      category: 'social',
      visitCount: real?.visitCount ?? 0,
      uniqueUrls: real?.uniqueUrls ?? 0,
      lastVisit: real?.lastVisit ?? null,
    };
  });

  const otherBots = allBots.filter(bot => bot.category === 'other');

  // Calculate totals
  const totalAIVisits = aiBots.reduce((sum, b) => sum + b.visitCount, 0);
  const uniquePages = aiBots.reduce((sum, b) => sum + b.uniqueUrls, 0);
  const hasAIData = totalAIVisits > 0;
  const hasData = totalAIVisits > 0 || rawRecentVisits.length > 0;
  const searchVisitTotal = statsData?.searchVisits ?? 0;
  const socialVisitTotal = statsData?.socialVisits ?? 0;
  const otherVisitTotal = statsData?.otherVisits ?? 0;

  // Calculate top AI bot
  const topBot = aiBots.reduce((top, bot) =>
    bot.visitCount > top.visitCount ? bot : top, aiBots[0] || { botType: 'None', visitCount: 0 }
  );

  // Calculate percentages for AI bots
  const aiBotsWithPercent = aiBots.map(bot => ({
    ...bot,
    percentage: totalAIVisits > 0 ? Math.round((bot.visitCount / totalAIVisits) * 100) : 0,
  }));

  // Extract top crawled pages from recent visits
  const pageCounts: Record<string, number> = {};
  recentVisits.forEach(v => {
    const path = v.url.replace(/^https?:\/\/[^\/]+/, '');
    pageCounts[path] = (pageCounts[path] || 0) + 1;
  });
  const topPages: TopCrawledPage[] = Object.entries(pageCounts)
    .map(([path, visits]) => ({ path, visits }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 5);
  const displayTopPages = topPages;

  // Top bot's pages (filter recent visits by top bot type)
  const topBotVisits = rawRecentVisits
    .filter(v => v.botType === topBot.botType);
  const topBotPageMap: Record<string, { count: number; lastCrawl: string }> = {};
  topBotVisits.forEach(v => {
    const path = v.url.replace(/^https?:\/\/[^\/]+/, '');
    const existing = topBotPageMap[path];
    if (!existing) {
      topBotPageMap[path] = { count: 1, lastCrawl: v.visitedAt };
    } else {
      existing.count++;
      if (v.visitedAt > existing.lastCrawl) existing.lastCrawl = v.visitedAt;
    }
  });
  const topBotPages = Object.entries(topBotPageMap)
    .map(([path, { count, lastCrawl }]) => ({ path, visits: count, lastCrawl }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 4);

  const trend = statsData?.trends.aiVisits ?? 0;
  const topBotTrend = statsData?.trends.byBot[topBot.botType] ?? 0;
  const pagesTrend = statsData?.trends.uniqueAiPages ?? 0;

  // Last seen time per bot (for Latest Activity card — all bot types)
  const allBotsList = [...AI_BOTS, ...SEARCH_BOTS, ...SOCIAL_BOTS];
  const recentVisitsSource = rawRecentVisits;
  const lastSeenByBot: Record<string, string> = {};
  recentVisitsSource.forEach(v => {
    if (!lastSeenByBot[v.botType] || v.visitedAt > lastSeenByBot[v.botType]) {
      lastSeenByBot[v.botType] = v.visitedAt;
    }
  });

  // Available bot types for filter
  const availableBots = ['all', ...Array.from(new Set(aiBots.map(b => b.botType)))];

  return (
    <main role="main" aria-label="Bot traffic" aria-busy={isLoading || undefined}>
      {/* Page Header */}
      <PageHeader
        title="Bot traffic"
        subtitle={activeTab === 'site-health'
          ? 'Technical checks for AI crawler accessibility'
          : 'AI crawler activity on your website'}
        action={
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="flex items-center gap-2 text-figma-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-figma-xs">Updating...</span>
              </div>
            )}
            {activeTab === 'site-health' && audit && !readOnlyDemo && (
              <Button
                variant="outline"
                size="sm"
                onClick={runAudit}
                disabled={isAuditing}
                className="rounded-lg gap-1.5 text-figma-sm font-medium"
              >
                {isAuditing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAuditing ? 'Running...' : audit ? 'Re-run audit' : 'Run audit'}
              </Button>
            )}
            <TimeRangeSelector
              value={range}
              onChange={handleTimeRangeChange}
              open={dateFilterOpen}
              onOpenChange={setDateFilterOpen}
            />
          </div>
        }
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={cn('w-full transition-opacity duration-200', isRefreshing && 'opacity-60')}
      >
        <TabsList className="mb-6 inline-flex items-center gap-6 bg-transparent rounded-none p-0 h-auto border-b border-figma-border-light w-full justify-start">
          <TabsTrigger
            value="overview"
            className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="by-type"
            className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
          >
            By type
          </TabsTrigger>
          <TabsTrigger
            value="site-health"
            className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
          >
            Site health
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" forceMount className={activeTab !== 'overview' ? 'hidden' : ''}>
          {isLoading ? <PageSpinner /> : (<>

      {/* ================================================================
          ROW 1 — 4 Metric Cards (horizontal scroll, matching competitors)
          ================================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Total AI Visits */}
        <div className="min-w-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Total AI visits</CardLabel>
              <InfoTooltip content="Total page visits from AI crawlers in this time period" />
            </div>
            {!noResultsForRange && hasAIData ? (
              <>
                <StatMetric value={formatCompact(totalAIVisits)} trend={trend} />
                <CardSubtitle>{getPeriodLabel(range.preset)}</CardSubtitle>
              </>
            ) : (
              <>
                <div className="h-[38px] flex items-baseline mt-2 mb-1">
                  <span className="text-figma-lg font-bold text-figma-primary">—</span>
                </div>
                <CardSubtitle>No AI crawl data for this period</CardSubtitle>
              </>
            )}
            <CardDivider className="mt-5 mb-1.5" />
            <MetricListScroller
              header={
                <div className="flex items-center gap-2">
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-12 text-right">Visits</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">%</span>
                </div>
              }
            >
              {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                {aiBotsWithPercent.map(bot => (
                  <div key={bot.botType} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                        <BotIcon botType={bot.botType} size="xs" />
                      </div>
                      <span className={cn("text-figma-2xs truncate", bot.visitCount > 0 ? "text-figma-secondary" : "text-figma-muted")}>{botToDisplayName(bot.botType)}</span>
                    </div>
                    <span className={cn("text-figma-2xs tabular-nums w-12 text-right", bot.visitCount > 0 ? "font-medium text-figma-primary" : "text-figma-muted")}>
                      {bot.visitCount > 0 ? formatCompact(bot.visitCount) : '—'}
                    </span>
                    <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                      {bot.visitCount > 0 ? `${bot.percentage}%` : '—'}
                    </span>
                  </div>
                ))}
              </div>}
            </MetricListScroller>
          </MetricCard>
        </div>

        {/* Card 2: Pages Crawled */}
        <div className="min-w-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Pages crawled</CardLabel>
              <InfoTooltip content="Number of unique URLs visited by AI crawlers" />
            </div>
            {!noResultsForRange && uniquePages > 0 ? (
              <>
                <StatMetric value={uniquePages} trend={pagesTrend} />
                <CardSubtitle>unique URLs</CardSubtitle>
              </>
            ) : (
              <>
                <div className="h-[38px] flex items-baseline mt-2 mb-1">
                  <span className="text-figma-lg font-bold text-figma-primary">—</span>
                </div>
                <CardSubtitle>No pages crawled this period</CardSubtitle>
              </>
            )}
            <CardDivider className="mt-5 mb-1.5" />
            <MetricListScroller
              header={
                <div className="flex items-center gap-2">
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Page</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">Visits</span>
                </div>
              }
            >
              {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                {hasAIData ? (
                  displayTopPages.slice(0, 4).map(page => (
                    <div key={page.path} className="flex items-center gap-2">
                      <span className="text-figma-2xs text-figma-secondary truncate flex-1 min-w-0">{page.path}</span>
                      <span className="text-figma-2xs font-medium text-figma-primary tabular-nums w-10 text-right">
                        {page.visits}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-figma-2xs text-figma-muted">No crawled pages yet</p>
                )}
              </div>}
            </MetricListScroller>
          </MetricCard>
        </div>

        {/* Card 3: Top AI Bot */}
        <div className="min-w-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Top AI bot</CardLabel>
              <InfoTooltip content="The AI crawler with the most visits this period" />
            </div>
            {!noResultsForRange && hasAIData ? (
              <>
                <div className="h-[38px] flex items-center mt-2 mb-1 min-w-0">
                  <div className="flex items-baseline gap-2 min-w-0 w-full">
                    <span className="self-center shrink-0"><BotIcon botType={topBot.botType} size="md" /></span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="min-w-0 flex-1 truncate text-figma-lg font-bold text-figma-primary leading-none">
                          {botToDisplayName(topBot.botType)}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="whitespace-nowrap">
                        {botToDisplayName(topBot.botType)}
                      </TooltipContent>
                    </Tooltip>
                    <span className={cn(
                      'shrink-0 text-figma-base font-semibold tabular-nums',
                      topBotTrend >= 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
                    )}>
                      {topBotTrend >= 0 ? '+' : ''}{topBotTrend}%
                    </span>
                  </div>
                </div>
                <CardSubtitle>{formatCompact(topBot.visitCount)} visits</CardSubtitle>
              </>
            ) : (
              <>
                <div className="h-[38px] flex items-baseline mt-2 mb-1">
                  <span className="text-figma-lg font-bold text-figma-primary">—</span>
                </div>
                <CardSubtitle>No bot visits this period</CardSubtitle>
              </>
            )}
            <CardDivider className="mt-5 mb-1.5" />
            <MetricListScroller
              header={
                <div className="flex items-center gap-2">
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Page</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-8 text-right">Visits</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-16 text-right">Last crawl</span>
                </div>
              }
            >
              {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                {hasAIData ? (
                  topBotPages.map(page => (
                    <div key={page.path} className="flex items-center gap-2">
                      <span className="text-figma-2xs text-figma-secondary truncate flex-1 min-w-0">{page.path}</span>
                      <span className="text-figma-2xs font-medium text-figma-primary tabular-nums w-8 text-right">
                        {page.visits}
                      </span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-16 text-right truncate">
                        {formatRelativeTime(page.lastCrawl)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-2 text-figma-2xs text-figma-muted">No crawled pages yet</p>
                )}
              </div>}
            </MetricListScroller>
          </MetricCard>
        </div>

        {/* Card 4: Latest Crawl Activity */}
        <div className="min-w-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Latest activity</CardLabel>
              <InfoTooltip content="When AI crawlers last visited your site" />
            </div>
            {!noResultsForRange && hasData ? (
              <>
                <div className="h-[38px] flex items-center mt-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-figma-muted" />
                    <span className="text-figma-lg font-bold text-figma-primary">
                      {rawRecentVisits.length > 0
                        ? formatRelativeTime(rawRecentVisits[0].visitedAt)
                        : '—'}
                    </span>
                  </div>
                </div>
                <CardSubtitle>last AI crawl detected</CardSubtitle>
              </>
            ) : (
              <>
                <div className="h-[38px] flex items-baseline mt-2 mb-1">
                  <span className="text-figma-lg font-bold text-figma-primary">—</span>
                </div>
                <CardSubtitle>No crawls detected this period</CardSubtitle>
              </>
            )}
            <CardDivider className="mt-5 mb-1.5" />
            <MetricListScroller
              header={
                <div className="flex items-center gap-2">
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-16 text-right">When</span>
                </div>
              }
            >
              {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                {allBotsList.map(bot => {
                  const lastSeen = lastSeenByBot[bot.id];
                  return (
                    <div key={bot.id} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <BotIcon botType={bot.id} size="xs" />
                        </div>
                        <span className={cn("text-figma-2xs truncate", lastSeen ? "text-figma-secondary" : "text-figma-muted")}>{bot.name}</span>
                      </div>
                      <span className={cn("text-figma-2xs tabular-nums w-16 text-right", lastSeen ? "text-figma-muted" : "text-figma-muted")}>
                        {lastSeen ? formatRelativeTime(lastSeen) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>}
            </MetricListScroller>
          </MetricCard>
        </div>
      </div>

      {/* ================================================================
          ROW 2 — AI Bot Traffic Over Time (Chart)
          ================================================================ */}
      <div className="mb-8">
        <ContentCard
          title="AI bot visits over time"
          subtitle="Daily AI crawler activity"
        >
          {noResultsForRange ? (
            <NoPeriodState onAdjustDateRange={handleAdjustDateRange} />
          ) : (
            <BotTrafficChart
              bots={aiBotsWithPercent}
              data={(timelineData?.points ?? []).map(point => ({ date: point.date, ...point.visits }))}
              height={280}
            />
          )}
        </ContentCard>
      </div>

      {/* ================================================================
          ROW 3 — Bot Breakdown + Top Crawled Pages
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: AI Bot Breakdown */}
        <ContentCard
          title="AI bot breakdown"
          subtitle="Visits by AI crawlers"
          footer={!noResultsForRange && totalAIVisits > 0 ? (
            <InsightBox variant="muted">
              {topBot.botType} is your most active AI crawler, accounting for {Math.round((topBot.visitCount / totalAIVisits) * 100)}% of visits.
            </InsightBox>
          ) : undefined}
        >
          <div className="space-y-0">
            {/* Table Header */}
            <TableHeader
              gridCols="grid-cols-[1fr_80px_60px]"
              columns={[
                { label: 'Bot' },
                { label: 'Visits', align: 'right' },
                { label: '%', align: 'right' },
              ]}
            />
            {/* Rows */}
            {noResultsForRange ? (
              <NoPeriodState onAdjustDateRange={handleAdjustDateRange} />
            ) : aiBotsWithPercent.map(bot => (
              <div
                key={bot.botType}
                className="grid grid-cols-[1fr_80px_60px] gap-3 items-center py-2.5 px-2 border-b border-figma-border-light last:border-0"
              >
                <div className="flex items-center gap-2">
                  <BotIcon botType={bot.botType} size="sm" />
                  <span className="text-figma-sm text-figma-primary">{botToDisplayName(bot.botType)}</span>
                </div>
                <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
                  {totalAIVisits > 0 ? bot.visitCount.toLocaleString() : '—'}
                </span>
                <span className="text-figma-xs text-figma-muted tabular-nums text-right">
                  {totalAIVisits > 0 ? `${bot.percentage}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </ContentCard>

        {/* Right: Top Crawled Pages */}
        <ContentCard
          title="Top crawled pages"
          subtitle="Most visited URLs by AI bots"
          onAction={() => {
            setScrollToRecentActivity(true);
            handleTabChange('by-type');
          }}
          footer={!noResultsForRange && displayTopPages.length > 0 ? (() => {
            // Calculate insight based on content type
            const blogCount = displayTopPages.filter(p => p.path.includes('/blog')).reduce((s, p) => s + p.visits, 0);
            const docsCount = displayTopPages.filter(p => p.path.includes('/docs')).reduce((s, p) => s + p.visits, 0);
            const ratio = blogCount > 0 && docsCount > 0 ? (blogCount / docsCount).toFixed(1) : null;

            let insight = `${displayTopPages[0].path} is your most indexed page by AI bots.`;
            if (blogCount > docsCount && ratio) {
              insight = `Blog content gets ${ratio}x more AI crawls than documentation.`;
            } else if (docsCount > blogCount) {
              insight = 'Documentation is your most crawled content category.';
            }

            return <InsightBox variant="muted">{insight}</InsightBox>;
          })() : undefined}
        >
          <div className="space-y-0">
            {/* Table Header */}
            <TableHeader
              gridCols="grid-cols-[1fr_80px]"
              columns={[
                { label: 'Page' },
                { label: 'Visits', align: 'right' },
              ]}
            />
            {/* Rows */}
            {noResultsForRange ? (
              <NoPeriodState onAdjustDateRange={handleAdjustDateRange} />
            ) : displayTopPages.length === 0 ? (
              <CardEmptyState
                icon={Search}
                title="No crawled pages yet"
                description="Pages will appear here after AI bots crawl your site."
              />
            ) : displayTopPages.map(page => (
              <div
                key={page.path}
                className="grid grid-cols-[1fr_80px] gap-3 items-center py-2.5 px-2 border-b border-figma-border-light last:border-0 hover:bg-figma-hover transition-colors cursor-pointer"
              >
                <span className="text-figma-sm text-figma-primary truncate">{page.path}</span>
                <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
                  {page.visits.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>
          </>)}
        </TabsContent>

        {/* By Type Tab */}
        <TabsContent value="by-type" forceMount className={activeTab !== 'by-type' ? 'hidden' : ''}>
          {isLoading ? <PageSpinner /> : (<>
          {/* ================================================================
              ROW 1 — 4 Category Metric Cards
              ================================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Card 1: AI Bots */}
            <MetricCard>
              <CardLabel>AI bots</CardLabel>
              <StatMetric
                value={noResultsForRange || totalAIVisits === 0 ? '—' : formatCompact(totalAIVisits)}
                trend={noResultsForRange ? 0 : trend}
              />
              <CardSubtitle>{noResultsForRange || totalAIVisits === 0 ? '— crawlers active' : `${aiBots.filter(b => b.visitCount > 0).length} crawlers active`}</CardSubtitle>
              <CardDivider className="mt-5 mb-1.5" />
              <MetricListScroller
                header={
                  <div className="flex items-center gap-2">
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">Pages</span>
                  </div>
                }
              >
                {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                  {aiBotsWithPercent.map(bot => (
                    <div key={bot.botType} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <BotIcon botType={bot.botType} size="xs" />
                        </div>
                        <span className={cn("text-figma-2xs truncate", bot.visitCount > 0 ? "text-figma-secondary" : "text-figma-muted")}>{botToDisplayName(bot.botType)}</span>
                      </div>
                      <span className={cn("text-figma-2xs tabular-nums w-12 text-right", bot.visitCount > 0 ? "font-medium text-figma-primary" : "text-figma-muted")}>
                        {bot.visitCount > 0 ? formatCompact(bot.visitCount) : '—'}
                      </span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                        {bot.uniqueUrls > 0 ? bot.uniqueUrls : '—'}
                      </span>
                    </div>
                  ))}
                </div>}
              </MetricListScroller>
            </MetricCard>

            {/* Card 2: Search Bots */}
            <MetricCard>
              <CardLabel>Search bots</CardLabel>
              <StatMetric
                value={noResultsForRange || searchVisitTotal === 0 ? '—' : formatCompact(searchVisitTotal)}
                trend={noResultsForRange ? 0 : statsData?.trends.searchVisits ?? 0}
              />
              <CardSubtitle>{noResultsForRange || searchVisitTotal === 0 ? '— crawlers active' : `${searchBots.filter(b => b.visitCount > 0).length} crawlers active`}</CardSubtitle>
              <CardDivider className="mt-5 mb-1.5" />
              <MetricListScroller
                header={
                  <div className="flex items-center gap-2">
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">Pages</span>
                  </div>
                }
              >
                {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                  {searchBots.map(bot => (
                    <div key={bot.botType} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <BotIcon botType={bot.botType} size="xs" />
                        </div>
                        <span className={cn("text-figma-2xs truncate", bot.visitCount > 0 ? "text-figma-secondary" : "text-figma-muted")}>{botToDisplayName(bot.botType)}</span>
                      </div>
                      <span className={cn("text-figma-2xs tabular-nums w-12 text-right", bot.visitCount > 0 ? "font-medium text-figma-primary" : "text-figma-muted")}>
                        {bot.visitCount > 0 ? formatCompact(bot.visitCount) : '—'}
                      </span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                        {bot.uniqueUrls > 0 ? bot.uniqueUrls : '—'}
                      </span>
                    </div>
                  ))}
                </div>}
              </MetricListScroller>
            </MetricCard>

            {/* Card 3: Social Bots */}
            <MetricCard>
              <CardLabel>Social bots</CardLabel>
              <StatMetric
                value={noResultsForRange || socialVisitTotal === 0 ? '—' : formatCompact(socialVisitTotal)}
                trend={noResultsForRange ? 0 : statsData?.trends.socialVisits ?? 0}
              />
              <CardSubtitle>{noResultsForRange || socialVisitTotal === 0 ? '— crawlers active' : `${socialBots.filter(b => b.visitCount > 0).length} crawlers active`}</CardSubtitle>
              <CardDivider className="mt-5 mb-1.5" />
              <MetricListScroller
                header={
                  <div className="flex items-center gap-2">
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">Pages</span>
                  </div>
                }
              >
                {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                  {socialBots.map(bot => (
                    <div key={bot.botType} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <BotIcon botType={bot.botType} size="xs" />
                        </div>
                        <span className={cn("text-figma-2xs truncate", bot.visitCount > 0 ? "text-figma-secondary" : "text-figma-muted")}>{botToDisplayName(bot.botType)}</span>
                      </div>
                      <span className={cn("text-figma-2xs tabular-nums w-12 text-right", bot.visitCount > 0 ? "font-medium text-figma-primary" : "text-figma-muted")}>
                        {bot.visitCount > 0 ? formatCompact(bot.visitCount) : '—'}
                      </span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                        {bot.uniqueUrls > 0 ? bot.uniqueUrls : '—'}
                      </span>
                    </div>
                  ))}
                </div>}
              </MetricListScroller>
            </MetricCard>

            {/* Card 4: Other Bots */}
            <MetricCard>
              <CardLabel>Other bots</CardLabel>
              <StatMetric
                value={noResultsForRange || otherVisitTotal === 0 ? '—' : formatCompact(otherVisitTotal)}
                trend={noResultsForRange ? 0 : statsData?.trends.otherVisits ?? 0}
              />
              <CardSubtitle>{noResultsForRange || otherVisitTotal === 0 ? 'No bot types detected' : `${otherBots.length} bot types detected`}</CardSubtitle>
              <CardDivider className="mt-5 mb-1.5" />
              <MetricListScroller
                header={
                  <div className="flex items-center gap-2">
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted tracking-wide w-10 text-right">Pages</span>
                  </div>
                }
              >
                {noResultsForRange ? <NoPeriodRows /> : <div className="space-y-1.5">
                  {otherBots.length > 0 ? otherBots.map(bot => (
                  <div key={bot.botType} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                        <BotIcon botType={bot.botType} size="xs" />
                      </div>
                      <span className="text-figma-2xs text-figma-secondary truncate">{botToDisplayName(bot.botType)}</span>
                    </div>
                    <span className="text-figma-2xs font-medium text-figma-primary tabular-nums w-12 text-right">
                      {bot.visitCount > 0 ? formatCompact(bot.visitCount) : '—'}
                    </span>
                    <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                      {bot.uniqueUrls > 0 ? bot.uniqueUrls : '—'}
                    </span>
                  </div>
                  )) : (
                    <span className="text-figma-2xs text-figma-muted">No other bot activity detected.</span>
                  )}
                </div>}
              </MetricListScroller>
            </MetricCard>
          </div>

          {/* ================================================================
              ROW 2 — Recent Bot Activity (moved from Overview)
              ================================================================ */}
          <div id="bot-recent-activity">
            <ContentCard
              title="Recent activity"
              subtitle="Latest crawler activity on your site"
              contentClassName="pt-0"
              headerRight={
              <div className="flex items-center gap-2">
                <FilterSearch
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search..."
                  className="w-[140px]"
                />
                {/* Type Filter */}
                <FilterSelect
                  value={typeFilter}
                  onValueChange={(v) => { setTypeFilter(v as 'all' | 'ai' | 'search' | 'social' | 'other'); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'All types' },
                    { value: 'ai', label: 'AI' },
                    { value: 'search', label: 'Search' },
                    { value: 'social', label: 'Social' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
                {/* Bot Filter */}
                <FilterSelect
                  value={botFilter}
                  onValueChange={(v) => { setBotFilter(v); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'All bots' },
                    ...availableBots.filter(b => b !== 'all').map(b => ({ value: b, label: b })),
                  ]}
                />
                {/* Export */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-7 text-figma-2xs font-medium gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export
                </Button>
              </div>
              }
            >
            {/* Recent Activity Table - using fr units like competitors table */}
            <div className="grid grid-cols-[2fr_3fr_5fr_2fr_2fr_2fr_2fr] gap-2 px-2 py-2 border-b border-figma-border-light">
              <button
                onClick={() => handleSort('visitedAt')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary hover:text-figma-primary transition-colors"
              >
                Time <SortIcon field="visitedAt" />
              </button>
              <button
                onClick={() => handleSort('botType')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary hover:text-figma-primary transition-colors"
              >
                Bot <SortIcon field="botType" />
              </button>
              <button
                onClick={() => handleSort('url')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary hover:text-figma-primary transition-colors"
              >
                Page <SortIcon field="url" />
              </button>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right">Status</span>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right">Time</span>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right">Size</span>
              <span className="text-figma-2xs font-medium text-figma-secondary text-right">Type</span>
            </div>

            {/* Recent Visits Rows */}
            <div className="divide-y divide-figma-border-light">
              {noResultsForRange ? (
                <NoPeriodState onAdjustDateRange={handleAdjustDateRange} />
              ) : recentVisits.length === 0 ? (
                <CardEmptyState
                  icon={Search}
                  title={rawRecentVisits.length === 0 ? 'No crawler activity yet' : 'No matching activity'}
                  description={rawRecentVisits.length === 0
                    ? 'Activity will appear here when bots visit your site.'
                    : 'Try changing your search or filters.'}
                />
              ) : (
                recentVisits.map(visit => {
                  const category = getBotCategory(visit.botType);
                  const categoryIcon = category === 'ai' ? <Bot className="w-3 h-3" />
                    : category === 'search' ? <Search className="w-3 h-3" />
                    : <Globe className="w-3 h-3" />;
                  const categoryLabel = category === 'ai' ? 'AI' : category === 'search' ? 'Search' : category === 'social' ? 'Social' : 'Other';
                  const categoryClasses = category === 'ai'
                    ? 'bg-violet-50 text-violet-600'
                    : category === 'search'
                      ? 'bg-blue-50 text-figma-blue'
                      : category === 'social'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-figma-hover text-figma-muted';

                  const sizeKB = visit.contentLengthBytes
                    ? `${(visit.contentLengthBytes / 1024).toFixed(1)}KB`
                    : '—';

                  return (
                    <div
                      key={visit.id}
                      className="grid grid-cols-[2fr_3fr_5fr_2fr_2fr_2fr_2fr] gap-2 items-center px-2 py-2 hover:bg-figma-hover transition-colors"
                    >
                      <span className="text-figma-xs text-figma-muted">
                        {formatRelativeTime(visit.visitedAt)}
                      </span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                          <BotIcon botType={visit.botType} size="xs" />
                        </div>
                        <span className="text-figma-sm text-figma-primary truncate">{botToDisplayName(visit.botType)}</span>
                      </div>
                      <span className="text-figma-sm text-figma-secondary truncate">{visit.url}</span>
                      <span className={cn(
                        'text-figma-xs font-medium tabular-nums text-right',
                        visit.statusCode === 200 ? 'text-figma-green' : visit.statusCode === 304 ? 'text-figma-blue' : 'text-figma-muted'
                      )}>
                        {visit.statusCode ?? '—'}
                      </span>
                      <span className="text-figma-xs text-figma-muted tabular-nums text-right">
                        {visit.responseTimeMs ? `${visit.responseTimeMs}ms` : '—'}
                      </span>
                      <span className="text-figma-xs text-figma-muted tabular-nums text-right">
                        {sizeKB}
                      </span>
                      <div className="flex justify-end">
                        <span className={cn(
                          'text-figma-2xs font-medium px-1.5 py-0.5 rounded inline-flex items-center gap-1',
                          categoryClasses
                        )}>
                          {categoryIcon}
                          {categoryLabel}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            {!noResultsForRange && (
              <TablePagination
                offset={(currentPage - 1) * pageSize}
                pageSize={pageSize}
                total={totalFiltered}
                onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
                onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              />
            )}
            </ContentCard>
          </div>
          </>)}
        </TabsContent>

        {/* Site Health Tab */}
        <TabsContent value="site-health" forceMount className={activeTab !== 'site-health' ? 'hidden' : ''}>
          <SiteHealthSection
            audit={audit}
            isAuditing={isAuditing}
            initialLoading={healthLoading}
            onRunAudit={runAudit}
            readOnlyDemo={readOnlyDemo}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default BotTrafficPage;
