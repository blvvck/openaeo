
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

import { useState } from 'react';
import { useSearch, useLocation } from 'wouter';
import { cn } from '@/lib/utils';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
function MetricCard({
  label,
  value,
  subtitle,
  trend,
  onClick,
}: {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        'border-figma-border rounded-xl bg-white h-[140px]',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5 h-full flex flex-col">
        <span className="text-figma-xs text-figma-secondary">{label}</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-figma-md font-bold text-figma-primary tabular-nums">
            {value}
          </span>
          {trend !== undefined && trend !== 0 && (
            <span
              className={cn(
                'text-figma-xs font-medium',
                trend > 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
              )}
            >
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
          )}
        </div>
        {subtitle && (
          <span className="text-figma-xs text-figma-muted mt-1">{subtitle}</span>
        )}
      </CardContent>
    </Card>
  );
}

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
  if (activeTab === 'all') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Total citations"
          value={overview?.total.count ?? 0}
          trend={overview?.total.trend}
          subtitle="across all sources"

        />
        <MetricCard
          label="Owned citations"
          value={`${overview?.byType.owned.count ?? 0} (${overview?.byType.owned.percentage ?? 0}%)`}
          trend={overview?.byType.owned.trend}
          subtitle="your domain"
          onClick={() => onTabChange('owned')}

        />
        <MetricCard
          label="Third-party"
          value={`${overview?.byType.thirdParty.count ?? 0} (${overview?.byType.thirdParty.percentage ?? 0}%)`}
          trend={overview?.byType.thirdParty.trend}
          subtitle="review sites, news"
          onClick={() => onTabChange('third-party')}

        />
        <MetricCard
          label="Social citations"
          value={`${overview?.byType.social.count ?? 0} (${overview?.byType.social.percentage ?? 0}%)`}
          trend={overview?.byType.social.trend}
          subtitle="forums, communities"
          onClick={() => onTabChange('social')}

        />
      </div>
    );
  }

  if (activeTab === 'owned') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Owned citations"
          value={overview?.byType.owned.count ?? 0}
          trend={overview?.byType.owned.trend}
          subtitle="your domain pages"

        />
        <MetricCard
          label="Top page"
          value="/pricing"
          subtitle="most cited page"

        />
        <MetricCard
          label="Pages cited"
          value={12}
          trend={2}
          subtitle="unique pages"

        />
        <MetricCard
          label="Avg per page"
          value="10.6"
          trend={1}
          subtitle="citations per page"

        />
      </div>
    );
  }

  if (activeTab === 'third-party') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Third-party citations"
          value={overview?.byType.thirdParty.count ?? 0}
          trend={overview?.byType.thirdParty.trend}
          subtitle="review sites, news"

        />
        <MetricCard
          label="Top source"
          value={overview?.topSource.domain ?? 'g2.com'}
          subtitle={`${overview?.topSource.count ?? 47} citations`}

        />
        <MetricCard
          label="Unique sources"
          value={24}
          trend={4}
          subtitle="domains citing you"

        />
        <MetricCard
          label="Review sites"
          value="68%"
          subtitle="of third-party"

        />
      </div>
    );
  }

  // Social tab
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        label="Social citations"
        value={overview?.byType.social.count ?? 0}
        trend={overview?.byType.social.trend}
        subtitle="communities, forums"

      />
      <MetricCard
        label="Top platform"
        value="reddit.com"
        subtitle="31 citations"

      />
      <MetricCard
        label="Unique threads"
        value={18}
        trend={3}
        subtitle="discussions citing you"

      />
      <MetricCard
        label="Sentiment"
        value="Mixed"
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
  hasMore,
  isLoadingMore,
  activeTab,
  selectedPlatform,
  selectedSentiment,
  searchQuery,
  onPlatformChange,
  onSentimentChange,
  onSearchChange,
  onLoadMore,
  onRowClick,
}: {
  citations: CitationItem[];
  total: number;
  hasMore: boolean;
  isLoadingMore?: boolean;
  activeTab: CitationType | 'all';
  selectedPlatform: string | null;
  selectedSentiment: CitationSentiment | null;
  searchQuery: string;
  onPlatformChange: (platform: string | null) => void;
  onSentimentChange: (sentiment: CitationSentiment | null) => void;
  onSearchChange: (query: string) => void;
  onLoadMore: () => void;
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
      subtitle={`${total} citations found`}
      headerRight={
        <div className="flex items-center gap-3">
          {/* Platform Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-figma-sm">
                {selectedPlatform
                  ? PLATFORMS.find((p) => p.id === selectedPlatform)?.name
                  : 'All platforms'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPlatformChange(null)}>
                All platforms
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PLATFORMS.map((platform) => (
                <DropdownMenuItem
                  key={platform.id}
                  onClick={() => onPlatformChange(platform.id)}
                >
                  <PlatformIcon platform={platform.id} size="xs" className="mr-2" />
                  {platform.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sentiment Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-figma-sm">
                {selectedSentiment
                  ? SENTIMENT_OPTIONS.find((s) => s.value === selectedSentiment)?.label
                  : 'All sentiments'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SENTIMENT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value ?? 'all'}
                  onClick={() => onSentimentChange(option.value)}
                >
                  {option.value && (
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full mr-2',
                        option.value === 'positive' && 'bg-figma-green',
                        option.value === 'neutral' && 'bg-amber-400',
                        option.value === 'negative' && 'bg-figma-red',
                        option.value === 'mixed' && 'bg-figma-muted'
                      )}
                    />
                  )}
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-figma-muted" />
            <Input
              placeholder="Search sources..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-[200px] text-figma-sm"
            />
          </div>
        </div>
      }
    >
      {citations.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="w-10 h-10 text-figma-muted mx-auto mb-3" />
          <p className="text-figma-sm font-medium text-figma-primary">No citations found</p>
          <p className="text-figma-xs text-figma-secondary mt-1">
            Try adjusting your search or filters
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onPlatformChange(null);
              onSentimentChange(null);
            }}
            className="mt-3 text-figma-blue"
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <>
          <TableHeader
            gridCols={tableGrid}
            columns={
              isAllTab
                ? [
                    { label: 'SOURCE' },
                    { label: 'TYPE' },
                    { label: 'PLATFORMS' },
                    { label: 'CITATIONS', align: 'right' },
                    { label: 'SENTIMENT', align: 'right' },
                  ]
                : [
                    { label: 'SOURCE' },
                    { label: 'PLATFORMS' },
                    { label: 'CITATIONS', align: 'right' },
                    { label: 'TREND', align: 'right' },
                    { label: 'SENTIMENT', align: 'right' },
                  ]
            }
          />
          <div className="space-y-0">
            {citations.map((citation) => (
              <div
                key={citation.id}
                onClick={() => onRowClick(citation)}
                className={cn(
                  'grid gap-3 items-center py-2.5 px-2',
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
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-figma-sm"
              >
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Show 25 more
              </Button>
            </div>
          )}
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
                  <div
                    key={prompt.id}
                    className="flex items-center gap-3 py-2 px-3 bg-figma-hover rounded-lg cursor-pointer hover:bg-figma-border-light transition-colors"
                    onClick={() => {
                      onClose();
                      setTimeout(() => onNavigateToPrompt(prompt.id), 100);
                    }}
                  >
                    <span className="text-figma-sm text-figma-primary flex-1 truncate">
                      "{prompt.text}"
                    </span>
                    <span className="text-figma-xs text-figma-muted tabular-nums shrink-0">
                      {prompt.citationCount} cites
                    </span>
                  </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedCitationId, setSelectedCitationId] = useState<string | null>(null);

  // Data fetching
  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch: refetchOverview,
  } = useCitationsOverview(timeRangePreset);

  const {
    data: citationsData,
    isLoading: citationsLoading,
    isFetching: citationsFetching,
  } = useCitations({
    timeRange: timeRangePreset,
    type: activeTab !== 'all' ? activeTab : undefined,
    platform: selectedPlatform || undefined,
    sentiment: selectedSentiment || undefined,
    search: searchQuery || undefined,
    limit: 25,
    offset,
  });

  const {
    data: citationDetailData,
    isLoading: detailLoading,
  } = useCitationDetail(selectedCitationId);

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

  const handleRowClick = (citation: CitationItem) => {
    setSelectedCitationId(citation.id);
  };

  const handleDrawerClose = () => {
    setSelectedCitationId(null);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + 25);
  };

  const handleRetry = () => {
    refetchOverview();
  };

  const handleNavigateToPrompt = (promptId: string) => {
    navigate(`/app/prompts?search=${promptId}`);
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
          action={<TimeRangeSelector value={range} onChange={handleTimeRangeChange} />}
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
            <TimeRangeSelector value={range} onChange={handleTimeRangeChange} />
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
              hasMore={citationsData?.hasMore || false}
              isLoadingMore={citationsFetching && offset > 0}
              activeTab={activeTab}
              selectedPlatform={selectedPlatform}
              selectedSentiment={selectedSentiment}
              searchQuery={searchQuery}
              onPlatformChange={setSelectedPlatform}
              onSentimentChange={setSelectedSentiment}
              onSearchChange={setSearchQuery}
              onLoadMore={handleLoadMore}
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
