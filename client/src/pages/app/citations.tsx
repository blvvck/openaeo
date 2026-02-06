
/**
 * Citations Page
 *
 * Aggregate view of all citations across all prompts.
 * Shows which sources AI platforms cite about the brand.
 *
 * Route: /app/citations
 *
 * Tabs:
 * - All (default)
 * - Owned
 * - Third-party
 * - Social
 *
 * Layout per tab:
 * - Row 1: Contextual Metric Cards (4 cards, changes per tab)
 * - Row 2: Citations Table with filters
 */

import { useEffect, useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FilterBar, FilterSelect, FilterSearch } from '@/components/shared/filter-bar';
import { CardEmptyState } from '@/components/shared/empty-state';
import { MetricStatCard } from '@/components/shared/stat-metric';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tab-set';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/action-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/slide-panel';
import {
  PageHeader,
  ContentCard,
  SentimentBadge,
  TableHeader,
  TablePagination,
  StaleDataWarning,
} from '@/components/shared';
import { ErrorState } from '@/components/shared/empty-state';
import {
  TimeRangeSelector,
  useTimeRange,
  type TimeRange,
} from '@/components/charts/time-range-selector';
import { PlatformIcon, PLATFORMS } from '@/components/ui/platform-icon';

// Hooks
import {
  useCitationsOverview,
  useCitations,
  useCitationDetail,
} from '@/hooks/use-citations';

// Types
import type {
  CitationType,
  CitationSentiment,
  CitationItem,
  CitationDetail,
  CitationsOverview,
  TimeRangePreset,
} from '@shared/types';

// Icons
import {
  Search,
  ChevronDown,
  Link2,
  Building2,
  Newspaper,
  Users,
  ExternalLink,
  Loader2,
  TrendingUp,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

const CITATION_TABS: { id: CitationType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'owned', label: 'Owned' },
  { id: 'third-party', label: 'Third-party' },
  { id: 'social', label: 'Social' },
];

const CITATION_TYPE_COLORS: Record<CitationType, string> = {
  'owned': 'bg-blue-50 text-figma-blue',
  'third-party': 'bg-purple-50 text-purple-600',
  'social': 'bg-amber-50 text-figma-orange',
  'other': 'bg-slate-100 text-figma-secondary',
};

const CITATION_TYPE_LABELS: Record<CitationType, string> = {
  'owned': 'Owned',
  'third-party': '3rd pty',
  'social': 'Social',
  'other': 'Other',
};

const SENTIMENT_OPTIONS: { value: CitationSentiment | null; label: string }[] = [
  { value: null, label: 'All sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' },
  { value: 'mixed', label: 'Mixed' },
];

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Citation Type Badge
 */
function CitationTypeBadge({ type }: { type: CitationType }) {
  return (
    <span
      className={cn(
        'text-figma-2xs font-medium px-2 py-0.5 rounded w-fit',
        CITATION_TYPE_COLORS[type]
      )}
    >
      {CITATION_TYPE_LABELS[type]}
    </span>
  );
}

/**
 * Metric Card Component
 */
/**
 * Metric Cards Row - Changes based on active tab
 */
