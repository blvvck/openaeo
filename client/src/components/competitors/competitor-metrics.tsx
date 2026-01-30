/**
 * Competitor Metrics Cards — CLEAN VERSION
 *
 * Following dashboard card pattern: MetricCard + shared components
 * Detail breakdowns go in tooltips, not on card face
 */

import { cn } from '@/lib/utils';
import { Info } from 'lucide-react';
import { MetricCard, MetricListScroller, CardLabel, CardSubtitle, CardDivider, StatMetric, Skeleton } from '@/components/shared';
import { PlatformIcon, PLATFORMS } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

// =============================================================================
// Info Tooltip Helper
// =============================================================================

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

function PeriodEmpty({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-h-[110px] w-full min-w-0 items-center justify-center break-words px-2 text-center text-figma-2xs text-figma-muted', className)}>
      No results in this period
    </div>
  );
}

// =============================================================================
// Types
// =============================================================================

interface PlatformBreakdown {
  platform: string;
  percentage: number;
  trend?: 'up' | 'down' | 'neutral';
}

interface CompetitorDelta {
  name: string;
  delta: number;
  domain?: string;
  logoUrl?: string | null;
}

interface CompetitorPlatformShare {
  name: string;
  isYou?: boolean;
  rank: number;
  shares: Record<string, number>; // platformId -> percentage
}

interface ShareOfAnswerData {
  percentage: number;
  trend: number; // raw trend value for StatMetric
  trackedPrompts: number;
  platforms?: PlatformBreakdown[];
  /** Competitor comparison for table view */
  competitorShares?: CompetitorPlatformShare[];
}

import type { CategorizedCitationSources } from '@shared/types';

interface CitationRateData {
  percentage: number;
  trend: number;
  totalCitations: number;
  sources?: CategorizedCitationSources;
}

interface CompetitivePressureData {
  netWins: number;
  takeovers: number;
  losses: number;
  competitors?: CompetitorDelta[];
}

// =============================================================================
// Card 0: Your Rank (first card — provides immediate context)
// =============================================================================

interface RankedCompetitor {
  name: string;
  rank: number;
  isYou?: boolean;
  domain?: string;
  logoUrl?: string | null;
  score?: number; // visibility score percentage
}

interface YourRankData {
  rank: number;
  totalCompetitors: number;
  change?: number; // position change vs last period
  competitors: RankedCompetitor[];
}

interface YourRankCardProps {
  data: YourRankData | null;
  isLoading?: boolean;
  brandName?: string;
  noPeriodData?: boolean;
}

