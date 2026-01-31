import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * Dashboard Page — 6-Row Narrative Layout
 *
 * Row 1 (hero):  [Visibility Score: col-span-2] [Mention Velocity] [Citations]
 * Row 2 (map):   [Competitive Position] [LLM mentions]
 * Row 3 (intel): [Top Prompts] [Competitor Rankings]
 * Row 4 (proof): [Citation Sources] [Sentiment Signal]
 * Row 5 (trend): [Trending Topics: full width]
 * Row 6 (action): [Compact alerts bar: full width]
 *
 * Route: /app/dashboard
 */

import { useLocation } from 'wouter';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Telescope,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCompact, formatRankBadge } from '@/lib/formatters';
import { DEMO_CONFIG, APP_CONFIG } from '@/config/app';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { VisibilityScoreRing } from '@/components/charts/visibility-score-ring';
import { PlatformIcon, PLATFORMS, getPlatformInfo } from '@/components/ui/platform-icon';
import { TimeRangeSelector, useTimeRange, getPeriodLabel, type TimeRange } from '@/components/charts/time-range-selector';
import { getSeriesColor } from '@/components/charts/chart-theme';
import { PlatformPerformanceChart } from '@/components/charts/platform-performance-chart';
import { ErrorState as SharedErrorState } from '@/components/shared/empty-state';
import { OnboardingChecklist, type OnboardingStep } from '@/components/onboarding/onboarding-checklist';
import { useOnboarding } from '@/hooks/use-onboarding';
import {
  Skeleton,
} from '@/components/shared/skeleton-loader';
import { PageHeader, StaleDataWarning } from '@/components/shared';

// Dashboard card components + co-located skeletons
import {
  TopPromptCard,
  TopPromptCardSkeleton,
  BotVisitsCard,
  BotVisitsCardSkeleton,
  CitationRateCard,
  CitationRateCardSkeleton,
  CitationSourcesCard,
  CitationSourcesCardSkeleton,
  SentimentSignalCard,
  SentimentSignalCardSkeleton,
  PlatformCoverageCard,
  PlatformCoverageCardSkeleton,
  VisibilityHeroCard,
  VisibilityHeroCardSkeleton,
} from '@/components/dashboard';

// Competitor components
import { CompetitorLeaderboard, CompetitorLeaderboardSkeleton } from '@/components/competitors/competitor-leaderboard';

// Types
import type {
  DashboardResponse,
  PlatformScore,
  CompetitorRank,
  RecentAlertsResponse,
  TopInsightsResponse,
} from '@shared/types';

// ============================================================================
// API Hooks
// ============================================================================

