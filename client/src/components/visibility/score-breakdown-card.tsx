
/**
 * ScoreBreakdownCard (Score Factors)
 *
 * Displays the breakdown of visibility score components with:
 * - 4 metric rows with enhanced micro-context (names specific platforms)
 * - LLM logo strip on platform diversity row
 * - Methodology weight % in tooltips
 * - Data-driven bottom insight with cross-tab navigation link
 * - ContentCard wrapper with figma design tokens
 *
 * Uses shared types from @shared/types
 */

import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared/dashboard-card';
import { Skeleton } from '@/components/shared/skeleton-loader';
import { TrendArrow } from '@/components/charts/trend-indicator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/profile-mark';
import { PlatformIcon, PLATFORMS } from '@/components/ui/platform-icon';
import { HelpCircle, Lightbulb } from 'lucide-react';
import type { TrendDirection, PlatformScore } from '@shared/types';

interface ScoreBreakdownProps {
  mentionCount: number;
  mentionsTrend?: number;
  citationRate: number;
  citationRateTrend?: number;
  /** Top cited source domains (e.g., ['techcrunch.com', 'g2.com']) */
  citationSources?: string[];
  sentimentBonus: number;
  sentimentTrend: TrendDirection;
  /** Sentiment distribution for mini bar */
  sentimentBreakdown?: { positive: number; neutral: number; negative: number };
  platformDiversity: {
    active: number;
    total: number;
  };
  /** Platform scores for identifying active/inactive platforms */
  platforms?: PlatformScore[];
  /** Callback to navigate to another tab */
  onNavigateTab?: (tab: string) => void;
  className?: string;
}

// ============================================================================
// Metric Row — label + help icon + value + trend + micro-context
// ============================================================================

interface MetricRowProps {
  label: string;
  value: string | number;
  trend?: number;
  trendDirection?: TrendDirection;
  tooltip?: string;
  context: string;
  format?: 'number' | 'percent' | 'signed' | 'ratio';
  /** Platform avatar stack to show alongside value */
  platforms?: PlatformScore[];
  /** Citation source domains to show alongside value */
  sources?: string[];
  /** Sentiment breakdown for mini bar */
  sentimentBreakdown?: { positive: number; neutral: number; negative: number };
}

