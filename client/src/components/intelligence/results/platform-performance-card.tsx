/**
 * Platform Breakdown Card
 *
 * Side-by-side comparison of both brands across each AI platform.
 * Shows Score, Mentions, Citation Rate, and Sentiment for each platform.
 */

import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { PlatformResult, PromptResult } from '../types';

function sentimentFrom(values: number[]): 'positive' | 'mixed' | 'negative' | null {
  if (values.length === 0) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return average > 0.2 ? 'positive' : average < -0.2 ? 'negative' : 'mixed';
}

export function yourPlatformMetrics(results: PromptResult[] | undefined, platformId: string): PlatformMetrics {
  const entries = (results ?? []).flatMap((prompt) => prompt.results)
    .filter((entry) => entry.platformId === platformId);
  if (entries.length === 0) return { score: 0, mentions: 0, citationRate: null, sentiment: null };
  const mentioned = entries.filter((entry) => entry.mentioned);
  const mentions = mentioned.length;
  const citations = entries.filter((entry) => /https?:\/\//i.test(entry.summary)).length;
  const sentimentValues: number[] = mentioned
    .map((entry) => entry.sentiment)
    .filter((value): value is 'positive' | 'mixed' | 'negative' => value !== null)
    .map((value) => value === 'positive' ? 1 : value === 'negative' ? -1 : 0);
  const average = sentimentValues.length > 0
    ? sentimentValues.reduce((sum, value) => sum + value, 0) / sentimentValues.length
    : 0;
  const citationRate = Math.round((citations / entries.length) * 100);
  return {
    score: Math.min(100, Math.round(
      (mentions / entries.length) * 50 +
      ((average + 1) / 2) * 30 +
      citationRate * 0.2
    )),
    mentions,
    citationRate,
    sentiment: sentimentFrom(sentimentValues),
  };
}

interface PlatformMetrics {
  score: number;
  mentions: number;
  citationRate: number | null;
  sentiment: 'positive' | 'mixed' | 'negative' | null;
}

interface PlatformComparisonData {
  platformId: string;
  platformName: string;
  isActive: boolean;
  target: PlatformMetrics;
  you: PlatformMetrics;
}

interface PlatformPerformanceCardProps {
  platforms: PlatformResult[];
  yourResults?: PromptResult[];
  targetName: string;
  yourName: string;
  className?: string;
}

// Compact metric display - no winner colors, just the value
function MetricValue({
  value,
  suffix = '',
}: {
  value: number | null;
  suffix?: string;
}) {
  if (value === null || value === 0) {
    return <span className="text-figma-muted opacity-60">✕</span>;
  }
  return <span>{value}{suffix}</span>;
}

// Sentiment dot indicator
function SentimentDot({ sentiment }: { sentiment: 'positive' | 'mixed' | 'negative' | null }) {
  if (!sentiment) {
    return <span className="text-figma-muted opacity-60">✕</span>;
  }

  const colors = {
    positive: 'bg-figma-green',
    mixed: 'bg-figma-orange',
    negative: 'bg-figma-red',
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', colors[sentiment])} />
      <span className="text-figma-2xs text-figma-muted capitalize">{sentiment}</span>
    </div>
  );
}

export function PlatformPerformanceCard({
  platforms,
  yourResults,
  targetName,
  yourName,
  className,
}: PlatformPerformanceCardProps) {
  const comparisonData: PlatformComparisonData[] = platforms.map((p) => ({
    platformId: p.id,
    platformName: p.name,
    isActive: p.isActive,
    target: {
      score: p.score,
      mentions: p.mentions,
      citationRate: p.citationRate,
      sentiment: p.sentiment,
    },
    you: yourPlatformMetrics(yourResults, p.id),
  }));

  return (
    <ContentCard
      title="Platform breakdown"
      subtitle={`How ${targetName} and ${yourName} compare across AI platforms`}
      className={className}
    >
      {/* Platform cards grid - show all 8 platforms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comparisonData.map((row) => (
            <div
              key={row.platformId}
              className="border border-figma-border-light rounded-xl p-4 bg-figma-bg"
            >
              {/* Platform header */}
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-figma-border-light">
                <PlatformIcon platform={row.platformId} size="sm" />
                <span className="text-figma-sm font-semibold text-figma-primary">
                  {row.platformName}
                </span>
              </div>

              {/* Comparison table */}
              <div className="space-y-0">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 pb-2 text-figma-2xs font-medium tracking-wider">
                  <div></div>
                  <div className="text-center truncate text-figma-muted">{targetName}</div>
                  <div className="text-center truncate text-figma-blue">{yourName} (You)</div>
                </div>

                {/* Score row */}
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 py-2 border-t border-figma-border-light text-figma-xs">
                  <div className="text-figma-secondary">Score</div>
                  <div className="text-center font-semibold tabular-nums">
                    <MetricValue value={row.target.score} />
                  </div>
                  <div className="text-center font-semibold tabular-nums">
                    <MetricValue value={row.you.score} />
                  </div>
                </div>

                {/* Mentions row */}
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 py-2 border-t border-figma-border-light text-figma-xs">
                  <div className="text-figma-secondary">Mentions</div>
                  <div className="text-center tabular-nums">
                    <MetricValue value={row.target.mentions} />
                  </div>
                  <div className="text-center tabular-nums">
                    <MetricValue value={row.you.mentions} />
                  </div>
                </div>

                {/* Citation Rate row */}
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 py-2 border-t border-figma-border-light text-figma-xs">
                  <div className="text-figma-secondary">Citations</div>
                  <div className="text-center tabular-nums">
                    <MetricValue value={row.target.citationRate} suffix="%" />
                  </div>
                  <div className="text-center tabular-nums">
                    <MetricValue value={row.you.citationRate} suffix="%" />
                  </div>
                </div>

                {/* Sentiment row */}
                <div className="grid grid-cols-[1fr_80px_80px] gap-2 py-2 border-t border-figma-border-light text-figma-xs">
                  <div className="text-figma-secondary">Sentiment</div>
                  <div className="flex justify-center">
                    <SentimentDot sentiment={row.target.sentiment} />
                  </div>
                  <div className="flex justify-center">
                    <SentimentDot sentiment={row.you.sentiment} />
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </ContentCard>
  );
}
