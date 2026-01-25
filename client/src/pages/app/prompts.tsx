
/**
 * Prompts & Topics Page
 *
 * Analyze prompts where your brand appears in AI responses.
 * Organized by buyer journey stage with funnel coverage visualization.
 *
 * Route: /app/prompts
 *
 * Tabs:
 * - All (default)
 * - Problem aware
 * - Solution seeking
 * - Comparing
 * - Buying
 * - Using
 *
 * Layout per tab:
 * - Row 1: Funnel Coverage visualization
 * - Row 2: Top Prompts + Trending Prompts (2-column)
 * - Row 3: Prompts Table with filters
 *
 * Features:
 * - Click row to open detail drawer
 * - Drawer shows: sentiment by platform, citations (tabbed), competitors, related prompts
 */

import { useState, useEffect } from 'react';
import { useSearch, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { DEMO_CONFIG } from '@/config/app';

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
  InsightBox,
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
  useFunnelCoverage,
  usePrompts,
  useTrendingPrompts,
  useTopics,
  usePromptDetail,
} from '@/hooks/use-prompts';

// Types
import type {
  BuyerJourneyStage,
  Prompt,
  PromptDetail,
  FunnelStage,
  Sentiment,
  TimeRangePreset,
} from '@shared/types';

// Icons
import {
  Search,
  ChevronDown,
  Lightbulb,
  MessageSquare,
  Compass,
  TrendingUp,
  X,
  Link2,
  Building2,
  Newspaper,
  Users,
  FileText,
  Star,
  Loader2,
} from 'lucide-react';

// =============================================================================
// Constants
// =============================================================================

const JOURNEY_STAGES: { id: BuyerJourneyStage | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'problem-aware', label: 'Problem aware' },
  { id: 'solution-seeking', label: 'Solution seeking' },
  { id: 'comparing', label: 'Comparing' },
  { id: 'buying', label: 'Buying' },
  { id: 'using', label: 'Using' },
];

const STAGE_BADGE_COLORS: Record<BuyerJourneyStage, string> = {
  'problem-aware': 'bg-purple-50 text-purple-600',
  'solution-seeking': 'bg-blue-50 text-figma-blue',
  'comparing': 'bg-green-50 text-figma-green',
  'buying': 'bg-amber-50 text-figma-orange',
  'using': 'bg-slate-100 text-figma-secondary',
};

