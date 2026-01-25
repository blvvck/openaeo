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
 * Note: Shows seeded demo data until CDN webhook is configured.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useLocation, useSearch } from 'wouter';
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
  ChevronLeft,
  ChevronRight,
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
import {
  TimeRangeSelector,
  useTimeRange,
  getPeriodLabel,
  type TimeRange,
} from '@/components/charts/time-range-selector';
import { ErrorState } from '@/components/shared/empty-state';
import { EmptyState } from '@/components/shared/empty-state';
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
  Skeleton,
  ChartSkeleton,
  InsightBox,
} from '@/components/shared';

// Chart Components
import { BotTrafficChart } from '@/components/bots/bot-traffic-chart';

// Platform Icon & Bot Constants
import { PlatformIcon, getPlatformInfo, getPlatformColor, AI_BOTS, SEARCH_BOTS, SOCIAL_BOTS } from '@/components/ui/platform-icon';

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
  };
  isDemo?: boolean;
}

interface AIBotStats {
  aiBots: BotStats[];
  totalAIVisits: number;
  isDemo?: boolean;
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
  isDemo?: boolean;
}

interface TopCrawledPage {
  path: string;
  visits: number;
}

// ============================================================================
// Bot to Icon Mapping - derived from constants
// ============================================================================

function botToIcon(botName: string): string | null {
  // Check AI bots
  const aiBot = AI_BOTS.find(b => b.id === botName);
  if (aiBot) return aiBot.icon;

  // Check Search bots
  const searchBot = SEARCH_BOTS.find(b => b.id === botName);
  if (searchBot) return searchBot.icon;

  // Check Social bots
  const socialBot = SOCIAL_BOTS.find(b => b.id === botName);
  if (socialBot) return socialBot.icon;

  return null;
}

// Get display name for a bot (e.g., 'facebookexternalhit' -> 'Facebook')
function botToDisplayName(botId: string): string {
  const aiBot = AI_BOTS.find(b => b.id === botId);
  if (aiBot) return aiBot.name;

  const searchBot = SEARCH_BOTS.find(b => b.id === botId);
  if (searchBot) return searchBot.name;

  const socialBot = SOCIAL_BOTS.find(b => b.id === botId);
  if (socialBot) return socialBot.name;

  return botId; // Fallback to raw ID
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
  // Derive from constants - no hardcoded lists
  if (AI_BOTS.some(b => botType.includes(b.id))) return 'ai';
  if (SEARCH_BOTS.some(b => botType.includes(b.id))) return 'search';
  if (SOCIAL_BOTS.some(b => botType.includes(b.id))) return 'social';
  return 'other';
}

// ============================================================================
// Seeded Demo Data (visit counts for demo mode)
// ============================================================================

// Demo visit counts keyed by bot ID
const DEMO_AI_VISITS: Record<string, { visits: number; pages: number }> = {
  'GPTBot': { visits: 1203, pages: 47 },
  'ChatGPT-User': { visits: 523, pages: 31 },
  'ClaudeBot': { visits: 847, pages: 38 },
  'PerplexityBot': { visits: 412, pages: 29 },
  'Google-Extended': { visits: 285, pages: 24 },
  'Cohere-ai': { visits: 156, pages: 21 },
  'CCBot': { visits: 100, pages: 18 },
};

const DEMO_SEARCH_VISITS: Record<string, { visits: number; pages: number }> = {
  'Googlebot': { visits: 4521, pages: 156 },
  'Bingbot': { visits: 1834, pages: 89 },
  'DuckDuckBot': { visits: 423, pages: 34 },
  'YandexBot': { visits: 287, pages: 28 },
  'Baiduspider': { visits: 156, pages: 19 },
};

const DEMO_SOCIAL_VISITS: Record<string, { visits: number; pages: number }> = {
  'Twitterbot': { visits: 892, pages: 45 },
  'facebookexternalhit': { visits: 634, pages: 38 },
  'LinkedInBot': { visits: 312, pages: 24 },
  'Slackbot': { visits: 178, pages: 16 },
};

const SEEDED_TOP_PAGES: TopCrawledPage[] = [
  { path: '/blog/ai-guide', visits: 234 },
  { path: '/docs/api', visits: 189 },
  { path: '/pricing', visits: 156 },
  { path: '/features', visits: 142 },
  { path: '/blog/case-study', visits: 98 },
];