function MetricCardsRow({
  overview,
  activeTab,
  onTabChange,
}: {
  overview: CitationsOverview | undefined;
  activeTab: CitationType | 'all';
  onTabChange: (tab: CitationType) => void;
}) {
  const tabMetrics = overview?.tabMetrics;
  const totalCitations = overview?.total.count ?? 0;
  const ownedCitations = overview?.byType.owned.count ?? 0;
  const thirdPartyCitations = overview?.byType.thirdParty.count ?? 0;
  const socialCitations = overview?.byType.social.count ?? 0;

  if (activeTab === 'all') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricStatCard
          label="Total citations"
          value={totalCitations || '—'}
          trend={totalCitations ? overview?.total.trend : undefined}
          subtitle="across all sources"

        />
        <MetricStatCard
          label="Owned citations"
          value={ownedCitations
            ? `${ownedCitations} (${overview?.byType.owned.percentage ?? 0}%)`
            : '—'}
          trend={ownedCitations ? overview?.byType.owned.trend : undefined}
          subtitle="your domain"
          onClick={() => onTabChange('owned')}

        />
        <MetricStatCard
          label="Third-party"
          value={thirdPartyCitations
            ? `${thirdPartyCitations} (${overview?.byType.thirdParty.percentage ?? 0}%)`
            : '—'}
          trend={thirdPartyCitations ? overview?.byType.thirdParty.trend : undefined}
          subtitle="review sites, news"
          onClick={() => onTabChange('third-party')}

        />
        <MetricStatCard
          label="Social citations"
          value={socialCitations
            ? `${socialCitations} (${overview?.byType.social.percentage ?? 0}%)`
            : '—'}
          trend={socialCitations ? overview?.byType.social.trend : undefined}
          subtitle="forums, communities"
          onClick={() => onTabChange('social')}

        />
      </div>
    );
  }

  if (activeTab === 'owned') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricStatCard
          label="Owned citations"
          value={ownedCitations || '—'}
          trend={ownedCitations ? overview?.byType.owned.trend : undefined}
          subtitle="your domain pages"

        />
        <MetricStatCard
          label="Top page"
          value={tabMetrics?.owned.topPage ?? '—'}
          subtitle="most cited page"

        />
        <MetricStatCard
          label="Pages cited"
          value={tabMetrics?.owned.pagesCited || '—'}
          trend={tabMetrics?.owned.pagesCited ? tabMetrics.owned.pagesTrend : undefined}
          subtitle="unique pages"

        />
        <MetricStatCard
          label="Avg per page"
          value={tabMetrics?.owned.avgPerPage ?? '—'}
          trend={tabMetrics?.owned.avgPerPage == null ? undefined : tabMetrics.owned.avgPerPageTrend}
          subtitle="citations per page"

        />
      </div>
    );
  }

  if (activeTab === 'third-party') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricStatCard
          label="Third-party citations"
          value={thirdPartyCitations || '—'}
          trend={thirdPartyCitations ? overview?.byType.thirdParty.trend : undefined}
          subtitle="review sites, news"

        />
        <MetricStatCard
          label="Top source"
          value={tabMetrics?.thirdParty.topSource ?? '—'}
          subtitle={tabMetrics?.thirdParty.topSourceCount
            ? `${tabMetrics.thirdParty.topSourceCount} citations`
            : 'Most cited external source'}

        />
        <MetricStatCard
          label="Unique sources"
          value={tabMetrics?.thirdParty.uniqueSources || '—'}
          trend={tabMetrics?.thirdParty.uniqueSources
            ? tabMetrics.thirdParty.uniqueSourcesTrend
            : undefined}
          subtitle="domains citing you"

        />
        <MetricStatCard
          label="Avg per source"
          value={tabMetrics?.thirdParty.avgPerSource ?? '—'}
          trend={tabMetrics?.thirdParty.avgPerSource == null
            ? undefined
            : tabMetrics.thirdParty.avgPerSourceTrend}
          subtitle="citations per source"

        />
      </div>
    );
  }

  // Social tab
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricStatCard
        label="Social citations"
        value={socialCitations || '—'}
        trend={socialCitations ? overview?.byType.social.trend : undefined}
        subtitle="communities, forums"

      />
      <MetricStatCard
        label="Top platform"
        value={tabMetrics?.social.topPlatform ?? '—'}
        subtitle={tabMetrics?.social.platformCitations
          ? `${tabMetrics.social.platformCitations} citations`
          : 'Most used AI platform'}

      />
      <MetricStatCard
        label="Prompts citing you"
        value={tabMetrics?.social.promptsCiting || '—'}
        trend={tabMetrics?.social.promptsCiting
          ? tabMetrics.social.promptsTrend
          : undefined}
        subtitle="distinct prompts"

      />
      <MetricStatCard
        label="Sentiment"
        value={tabMetrics?.social.sentiment ?? '—'}
        subtitle="overall social tone"

      />
    </div>
  );
}

/**
 * Citations Table
 */