const SENTIMENT_SHORT_LABELS: Record<Sentiment, string> = {
  positive: 'Pos',
  neutral: 'Neu',
  negative: 'Neg',
  mixed: 'Mix',
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Funnel Coverage Card - Row 1
 * Shows brand presence across buyer journey stages
 */
function FunnelCoverageCard({
  stages,
  currentTab,
  insight,
  onStageClick,
}: {
  stages: FunnelStage[];
  currentTab: BuyerJourneyStage | 'all';
  insight?: string;
  onStageClick: (stage: BuyerJourneyStage) => void;
}) {
  return (
    <ContentCard title="Your funnel coverage" subtitle="Brand presence across the buyer journey">
      <div className="grid grid-cols-5 gap-4">
        {stages.map((stage) => {
          const isCurrentTab = currentTab === stage.id;
          const coverageColor =
            stage.coverage >= 60
              ? 'text-figma-green'
              : stage.coverage >= 30
              ? 'text-figma-primary'
              : 'text-figma-trend-down';
          const barColor =
            stage.coverage >= 60
              ? 'bg-figma-green'
              : stage.coverage >= 30
              ? 'bg-figma-blue'
              : 'bg-figma-orange';
          const labelColor =
            stage.coverage >= 60
              ? 'text-figma-green'
              : stage.coverage >= 30
              ? 'text-figma-secondary'
              : 'text-figma-orange';

          return (
            <div
              key={stage.id}
              onClick={() => onStageClick(stage.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-lg cursor-pointer transition-all',
                isCurrentTab && 'bg-figma-blue-light ring-2 ring-figma-blue/30',
                !isCurrentTab && 'hover:bg-figma-hover'
              )}
            >
              <span className="text-figma-xs font-medium text-figma-secondary">{stage.name}</span>
              <span className={cn('text-figma-md font-bold tabular-nums', coverageColor)}>
                {stage.coverage}%
              </span>
              <div className="w-full h-2 bg-figma-bar-track rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', barColor)}
                  style={{ width: `${stage.coverage}%` }}
                />
              </div>
              <span className={cn('text-figma-2xs font-medium', labelColor)}>
                {stage.coverage >= 60 ? 'strong' : stage.coverage >= 30 ? 'average' : 'weak'}
              </span>
              <span className="text-figma-2xs text-figma-muted tabular-nums">
                {stage.promptCount} prompts
              </span>
            </div>
          );
        })}
      </div>

      {insight && (
        <div className="bg-figma-hover rounded-lg p-3 flex items-start gap-2 mt-4">
          <Lightbulb className="w-3.5 h-3.5 text-figma-secondary shrink-0 mt-0.5" />
          <p className="text-figma-xs text-figma-secondary leading-relaxed">{insight}</p>
        </div>
      )}
    </ContentCard>
  );
}

/**
 * Top Prompts Card - Row 2 Left
 */
function TopPromptsCard({
  prompts,
  onViewAll,
}: {
  prompts: Prompt[];
  onViewAll?: () => void;
}) {
  return (
    <ContentCard title="Top prompts" subtitle="Highest brand mentions" onAction={onViewAll}>
      <div className="space-y-0">
        {prompts.slice(0, 5).map((prompt, index) => (
          <div
            key={prompt.id}
            className="py-2.5 border-b border-figma-border-light last:border-0"
          >
            <div className="flex items-start gap-3">
              <span className="text-figma-xs font-medium text-figma-muted tabular-nums w-4 shrink-0 mt-0.5">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-figma-sm text-figma-primary leading-snug">"{prompt.text}"</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-figma-xs text-figma-muted tabular-nums">
                    {prompt.mentions} mentions
                  </span>
                  <div className="flex items-center gap-1">
                    {prompt.platforms.slice(0, 4).map((pId) => (
                      <PlatformIcon key={pId} platform={pId} size="xs" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

/**
 * Trending Prompts Card - Row 2 Right
 */
function TrendingPromptsCard({
  prompts,
  onViewAll,
}: {
  prompts: Prompt[];
  onViewAll?: () => void;
}) {
  return (
    <ContentCard title="Trending prompts" subtitle="Fastest growing this period" onAction={onViewAll}>
      <div className="space-y-0">
        {prompts.slice(0, 5).map((prompt) => (
          <div
            key={prompt.id}
            className="py-2.5 border-b border-figma-border-light last:border-0"
          >
            <div className="flex items-start gap-3">
              <span className="text-figma-xs font-medium text-figma-trend-up shrink-0 mt-0.5">
                +{prompt.trend}%
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-figma-sm text-figma-primary leading-snug">"{prompt.text}"</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-figma-xs text-figma-muted tabular-nums">
                    {prompt.mentions} mentions
                  </span>
                  <div className="flex items-center gap-1">
                    {prompt.platforms.slice(0, 4).map((pId) => (
                      <PlatformIcon key={pId} platform={pId} size="xs" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

/**
 * Prompts Table - Row 3
 */
function PromptsTable({
  prompts,
  total,
  hasMore,
  isLoadingMore,
  topics,
  selectedTopic,
  searchQuery,
  onTopicChange,
  onSearchChange,
  onLoadMore,
  onRowClick,
  stageTab,
}: {
  prompts: Prompt[];
  total: number;
  hasMore: boolean;
  isLoadingMore?: boolean;
  topics: { id: string; name: string; promptCount: number }[];
  selectedTopic: string | null;
  searchQuery: string;
  onTopicChange: (topic: string | null) => void;
  onSearchChange: (query: string) => void;
  onLoadMore: () => void;
  onRowClick: (prompt: Prompt) => void;
  stageTab: BuyerJourneyStage | 'all';
}) {
  const title = stageTab === 'all' ? 'All prompts' : `${JOURNEY_STAGES.find(s => s.id === stageTab)?.label} prompts`;

  return (
    <ContentCard
      title={title}
      subtitle={`${total} prompts found`}
      headerRight={
        <div className="flex items-center gap-3">
          {/* Topic Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-figma-sm">
                {selectedTopic ? topics.find(t => t.id === selectedTopic)?.name : 'All topics'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onTopicChange(null)}>All topics</DropdownMenuItem>
              <DropdownMenuSeparator />
              {topics.map((topic) => (
                <DropdownMenuItem key={topic.id} onClick={() => onTopicChange(topic.id)}>
                  {topic.name} ({topic.promptCount})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-figma-muted" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 w-[200px] text-figma-sm"
            />
          </div>
        </div>
      }
    >
      {prompts.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="w-10 h-10 text-figma-muted mx-auto mb-3" />
          <p className="text-figma-sm font-medium text-figma-primary">No prompts found</p>
          <p className="text-figma-xs text-figma-secondary mt-1">
            Try adjusting your search or filters
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onSearchChange('');
              onTopicChange(null);
            }}
            className="mt-3 text-figma-blue"
          >
            Clear all filters
          </Button>
        </div>
      ) : (
        <>
          <TableHeader
            gridCols="grid-cols-[1fr_90px_100px_80px_70px]"
            columns={[
              { label: 'PROMPT' },
              { label: 'STAGE' },
              { label: 'PLATFORMS' },
              { label: 'SENTIMENT' },
              { label: 'MENTIONS', align: 'right' },
            ]}
          />
          <div className="space-y-0">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                onClick={() => onRowClick(prompt)}
                className={cn(
                  'grid grid-cols-[1fr_90px_100px_80px_70px] gap-3 items-center py-3 px-2',
                  'border-b border-figma-border-light last:border-0',
                  'hover:bg-figma-hover cursor-pointer transition-colors'
                )}
              >
                {/* Prompt text */}
                <div className="min-w-0">
                  <p className="text-figma-sm text-figma-primary truncate">"{prompt.text}"</p>
                  {prompt.topicName && (
                    <span className="text-figma-2xs text-figma-muted mt-0.5">{prompt.topicName}</span>
                  )}
                </div>

                {/* Stage badge */}
                <span
                  className={cn(
                    'text-figma-2xs font-medium px-2 py-0.5 rounded w-fit',
                    STAGE_BADGE_COLORS[prompt.stage]
                  )}
                >
                  {prompt.stageName}
                </span>

                {/* Platforms */}
                <div className="flex items-center gap-1">
                  {prompt.platforms.slice(0, 4).map((pId) => (
                    <PlatformIcon key={pId} platform={pId} size="xs" />
                  ))}
                  {prompt.platforms.length > 4 && (
                    <span className="text-figma-2xs text-figma-muted">
                      +{prompt.platforms.length - 4}
                    </span>
                  )}
                </div>

                {/* Sentiment */}
                <SentimentBadge
                  sentiment={prompt.dominantSentiment}
                  label={SENTIMENT_SHORT_LABELS[prompt.dominantSentiment]}
                />

                {/* Mentions */}
                <div className="flex items-center justify-end gap-1">
                  <span className="text-figma-sm font-medium text-figma-primary tabular-nums">
                    {prompt.mentions}
                  </span>
                  {prompt.trend !== 0 && (
                    <span
                      className={cn(
                        'text-figma-2xs',
                        prompt.trend > 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
                      )}
                    >
                      {prompt.trend > 0 ? '↑' : '↓'}
                    </span>
                  )}
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
 * Prompt Detail Drawer
 */
function PromptDetailDrawer({
  prompt,
  isOpen,
  onClose,
  isLoading,
  onNavigateToPrompt,
}: {
  prompt: PromptDetail | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
  onNavigateToPrompt: (id: string) => void;
}) {
  const [citationTab, setCitationTab] = useState<'owned' | 'third-party' | 'social'>('owned');

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading || !prompt ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-figma-muted" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Header */}
            <SheetHeader>
              <SheetTitle className="text-figma-md font-semibold text-figma-primary text-left">
                "{prompt.text}"
              </SheetTitle>
            </SheetHeader>

            {/* Stats Bar */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-figma-hover rounded-lg">
              <span
                className={cn(
                  'text-figma-2xs font-medium px-2 py-0.5 rounded',
                  STAGE_BADGE_COLORS[prompt.stage]
                )}
              >
                {prompt.stageName}
              </span>
              {prompt.topicName && (
                <span className="text-figma-xs text-figma-secondary">{prompt.topicName}</span>
              )}
              <span className="text-figma-xs text-figma-muted tabular-nums">
                {prompt.mentions} mentions
                {prompt.trend !== 0 && (
                  <span
                    className={cn(
                      'ml-1',
                      prompt.trend > 0 ? 'text-figma-trend-up' : 'text-figma-trend-down'
                    )}
                  >
                    {prompt.trend > 0 ? '+' : ''}
                    {prompt.trend}%
                  </span>
                )}
              </span>
              <SentimentBadge sentiment={prompt.dominantSentiment} />
              <span className="text-figma-xs text-figma-muted tabular-nums">
                {prompt.citationCount} sources
              </span>
            </div>

            {/* Section 1: Sentiment by Platform */}
            <section className="space-y-4">
              <div>
                <h3 className="text-figma-sm font-semibold text-figma-primary">
                  Sentiment by platform
                </h3>
                <p className="text-figma-2xs text-figma-muted mt-0.5">
                  How each AI talks about your brand for this prompt
                </p>
              </div>

              <div className="space-y-2">
                {prompt.platformDetails.map((platform) => (
                  <div
                    key={platform.platformId}
                    className={cn(
                      'flex items-start gap-3 py-2 px-3 rounded-lg',
                      platform.mentioned ? 'bg-figma-hover' : 'opacity-60'
                    )}
                  >
                    <PlatformIcon platform={platform.platformId} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-figma-sm font-medium text-figma-primary">
                          {platform.platformName}
                        </span>
                        {platform.mentioned && platform.sentiment ? (
                          <SentimentBadge sentiment={platform.sentiment} />
                        ) : (
                          <span className="text-figma-2xs text-figma-muted">Not mentioned</span>
                        )}
                      </div>
                      {platform.snippet && (
                        <p className="text-figma-xs text-figma-secondary mt-1 line-clamp-2">
                          "{platform.snippet}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sentiment breakdown bar */}
              <div className="bg-figma-hover rounded-lg p-3">
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-figma-green"
                    style={{ width: `${prompt.sentimentBreakdown.positive}%` }}
                  />
                  <div
                    className="bg-amber-400"
                    style={{ width: `${prompt.sentimentBreakdown.neutral}%` }}
                  />
                  <div
                    className="bg-figma-red"
                    style={{ width: `${prompt.sentimentBreakdown.negative}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-figma-2xs">
                  <span className="text-figma-green">{prompt.sentimentBreakdown.positive}% positive</span>
                  <span className="text-figma-muted">{prompt.sentimentBreakdown.neutral}% neutral</span>
                  <span className="text-figma-red">{prompt.sentimentBreakdown.negative}% negative</span>
                </div>
              </div>
            </section>

            {/* Section 2: Sources Cited */}
            <section className="space-y-4">
              <div>
                <h3 className="text-figma-sm font-semibold text-figma-primary">Sources cited</h3>
                <p className="text-figma-2xs text-figma-muted mt-0.5">
                  What sources AI platforms reference when answering this prompt
                </p>
              </div>

              {/* Source type tabs */}
              <Tabs value={citationTab} onValueChange={(v) => setCitationTab(v as typeof citationTab)}>
                <TabsList className="inline-flex gap-2 bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="owned"
                    className="rounded-none px-2 pb-2 pt-0 text-figma-xs font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium bg-transparent shadow-none"
                  >
                    Owned ({prompt.citations.owned.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="third-party"
                    className="rounded-none px-2 pb-2 pt-0 text-figma-xs font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium bg-transparent shadow-none"
                  >
                    Third-party ({prompt.citations.thirdParty.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="rounded-none px-2 pb-2 pt-0 text-figma-xs font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium bg-transparent shadow-none"
                  >
                    Social ({prompt.citations.social.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="owned" className="mt-3">
                  <CitationList
                    sources={prompt.citations.owned}
                    emptyMessage="No owned sources cited"
                  />
                </TabsContent>
                <TabsContent value="third-party" className="mt-3">
                  <CitationList
                    sources={prompt.citations.thirdParty}
                    emptyMessage="No third-party sources cited"
                  />
                </TabsContent>
                <TabsContent value="social" className="mt-3">
                  <CitationList
                    sources={prompt.citations.social}
                    emptyMessage="No social sources cited"
                  />
                </TabsContent>
              </Tabs>

              {/* Citation summary */}
              <div className="bg-figma-hover rounded-lg p-3 grid grid-cols-2 gap-2 text-figma-2xs">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3 h-3 text-figma-blue" />
                  <span className="text-figma-secondary">
                    Owned: {prompt.citations.summary.owned.count} ({prompt.citations.summary.owned.percentage}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Newspaper className="w-3 h-3 text-figma-secondary" />
                  <span className="text-figma-secondary">
                    Third-party: {prompt.citations.summary.thirdParty.count}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-figma-muted" />
                  <span className="text-figma-secondary">
                    Social: {prompt.citations.summary.social.count}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-figma-muted" />
                  <span className="text-figma-secondary">
                    Other: {prompt.citations.summary.other.count}
                  </span>
                </div>
              </div>
            </section>

            {/* Section 3: Competitors */}
            <section className="space-y-4">
              <h3 className="text-figma-sm font-semibold text-figma-primary">
                Competitors in this prompt
              </h3>

              <div className="space-y-2">
                {prompt.competitors.map((comp) => (
                  <div
                    key={comp.id}
                    className={cn(
                      'flex items-center gap-3 py-2 px-3 rounded-lg',
                      comp.isYou && 'bg-figma-blue-light ring-1 ring-figma-blue/30'
                    )}
                  >
                    {comp.isYou && <Star className="w-3.5 h-3.5 text-figma-blue shrink-0" />}
                    <span
                      className={cn(
                        'text-figma-sm flex-1',
                        comp.isYou ? 'font-semibold text-figma-primary' : 'text-figma-secondary'
                      )}
                    >
                      {comp.name} {comp.isYou && '[You]'}
                    </span>
                    <span className="text-figma-xs text-figma-muted tabular-nums">
                      {comp.platformCount}/{PLATFORMS.length} platforms
                    </span>
                    <SentimentBadge sentiment={comp.dominantSentiment} />
                  </div>
                ))}
              </div>
            </section>

            {/* Section 4: Related Prompts */}
            <section className="space-y-4">
              <h3 className="text-figma-sm font-semibold text-figma-primary">Related prompts</h3>

              <div className="space-y-2">
                {prompt.relatedPrompts.map((related) => (
                  <div
                    key={related.id}
                    className="flex items-center gap-3 py-2 cursor-pointer hover:bg-figma-hover rounded-lg px-2 transition-colors"
                    onClick={() => {
                      onClose();
                      setTimeout(() => onNavigateToPrompt(related.id), 100);
                    }}
                  >
                    <span className="text-figma-sm text-figma-primary flex-1 truncate">
                      "{related.text}"
                    </span>
                    <span className="text-figma-xs text-figma-muted tabular-nums shrink-0">
                      {related.mentions} mentions
                    </span>
                    <SentimentBadge sentiment={related.dominantSentiment} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/**
 * Citation list for drawer tabs
 */
function CitationList({
  sources,
  emptyMessage,
}: {
  sources: { url: string; displayUrl: string; platforms: string[] }[];
  emptyMessage: string;
}) {
  if (sources.length === 0) {
    return (
      <p className="text-figma-xs text-figma-muted py-4 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-2">
      {sources.map((source) => (
        <div key={source.url} className="flex items-center gap-3 py-2 px-3 bg-figma-hover rounded-lg">
          <Link2 className="w-3.5 h-3.5 text-figma-blue shrink-0" />
          <div className="flex-1 min-w-0">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-figma-sm text-figma-blue hover:underline truncate block"
            >
              {source.displayUrl}
            </a>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-figma-2xs text-figma-muted">Cited by:</span>
            {source.platforms.slice(0, 4).map((pId) => (
              <PlatformIcon key={pId} platform={pId} size="xs" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export function PromptsPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { range, setRange } = useTimeRange('30d');
  const timeRangePreset = range.preset as TimeRangePreset;

  // Get initial tab from URL or default to 'all'
  const urlParams = new URLSearchParams(search);
  const initialTab = (urlParams.get('tab') as BuyerJourneyStage) || 'all';

  // State
  const [activeTab, setActiveTab] = useState<BuyerJourneyStage | 'all'>(initialTab);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

  // Data fetching
  const {
    data: funnelData,
    isLoading: funnelLoading,
    isFetching: funnelFetching,
    error: funnelError,
    refetch: refetchFunnel,
  } = useFunnelCoverage(timeRangePreset);

  const {
    data: promptsData,
    isLoading: promptsLoading,
    isFetching: promptsFetching,
  } = usePrompts({
    timeRange: timeRangePreset,
    stage: activeTab !== 'all' ? activeTab : undefined,
    topic: selectedTopic || undefined,
    search: searchQuery || undefined,
    limit: 25,
    offset,
  });

  const {
    data: trendingData,
    isLoading: trendingLoading,
  } = useTrendingPrompts(timeRangePreset);

  const { data: topicsData } = useTopics();

  const {
    data: promptDetailData,
    isLoading: detailLoading,
  } = usePromptDetail(selectedPromptId);

  // Handlers
  const handleTabChange = (tab: string) => {
    const newTab = tab as BuyerJourneyStage | 'all';
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

  const handleStageClick = (stage: BuyerJourneyStage) => {
    handleTabChange(stage);
  };

  const handleTimeRangeChange = (newRange: TimeRange) => {
    setRange(newRange);
    setOffset(0);
  };

  const handleRowClick = (prompt: Prompt) => {
    setSelectedPromptId(prompt.id);
  };

  const handleDrawerClose = () => {
    setSelectedPromptId(null);
  };

  const handleLoadMore = () => {
    setOffset((prev) => prev + 25);
  };

  const handleRetry = () => {
    refetchFunnel();
  };

  // Computed
  const isLoading = funnelLoading || promptsLoading;
  const isRefreshing = funnelFetching && !funnelLoading;
  const topPrompts = promptsData?.prompts.slice().sort((a, b) => b.mentions - a.mentions).slice(0, 5) || [];
  const trendingPrompts = trendingData?.prompts || [];

  // Error state
  if (funnelError && !funnelLoading) {
    return (
      <main role="main" aria-label="Prompts">
        <PageHeader
          title="Prompts & Topics"
          subtitle="Understand what questions drive AI visibility"
          action={<TimeRangeSelector value={range} onChange={handleTimeRangeChange} />}
        />
        <ErrorState
          title="Couldn't load prompts data"
          error={funnelError instanceof Error ? funnelError.message : 'Unknown error'}
          onRetry={handleRetry}
        />
      </main>
    );
  }

  return (
    <main role="main" aria-label="Prompts">
      {/* Page Header */}
      <PageHeader
        title="Prompts & Topics"
        subtitle="Understand what questions drive AI visibility"
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
      <StaleDataWarning cacheAge={funnelData?.meta?.cacheAge} onRefresh={handleRetry} />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className={cn('w-full transition-opacity duration-200', isRefreshing && 'opacity-60')}
      >
        <TabsList className="mb-6 inline-flex items-center gap-6 bg-transparent rounded-none p-0 h-auto border-b border-figma-border-light w-full justify-start">
          {JOURNEY_STAGES.map((stage) => (
            <TabsTrigger
              key={stage.id}
              value={stage.id}
              className="rounded-none px-0 pb-2 pt-0 text-figma-sm font-normal text-figma-secondary border-b-2 border-transparent data-[state=active]:border-figma-blue data-[state=active]:text-figma-primary data-[state=active]:font-medium data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:text-figma-primary transition-colors"
            >
              {stage.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab Content (same structure for all tabs) */}
        <TabsContent value={activeTab} forceMount className={activeTab !== activeTab ? 'hidden' : ''}>
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-figma-muted" />
            </div>
          ) : (
          <div className="space-y-8">
            {/* Row 1: Funnel Coverage */}
            <FunnelCoverageCard
              stages={funnelData?.stages || []}
              currentTab={activeTab}
              insight={funnelData?.insight}
              onStageClick={handleStageClick}
            />

            {/* Row 2: Top + Trending */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopPromptsCard
                prompts={topPrompts}
              />
              <TrendingPromptsCard
                prompts={trendingPrompts}
              />
            </div>

            {/* Row 3: Prompts Table */}
            <PromptsTable
              prompts={promptsData?.prompts || []}
              total={promptsData?.total || 0}
              hasMore={promptsData?.hasMore || false}
              isLoadingMore={promptsFetching && offset > 0}
              topics={topicsData?.topics || []}
              selectedTopic={selectedTopic}
              searchQuery={searchQuery}
              onTopicChange={setSelectedTopic}
              onSearchChange={setSearchQuery}
              onLoadMore={handleLoadMore}
              onRowClick={handleRowClick}
              stageTab={activeTab}
            />
          </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Prompt Detail Drawer */}
      <PromptDetailDrawer
        prompt={promptDetailData || null}
        isOpen={!!selectedPromptId}
        onClose={handleDrawerClose}
        isLoading={detailLoading}
        onNavigateToPrompt={(id) => setSelectedPromptId(id)}
      />
    </main>
  );
}

export default PromptsPage;