function MetricRow({
  label,
  value,
  trend,
  trendDirection,
  tooltip,
  context,
  format = 'number',
  platforms,
  sources,
  sentimentBreakdown,
}: MetricRowProps) {

  const formatValue = () => {
    if (format === 'percent') return `${value}%`;
    if (format === 'signed') {
      const num = typeof value === 'number' ? value : parseFloat(value.toString());
      return num >= 0 ? `+${num}` : `${num}`;
    }
    if (format === 'ratio') return value;
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-US').format(value);
    }
    return value;
  };

  // Compact delta indicator: +12% ↑ (green), -5% ↓ (red), 0% (gray, no arrow)
  const renderDelta = () => {
    if (trend !== undefined) {
      // Near-zero: show "0%" in muted gray, no arrow
      if (Math.abs(trend) < 0.1) {
        return <span className="text-figma-xs font-medium tabular-nums text-figma-muted">0%</span>;
      }
      const isUp = trend > 0;
      const isDown = trend < 0;
      const colorClass = isUp ? 'text-figma-green' : isDown ? 'text-figma-red' : 'text-figma-muted';
      const arrow = isUp ? ' ↑' : isDown ? ' ↓' : '';
      const capped = Math.abs(trend) > 999;
      const display = capped ? '999' : Math.abs(trend).toFixed(1);
      return (
        <span className={cn('text-figma-xs font-medium tabular-nums', colorClass)}>
          {trend > 0 ? '+' : ''}{capped ? '>' : ''}{display}%{arrow}
        </span>
      );
    }
    if (trendDirection) {
      const colorClass = trendDirection === 'up' ? 'text-figma-green' : trendDirection === 'down' ? 'text-figma-red' : 'text-figma-muted';
      const arrow = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '';
      // If direction is flat/stable, show 0%
      if (trendDirection === 'stable' || !arrow) {
        return <span className="text-figma-xs font-medium tabular-nums text-figma-muted">0%</span>;
      }
      return (
        <span className={cn('text-figma-xs font-medium', colorClass)}>
          {arrow}
        </span>
      );
    }
    return <span className="text-figma-xs font-medium tabular-nums text-figma-muted">0%</span>;
  };

  // Dot separator
  const Dot = () => <span className="text-figma-border-light text-xs">•</span>;

  return (
    <div className="px-4 py-3 flex items-center justify-between bg-figma-hover rounded-lg flex-1">
      {/* Left: label + context */}
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="text-figma-sm text-figma-secondary">{label}</span>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-figma-muted hover:text-figma-secondary">
                  <HelpCircle className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[200px]">
                <p className="text-figma-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="text-figma-2xs text-figma-muted">{context}</p>
      </div>
      {/* Right: value • delta • visual (logos/sources/sentiment bar) */}
      <div className="flex items-center gap-2">
        <span className="text-figma-sm font-semibold text-figma-primary tabular-nums">{formatValue()}</span>
        <Dot />
        {renderDelta()}
        {platforms && (
          <>
            <Dot />
            <PlatformAvatarStack platforms={platforms} />
          </>
        )}
        {sources && (
          <>
            <Dot />
            <SourceAvatarStack sources={sources} />
          </>
        )}
        {sentimentBreakdown && (
          <>
            <Dot />
            <SentimentBar {...sentimentBreakdown} />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Platform Logo Strip — 8 logos, inactive ones grayed out
// ============================================================================

/** Normalize API platform ID to match PLATFORMS constant (underscores → hyphens) */
function normalizePlatformId(id: string): string {
  return id.toLowerCase().replace(/[\s_]+/g, '-');
}

/** Get display name from PLATFORMS constant, falling back to raw name */
function getPlatformDisplayName(apiPlatform: PlatformScore): string {
  const normalizedId = normalizePlatformId(apiPlatform.id);
  const match = PLATFORMS.find(p => p.id === normalizedId);
  return match?.name ?? apiPlatform.name;
}

/** Segmented sentiment bar with hover tooltip showing breakdown */
function SentimentBar({ positive, neutral, negative }: { positive: number; neutral: number; negative: number }) {
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const pct = {
    positive: Math.round((positive / total) * 100),
    neutral: Math.round((neutral / total) * 100),
    negative: Math.round((negative / total) * 100),
  };

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button type="button" className="flex items-center gap-0.5 cursor-help">
          {/* Segmented pills with gaps */}
          <div
            className="h-2 rounded-sm bg-figma-green min-w-[4px]"
            style={{ width: `${Math.max(pct.positive * 0.4, 4)}px` }}
          />
          <div
            className="h-2 rounded-sm bg-figma-muted min-w-[4px]"
            style={{ width: `${Math.max(pct.neutral * 0.4, 4)}px` }}
          />
          <div
            className="h-2 rounded-sm bg-figma-red min-w-[4px]"
            style={{ width: `${Math.max(pct.negative * 0.4, 4)}px` }}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        <p className="text-figma-xs font-medium text-figma-primary mb-2">Sentiment breakdown</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-figma-2xs text-figma-secondary">
              <span className="w-2 h-2 rounded-sm bg-figma-green" />
              Positive
            </span>
            <span className="text-figma-2xs font-medium text-figma-primary tabular-nums">
              {positive.toLocaleString()} ({pct.positive}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-figma-2xs text-figma-secondary">
              <span className="w-2 h-2 rounded-sm bg-figma-muted" />
              Neutral
            </span>
            <span className="text-figma-2xs font-medium text-figma-primary tabular-nums">
              {neutral.toLocaleString()} ({pct.neutral}%)
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-figma-2xs text-figma-secondary">
              <span className="w-2 h-2 rounded-sm bg-figma-red" />
              Negative
            </span>
            <span className="text-figma-2xs font-medium text-figma-primary tabular-nums">
              {negative.toLocaleString()} ({pct.negative}%)
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Source avatar stack - shows top cited sources with real favicons + hover tooltip */
function SourceAvatarStack({ sources, maxVisible = 3 }: { sources?: string[]; maxVisible?: number }) {
  if (!sources || sources.length === 0) return null;

  const visible = sources.slice(0, maxVisible);
  const overflow = sources.length - maxVisible;

  // Google's favicon service - reliable and fast
  const getFaviconUrl = (domain: string) =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button type="button" className="flex items-center -space-x-1.5 cursor-help">
          {visible.map((domain, idx) => (
            <div
              key={domain}
              className="w-5 h-5 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden"
              style={{ zIndex: maxVisible - idx + 1 }}
            >
              <img
                src={getFaviconUrl(domain)}
                alt={domain}
                className="w-3.5 h-3.5 object-contain"
                loading="eager"
              />
            </div>
          ))}
          {overflow > 0 && (
            <div
              className="w-5 h-5 rounded-full border-2 border-white bg-figma-muted flex items-center justify-center"
              style={{ zIndex: 0 }}
            >
              <span className="text-white text-[8px] font-medium">+{overflow}</span>
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        <p className="text-figma-xs font-medium text-figma-primary mb-2">Top cited sources</p>
        <div className="flex flex-col gap-1.5">
          {sources.map(domain => (
            <div key={domain} className="flex items-center gap-2">
              <img src={getFaviconUrl(domain)} alt="" className="w-4 h-4" />
              <span className="text-figma-2xs text-figma-secondary">{domain}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Compact avatar stack showing active platforms + hover tooltip */
function PlatformAvatarStack({ platforms, maxVisible = 4 }: { platforms?: PlatformScore[]; maxVisible?: number }) {
  const activePlatforms = (platforms ?? [])
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score);

  if (activePlatforms.length === 0) return null;

  const visible = activePlatforms.slice(0, maxVisible);
  const overflow = activePlatforms.length - maxVisible;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button type="button" className="flex items-center -space-x-1 cursor-help">
          {visible.map((platform, idx) => (
            <Avatar
              key={platform.id}
              className="w-5 h-5 border-2 border-white"
              style={{ zIndex: maxVisible - idx + 1 }}
            >
              <AvatarFallback className="bg-white">
                <PlatformIcon platform={normalizePlatformId(platform.id)} size="xs" />
              </AvatarFallback>
            </Avatar>
          ))}
          {overflow > 0 && (
            <Avatar className="w-5 h-5 border-2 border-white" style={{ zIndex: 0 }}>
              <AvatarFallback className="bg-figma-muted text-white text-[8px] font-medium">
                +{overflow}
              </AvatarFallback>
            </Avatar>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="p-3">
        <p className="text-figma-xs font-medium text-figma-primary mb-2">Active platforms</p>
        <div className="flex flex-col gap-1.5">
          {activePlatforms.map(platform => (
            <div key={platform.id} className="flex items-center gap-2">
              <PlatformIcon platform={normalizePlatformId(platform.id)} size="xs" />
              <span className="text-figma-2xs text-figma-secondary">{getPlatformDisplayName(platform)}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Micro-Context Generators — data-driven, never hardcoded
// ============================================================================

function getMentionsContext(count: number, platforms?: PlatformScore[]): string {
  const active = (platforms ?? []).filter(p => p.score > 0);

  if (active.length === 0) {
    return `Brand appearances in LLM responses this period`;
  }

  // Show top 3 by score, then "and N more" — don't repeat the count
  const sorted = [...active].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 3).map(p => getPlatformDisplayName(p));
  const remaining = sorted.length - top.length;

  if (remaining > 0) {
    return `Across ${top.join(', ')} and ${remaining} more`;
  }
  return `Across ${top.join(', ')}`;
}

function getCitationContext(rate: number): string {
  // Industry average citation rate is ~24%
  if (rate >= 50) return `${Math.round(rate / 24)}x more clicks to your site than avg`;
  if (rate < 24) return `Fewer clicks to your site than avg (24%)`;
  return `Average clicks to your site`;
}

/**
 * Get dominant sentiment percentage - matches what's shown in hover
 * Returns { value, label } so we know which sentiment is dominant
 */
function getSentimentData(breakdown?: { positive: number; neutral: number; negative: number }): { value: number; label: 'positive' | 'neutral' | 'negative' } {
  if (!breakdown) return { value: 0, label: 'neutral' };
  const total = breakdown.positive + breakdown.neutral + breakdown.negative;
  if (total === 0) return { value: 0, label: 'neutral' };

  const { positive, neutral, negative } = breakdown;
  const positivePct = Math.round((positive / total) * 100);
  const neutralPct = Math.round((neutral / total) * 100);
  const negativePct = Math.round((negative / total) * 100);

  if (positive >= neutral && positive >= negative) return { value: positivePct, label: 'positive' };
  if (negative >= neutral && negative >= positive) return { value: negativePct, label: 'negative' };
  return { value: neutralPct, label: 'neutral' };
}

/** Get sentiment context based on dominant sentiment — explains impact */
function getSentimentContextFromBreakdown(breakdown?: { positive: number; neutral: number; negative: number }): string {
  if (!breakdown) return 'No sentiment data available';
  const { label } = getSentimentData(breakdown);

  if (label === 'positive') return `Positive tone — adding points to your score`;
  if (label === 'negative') return `Negative tone — reduce by improving content quality`;
  return `Neutral tone — no boost or penalty`;
}

function getPlatformDiversityContext(platforms?: PlatformScore[]): string {
  const active = (platforms ?? []).filter(p => p.score > 0);
  const inactive = PLATFORMS.filter(
    plat => !active.some(a => normalizePlatformId(a.id) === plat.id)
  );

  if (inactive.length === 0) {
    return `Visible on all major LLMs`;
  }

  // Name missing platforms — actionable
  if (inactive.length <= 3) {
    return `Not visible on ${inactive.map(p => p.name).join(', ')}`;
  }
  const topMissing = inactive.slice(0, 2).map(p => p.name);
  return `Not visible on ${topMissing.join(', ')} +${inactive.length - 2} more`;
}

// ============================================================================
// Bottom Insight — data-driven focus + cross-tab navigation
// ============================================================================

interface InsightResult {
  text: string;
  targetTab: string;
}

function getInsight(props: ScoreBreakdownProps): InsightResult {
  const { citationRate, sentimentBonus, platformDiversity, mentionCount } = props;

  if (platformDiversity.active < platformDiversity.total) {
    const missing = platformDiversity.total - platformDiversity.active;
    return {
      text: `You're visible on ${platformDiversity.active} of ${platformDiversity.total} platforms. Expanding to ${missing} more could boost your score.`,
      targetTab: 'platform',
    };
  }
  if (sentimentBonus < 0) {
    return {
      text: `Sentiment (${sentimentBonus} pts) is dragging your score. Review mentions for improvement.`,
      targetTab: 'platform',
    };
  }
  if (citationRate < 30) {
    return {
      text: `Citation rate is ${citationRate}%. Improving structured content helps LLMs cite you.`,
      targetTab: 'topic',
    };
  }
  if (mentionCount < 100) {
    return {
      text: `${mentionCount} mentions this period. Creating more LLM-optimized content can increase your presence.`,
      targetTab: 'topic',
    };
  }
  return {
    text: `Strong performance across all factors. Platform diversity (${platformDiversity.active}/${platformDiversity.total}) is a key strength.`,
    targetTab: 'trends',
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function ScoreBreakdownCard({
  mentionCount,
  mentionsTrend,
  citationRate,
  citationRateTrend,
  citationSources,
  sentimentBonus,
  sentimentTrend,
  sentimentBreakdown,
  platformDiversity,
  platforms,
  onNavigateTab,
  className,
}: ScoreBreakdownProps) {
  const insight = getInsight({
    mentionCount,
    mentionsTrend,
    citationRate,
    citationRateTrend,
    sentimentBonus,
    sentimentTrend,
    platformDiversity,
    platforms,
    onNavigateTab,
  });

  return (
    <ContentCard
      title="Score factors"
      subtitle="How your visibility score is calculated"
      className={cn('h-full flex flex-col', className)}
      contentClassName="flex-1 flex flex-col"
    >
      {/* 4 metrics filling height evenly */}
      <div className="flex flex-col gap-1.5 flex-1">
        <MetricRow
          label="Mentions"
          value={mentionCount}
          trend={mentionsTrend}
          tooltip="Total brand appearances across all tracked AI responses. Weighted ~35% in your overall score."
          context={getMentionsContext(mentionCount, platforms)}
          format="number"
        />
        <MetricRow
          label="Citation rate"
          value={citationRate}
          trend={citationRateTrend}
          tooltip="Percentage of mentions that include a link to your content. Weighted ~25% in your overall score."
          context={getCitationContext(citationRate)}
          format="percent"
          sources={citationSources}
        />
        <MetricRow
          label="Sentiment"
          value={getSentimentData(sentimentBreakdown).value}
          tooltip="Dominant sentiment across your mentions. Positive boosts your score, negative pulls it down. Weighted ~20%."
          context={getSentimentContextFromBreakdown(sentimentBreakdown)}
          format="percent"
          sentimentBreakdown={sentimentBreakdown}
        />
        <MetricRow
          label="Platform diversity"
          value={`${platformDiversity.active}/${platformDiversity.total}`}
          tooltip="Platforms where your brand is actively mentioned. Weighted ~20% in your overall score."
          context={getPlatformDiversityContext(platforms)}
          format="ratio"
          platforms={platforms}
        />
      </div>
    </ContentCard>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

const METRIC_LABELS = [
  { label: 'Mentions', context: 'Brand appearances in LLM responses this period' },
  { label: 'Citation rate', context: 'How often LLMs link directly to your content' },
  { label: 'Sentiment', context: 'Points from positive or negative mention tone' },
  { label: 'Platform diversity', context: 'Platforms actively mentioning your brand' },
];

export function ScoreBreakdownCardSkeleton() {
  return (
    <ContentCard
      title="Score factors"
      subtitle="How your visibility score is calculated"
      className="h-full flex flex-col"
      contentClassName="flex-1 flex flex-col"
    >
      {/* 4 metric rows - matching actual card structure */}
      <div className="flex flex-col gap-1.5 flex-1">
        {METRIC_LABELS.map((item) => (
          <div
            key={item.label}
            className="px-4 py-3 flex items-center justify-between bg-figma-hover rounded-lg flex-1"
          >
            {/* Left: label + context - static text */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1">
                <span className="text-figma-sm text-figma-secondary">{item.label}</span>
                <div className="w-3 h-3 rounded-full bg-figma-border-light" />
              </div>
              <p className="text-figma-2xs text-figma-muted">{item.context}</p>
            </div>
            {/* Right: value + trend skeleton */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-10 rounded" />
              <span className="text-figma-border-light text-xs">•</span>
              <Skeleton className="h-4 w-12 rounded" />
            </div>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

// ============================================================================
// Empty State
// ============================================================================

const EMPTY_METRIC_DEFS = [
  { label: 'Mentions', tooltip: 'Total brand appearances across all tracked AI responses. Weighted ~35% in your overall score.', context: 'Brand appearances in LLM responses this period' },
  { label: 'Citation rate', tooltip: 'Percentage of mentions that include a link to your content. Weighted ~25% in your overall score.', context: 'How often LLMs link directly to your content' },
  { label: 'Sentiment', tooltip: 'Dominant sentiment across your mentions. Positive boosts your score, negative pulls it down. Weighted ~20%.', context: 'Points from positive or negative mention tone' },
  { label: 'Platform diversity', tooltip: 'Platforms where your brand is actively mentioned. Weighted ~20% in your overall score.', context: 'Platforms actively mentioning your brand' },
];

export function ScoreBreakdownCardEmpty() {
  return (
    <ContentCard
      title="Score factors"
      subtitle="How your visibility score is calculated"
      className="h-full flex flex-col"
      contentClassName="flex-1 flex flex-col"
    >
      <TooltipProvider>
        {/* 4 metric rows - matching actual card structure with tooltips and separators */}
        <div className="flex flex-col gap-1.5 flex-1">
          {EMPTY_METRIC_DEFS.map((item) => (
            <div
              key={item.label}
              className="px-4 py-3 flex items-center justify-between bg-figma-hover rounded-lg flex-1"
            >
              {/* Left: label + tooltip + context */}
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="text-figma-sm text-figma-secondary">{item.label}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-figma-muted hover:text-figma-secondary">
                        <HelpCircle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[200px]">
                      <p className="text-figma-xs">{item.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-figma-2xs text-figma-muted">{item.context}</p>
              </div>
              {/* Right: placeholder value • trend */}
              <div className="flex items-center gap-2">
                <span className="text-figma-sm font-semibold text-figma-muted tabular-nums">—</span>
                <span className="text-figma-border-light text-xs">•</span>
                <span className="text-figma-xs font-medium text-figma-muted">—</span>
              </div>
            </div>
          ))}
        </div>
      </TooltipProvider>
    </ContentCard>
  );
}