function CitationsTable({
  citations,
  total,
  offset,
  pageSize,
  isFetching,
  activeTab,
  selectedPlatform,
  selectedSentiment,
  searchQuery,
  onPlatformChange,
  onSentimentChange,
  onSearchChange,
  onPrevious,
  onNext,
  onRowClick,
}: {
  citations: CitationItem[];
  total: number;
  offset: number;
  pageSize: number;
  isFetching?: boolean;
  activeTab: CitationType | 'all';
  selectedPlatform: string | null;
  selectedSentiment: CitationSentiment | null;
  searchQuery: string;
  onPlatformChange: (platform: string | null) => void;
  onSentimentChange: (sentiment: CitationSentiment | null) => void;
  onSearchChange: (query: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRowClick: (citation: CitationItem) => void;
}) {
  const isAllTab = activeTab === 'all';
  const title = activeTab === 'all' ? 'All citations' : `${CITATION_TABS.find(t => t.id === activeTab)?.label} citations`;

  // Grid columns differ based on tab
  const ALL_TABLE_GRID = 'grid-cols-[1fr_80px_120px_80px_80px]';
  const FILTERED_TABLE_GRID = 'grid-cols-[1fr_120px_80px_80px_80px]';
  const tableGrid = isAllTab ? ALL_TABLE_GRID : FILTERED_TABLE_GRID;

  return (
    <ContentCard
      title={title}
      subtitle="Sources cited in AI responses about your brand"
      headerRight={
        <FilterBar>
          <FilterSearch
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Search sources..."
            className="w-[200px]"
          />
          <FilterSelect
            value={selectedPlatform ?? 'all'}
            onValueChange={(v) => onPlatformChange(v === 'all' ? null : v)}
            options={[
              { value: 'all', label: 'All platforms' },
              ...PLATFORMS.map((platform) => ({
                value: platform.id,
                label: platform.name,
                icon: <PlatformIcon platform={platform.id} size="xs" />,
              })),
            ]}
          />
          <FilterSelect
            value={selectedSentiment ?? 'all'}
            onValueChange={(v) => onSentimentChange(v === 'all' ? null : (v as CitationSentiment))}
            options={SENTIMENT_OPTIONS.map((option) => ({
              value: option.value ?? 'all',
              label: option.label,
              icon: option.value ? (
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    option.value === 'positive' && 'bg-figma-green',
                    option.value === 'neutral' && 'bg-amber-400',
                    option.value === 'negative' && 'bg-figma-red',
                    option.value === 'mixed' && 'bg-figma-muted'
                  )}
                />
              ) : undefined,
            }))}
          />
        </FilterBar>
      }
    >
      {citations.length === 0 ? (
        <CardEmptyState
          icon={Search}
          title="No citations found"
          description="Try adjusting your search or filters"
          action={{
            label: 'Clear all filters',
            onClick: () => {
              onSearchChange('');
              onPlatformChange(null);
              onSentimentChange(null);
            },
          }}
        />
      ) : (
        <>
          <TableHeader
            gridCols={tableGrid}
            columns={
              isAllTab
                ? [
                    { label: 'Source' },
                    { label: 'Type' },
                    { label: 'Platforms' },
                    { label: 'Citations', align: 'right' },
                    { label: 'Sentiment', align: 'right' },
                  ]
                : [
                    { label: 'Source' },
                    { label: 'Platforms' },
                    { label: 'Citations', align: 'right' },
                    { label: 'Trend', align: 'right' },
                    { label: 'Sentiment', align: 'right' },
                  ]
            }
          />
          <div className="space-y-0">
            {citations.map((citation) => (
              <button
                type="button"
                key={citation.id}
                onClick={() => onRowClick(citation)}
                className={cn(
                  'grid gap-3 items-center py-2.5 px-2 w-full text-left',
                  'border-b border-figma-border-light last:border-0',
                  'hover:bg-figma-hover cursor-pointer transition-colors',
                  tableGrid
                )}
              >
                {/* Source URL */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-figma-muted shrink-0" />
                  <span className="text-figma-sm font-medium text-figma-primary truncate">
                    {citation.displayUrl}
                  </span>
                </div>

                {/* Type badge (All tab only) */}
                {isAllTab && <CitationTypeBadge type={citation.type} />}

                {/* Platforms */}
                <div className="flex items-center gap-1.5">
                  {citation.platforms.slice(0, 4).map((pId) => (
                    <PlatformIcon key={pId} platform={pId} size="xs" />
                  ))}
                  {citation.platforms.length > 4 && (
                    <span className="text-figma-2xs text-figma-muted">
                      +{citation.platforms.length - 4}
                    </span>
                  )}
                </div>

                {/* Citations count */}
                <div className="flex items-center justify-end gap-1">
                  <span className="text-figma-sm font-medium text-figma-primary tabular-nums">
                    {citation.count}
                  </span>
                  {isAllTab && citation.trend !== 0 && (
                    <span
                      className={cn(
                        'text-figma-2xs',
                        citation.trend > 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
                      )}
                    >
                      {citation.trend > 0 ? '↑' : '↓'}
                    </span>
                  )}
                </div>

                {/* Trend (filtered tabs only) */}
                {!isAllTab && (
                  <span
                    className={cn(
                      'text-figma-xs tabular-nums text-right',
                      citation.trend > 0
                        ? 'text-figma-trend-up'
                        : citation.trend < 0
                        ? 'text-figma-trend-down'
                        : 'text-figma-muted'
                    )}
                  >
                    {citation.trend > 0 ? '+' : ''}
                    {citation.trend}%
                  </span>
                )}

                {/* Sentiment */}
                <div className="flex justify-end">
                  <SentimentBadge sentiment={citation.sentiment} />
                </div>
              </button>
            ))}
          </div>

          <TablePagination
            offset={offset}
            pageSize={pageSize}
            total={total}
            disabled={isFetching}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </>
      )}
    </ContentCard>
  );
}