const SEEDED_RECENT_VISITS: BotVisit[] = [
  { id: 1, botType: 'GPTBot', userAgent: 'GPTBot/1.0', url: '/blog/ai-trends', visitedAt: new Date(Date.now() - 2 * 60000).toISOString(), statusCode: 200, responseTimeMs: 142, contentType: 'text/html', contentLengthBytes: 45231 },
  { id: 2, botType: 'ClaudeBot', userAgent: 'ClaudeBot/1.0', url: '/docs/getting-started', visitedAt: new Date(Date.now() - 5 * 60000).toISOString(), statusCode: 200, responseTimeMs: 89, contentType: 'text/html', contentLengthBytes: 32156 },
  { id: 3, botType: 'Googlebot', userAgent: 'Googlebot/2.1', url: '/pricing', visitedAt: new Date(Date.now() - 12 * 60000).toISOString(), statusCode: 200, responseTimeMs: 67, contentType: 'text/html', contentLengthBytes: 28943 },
  { id: 4, botType: 'PerplexityBot', userAgent: 'PerplexityBot/1.0', url: '/blog/ai-guide', visitedAt: new Date(Date.now() - 15 * 60000).toISOString(), statusCode: 200, responseTimeMs: 156, contentType: 'text/html', contentLengthBytes: 52847 },
  { id: 5, botType: 'GPTBot', userAgent: 'GPTBot/1.0', url: '/features', visitedAt: new Date(Date.now() - 23 * 60000).toISOString(), statusCode: 200, responseTimeMs: 78, contentType: 'text/html', contentLengthBytes: 31256 },
  { id: 6, botType: 'ClaudeBot', userAgent: 'ClaudeBot/1.0', url: '/blog/case-study', visitedAt: new Date(Date.now() - 35 * 60000).toISOString(), statusCode: 200, responseTimeMs: 134, contentType: 'text/html', contentLengthBytes: 48923 },
  { id: 7, botType: 'Google-Extended', userAgent: 'Google-Extended', url: '/docs/api', visitedAt: new Date(Date.now() - 42 * 60000).toISOString(), statusCode: 200, responseTimeMs: 112, contentType: 'text/html', contentLengthBytes: 67432 },
  { id: 8, botType: 'GPTBot', userAgent: 'GPTBot/1.0', url: '/about', visitedAt: new Date(Date.now() - 58 * 60000).toISOString(), statusCode: 200, responseTimeMs: 45, contentType: 'text/html', contentLengthBytes: 18234 },
  { id: 9, botType: 'PerplexityBot', userAgent: 'PerplexityBot/1.0', url: '/pricing', visitedAt: new Date(Date.now() - 65 * 60000).toISOString(), statusCode: 304, responseTimeMs: 23, contentType: null, contentLengthBytes: 0 },
  { id: 10, botType: 'Bingbot', userAgent: 'bingbot/2.0', url: '/blog/ai-trends', visitedAt: new Date(Date.now() - 78 * 60000).toISOString(), statusCode: 200, responseTimeMs: 167, contentType: 'text/html', contentLengthBytes: 45231 },
  { id: 11, botType: 'Twitterbot', userAgent: 'Twitterbot/1.0', url: '/blog/ai-guide', visitedAt: new Date(Date.now() - 85 * 60000).toISOString(), statusCode: 200, responseTimeMs: 98, contentType: 'text/html', contentLengthBytes: 52847 },
  { id: 12, botType: 'facebookexternalhit', userAgent: 'facebookexternalhit/1.1', url: '/features', visitedAt: new Date(Date.now() - 92 * 60000).toISOString(), statusCode: 200, responseTimeMs: 76, contentType: 'text/html', contentLengthBytes: 31256 },
];

// ============================================================================
// Site Health Types (from shared)
// ============================================================================

