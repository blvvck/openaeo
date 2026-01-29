

import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { Users, Plus, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveWorkspaceName } from '@/hooks/use-active-workspace';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tab-set';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import { PlatformIcon } from '@/components/ui/platform-icon';
import {
  PageHeader,
  StaleDataWarning,
  MetricCard,
  ContentCard,
  CardLabel,
  CardSubtitle,
  CardDivider,
  InsightBox,
} from '@/components/shared';
import { CardEmptyState, ErrorState } from '@/components/shared/empty-state';
import {
  TimeRangeSelector,
  useTimeRange,
  type TimeRange,
} from '@/components/charts/time-range-selector';

// Feature Components
import { CompetitorLeaderboardExtended } from '@/components/competitors/competitor-leaderboard-extended';
import { PlatformBreakdownTable } from '@/components/competitors/platform-breakdown-table';
import { HeadToHeadCard } from '@/components/competitors/head-to-head-card';
import { AddCompetitorModal } from '@/components/competitors/add-competitor-modal';
import { CompetitorDetailModal } from '@/components/competitors/competitor-detail-modal';
import { CompetitorTrendsChart, TrendMetricTabs, type CompetitorTrendsData, type TrendMetric } from '@/components/competitors/competitor-trends-chart';
import {
  YourRankCard,
  ShareOfAnswerCard,
  HighIntentCard,
  CitationRateCompetitorCard,
  CompetitivePressureCard,
} from '@/components/competitors/competitor-metrics';

// Intelligence Components
import { IntelligenceWizard } from '@/components/intelligence';

// Hooks
import {
  useCompetitors,
  useCompetitorsByPlatform,
  useCompetitorCompare,
  useCompetitorMetrics,
  useCompetitorTrends,
  useDeleteCompetitor,
} from '@/hooks/use-competitors';
import { useToast } from '@/hooks/use-toast';
import { isDemoPreview } from '@/lib/demo-preview';

// Types
import type { TimeRangePreset, CompetitorDetail } from '@shared/types';

// =============================================================================
// Overview Tab Content
// =============================================================================

interface OverviewTabProps {
  range: TimeRange;
  onOpenDateFilter: () => void;
  initialCompetitorId: string | null;
  mockEmptyPeriod: boolean;
  isAddModalOpen: boolean;
  onOpenAddModal: () => void;
  onCloseAddModal: () => void;
}