/**
 * Citation Detail Drawer
 */
function CitationDetailDrawer({
  citation,
  isOpen,
  onClose,
  isLoading,
  onNavigateToPrompt,
}: {
  citation: CitationDetail | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onNavigateToPrompt: (promptId: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    if (citation?.url) {
      navigator.clipboard.writeText(citation.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !citation ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-figma-muted" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Header */}
            <SheetHeader>
              <SheetTitle className="text-figma-md font-semibold text-figma-primary text-left flex items-center gap-2">
                <Link2 className="w-4 h-4 text-figma-blue shrink-0" />
                <span className="truncate">{citation.displayUrl}</span>
              </SheetTitle>
            </SheetHeader>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-figma-hover rounded-lg">
              <CitationTypeBadge type={citation.type} />
              <span className="text-figma-xs text-figma-muted tabular-nums">
                {citation.count} citations
              </span>
              <SentimentBadge sentiment={citation.sentiment} />
              {citation.trend !== 0 && (
                <span
                  className={cn(
                    'text-figma-xs font-medium',
                    citation.trend > 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
                  )}
                >
                  {citation.trend > 0 ? '+' : ''}
                  {citation.trend}% this period
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-figma-sm"
                onClick={handleCopyUrl}
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 mr-2 text-figma-green" />
                ) : (
                  <Copy className="w-3.5 h-3.5 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy URL'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-figma-sm"
                onClick={() => window.open(citation.url, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                Open source
              </Button>
            </div>

            {/* Section 1: Platforms Citing This Source */}
            <section className="space-y-4">
              <div>
                <h3 className="text-figma-sm font-semibold text-figma-primary">
                  Platforms citing this source
                </h3>
                <p className="text-figma-2xs text-figma-muted mt-0.5">
                  Which AI platforms cite this source
                </p>
              </div>

              <div className="space-y-2">
                {citation.platformBreakdown.map((platform) => (
                  <div
                    key={platform.platformId}
                    className="flex items-center gap-3 py-2 px-3 bg-figma-hover rounded-lg"
                  >
                    <PlatformIcon platform={platform.platformId} size="sm" />
                    <span className="text-figma-sm font-medium text-figma-primary flex-1">
                      {platform.platformName}
                    </span>
                    <span className="text-figma-xs text-figma-muted tabular-nums">
                      {platform.count} citations
                    </span>
                    <span className="text-figma-2xs text-figma-muted">
                      Last: {new Date(platform.lastCited).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: Prompts Citing This Source */}
            <section className="space-y-4">
              <div>
                <h3 className="text-figma-sm font-semibold text-figma-primary">
                  Prompts citing this source
                </h3>
                <p className="text-figma-2xs text-figma-muted mt-0.5">
                  Top prompts where this source appears
                </p>
              </div>

              <div className="space-y-2">
                {citation.promptsCiting.map((prompt) => (
                  <button
                    type="button"
                    key={prompt.id}
                    className="flex w-full items-center gap-3 py-2 px-3 bg-figma-hover rounded-lg text-left hover:bg-figma-border-light transition-colors"
                    onClick={() => {
                      onClose();
                      setTimeout(() => onNavigateToPrompt(prompt.text), 100);
                    }}
                  >
                    <span className="text-figma-sm text-figma-primary flex-1 truncate">
                      "{prompt.text}"
                    </span>
                    <span className="text-figma-xs text-figma-muted tabular-nums shrink-0">
                      {prompt.citationCount} cites
                    </span>
                  </button>
                ))}
              </div>

              {citation.totalPromptsCiting > citation.promptsCiting.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-figma-blue text-figma-sm w-full"
                  onClick={() => {
                    onClose();
                    // Navigate to prompts page with filter
                    window.location.href = `/app/prompts?citation=${citation.id}`;
                  }}
                >
                  View all {citation.totalPromptsCiting} prompts →
                </Button>
              )}
            </section>

            {/* Section 3: Content Preview */}
            {citation.sampleSnippet && (
              <section className="space-y-4">
                <div>
                  <h3 className="text-figma-sm font-semibold text-figma-primary">
                    Content preview
                  </h3>
                  <p className="text-figma-2xs text-figma-muted mt-0.5">
                    How this source is typically cited
                  </p>
                </div>

                <div className="p-4 bg-figma-hover rounded-lg border-l-2 border-figma-blue">
                  <p className="text-figma-sm text-figma-secondary italic leading-relaxed">
                    "{citation.sampleSnippet}"
                  </p>
                </div>
              </section>
            )}

            {/* Sentiment Breakdown */}
            <section className="space-y-4">
              <h3 className="text-figma-sm font-semibold text-figma-primary">
                Sentiment breakdown
              </h3>

              <div className="bg-figma-hover rounded-lg p-3">
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-figma-green"
                    style={{ width: `${citation.sentimentBreakdown.positive}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${citation.sentimentBreakdown.neutral}%` }}
                  />
                  <div
                    className="bg-figma-red"
                    style={{ width: `${citation.sentimentBreakdown.negative}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-figma-2xs">
                  <span className="text-figma-green">
                    {citation.sentimentBreakdown.positive}% positive
                  </span>
                  <span className="text-figma-muted">
                    {citation.sentimentBreakdown.neutral}% neutral
                  </span>
                  <span className="text-figma-red">
                    {citation.sentimentBreakdown.negative}% negative
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function CitationsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');
  const timeRangePreset = range.preset as TimeRangePreset;

  // Get initial tab from URL or default to 'all'
  const urlParams = new URLSearchParams(search);
  const initialTab = (urlParams.get('tab') as CitationType) || 'all';

  // State
  const [activeTab, setActiveTab] = useState<CitationType | 'all'>(initialTab);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedSentiment, setSelectedSentiment] = useState<CitationSentiment | null>(null);
  const [searchQuery, setSearchQuery] = useState(() => urlParams.get('search') ?? '');
  const [offset, setOffset] = useState(0);
  const pageSize = 25;
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);

  useEffect(() => {
    setSearchQuery(new URLSearchParams(search).get('search') ?? '');
    setOffset(0);
  }, [search]);

  // Data fetching
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useCitationsOverview(timeRangePreset, range);

  const {
    data: citationsData,
    isLoading: citationsLoading,
    isFetching: citationsFetching,
  } = useCitations({
    timeRange: timeRangePreset,
    range,
    type: activeTab !== 'all' ? activeTab : undefined,
    platform: selectedPlatform || undefined,
    sentiment: selectedSentiment || undefined,
    search: searchQuery || undefined,
    limit: pageSize,
    offset,
  });

  const {
    data: citationDetailData,
    isLoading: detailLoading,
  } = useCitationDetail(selectedCitationId, range);

  // Handlers
  const handleTabChange = (tab: string) => {
    const newTab = tab as CitationType | 'all';
    setActiveTab(newTab);
    setOffset(0);
    // Update URL
    const url = new URL(window.location.href);
    if (newTab === 'all') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', newTab);
    }
    window.history.replaceState({}, '', url.toString());
  };

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    setOffset(0);
  };

  const handlePlatformChange = (platform: string | null) => {
    setSelectedPlatform(platform);
    setOffset(0);
  };

  const handleSentimentChange = (sentiment: CitationSentiment | null) => {
    setSelectedSentiment(sentiment);
    setOffset(0);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setOffset(0);
  };

  const handleRowClick = (citation: CitationItem) => {
    setSelectedCitationId(citation.id);
  };

  const handleDrawerClose = () => {
    setSelectedCitationId(null);
  };

  const handlePreviousPage = () => setOffset((prev) => Math.max(0, prev - pageSize));
  const handleNextPage = () => setOffset((prev) => prev + pageSize);

  const handleRetry = () => {
    refetchOverview();
  };

  const handleNavigateToPrompt = (promptText: string) => {
    navigate(`/app/prompts?search=${encodeURIComponent(promptText)}`);
  };

  // Computed
  const isLoading = overviewLoading || citationsLoading;
  const isRefreshing = overviewFetching && !overviewLoading;

  // Error state
  if (overviewError && !overviewLoading) {
    return (
      <main role="main" aria-label="Citations">
        <PageHeader
          title="Citations"
          subtitle="See what AI platforms cite about your brand"
          action={<TimeRangeSelector value={range} onChange={handleTimeRangeChange} presets={['1d', '3d', '7d', '14d', '30d', '60d', '90d', '365d', 'all', 'custom']} />}
        />
        <ErrorState
          title="Couldn't load citations data"
          error={overviewError instanceof Error ? overviewError.message : 'Unknown error'}
          onRetry={handleRetry}
        />
      </main>
    );
  }

  return (
    <main role="main" aria-label="Citations">
      {/* Page Header */}
      <PageHeader
        title="Citations"
        subtitle="See what AI platforms cite about your brand"
        action={
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <div className="flex items-center gap-2 text-figma-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-figma-xs">Updating...</span>
              </div>
            )}
            <TimeRangeSelector value={range} onChange={handleTimeRangeChange} presets={['1d', '3d', '7d', '14d', '30d', '60d', '90d', '365d', 'all', 'custom']} />
          </div>
        }
      />

      {/* Stale data warning */}
      <StaleDataWarning cacheAge={overviewData?.meta?.cacheAge} onRefresh={handleRetry} />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={cn('w-full transition-opacity duration-200', isRefreshing && 'opacity-60')}
      >
        <TabsList className="mb-6 inline-flex items-center gap-6 bg-transparent rounded-none p-0 h-auto border-b border-figma-border-light w-full justify-start">
          {CITATION_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content */}
        <TabsContent value={activeTab} forceMount className={activeTab !== activeTab ? 'hidden' : ''}>
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
            </div>
          ) : (
          <div className="space-y-8">
            {/* Row 1: Metric Cards */}
            <MetricCardsRow
              overview={overviewData}
              activeTab={activeTab}
              onTabChange={(tab) => handleTabChange(tab)}
            />

            {/* Row 2: Citations Table */}
            <CitationsTable
              citations={citationsData?.citations || []}
              total={citationsData?.total || 0}
              offset={offset}
              pageSize={pageSize}
              isFetching={citationsFetching}
              activeTab={activeTab}
              selectedPlatform={selectedPlatform}
              selectedSentiment={selectedSentiment}
              searchQuery={searchQuery}
              onPlatformChange={handlePlatformChange}
              onSentimentChange={handleSentimentChange}
              onSearchChange={handleSearchChange}
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
              onRowClick={handleRowClick}
            />
          </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Citation Detail Drawer */}
      <CitationDetailDrawer
        citation={citationDetailData || null}
        isOpen={!!selectedCitationId}
        onClose={handleDrawerClose}
        isLoading={detailLoading}
        onNavigateToPrompt={handleNavigateToPrompt}
      />
    </main>
  );
}

export default CitationsPage;