export function YourRankCard({ data, isLoading, brandName = 'Your Brand', noPeriodData = false }: YourRankCardProps) {
  // Empty state: no data OR only "you" in the ranking (no real competitors)
  const isEmpty = !data || data.totalCompetitors <= 1;

  // Loading skeleton — matches: title, metric, subtitle, divider, column headers, 4 data rows
  if (isLoading) {
    return (
      <MetricCard>
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-8 w-24 mt-2 mb-1 rounded" />
        <Skeleton className="h-3 w-36 rounded" />
        <CardDivider className="mt-5 mb-1.5" />
        <MetricListScroller
          header={
            <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 w-5 rounded" />
            <Skeleton className="h-2.5 w-4 rounded" />
            <Skeleton className="h-2.5 flex-1 rounded" />
            <Skeleton className="h-2.5 w-8 rounded" />
            </div>
          }
        >
          {/* Data rows skeleton */}
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2.5 w-5 rounded" />
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-2.5 flex-1 rounded" />
                <Skeleton className="h-2.5 w-8 rounded" />
              </div>
            ))}
          </div>
        </MetricListScroller>
      </MetricCard>
    );
  }

  return (
    <MetricCard>
      <div className="flex items-center">
        <CardLabel>Your rank</CardLabel>
        <InfoTooltip content="Your visibility ranking among tracked competitors across all LLM platforms" />
      </div>

      {isEmpty || noPeriodData ? (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary">#—</span>
            <span className="text-figma-base text-figma-secondary">of —</span>
          </div>
          <CardSubtitle>{noPeriodData ? '—' : 'Add competitors to see rankings'}</CardSubtitle>
        </>
      ) : (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary tabular-nums">
              #{data.rank}
            </span>
            <span className="text-figma-base text-figma-secondary">
              of {data.totalCompetitors}
            </span>
            {data.change !== undefined && data.change !== 0 && (
              <span className={cn(
                "text-figma-sm font-medium",
                data.change < 0 ? "text-figma-trend-up" : "text-figma-trend-down"
              )}>
                {data.change < 0 ? '↑' : '↓'}{Math.abs(data.change)}
              </span>
            )}
          </div>
          <CardSubtitle>
            {data.rank === 1 ? "You're leading!" : `${data.rank - 1} ahead of you`}
          </CardSubtitle>
        </>
      )}

      <CardDivider className="mt-5 mb-1.5" />

      {/* Competitor list with avatars and positions */}
      <MetricListScroller
        header={
          <div className="flex items-center gap-2">
          <span className="text-figma-2xs font-medium text-figma-muted w-5">Rank</span>
          <span className="text-figma-2xs font-medium text-figma-muted w-5"></span>
          <span className="text-figma-2xs font-medium text-figma-muted flex-1">Company</span>
          <span className="text-figma-2xs font-medium text-figma-muted w-8 text-right">Score</span>
          </div>
        }
      >

        {noPeriodData ? <PeriodEmpty /> : <div className="space-y-1.5">
        {isEmpty ? (
          // Empty state: show placeholder rows (your brand first for emphasis, not rank)
          [`${brandName} (You)`, 'Competitor 1', 'Competitor 2', 'Competitor 3'].map((name, idx) => (
            <div key={name} className="flex items-center gap-2">
              <span className={cn(
                "text-figma-2xs font-medium tabular-nums w-5",
                name.includes('You') ? "text-figma-blue" : "text-figma-muted"
              )}>
                #—
              </span>
              <CompanyAvatar
                name={name.replace(' (You)', '')}
                size="xs"
                isPlaceholder={idx > 0}
              />
              <span className={cn(
                "text-figma-2xs truncate flex-1 min-w-0",
                name.includes('You') ? "font-medium text-figma-blue" : "text-figma-muted"
              )}>
                {name}
              </span>
              <span className="text-figma-2xs tabular-nums text-figma-muted w-8 text-right">
                —%
              </span>
            </div>
          ))
        ) : (
          data.competitors.slice(0, 5).map((comp) => (
            <div key={comp.name} className="flex items-center gap-2">
              <span className={cn(
                "text-figma-2xs font-medium tabular-nums w-5",
                comp.isYou ? "text-figma-blue" : "text-figma-muted"
              )}>
                #{comp.rank}
              </span>
              <CompanyAvatar
                name={comp.name}
                domain={comp.domain}
                logoUrl={comp.logoUrl}
                size="xs"
              />
              <span className={cn(
                "text-figma-2xs truncate flex-1 min-w-0",
                comp.isYou ? "font-medium text-figma-blue" : "text-figma-secondary"
              )}>
                {comp.name}{comp.isYou ? ' (You)' : ''}
              </span>
              <span className={cn(
                "text-figma-2xs tabular-nums w-8 text-right",
                comp.isYou ? "font-medium text-figma-blue" : "text-figma-secondary"
              )}>
                {comp.score != null ? `${comp.score}%` : '—%'}
              </span>
            </div>
          ))
        )}
        </div>}
      </MetricListScroller>
    </MetricCard>
  );
}

// =============================================================================
// Helper: Platform Bar (simple stacked bar for card face)
// =============================================================================