function useDashboardData(range: TimeRange) {
  return useQuery<DashboardResponse>({
    queryKey: ['dashboard', range.preset, range.from.toISOString(), range.to.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({ timeRange: range.preset });
      if (range.preset === 'custom') {
        params.set('startDate', range.from.toISOString());
        params.set('endDate', range.to.toISOString());
      }
      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load dashboard');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData, // Keep showing old data while new data loads
    retry: 2,
  });
}

function useRecentAlerts() {
  return useQuery<RecentAlertsResponse>({
    queryKey: ['alerts', 'recent'],
    queryFn: async () => {
      const res = await fetch('/api/alerts/recent?limit=5');
      if (!res.ok) {
        throw new Error('Failed to load alerts');
      }
      return res.json();
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

function useTopInsights() {
  return useQuery<TopInsightsResponse>({
    queryKey: ['insights', 'top'],
    queryFn: async () => {
      const res = await fetch('/api/insights/top?limit=3');
      if (!res.ok) {
        throw new Error('Failed to load insights');
      }
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// ============================================================================
// Empty States
// ============================================================================

interface WelcomeEmptyStateProps {
  onSetupBrand: () => void;
  onTakeTour: () => void;
}

function WelcomeEmptyState({ onSetupBrand, onTakeTour }: WelcomeEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 p-6 bg-primary-100 rounded-full">
        <Telescope className="w-16 h-16 text-primary" />
      </div>
      <h1 className="text-3xl font-bold mb-2">Welcome to {APP_CONFIG.fullName}</h1>
      <p className="text-lg text-muted-foreground mb-4">
        Let&apos;s set up your brand tracking in just a few minutes.
      </p>
      <div className="text-muted-foreground mb-8 max-w-md">
        <p className="mb-2">We&apos;ll help you:</p>
        <ul className="text-left list-disc list-inside space-y-1">
          <li>Track how AI platforms talk about your brand</li>
          <li>Monitor your competitors</li>
          <li>Get alerts when things change</li>
        </ul>
      </div>
      <div className="flex gap-4">
        <Button size="lg" onClick={onSetupBrand}>
          Set up your brand
        </Button>
        <Button variant="outline" size="lg" onClick={onTakeTour}>
          Take a quick tour
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-4">Takes about 3 minutes</p>
    </div>
  );
}


// ============================================================================
// Main Dashboard Component
// ============================================================================

export function DashboardPage() {
  const [, navigate] = useLocation();
  const { range, setRange } = useTimeRange('7d');

  // Data fetching
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isFetching: dashboardFetching,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardData(range);

  // Refreshing = has data but fetching new (for visual feedback)
  const isRefreshing = dashboardFetching && !dashboardLoading;

  const {
    data: alertsData,
  } = useRecentAlerts();

  const {
    data: insightsData,
  } = useTopInsights();

  // Onboarding state
  const { completedSteps, dismissed, markComplete, dismiss, isComplete } = useOnboarding();

  // Handlers
  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  const handleSetupBrand = () => {
    navigate('/app/settings/brand');
  };

  const handleTakeTour = () => {
    console.log('Start tour');
  };

  const handleCompetitorClick = () => {
    navigate('/app/competitors');
  };

  const handlePlatformClick = (platformId: string) => {
    navigate(`/app/visibility?platform=${platformId}`);
  };

  const handleRetryAll = () => {
    refetchDashboard();
  };

  // Convert onboarding steps from API format
  const onboardingSteps: OnboardingStep[] = dashboardData?.onboarding?.steps?.map(step => ({
    id: step.id,
    title: step.title,
    completed: step.complete,
    action: () => navigate(step.href),
  })) || [];

  // Error state (non-loading)
  if (dashboardError && !dashboardLoading) {
    const errorMessage = dashboardError instanceof Error
      ? dashboardError.message
      : 'Failed to load dashboard';

    if (errorMessage.includes('No brand configured') || errorMessage.includes('NO_BRAND')) {
      return (
        <main role="main" aria-label="Dashboard">
          <WelcomeEmptyState
            onSetupBrand={handleSetupBrand}
            onTakeTour={handleTakeTour}
          />
        </main>
      );
    }

    return (
      <main role="main" aria-label="Dashboard">
        <SharedErrorState
          title="Couldn't load dashboard"
          error={errorMessage}
          onRetry={handleRetryAll}
        />
      </main>
    );
  }

  // Derive data with safe defaults for loading state
  const isPending = dashboardData?.meta?.dataFreshness === 'pending';
  const displayName = dashboardData?.brandName || DEMO_CONFIG.brandName;
  const competitors = dashboardData?.competitors ?? [];
  const you = competitors.find(c => c.isYou);
  const rankBadge = you ? formatRankBadge(you.rank, competitors.length) : null;

  return (
    <main role="main" aria-label="Dashboard" aria-busy={dashboardLoading || undefined}>
      {/* Page Header */}
      <PageHeader
        title={`Welcome, ${DEMO_CONFIG.user.name.split(' ')[0]}`}
        subtitle={`Here's how ${displayName} is performing on answer engines`}
        action={
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="flex items-center gap-2 text-figma-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-figma-xs">Updating...</span>
              </div>
            )}
            {dashboardLoading ? (
              <Skeleton className="h-9 w-32 rounded-lg" />
            ) : (
              <TimeRangeSelector value={range} onChange={handleTimeRangeChange} />
            )}
          </div>
        }
        responsive={false}
      />

      {/* Stale data warning */}
      {!dashboardLoading && dashboardData?.meta && (
        <StaleDataWarning cacheAge={dashboardData.meta.cacheAge} onRefresh={handleRetryAll} />
      )}

      {/* Main content - dims when refreshing to indicate data is updating */}
      <div className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60')}>
      {/* ================================================================
          ROW 1 — Visibility Score (wider) + Top Prompt + Citation Rate + Bot Visits
          ================================================================ */}
      {dashboardLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
        </div>
      ) : (<>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-6 mb-8">
        <VisibilityHeroCard
          score={dashboardData!.visibility.score}
          previousScore={dashboardData!.visibility.previousScore}
          platforms={dashboardData!.platforms}
          competitors={competitors}
          isPending={isPending}
          rankBadge={rankBadge}
          onClick={() => navigate('/app/visibility')}
        />
        <TopPromptCard
          prompt={dashboardData!.mentions.topTrigger?.promptText ?? 'No prompts yet'}
          mentionCount={dashboardData!.mentions.promptCount}
          mentionTrend={dashboardData!.mentions.trend}
          platforms={dashboardData!.platforms.slice(0, 5).map(p => ({
            id: p.id,
            percentage: dashboardData!.metrics.totalMentions > 0 ? Math.round((p.mentions / dashboardData!.metrics.totalMentions) * 100) : 0,
            count: p.mentions,
          }))}
          onClick={() => navigate('/app/prompts')}
        />
        {(() => {
          const totalCitations = dashboardData!.citationSources.owned.count + dashboardData!.citationSources.thirdParty.count + dashboardData!.citationSources.social.count;
          const citationRate = dashboardData!.metrics.totalMentions > 0 ? Math.round((totalCitations / dashboardData!.metrics.totalMentions) * 100) : 0;
          return (
            <CitationRateCard
              rate={citationRate}
              trend={dashboardData!.metrics.mentionsTrend}
              sources={dashboardData!.citationSources}
              onClick={() => navigate('/app/citations')}
            />
          );
        })()}
        <BotVisitsCard
          total={formatCompact(dashboardData!.botVisits.total)}
          trend={dashboardData!.botVisits.trend}
          period={getPeriodLabel(range.preset)}
          bots={dashboardData!.botVisits.bots.slice(0, 5).map(b => ({
            id: b.id === 'ai_mode' || b.id === 'ai_overview' ? 'gemini' : b.id,
            name: b.name,
            percentage: b.percentage,
            count: formatCompact(b.count),
          }))}
          onClick={() => navigate('/app/visibility')}
        />
      </div>

      {/* ================================================================
          ROW 2 — Intel: Platform Coverage + Competitor Rankings
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PlatformCoverageCard
          className=""
          subtitle={dashboardData!.cardSubtitles?.llmMentions}
          platforms={dashboardData!.platforms.map(p => ({
            id: p.id,
            name: getPlatformInfo(p.id).name,
            score: p.score,
            mentions: p.mentions || 0,
            citations: p.citations,
            sentiment: p.sentiment,
          }))}
          onPlatformClick={handlePlatformClick}
          onClick={() => navigate('/app/visibility')}
        />
        <Card className="flex flex-col border-figma-border rounded-xl bg-figma-card min-w-0 overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-figma-md font-semibold text-figma-primary leading-tight">Competitor rankings</span>
                <span className="text-figma-xs font-normal text-figma-secondary mt-0.5 truncate max-w-[220px] block">
                  {dashboardData!.cardSubtitles?.competitorRankings || 'Your position in the market'}
                </span>
              </div>
              <button
                onClick={handleCompetitorClick}
                className="inline-flex items-center gap-0.5 text-figma-sm font-normal text-figma-blue hover:underline transition-all"
              >
                View competitors
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <div className="mx-5 border-b border-figma-border-light" />
          <CardContent className="flex-1 pt-0 px-5 pb-5 overflow-hidden">
            <CompetitorLeaderboard
              data={isPending ? [] : competitors.map(c => ({
                rank: c.rank,
                id: c.id,
                name: c.name,
                score: c.score,
                trend: c.trend,
                isYou: c.isYou,
                topPlatforms: c.topPlatforms,
              }))}
              onRowClick={isPending ? undefined : () => handleCompetitorClick()}
              isEmpty={isPending || competitors.length === 0}
              brandName={displayName}
            />
          </CardContent>
        </Card>
      </div>

      {/* ================================================================
          ROW 3 — Market: Citation Sources + Sentiment Signal
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <CitationSourcesCard
          subtitle={dashboardData!.cardSubtitles?.citationSources}
          sources={dashboardData!.citationSourcesList.slice(0, 5).map((s, i) => ({
            id: String(i + 1),
            domain: s.domain,
            count: s.citationCount,
            sentiment: (s.sentiment === 'positive' || s.sentiment === 'negative' ? s.sentiment : 'neutral') as 'positive' | 'neutral' | 'negative',
            platforms: s.platforms ?? dashboardData!.platforms.slice(0, Math.max(2, 4 - i)).map(p => p.id),
          }))}
          onClick={() => navigate('/app/citations')}
        />
        <SentimentSignalCard
          subtitle={dashboardData!.cardSubtitles?.sentimentSignal}
          trend={dashboardData!.sentiment.trend}
          positive={dashboardData!.sentiment.positive}
          neutral={dashboardData!.sentiment.neutral}
          negative={dashboardData!.sentiment.negative}
          totalMentions={dashboardData!.metrics.totalMentions}
          platformSentiment={dashboardData!.sentiment.platformSentiment}
          quote={dashboardData!.sentiment.sampleQuote ? {
            text: dashboardData!.sentiment.sampleQuote.text,
            platform: dashboardData!.sentiment.sampleQuote.platform,
            date: new Date(dashboardData!.sentiment.sampleQuote.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          } : { text: 'No quotes available yet', platform: 'N/A', date: '' }}
          onClick={() => navigate('/app/sentiment')}
        />
      </div>
      </>)}
      </div>{/* End opacity wrapper */}


      {/* Onboarding Checklist (if incomplete) */}
      {dashboardData?.onboarding && !dashboardData.onboarding.complete && !dismissed && onboardingSteps.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <OnboardingChecklist
            steps={onboardingSteps}
            onDismiss={dismiss}
            dismissed={dismissed}
          />
        </div>
      )}
    </main>
  );
}

export default DashboardPage;