function OverviewTab({ range, onOpenDateFilter, initialCompetitorId, mockEmptyPeriod, isAddModalOpen, onOpenAddModal, onCloseAddModal }: OverviewTabProps) {
  const organizationName = useActiveWorkspaceName();
  const timeRangePreset = range.preset as TimeRangePreset;
  const { toast } = useToast();
  // Selected competitor for head-to-head
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);

  // Trend chart metric
  const [trendMetric, setTrendMetric] = useState<TrendMetric>('visibility');

  // Competitor detail modal state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailCompetitor, setDetailCompetitor] = useState<CompetitorDetail | null>(null);
  const [handledInitialCompetitorId, setHandledInitialCompetitorId] = useState<string | null>(null);
  const handleOpenDetailModal = (competitor: CompetitorDetail) => {
    setDetailCompetitor(competitor);
    setIsDetailModalOpen(true);
  };
  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setDetailCompetitor(null);
  };

  // Delete competitor mutation
  const deleteCompetitor = useDeleteCompetitor();

  // Data fetching
  const {
    data: competitorsData,
    isLoading: competitorsLoading,
    isFetching: competitorsFetching,
    error: competitorsError,
    refetch: refetchCompetitors,
  } = useCompetitors(timeRangePreset);

  const {
    data: platformData,
    isLoading: platformLoading,
    isFetching: platformFetching,
  } = useCompetitorsByPlatform(timeRangePreset);

  // Metrics for the 5 metric cards
  const {
    data: metricsData,
    isLoading: metricsLoading,
  } = useCompetitorMetrics(timeRangePreset);

  // Default to first competitor (the leader) for comparison
  const compareId = selectedCompetitorId || competitorsData?.competitors?.find(c => !c.isYou)?.id || null;

  const {
    data: compareData,
    isLoading: compareLoading,
  } = useCompetitorCompare(compareId, timeRangePreset);

  // Trends data for chart (real data from API)
  const {
    data: trendsData,
    isLoading: trendsLoading,
  } = useCompetitorTrends(timeRangePreset);

  useEffect(() => {
    if (!initialCompetitorId || !competitorsData || handledInitialCompetitorId === initialCompetitorId) return;
    const competitor = competitorsData.competitors.find(({ id }) => String(id) === initialCompetitorId);
    if (competitor) {
      setDetailCompetitor(competitor);
      setIsDetailModalOpen(true);
    }
    setHandledInitialCompetitorId(initialCompetitorId);
  }, [competitorsData, handledInitialCompetitorId, initialCompetitorId]);

  // Event handlers
  const handleRetry = () => {
    refetchCompetitors();
  };

  const handleCompetitorSelect = (id: string) => {
    setSelectedCompetitorId(id);
  };

  const handleDeleteCompetitor = (competitor: { id: string; name: string }) => {
    if (confirm(`Remove ${competitor.name} from your competitors?`)) {
      deleteCompetitor.mutate(competitor.id, {
        onSuccess: (data) => {
          toast({
            title: 'Competitor removed',
            description: data.message || `${competitor.name} has been removed from your competitors`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to remove competitor',
            description: error.message,
            variant: 'destructive',
          });
        },
      });
    }
  };

  // Loading state
  const isLoading = competitorsLoading || metricsLoading;
  const isFetching = competitorsFetching || platformFetching;
  const isRefreshing = isFetching && !isLoading;

  // Check if we have real tracked data (prompts + responses)
  const hasTrackedData = metricsData?.meta?.hasTrackedData ?? false;
  const noResultsForRange = mockEmptyPeriod || Boolean(
    trendsData?.hasHistoricalData && !trendsData.hasDataInRange
  );

  // Error state
  if (competitorsError && !isLoading) {
    const errorMessage = competitorsError instanceof Error
      ? competitorsError.message
      : 'Failed to load competitor data';

    return (
      <ErrorState
        title="Couldn't load competitor data"
        error={errorMessage}
        onRetry={handleRetry}
      />
    );
  }

  // Derive data with safe defaults for loading/empty states
  const competitors = competitorsData?.competitors ?? [];
  const nonYouCompetitors = competitors.filter(c => !c.isYou);
  const trackedCompetitors = competitors.filter(c => !c.isYou);

  return (
    <>
      {/* Stale data warning */}
      {!isLoading && competitorsData?.meta?.cacheAge && (
        <StaleDataWarning cacheAge={competitorsData.meta.cacheAge} onRefresh={handleRetry} />
      )}

      {/* Main content - dims when refreshing */}
      <div className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60')}>

      {/* First-load spinner */}
      {isLoading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
        </div>
      ) : (<>

      {/* Info banner for empty state */}
      {!hasTrackedData && !noResultsForRange && (
        <div className="bg-figma-blue-light border border-figma-blue/20 rounded-lg px-4 py-3 mb-8">
          <p className="text-figma-sm text-figma-primary">
            <span className="font-medium">No ranking data yet.</span>{' '}
            <a href="/app/prompts" className="text-figma-blue hover:underline">Add prompts</a> to start tracking how you compare to competitors.
          </p>
        </div>
      )}

      {/* Row 1: Competitive Intelligence Cards (horizontal scroll for 5 cards) */}
      <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-hover mb-8 -mr-6 pr-6 2xl:mr-0 2xl:grid 2xl:grid-cols-5 2xl:overflow-visible 2xl:pb-0 2xl:pr-0">
        {!hasTrackedData ? (
          <>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0"><YourRankCard data={null} brandName={organizationName} noPeriodData={noResultsForRange} /></div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0"><ShareOfAnswerCard data={null} brandName={organizationName} noPeriodData={noResultsForRange} /></div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0"><HighIntentCard data={null} noPeriodData={noResultsForRange} /></div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0"><CitationRateCompetitorCard data={null} noPeriodData={noResultsForRange} /></div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0"><CompetitivePressureCard data={null} noPeriodData={noResultsForRange} /></div>
          </>
        ) : (
          <>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0">
              <YourRankCard data={metricsData?.yourRank || null} brandName={organizationName} noPeriodData={noResultsForRange} />
            </div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0">
              <ShareOfAnswerCard data={metricsData?.shareOfAnswer || null} brandName={organizationName} noPeriodData={noResultsForRange} />
            </div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0">
              <HighIntentCard data={metricsData?.highIntent || null} noPeriodData={noResultsForRange} />
            </div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0">
              <CitationRateCompetitorCard data={metricsData?.citationRate || null} noPeriodData={noResultsForRange} />
            </div>
            <div className="w-[260px] flex-shrink-0 2xl:w-auto 2xl:min-w-0">
              <CompetitivePressureCard data={metricsData?.competitivePressure || null} noPeriodData={noResultsForRange} />
            </div>
          </>
        )}
      </div>

      {/* Row 2: Full Leaderboard */}
      <div className="mb-8">
        <ContentCard
          title="Competitor rankings"
          subtitle="See where you rank in AI responses"
          actionLabel={isDemoPreview() ? undefined : "+ Add competitor"}
          onAction={isDemoPreview() ? undefined : onOpenAddModal}
          hideActionIcon
          contentClassName="pt-0"
        >
          {noResultsForRange ? (
            <>
              <div className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 px-5 py-3 border-b border-figma-border-light">
                <span className="text-figma-2xs font-medium text-figma-secondary">Rank</span>
                <span className="text-figma-2xs font-medium text-figma-secondary">Brand</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Share of answers</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">High-intent</span>
                <span className="text-figma-2xs font-medium text-figma-secondary pl-3">Top prompt</span>
                <span className="text-figma-2xs font-medium text-figma-secondary">Platforms</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Score</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Trend</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Δ</span>
                <span></span>
              </div>
              <CardEmptyState
                icon={Search}
                title="No rankings for this period"
                description="Change the date range to view results from another period."
                action={{ label: 'Adjust date filter', onClick: onOpenDateFilter }}
                className="min-h-[280px]"
              />
            </>
          ) : !hasTrackedData ? (
            <>
              {/* Table Header — matches CompetitorLeaderboardExtended */}
              <div className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 px-5 py-3 border-b border-figma-border-light">
                <span className="text-figma-2xs font-medium text-figma-secondary">Rank</span>
                <span className="text-figma-2xs font-medium text-figma-secondary">Brand</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Share of answers</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">High-intent</span>
                <span className="text-figma-2xs font-medium text-figma-secondary pl-3">Top prompt</span>
                <span className="text-figma-2xs font-medium text-figma-secondary">Platforms</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Score</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Trend</span>
                <span className="text-figma-2xs font-medium text-figma-secondary text-right">Δ</span>
                <span></span>
              </div>
              <div className="divide-y divide-figma-border-light">
                {/* Brand row (You) */}
                <div className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 items-center px-5 py-2.5 bg-figma-blue-light">
                  <span className="text-figma-sm font-medium text-figma-secondary">—</span>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-figma-hover shrink-0" />
                    <span className="text-figma-sm font-semibold text-figma-blue truncate">{organizationName}</span>
                    <span className="text-[9px] leading-none font-medium text-figma-blue bg-white rounded px-1.5 py-1 shrink-0">You</span>
                  </div>
                  <span className="text-figma-sm text-figma-muted text-right">—</span>
                  <span className="text-figma-sm text-figma-muted text-right">—</span>
                  <span className="text-figma-2xs text-figma-muted pl-3">—</span>
                  <span className="text-figma-sm text-figma-muted">—</span>
                  <span className="text-figma-sm text-figma-muted text-right">—</span>
                  <span className="text-figma-xs text-figma-muted text-right">—</span>
                  <span className="text-figma-xs text-figma-muted text-right">—</span>
                  <span></span>
                </div>
                {trackedCompetitors.length > 0 ? (
                  trackedCompetitors.map((comp) => (
                    <button
                      type="button"
                      key={comp.id}
                      onClick={() => handleOpenDetailModal(comp)}
                      className="w-full text-left grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 items-center px-5 py-2.5 cursor-pointer transition-colors hover:bg-figma-hover"
                    >
                      <span className="text-figma-sm text-figma-muted">—</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <CompanyAvatar name={comp.name} domain={comp.domain} />
                        <span className="text-figma-sm text-figma-primary truncate">{comp.name}</span>
                      </div>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-2xs text-figma-muted pl-3">—</span>
                      <span className="text-figma-sm text-figma-muted">—</span>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-xs text-figma-muted text-right">—</span>
                      <span className="text-figma-xs text-figma-muted text-right">—</span>
                      <span></span>
                    </button>
                  ))
                ) : (
                  [1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-[2fr_5fr_4fr_4fr_5fr_4fr_3fr_3fr_2fr_1fr] gap-2 items-center px-5 py-2.5">
                      <span className="text-figma-sm text-figma-muted">—</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-figma-hover shrink-0" />
                        <span className="text-figma-sm text-figma-muted">Add a competitor</span>
                      </div>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-2xs text-figma-muted pl-3">—</span>
                      <span className="text-figma-sm text-figma-muted">—</span>
                      <span className="text-figma-sm text-figma-muted text-right">—</span>
                      <span className="text-figma-xs text-figma-muted text-right">—</span>
                      <span className="text-figma-xs text-figma-muted text-right">—</span>
                      <span></span>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <CompetitorLeaderboardExtended
              competitors={competitors}
              onRowClick={(c) => !c.isYou && handleCompetitorSelect(c.id)}
              onDelete={isDemoPreview() ? undefined : (c) => handleDeleteCompetitor({ id: c.id, name: c.name })}
            />
          )}
        </ContentCard>
      </div>

      {/* Row 3: Trends Chart */}
      <div className="mb-8">
        <ContentCard
          title={`${organizationName} vs competitors`}
          subtitle="Who's gaining ground over time"
          headerRight={<TrendMetricTabs value={trendMetric} onChange={setTrendMetric} />}
        >
          <CompetitorTrendsChart
              data={trendsData ?? { points: [], competitors: [] }}
              metric={trendMetric}
              brandName={trendsData?.competitors?.find(c => c.isYou)?.name || organizationName}
              isEmpty={trendsLoading || !trendsData?.hasHistoricalData}
              noDataForRange={!trendsLoading && noResultsForRange}
              onAdjustDateRange={onOpenDateFilter}
              timeRange={timeRangePreset}
            />
        </ContentCard>
      </div>

      </>)}
      </div>{/* End opacity wrapper */}

      {/* Add Competitor Modal */}
      <AddCompetitorModal
        isOpen={isAddModalOpen}
        onClose={onCloseAddModal}
        existingDomains={competitors.map(c => c.domain).filter(Boolean) as string[]}
      />

      <CompetitorDetailModal
        competitor={detailCompetitor}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />
    </>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function CompetitorsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);
  const mockEmptyPeriod = import.meta.env.DEV && new URLSearchParams(search).get('mock') === 'empty-range';

  // Get initial tab and brand from URL
  const urlParams = new URLSearchParams(search);
  const initialTab = urlParams.get('tab') || 'overview';
  const brandId = urlParams.get('brand');

  const [activeTab, setActiveTab] = useState(initialTab);

  // Add competitor modal state (lifted from OverviewTab)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const handleOpenAddModal = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  // Sync tab from URL changes
  useEffect(() => {
    const params = new URLSearchParams(search);
    const tabFromUrl = params.get('tab') || 'overview';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Update URL without navigation
    const url = new URL(window.location.href);
    if (tab === 'overview') {
      url.searchParams.delete('tab');
      url.searchParams.delete('brand');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
  };

  // Determine page subtitle based on tab (title always "Competitors")
  const isIntelligence = activeTab === 'intelligence';
  const pageTitle = 'Competitors';
  const pageSubtitle = isIntelligence
    ? 'Research any brand across AI platforms'
    : 'See how you compare to the competition';

  return (
    <main role="main" aria-label="Competitors">
      {/* Page Header */}
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        action={
          !isIntelligence ? (
            <div className="flex items-center gap-3">
              {!isDemoPreview() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenAddModal}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Add competitor
                </Button>
              )}
              <TimeRangeSelector
                value={range}
                onChange={handleTimeRangeChange}
                open={dateFilterOpen}
                onOpenChange={setDateFilterOpen}
              />
            </div>
          ) : undefined
        }
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="mb-6 inline-flex items-center gap-6 bg-transparent rounded-none p-0 h-auto border-b border-figma-border-light w-full justify-start">
          <TabsTrigger
            value="overview"
            className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="intelligence"
            className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
          >
            Intelligence
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            range={range}
            onOpenDateFilter={() => setDateFilterOpen(true)}
            initialCompetitorId={urlParams.get('competitorId')}
            mockEmptyPeriod={mockEmptyPeriod}
            isAddModalOpen={isAddModalOpen}
            onOpenAddModal={handleOpenAddModal}
            onCloseAddModal={handleCloseAddModal}
          />
        </TabsContent>

        <TabsContent value="intelligence">
          <IntelligenceWizard
            initialBrandId={brandId || undefined}
            onComplete={(results) => {
              // Update URL with brand ID for bookmarking
              const url = new URL(window.location.href);
              url.searchParams.set('brand', results.brand.id);
              window.history.replaceState({}, '', url.toString());
            }}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}

export default CompetitorsPage;