function SimplePlatformBar({ platforms }: { platforms?: PlatformBreakdown[] }) {
  if (!platforms || platforms.length === 0) {
    return <div className="h-1.5 rounded-full bg-figma-bar-track" />;
  }

  const colors: Record<string, string> = {
    'chatgpt': '#10A37F',
    'perplexity': '#06B6D4',
    'gemini': '#8B5CF6',
    'claude': '#E07A2F',
    'grok': '#6B7280',
    'ai-overview': '#4285F4',
  };

  return (
    <div className="h-1.5 rounded-full bg-figma-bar-track overflow-hidden flex">
      {platforms.map((p) => (
        <div
          key={p.platform}
          style={{
            width: `${p.percentage}%`,
            backgroundColor: colors[p.platform] || '#6B7280',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Helper: Simple Progress Bar
// =============================================================================

function SimpleProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="h-1.5 rounded-full bg-figma-bar-track overflow-hidden">
      <div
        className="h-full rounded-full bg-figma-green transition-all"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
}

// =============================================================================
// Helper: Source Donut (mini version for card face)
// =============================================================================

// Colors for citation categories
const CITATION_COLORS = {
  owned: '#22C55E',      // green
  thirdParty: '#3B82F6', // blue
  social: '#8B5CF6',     // purple
};

function MiniSourceDonut({ sources }: { sources?: CategorizedCitationSources }) {
  if (!sources) {
    return <div className="w-[48px] h-[48px] rounded-full border-[6px] border-figma-bar-track" />;
  }

  // Build gradient from categorized sources
  const parts = [
    { percentage: sources.owned.percentage, color: CITATION_COLORS.owned },
    { percentage: sources.thirdParty.percentage, color: CITATION_COLORS.thirdParty },
    { percentage: sources.social.percentage, color: CITATION_COLORS.social },
  ].filter(p => p.percentage > 0);

  if (parts.length === 0) {
    return <div className="w-[48px] h-[48px] rounded-full border-[6px] border-figma-bar-track" />;
  }

  // Simple CSS conic gradient donut
  const gradientStops = parts.reduce((acc, source, i) => {
    const start = i === 0 ? 0 : parts.slice(0, i).reduce((sum, s) => sum + s.percentage, 0);
    const end = start + source.percentage;
    return `${acc}${acc ? ', ' : ''}${source.color} ${start}% ${end}%`;
  }, '');

  return (
    <div
      className="w-[48px] h-[48px] rounded-full"
      style={{
        background: `conic-gradient(${gradientStops})`,
        mask: 'radial-gradient(circle, transparent 55%, black 55%)',
        WebkitMask: 'radial-gradient(circle, transparent 55%, black 55%)',
      }}
    />
  );
}

// =============================================================================
// Card 1: Share of Answer
// =============================================================================

interface ShareOfAnswerCardProps {
  data: ShareOfAnswerData | null;
  isLoading?: boolean;
  brandName?: string;
  noPeriodData?: boolean;
}

export function ShareOfAnswerCard({ data, isLoading, brandName = 'Your Brand', noPeriodData = false }: ShareOfAnswerCardProps) {
  // Empty state: no data OR only "you" in competitor shares (no real competitors)
  const hasRealCompetitors = data?.competitorShares && data.competitorShares.filter(c => !c.isYou).length > 0;
  const isEmpty = !data || !hasRealCompetitors;

  // Loading skeleton — matches: title, metric, subtitle, divider, table header (Platform/You/Comp1/Comp2), 4 platform rows
  if (isLoading) {
    return (
      <MetricCard>
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-8 w-20 mt-2 mb-1 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
        <CardDivider className="mt-5 mb-1.5" />
        <div className="min-h-0 flex-1 overflow-auto scrollbar-none">
          {/* Table header skeleton */}
          <div className="flex items-center pb-1.5 border-b border-figma-border-light">
            <Skeleton className="h-3 w-[60px] rounded mr-1" />
            <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
            <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
            <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
          </div>
          {/* Table rows skeleton — first row has extra pt-1.5 */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`flex items-center py-0.5 ${i === 0 ? 'pt-1.5' : ''}`}>
              <div className="flex items-center gap-1 w-[60px] pr-1">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-8 rounded" />
              </div>
              <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
              <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
              <Skeleton className="h-3 w-[52px] rounded mx-0.5" />
            </div>
          ))}
        </div>
      </MetricCard>
    );
  }

  return (
    <MetricCard>
      <div className="flex items-center">
        <CardLabel>Share of answer</CardLabel>
        <InfoTooltip content="Percentage of tracked prompts where your brand appears in the LLM response" />
      </div>

      {isEmpty || noPeriodData ? (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary">{noPeriodData ? '—%' : '0.0%'}</span>
            <span className="text-figma-sm font-medium text-figma-secondary">—%</span>
          </div>
          <CardSubtitle>of {noPeriodData ? '—' : '0'} tracked prompts</CardSubtitle>
        </>
      ) : (
        <>
          <StatMetric value={data.percentage.toFixed(1)} trend={data.trend} valueSuffix="%" />
          <CardSubtitle>of {data.trackedPrompts.toLocaleString()} tracked prompts</CardSubtitle>
        </>
      )}

      <CardDivider className="mt-5 mb-1.5" />

      {/* Competitor comparison table */}
      <div className="flex min-h-0 flex-1 flex-col">
        {!isEmpty && data?.competitorShares && data.competitorShares.length > 0 ? (
          (() => {
            const sorted = [...data.competitorShares].sort((a, b) => {
              if (a.isYou) return -1;
              if (b.isYou) return 1;
              return a.rank - b.rank;
            });
            const uniqueCompetitors = sorted.filter((comp, idx, arr) =>
              arr.findIndex(c => c.name === comp.name) === idx
            ).slice(0, 4);

            const colgroup = (
              <colgroup>
                <col style={{ width: 60 }} />
                {uniqueCompetitors.map((comp) => (
                  <col key={comp.name} />
                ))}
              </colgroup>
            );

            return (
              <>
                <table className="w-full table-fixed border-separate border-spacing-0 text-figma-2xs">
                  {colgroup}
                  <thead>
                    <tr>
                      <th className="border-b border-figma-border-light pb-1.5 pr-1 text-left font-medium text-figma-muted">Platform</th>
                      {uniqueCompetitors.map((comp) => (
                        <th
                          key={comp.name}
                          className={cn(
                            "truncate border-b border-figma-border-light pb-1.5 px-0.5 text-center font-medium",
                            comp.isYou ? "text-figma-blue" : "text-figma-muted"
                          )}
                        >
                          {comp.isYou ? `You (#${comp.rank})` : `#${comp.rank} ${comp.name}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                </table>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
                {noPeriodData ? <PeriodEmpty /> : <table className="w-full table-fixed text-figma-2xs">
                    {colgroup}
                    <tbody>
                      {PLATFORMS.slice(0, 5).map((platform) => (
                        <tr key={platform.id}>
                          <td className="py-1 pr-1">
                            <div className="flex items-center gap-1">
                              <PlatformIcon platform={platform.id} size="xs" />
                              <span className="truncate text-figma-muted">{platform.name}</span>
                            </div>
                          </td>
                          {uniqueCompetitors.map((comp) => {
                            const share = comp.shares[platform.id];
                            return (
                              <td
                                key={`${platform.id}-${comp.name}`}
                                className={cn(
                                  "text-center py-1 px-0.5 tabular-nums",
                                  comp.isYou ? "font-medium text-figma-primary" : "text-figma-secondary"
                                )}
                              >
                                {share != null ? `${share}%` : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>}
                </div>
              </>
            );
          })()
        ) : (
          <>
            <table className="w-full table-fixed border-separate border-spacing-0 text-figma-2xs">
              <colgroup>
                <col style={{ width: 60 }} />
                <col /><col /><col />
              </colgroup>
              <thead>
                <tr>
                  <th className="border-b border-figma-border-light pb-1.5 pr-1 text-left font-medium text-figma-muted">Platform</th>
                  <th className="truncate border-b border-figma-border-light pb-1.5 px-0.5 text-center font-medium text-figma-blue" title={`${brandName} (You)`}>
                    {brandName}
                  </th>
                  <th className="border-b border-figma-border-light pb-1.5 px-0.5 text-center font-medium text-figma-muted">Comp 1</th>
                  <th className="border-b border-figma-border-light pb-1.5 px-0.5 text-center font-medium text-figma-muted">Comp 2</th>
                </tr>
              </thead>
            </table>
            <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
              {noPeriodData ? <PeriodEmpty /> : <table className="w-full table-fixed text-figma-2xs">
                <colgroup>
                  <col style={{ width: 60 }} />
                  <col /><col /><col />
                </colgroup>
                <tbody>
                  {PLATFORMS.slice(0, 4).map((platform) => (
                    <tr key={platform.id}>
                      <td className="py-1 pr-1">
                        <div className="flex items-center gap-1">
                          <PlatformIcon platform={platform.id} size="xs" />
                          <span className="truncate text-figma-muted">{platform.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-1 px-0.5 text-figma-muted">—</td>
                      <td className="text-center py-1 px-0.5 text-figma-muted">—</td>
                      <td className="text-center py-1 px-0.5 text-figma-muted">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </div>
          </>
        )}
      </div>
    </MetricCard>
  );
}

// =============================================================================
// Card 2: High-Intent Coverage
// =============================================================================

interface HighIntentQuery {
  query: string;
  topic: string;
  coverage: number; // percentage
}

interface HighIntentData {
  percentage: number;
  trend: number;
  covered: number;
  total: number;
  /** Top high-intent queries for the footer table */
  queries?: HighIntentQuery[];
}

interface HighIntentCardProps {
  data: HighIntentData | null;
  isLoading?: boolean;
  noPeriodData?: boolean;
}

// Topic badge colors
const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  'Comparison': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Best': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Alternative': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Pricing': { bg: 'bg-green-50', text: 'text-green-700' },
  'Review': { bg: 'bg-teal-50', text: 'text-teal-700' },
};

function TopicBadge({ topic }: { topic: string }) {
  const colors = TOPIC_COLORS[topic] || { bg: 'bg-figma-hover', text: 'text-figma-secondary' };
  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium truncate max-w-[60px]', colors.bg, colors.text)}>
      {topic}
    </span>
  );
}

export function HighIntentCard({ data, isLoading, noPeriodData = false }: HighIntentCardProps) {
  const isEmpty = !data;
  const queries = data?.queries || [];

  // Loading skeleton — matches: title, metric, subtitle, divider, column headers (Query/Topic/%), 4 data rows
  if (isLoading) {
    return (
      <MetricCard>
        <Skeleton className="h-4 w-36 rounded" />
        <Skeleton className="h-8 w-16 mt-2 mb-1 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
        <CardDivider className="mt-5 mb-1.5" />
        <MetricListScroller
          header={
            <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 flex-1 rounded" />
            <Skeleton className="h-2.5 w-[70px] rounded" />
            <Skeleton className="h-2.5 w-8 rounded" />
            </div>
          }
        >
          {/* Data rows skeleton */}
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-0.5">
                <Skeleton className="h-2.5 flex-1 rounded" />
                <Skeleton className="h-[18px] w-[70px] rounded" />
                <Skeleton className="h-2.5 w-8 rounded" />
              </div>
            ))}
          </div>
        </MetricListScroller>
      </MetricCard>
    );
  }

  return (
    <MetricCard>
      <div className="flex items-center">
        <CardLabel>High-intent coverage</CardLabel>
        <InfoTooltip content="Coverage of prompts with buyer intent signals like 'best', 'vs', 'alternatives'" />
      </div>

      {noPeriodData || isEmpty || data?.percentage === 0 ? (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary">{noPeriodData ? '—%' : '0%'}</span>
            <span className="text-figma-sm font-medium text-figma-secondary">—%</span>
          </div>
          <CardSubtitle>of {noPeriodData ? '—' : data?.total ?? 0} buyer-intent queries</CardSubtitle>
        </>
      ) : (
        <>
          <StatMetric value={data.percentage} trend={data.trend} valueSuffix="%" />
          <CardSubtitle>
            {data.covered === 0 ? '' : `${data.covered} `}of {data.total} buyer-intent queries
          </CardSubtitle>
        </>
      )}

      <CardDivider className="mt-5 mb-1.5" />

      {/* Query table: Query | Topic | Coverage */}
      <MetricListScroller
        header={
          <div className="flex items-center gap-2">
            <span className="flex-1 text-figma-2xs font-medium text-figma-muted">Query</span>
            <span className="w-[70px] text-center text-figma-2xs font-medium text-figma-muted">Topic</span>
            <span className="w-8 text-right text-figma-2xs font-medium text-figma-muted">%</span>
          </div>
        }
      >
        {noPeriodData ? <PeriodEmpty /> : <div className="space-y-1.5">
          {queries.length > 0 ? (
            queries.slice(0, 4).map((q, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-figma-2xs truncate flex-1 min-w-0 text-figma-secondary">
                  {q.query}
                </span>
                <div className="w-[70px] flex justify-center">
                  <TopicBadge topic={q.topic} />
                </div>
                <span className="text-figma-2xs font-medium tabular-nums w-8 text-right shrink-0 text-figma-primary">
                  {q.coverage}%
                </span>
              </div>
            ))
          ) : (
            /* Empty state: placeholder rows */
            ['Query 1', 'Query 2', 'Query 3', 'Query 4'].map((query) => (
              <div key={query} className="flex items-center gap-2">
                <span className="text-figma-2xs truncate flex-1 min-w-0 text-figma-muted">
                  {query}
                </span>
                <div className="w-[70px] flex justify-center">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-figma-hover text-figma-muted">
                    Topic
                  </span>
                </div>
                <span className="text-figma-2xs tabular-nums w-8 text-right shrink-0 text-figma-muted">
                  —%
                </span>
              </div>
            ))
          )}
        </div>}
      </MetricListScroller>
    </MetricCard>
  );
}

// =============================================================================
// Card 3: Citation Rate
// =============================================================================

interface CitationRateCardProps {
  data: CitationRateData | null;
  isLoading?: boolean;
  noPeriodData?: boolean;
}

export function CitationRateCompetitorCard({ data, isLoading, noPeriodData = false }: CitationRateCardProps) {
  const isEmpty = !data;
  const sourceGroups = [
    { label: 'Owned', color: CITATION_COLORS.owned, percentage: data?.sources?.owned.percentage, sites: data?.sources?.owned.sites ?? [] },
    { label: '3rd party', color: CITATION_COLORS.thirdParty, percentage: data?.sources?.thirdParty.percentage, sites: data?.sources?.thirdParty.sites ?? [] },
    { label: 'Social', color: CITATION_COLORS.social, percentage: data?.sources?.social.percentage, sites: data?.sources?.social.sites ?? [] },
  ];

  // Loading skeleton — matches: title, metric, subtitle, divider, donut + two columns (Owned/3rd party) with 4 cites each
  if (isLoading) {
    return (
      <MetricCard>
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-8 w-20 mt-2 mb-1 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
        <CardDivider className="mt-5 mb-1.5" />
        <div className="flex-1 flex gap-3">
          {/* Mini donut skeleton */}
          <div className="shrink-0 flex items-start pt-5">
            <Skeleton className="w-[48px] h-[48px] rounded-full" />
          </div>
          {/* Two columns skeleton */}
          <div className="flex-1 flex gap-3">
            {/* Owned column */}
            <div className="flex-1">
              <div className="flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light">
                <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-10 rounded" />
                <Skeleton className="h-3 w-6 rounded ml-auto" />
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-12 rounded" />
                ))}
              </div>
            </div>
            {/* Third-party column */}
            <div className="flex-1">
              <div className="flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light">
                <Skeleton className="w-1.5 h-1.5 rounded-full shrink-0" />
                <Skeleton className="h-3 w-14 rounded" />
                <Skeleton className="h-3 w-6 rounded ml-auto" />
              </div>
              <div className="space-y-0.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-12 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </MetricCard>
    );
  }

  return (
    <MetricCard>
      <div className="flex items-center">
        <CardLabel>Citation rate</CardLabel>
        <InfoTooltip content="Percentage of LLM mentions that include a link to your site" />
      </div>

      {noPeriodData || isEmpty || data?.percentage === 0 ? (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary">{noPeriodData ? '—%' : '0.0%'}</span>
            <span className="text-figma-sm font-medium text-figma-secondary">—%</span>
          </div>
          <CardSubtitle>{noPeriodData ? '—' : data?.totalCitations ?? 0} citations</CardSubtitle>
        </>
      ) : (
        <>
          <StatMetric value={data.percentage.toFixed(1)} trend={data.trend} valueSuffix="%" />
          <CardSubtitle>{data.totalCitations.toLocaleString()} citations</CardSubtitle>
        </>
      )}

      <CardDivider className="mt-5 mb-1.5" />

      {/* Donut + two columns of citing sites */}
      <div className="flex-1 flex gap-3">
        {/* Mini donut */}
        <div className="shrink-0 flex items-start pt-5">
          <MiniSourceDonut sources={data?.sources} />
        </div>

        {/* Three columns: Owned | Third-party | Social (scroll for Social) */}
        <div className="flex flex-1 min-w-0 flex-col">
          <div className="overflow-x-auto scrollbar-hover">
            <div className="flex min-w-max gap-3">
              {sourceGroups.map((source) => (
                <div key={source.label} className="w-[80px] shrink-0 flex items-center gap-1 pb-1 mb-1 border-b border-figma-border-light whitespace-nowrap">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: source.color }} />
                  <span className="text-figma-2xs font-medium text-figma-secondary">{source.label}</span>
                  <span className="text-figma-2xs font-medium tabular-nums text-figma-muted ml-auto">
                    {isEmpty || noPeriodData ? '—' : (source.percentage ?? '—')}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          {noPeriodData ? (
            <PeriodEmpty className="min-h-[100px] flex-1" />
          ) : (
            <div className="overflow-x-auto scrollbar-hover">
              <div className="flex gap-3">
                {sourceGroups.map((source) => (
                  <div key={source.label} className="w-[80px] shrink-0 space-y-0.5">
                    {source.sites.length > 0 ? source.sites.slice(0, 4).map((site) => (
                      <p key={site} className="text-figma-2xs text-figma-muted truncate">{site}</p>
                    )) : <p className="text-figma-2xs text-figma-muted">No sources</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MetricCard>
  );
}

// =============================================================================
// Card 4: Competitive Pressure
// =============================================================================

interface CompetitivePressureCardProps {
  data: CompetitivePressureData | null;
  isLoading?: boolean;
  noPeriodData?: boolean;
}

export function CompetitivePressureCard({ data, isLoading, noPeriodData = false }: CompetitivePressureCardProps) {
  // Empty state: no data OR no competitors to compare against
  const hasRealCompetitors = data?.competitors && data.competitors.length > 0;
  const isEmpty = !data || !hasRealCompetitors;
  const isPositive = data ? data.netWins >= 0 : true;

  // Loading skeleton
  if (isLoading) {
    return (
      <MetricCard>
        <Skeleton className="h-4 w-36 rounded" />
        <Skeleton className="h-8 w-20 mt-2 mb-1 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
        <CardDivider className="mt-5 mb-1.5" />
        <MetricListScroller
          header={
            <div className="flex items-center gap-2">
            <Skeleton className="h-2.5 flex-1 rounded" />
            <Skeleton className="h-2.5 w-10 rounded" />
            <Skeleton className="h-2.5 w-6 rounded" />
            </div>
          }
        >
          {/* 4 competitor rows */}
          <div className="space-y-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 h-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-2.5 flex-1 rounded" />
                <Skeleton className="h-1.5 w-10 rounded-full" />
                <Skeleton className="h-2.5 w-6 rounded" />
              </div>
            ))}
          </div>
        </MetricListScroller>
      </MetricCard>
    );
  }

  return (
    <MetricCard>
      <div className="flex items-center">
        <CardLabel>Competitive pressure</CardLabel>
        <InfoTooltip content="Net position changes vs competitors: takeovers (wins) minus losses" />
      </div>

      {noPeriodData || isEmpty ? (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className="text-figma-lg font-bold text-figma-primary">{noPeriodData ? '—' : '0'}</span>
            <span className="text-figma-base text-figma-secondary">net wins</span>
          </div>
          <CardSubtitle>{noPeriodData ? '— takeovers · — losses' : '0 takeovers · 0 losses'}</CardSubtitle>
        </>
      ) : (
        <>
          <div className="h-[38px] flex items-baseline gap-2 mt-2 mb-1">
            <span className={cn(
              "text-figma-lg font-bold tabular-nums",
              isPositive ? "text-figma-trend-up" : "text-figma-trend-down"
            )}>
              {isPositive ? '+' : ''}{data.netWins}
            </span>
            <span className="text-figma-base font-semibold text-figma-primary">
              net wins
            </span>
          </div>
          <CardSubtitle>{data.takeovers} takeovers · {data.losses} losses</CardSubtitle>
        </>
      )}

      <CardDivider className="mt-5 mb-1.5" />

      {/* Competitor table with column headers */}
      <MetricListScroller
        header={
          <div className="flex items-center gap-2">
            <span className="flex-1 text-figma-2xs font-medium text-figma-muted">Competitor</span>
            <span className="w-10 text-center text-figma-2xs font-medium text-figma-muted">Net</span>
            <span className="w-6 text-right text-figma-2xs font-medium text-figma-muted">Δ</span>
          </div>
        }
      >
        {noPeriodData ? <PeriodEmpty /> : <div className="space-y-1.5">
          {(data?.competitors?.length ? data.competitors : [
            { name: 'Competitor 1', delta: 0 },
            { name: 'Competitor 2', delta: 0 },
            { name: 'Competitor 3', delta: 0 },
            { name: 'Competitor 4', delta: 0 },
          ]).slice(0, 4).map((comp) => (
            <div key={comp.name} className="flex items-center gap-2">
              {/* Avatar */}
              <CompanyAvatar
                name={comp.name}
                domain={comp.domain}
                logoUrl={comp.logoUrl}
                size="xs"
                isPlaceholder={isEmpty}
              />

              <span className={cn(
                "text-figma-2xs truncate flex-1 min-w-0",
                isEmpty ? "text-figma-muted" : "text-figma-secondary"
              )}>
                {comp.name}
              </span>

              {/* Diverging bar OR dash for empty state */}
              {isEmpty ? (
                <span className="text-figma-2xs text-figma-muted w-10 text-center">—</span>
              ) : (
                <div className="w-10 h-1.5 rounded-full bg-figma-bar-track overflow-hidden flex shrink-0">
                  {comp.delta < 0 ? (
                    <>
                      <div className="flex-1" />
                      <div
                        className="h-full bg-figma-trend-down"
                        style={{ width: `${Math.min(Math.abs(comp.delta) * 8, 50)}%` }}
                      />
                      <div className="w-px bg-figma-border shrink-0" />
                      <div className="w-1/2" />
                    </>
                  ) : comp.delta > 0 ? (
                    <>
                      <div className="w-1/2" />
                      <div className="w-px bg-figma-border shrink-0" />
                      <div
                        className="h-full bg-figma-trend-up"
                        style={{ width: `${Math.min(comp.delta * 8, 50)}%` }}
                      />
                      <div className="flex-1" />
                    </>
                  ) : (
                    <>
                      <div className="w-1/2" />
                      <div className="w-px bg-figma-border shrink-0" />
                      <div className="w-1/2" />
                    </>
                  )}
                </div>
              )}

              <span className={cn(
                "text-figma-2xs font-medium tabular-nums w-6 text-right shrink-0",
                comp.delta > 0 ? "text-figma-trend-up" :
                comp.delta < 0 ? "text-figma-trend-down" : "text-figma-muted"
              )}>
                {isEmpty ? '—' : (comp.delta > 0 ? '+' : '') + (comp.delta || '—')}
              </span>
            </div>
          ))}
        </div>}
      </MetricListScroller>
    </MetricCard>
  );
}

// =============================================================================
// Export All
// =============================================================================

export type {
  YourRankData,
  ShareOfAnswerData,
  CompetitorPlatformShare,
  HighIntentData,
  CitationRateData,
  CompetitivePressureData,
  PlatformBreakdown,
  CompetitorDelta,
  RankedCompetitor,
};