import type {
  HealthStatus,
  CheckStatus,
  SiteHealthAudit,
  SiteHealthAuditResponse,
  SiteHealthStatusResponse,
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

  // Check for cached audit on mount
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

  return { audit, isAuditing, initialLoading, runAudit };
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
// Integration Banner
// ============================================================================

interface IntegrationBannerProps {
  onNavigate: () => void;
  onDismiss?: () => void;
}

function IntegrationBanner({ onNavigate }: IntegrationBannerProps) {
  return (
    <div className="bg-figma-blue-light border border-figma-blue/20 rounded-xl p-4 mb-6 flex items-start gap-3">
      <Info className="w-5 h-5 text-figma-blue shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-figma-sm font-medium text-figma-primary">
          Connect your CDN to track real bot traffic
        </p>
        <p className="text-figma-xs text-figma-secondary mt-1">
          Currently showing demo data. Set up the webhook to see actual AI crawler activity on your site.
        </p>
      </div>
      <button
        onClick={onNavigate}
        className="text-figma-sm font-medium text-figma-blue hover:underline shrink-0"
      >
        Go to Settings
      </button>
    </div>
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
function handleCheckAction(action: { label: string; type: string; value: string }) {
  if (action.type === 'link') {
    window.open(action.value.startsWith('http') ? action.value : `https://${action.value}`, '_blank');
  } else if (action.type === 'copy') {
    navigator.clipboard.writeText(action.value);
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

function AuditProgressIndicator() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % AUDIT_STEPS.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center py-12">
      <Loader2 className="w-8 h-8 text-figma-blue mx-auto mb-4 animate-spin" />
      <p className="text-figma-sm text-figma-secondary transition-opacity duration-300">
        {AUDIT_STEPS[stepIndex]}
      </p>
    </div>
  );
}

interface SiteHealthSectionProps {
  audit: SiteHealthAudit | null;
  isAuditing: boolean;
  initialLoading: boolean;
  onRunAudit: () => void;
}

function SiteHealthSection({ audit, isAuditing, initialLoading, onRunAudit }: SiteHealthSectionProps) {
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

  // Audit in progress — rotate through check descriptions
  if (isAuditing) {
    return <AuditProgressIndicator />;
  }

  // No audit run yet — empty state
  if (!audit) {
    return (
      <EmptyState
        icon={SearchCheck}
        title="How visible are you to AI?"
        description="Check your llms.txt, robots.txt, sitemap, and schema markup to see how AI crawlers find and understand your content."
        primaryAction={{ label: 'Run audit', onClick: onRunAudit }}
      />
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
          gridCols="grid-cols-[1fr_80px_1fr_80px]"
          columns={[
            { label: 'CHECK' },
            { label: 'STATUS' },
            { label: 'DETAILS' },
            { label: 'ACTION', align: 'right' },
          ]}
        />
        <div className="space-y-0">
          {checks.map(check => (
            <div
              key={check.id}
              className="grid grid-cols-[1fr_80px_1fr_80px] gap-3 items-center py-3 px-2 border-b border-figma-border-light last:border-0"
            >
              <span className="text-figma-sm text-figma-primary">{check.name}</span>
              <div className="flex justify-center">
                {getCheckIcon(check.status)}
              </div>
              <span className="text-figma-sm text-figma-secondary truncate">{check.details}</span>
              <div className="flex justify-end">
                {check.action && (
                  <button
                    onClick={() => handleCheckAction(check.action!)}
                    className="text-figma-xs font-medium text-figma-blue hover:underline"
                  >
                    {check.action.label}
                  </button>
                )}
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
                      {rec.impact} impact
                    </span>
                    {rec.actions?.map(action => (
                      <button
                        key={action.label}
                        onClick={() => handleCheckAction(action)}
                        className="text-figma-xs font-medium text-figma-blue hover:underline"
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
  const [, navigate] = useLocation();
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');

  // Get initial tab from URL
  const urlParams = new URLSearchParams(search);
  const tabParam = urlParams.get('tab');
  const initialTab = tabParam === 'by-type' ? 'by-type' : tabParam === 'site-health' ? 'site-health' : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [botFilter, setBotFilter] = useState<string>('all');

  // Site health audit
  const { audit, isAuditing, initialLoading: healthLoading, runAudit } = useSiteHealth();

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

  // Check if date range includes today (for demo data display)
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const rangeIncludesToday = range.to >= today || range.to.toDateString() === new Date().toDateString();

  // Raw recent visits - only show seeded demo data if range includes today
  const hasRealData = recentData?.visits?.length && recentData.visits.length > 0;
  const rawRecentVisits = hasRealData
    ? recentData.visits
    : (rangeIncludesToday ? SEEDED_RECENT_VISITS : []);

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

  const handleNavigateSettings = () => {
    navigate('/app/settings/integrations');
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

  // Use API data or fallback to demo data (only if range includes today)
  // Guarded with defaults so they don't crash during loading
  const isDemo = statsData?.cdnConfigured === true ? false : (statsData?.totalVisits === 0 || !statsData);
  const showDemoData = isDemo && rangeIncludesToday;
  const allBots = statsData?.byBot || [];

  // Always show all supported bots from constants - merge with real/demo data
  const aiBots: BotStats[] = AI_BOTS.map(bot => {
    const real = aiBotsData?.aiBots?.find(b => b.botType === bot.id);
    const demo = DEMO_AI_VISITS[bot.id];
    return {
      botType: bot.id,
      category: 'ai',
      visitCount: real?.visitCount ?? (showDemoData ? demo?.visits ?? 0 : 0),
      uniqueUrls: real?.uniqueUrls ?? (showDemoData ? demo?.pages ?? 0 : 0),
      lastVisit: real?.lastVisit ?? new Date().toISOString(),
    };
  });

  const searchBots: BotStats[] = SEARCH_BOTS.map(bot => {
    const real = allBots.find(b => b.botType === bot.id);
    const demo = DEMO_SEARCH_VISITS[bot.id];
    return {
      botType: bot.id,
      category: 'search',
      visitCount: real?.visitCount ?? (showDemoData ? demo?.visits ?? 0 : 0),
      uniqueUrls: real?.uniqueUrls ?? (showDemoData ? demo?.pages ?? 0 : 0),
      lastVisit: real?.lastVisit ?? new Date().toISOString(),
    };
  });

  const socialBots: BotStats[] = SOCIAL_BOTS.map(bot => {
    const real = allBots.find(b => b.botType === bot.id);
    const demo = DEMO_SOCIAL_VISITS[bot.id];
    return {
      botType: bot.id,
      category: 'social',
      visitCount: real?.visitCount ?? (showDemoData ? demo?.visits ?? 0 : 0),
      uniqueUrls: real?.uniqueUrls ?? (showDemoData ? demo?.pages ?? 0 : 0),
      lastVisit: real?.lastVisit ?? new Date().toISOString(),
    };
  });

  const otherBots = allBots.filter(b => getBotCategory(b.botType) === 'other');

  // Calculate totals
  const totalAIVisits = aiBots.reduce((sum, b) => sum + b.visitCount, 0);
  const uniquePages = aiBots.reduce((sum, b) => sum + b.uniqueUrls, 0);
  const hasData = totalAIVisits > 0 || rawRecentVisits.length > 0;

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
  const displayTopPages = topPages.length ? topPages : (showDemoData ? SEEDED_TOP_PAGES : []);

  // Top bot's pages (filter recent visits by top bot type)
  const topBotVisits = (rawRecentVisits.length > 0 ? rawRecentVisits : (showDemoData ? SEEDED_RECENT_VISITS : []))
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

  // Calculate trend (mock for demo)
  const trend = showDemoData ? 23.4 : (statsData?.aiVisits || 0) > 0 ? 12.5 : 0;
  const topBotTrend = showDemoData ? 18.2 : 0;
  const pagesTrend = showDemoData ? 12.5 : 0;

  // Last seen time per bot (for Latest Activity card — all bot types)
  const allBotsList = [...AI_BOTS, ...SEARCH_BOTS, ...SOCIAL_BOTS];
  const recentVisitsSource = rawRecentVisits.length > 0 ? rawRecentVisits : (showDemoData ? SEEDED_RECENT_VISITS : []);
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
            {activeTab === 'site-health' && (
              <Button
                variant="outline"
                size="sm"
                onClick={runAudit}
                disabled={isAuditing}
                className="gap-1.5 text-figma-sm font-medium"
              >
                {isAuditing && <Loader2 className="w-4 h-4 animate-spin" />}
                {isAuditing ? 'Running...' : audit ? 'Re-run audit' : 'Run audit'}
              </Button>
            )}
            <TimeRangeSelector value={range} onChange={handleTimeRangeChange} />
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

      {/* Integration Banner — inside tab content, after tab line */}
      {isDemo && (
        <IntegrationBanner onNavigate={handleNavigateSettings} />
      )}

      {/* ================================================================
          ROW 1 — 4 Metric Cards (horizontal scroll, matching competitors)
          ================================================================ */}
      <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hover mb-8 -mr-6 pr-6">
        {/* Card 1: Total AI Visits */}
        <div className="w-[260px] flex-shrink-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Total AI visits</CardLabel>
              <InfoTooltip content="Total page visits from AI crawlers in this time period" />
            </div>
            {hasData ? (
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
            <CardDivider className="mt-5 mb-3" />
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-12 text-right">Visits</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">%</span>
              </div>
              <div className="space-y-1.5">
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
              </div>
            </div>
          </MetricCard>
        </div>

        {/* Card 2: Pages Crawled */}
        <div className="w-[260px] flex-shrink-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Pages crawled</CardLabel>
              <InfoTooltip content="Number of unique URLs visited by AI crawlers" />
            </div>
            {hasData ? (
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
            <CardDivider className="mt-5 mb-3" />
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                <span className="text-figma-2xs font-medium text-figma-muted flex-1">Page</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">Visits</span>
              </div>
              <div className="space-y-1.5">
                {hasData ? (
                  displayTopPages.slice(0, 4).map(page => (
                    <div key={page.path} className="flex items-center gap-2">
                      <span className="text-figma-2xs text-figma-secondary truncate flex-1 min-w-0">{page.path}</span>
                      <span className="text-figma-2xs font-medium text-figma-primary tabular-nums w-10 text-right">
                        {page.visits}
                      </span>
                    </div>
                  ))
                ) : (
                  ['/page-1', '/page-2', '/page-3', '/page-4'].map(path => (
                    <div key={path} className="flex items-center gap-2">
                      <span className="text-figma-2xs text-figma-muted truncate flex-1 min-w-0">{path}</span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">—</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </MetricCard>
        </div>

        {/* Card 3: Top AI Bot */}
        <div className="w-[260px] flex-shrink-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Top AI bot</CardLabel>
              <InfoTooltip content="The AI crawler with the most visits this period" />
            </div>
            {hasData ? (
              <>
                <div className="h-[38px] flex items-center mt-2 mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="self-center"><BotIcon botType={topBot.botType} size="md" /></span>
                    <span className="text-figma-lg font-bold text-figma-primary leading-none">{botToDisplayName(topBot.botType)}</span>
                    <span className={cn(
                      'text-figma-base font-semibold tabular-nums',
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
            <CardDivider className="mt-5 mb-3" />
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                <span className="text-figma-2xs font-medium text-figma-muted flex-1">Page</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-8 text-right">Visits</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-16 text-right">Last crawl</span>
              </div>
              <div className="space-y-1.5">
                {hasData ? (
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
                  ['/page-1', '/page-2', '/page-3', '/page-4'].map(path => (
                    <div key={path} className="flex items-center gap-2">
                      <span className="text-figma-2xs text-figma-muted truncate flex-1 min-w-0">{path}</span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-8 text-right">—</span>
                      <span className="text-figma-2xs text-figma-muted tabular-nums w-16 text-right">—</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </MetricCard>
        </div>

        {/* Card 4: Latest Crawl Activity */}
        <div className="w-[260px] flex-shrink-0">
          <MetricCard>
            <div className="flex items-center">
              <CardLabel>Latest activity</CardLabel>
              <InfoTooltip content="When AI crawlers last visited your site" />
            </div>
            {hasData ? (
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
            <CardDivider className="mt-5 mb-3" />
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                <span className="text-figma-2xs font-medium text-figma-muted w-16 text-right">When</span>
              </div>
              <div className="space-y-1.5">
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
              </div>
            </div>
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
          <BotTrafficChart
            bots={aiBotsWithPercent}
            timeRange={range}
            height={280}
          />
        </ContentCard>
      </div>

      {/* ================================================================
          ROW 3 — Bot Breakdown + Top Crawled Pages
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Left: AI Bot Breakdown */}
        <ContentCard
          title="AI bot breakdown"
          subtitle="Visits by AI crawler"
          footer={
            <InsightBox variant="muted">
              {topBot.botType} is your most active AI crawler, accounting for {aiBotsWithPercent[0]?.percentage || 0}% of visits.
            </InsightBox>
          }
        >
          <div className="space-y-0">
            {/* Table Header */}
            <TableHeader
              gridCols="grid-cols-[1fr_80px_60px]"
              columns={[
                { label: 'BOT' },
                { label: 'VISITS', align: 'right' },
                { label: '%', align: 'right' },
              ]}
            />
            {/* Rows */}
            {aiBotsWithPercent.map(bot => (
              <div
                key={bot.botType}
                className="grid grid-cols-[1fr_80px_60px] gap-3 items-center py-2.5 px-2 border-b border-figma-border-light last:border-0"
              >
                <div className="flex items-center gap-2">
                  <BotIcon botType={bot.botType} size="sm" />
                  <span className="text-figma-sm text-figma-primary">{botToDisplayName(bot.botType)}</span>
                </div>
                <span className="text-figma-sm font-medium text-figma-primary tabular-nums text-right">
                  {bot.visitCount.toLocaleString()}
                </span>
                <span className="text-figma-xs text-figma-muted tabular-nums text-right">
                  {bot.percentage}%
                </span>
              </div>
            ))}
          </div>
        </ContentCard>

        {/* Right: Top Crawled Pages */}
        <ContentCard
          title="Top crawled pages"
          subtitle="Most visited URLs by AI bots"
          onAction={() => navigate('/app/bots')}
          footer={(() => {
            // Calculate insight based on content type
            const blogCount = displayTopPages.filter(p => p.path.includes('/blog')).reduce((s, p) => s + p.visits, 0);
            const docsCount = displayTopPages.filter(p => p.path.includes('/docs')).reduce((s, p) => s + p.visits, 0);
            const ratio = blogCount > 0 && docsCount > 0 ? (blogCount / docsCount).toFixed(1) : null;

            let insight = `${displayTopPages[0]?.path} is your most indexed page by AI bots.`;
            if (blogCount > docsCount && ratio) {
              insight = `Blog content gets ${ratio}x more AI crawls than documentation.`;
            } else if (docsCount > blogCount) {
              insight = 'Documentation is your most crawled content category.';
            }

            return <InsightBox variant="muted">{insight}</InsightBox>;
          })()}
        >
          <div className="space-y-0">
            {/* Table Header */}
            <TableHeader
              gridCols="grid-cols-[1fr_80px]"
              columns={[
                { label: 'PAGE' },
                { label: 'VISITS', align: 'right' },
              ]}
            />
            {/* Rows */}
            {displayTopPages.map(page => (
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
                value={formatCompact(totalAIVisits)}
                trend={trend}
              />
              <CardSubtitle>{aiBots.filter(b => b.visitCount > 0).length} crawlers active</CardSubtitle>
              <CardDivider className="mt-5 mb-3" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                  <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">Pages</span>
                </div>
                <div className="space-y-1.5">
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
                </div>
              </div>
            </MetricCard>

            {/* Card 2: Search Bots */}
            <MetricCard>
              <CardLabel>Search bots</CardLabel>
              <StatMetric
                value={formatCompact(showDemoData ? searchBots.reduce((sum, b) => sum + b.visitCount, 0) : (statsData?.searchVisits || 0))}
                trend={showDemoData ? 8.3 : 0}
              />
              <CardSubtitle>{searchBots.filter(b => b.visitCount > 0).length} crawlers active</CardSubtitle>
              <CardDivider className="mt-5 mb-3" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                  <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">Pages</span>
                </div>
                <div className="space-y-1.5">
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
                </div>
              </div>
            </MetricCard>

            {/* Card 3: Social Bots */}
            <MetricCard>
              <CardLabel>Social bots</CardLabel>
              <StatMetric
                value={formatCompact(showDemoData ? socialBots.reduce((sum, b) => sum + b.visitCount, 0) : (statsData?.socialVisits || 0))}
                trend={showDemoData ? 5.1 : 0}
              />
              <CardSubtitle>{socialBots.filter(b => b.visitCount > 0).length} crawlers active</CardSubtitle>
              <CardDivider className="mt-5 mb-3" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                  <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">Pages</span>
                </div>
                <div className="space-y-1.5">
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
                </div>
              </div>
            </MetricCard>

            {/* Card 4: Other Bots */}
            <MetricCard>
              <CardLabel>Other bots</CardLabel>
              <StatMetric
                value={formatCompact(statsData?.otherVisits || 0)}
                trend={showDemoData ? -2.4 : 0}
              />
              <CardSubtitle>{otherBots.length} bot types detected</CardSubtitle>
              <CardDivider className="mt-5 mb-3" />
              <div className="flex-1 overflow-y-auto scrollbar-none">
                <div className="flex items-center gap-2 pb-1.5 mb-1.5 border-b border-figma-border-light sticky top-0 bg-white">
                  <span className="text-figma-2xs font-medium text-figma-muted flex-1">Bot</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-12 text-right">Visits</span>
                  <span className="text-figma-2xs font-medium text-figma-muted w-10 text-right">Pages</span>
                </div>
                <div className="space-y-1.5">
                  {otherBots.length > 0 ? otherBots.map(bot => (
                  <div key={bot.botType} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <div className="w-3 h-3 shrink-0 flex items-center justify-center">
                        <BotIcon botType={bot.botType} size="xs" />
                      </div>
                      <span className="text-figma-2xs text-figma-secondary truncate">{botToDisplayName(bot.botType)}</span>
                    </div>
                    <span className="text-figma-2xs font-medium text-figma-primary tabular-nums w-12 text-right">
                      {formatCompact(bot.visitCount)}
                    </span>
                    <span className="text-figma-2xs text-figma-muted tabular-nums w-10 text-right">
                      {bot.uniqueUrls}
                    </span>
                  </div>
                  )) : (
                    <span className="text-figma-2xs text-figma-muted">Monitors, scanners, misc crawlers</span>
                  )}
                </div>
              </div>
            </MetricCard>
          </div>

          {/* ================================================================
              ROW 2 — Recent Bot Activity (moved from Overview)
              ================================================================ */}
          <ContentCard
            title="Recent activity"
            subtitle="Latest crawler activity on your site"
            headerRight={
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-figma-muted" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="h-7 w-[140px] pl-7 text-figma-xs"
                  />
                </div>
                {/* Type Filter */}
                <Select value={typeFilter} onValueChange={(v: 'all' | 'ai' | 'search' | 'social' | 'other') => { setTypeFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[90px] h-7 text-figma-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-figma-xs">All types</SelectItem>
                    <SelectItem value="ai" className="text-figma-xs">AI</SelectItem>
                    <SelectItem value="search" className="text-figma-xs">Search</SelectItem>
                    <SelectItem value="social" className="text-figma-xs">Social</SelectItem>
                    <SelectItem value="other" className="text-figma-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
                {/* Bot Filter */}
                <Select value={botFilter} onValueChange={(v) => { setBotFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[110px] h-7 text-figma-xs">
                    <SelectValue placeholder="Bot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-figma-xs">All bots</SelectItem>
                    {availableBots.filter(b => b !== 'all').map(bot => (
                      <SelectItem key={bot} value={bot} className="text-figma-xs">
                        {bot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Export */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="h-7 text-figma-xs font-medium gap-1"
                >
                  <Download className="w-3 h-3" />
                  Export
                </Button>
              </div>
            }
          >
            {/* Recent Activity Table - using fr units like competitors table */}
            <div className="grid grid-cols-[2fr_3fr_5fr_2fr_2fr_2fr_2fr] gap-2 px-2 py-2 border-b border-figma-border-light bg-figma-hover rounded-t-lg">
              <button
                onClick={() => handleSort('visitedAt')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary uppercase hover:text-figma-primary transition-colors"
              >
                TIME <SortIcon field="visitedAt" />
              </button>
              <button
                onClick={() => handleSort('botType')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary uppercase hover:text-figma-primary transition-colors"
              >
                BOT <SortIcon field="botType" />
              </button>
              <button
                onClick={() => handleSort('url')}
                className="flex items-center gap-1 text-figma-2xs font-medium text-figma-secondary uppercase hover:text-figma-primary transition-colors"
              >
                PAGE <SortIcon field="url" />
              </button>
              <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">STATUS</span>
              <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">TIME</span>
              <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">SIZE</span>
              <span className="text-figma-2xs font-medium text-figma-secondary uppercase text-right">TYPE</span>
            </div>

            {/* Recent Visits Rows */}
            <div className="divide-y divide-figma-border-light">
              {recentVisits.length === 0 ? (
                <div className="grid grid-cols-[2fr_3fr_5fr_2fr_2fr_2fr_2fr] gap-2 items-center px-2 py-2 text-figma-muted">
                  <span>—</span>
                  <span>—</span>
                  <span>—</span>
                  <span className="text-right">—</span>
                  <span className="text-right">—</span>
                  <span className="text-right">—</span>
                  <span className="text-right">—</span>
                </div>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-figma-border-light">
                <span className="text-figma-xs text-figma-muted">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-7 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-7 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </ContentCard>
          </>)}
        </TabsContent>

        {/* Site Health Tab */}
        <TabsContent value="site-health" forceMount className={activeTab !== 'site-health' ? 'hidden' : ''}>
          <SiteHealthSection
            audit={audit}
            isAuditing={isAuditing}
            initialLoading={healthLoading}
            onRunAudit={runAudit}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default BotTrafficPage;
