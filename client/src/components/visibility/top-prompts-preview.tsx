import { workspaceFetch as fetch } from '@/lib/workspace-query';

/**
 * TopPromptsPreview — Table showing top prompts with full metrics.
 *
 * Columns:
 * - Prompt (2-3 lines max with ellipsis)
 * - Topic
 * - Mentions (count + platform logos)
 * - Citations
 * - Competitor mentions
 * - Journey Stage
 * - Date
 *
 * API: GET /api/prompts/top
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ContentCard } from '@/components/shared/dashboard-card';
import { Skeleton } from '@/components/shared/skeleton-loader';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimeRangePreset } from '@shared/types';

// ============================================================================
// Types
// ============================================================================

interface PlatformStatus {
  platform: string;
  mentioned: boolean;
  responded: boolean;
}

interface TopPrompt {
  id: number;
  text: string;
  topics: string[];
  mentions: number;
  citations: number;
  position: number | null;
  competitorsMentioned: string[];
  journeyStages: string[];
  platformStatus: PlatformStatus[];
  createdAt: string;
}

interface TopPromptsResponse {
  prompts: TopPrompt[];
}

interface TopPromptsPreviewProps {
  timeRange: TimeRangePreset;
  brandName: string;
  onViewAll?: () => void;
  className?: string;
}

// ============================================================================
// Data Hook
// ============================================================================

function useTopPrompts(timeRange: TimeRangePreset) {
  return useQuery<TopPromptsResponse>({
    queryKey: ['visibility', 'top-prompts', timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/prompts/top?timeRange=${timeRange}&limit=5`);
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to load prompts data');
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
  });
}

// ============================================================================
// Journey Stage Badge
// ============================================================================

const STAGE_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  problem_aware: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Problem Aware' },
  exploring: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Exploring' },
  comparing_tradeoffs: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Comparing' },
  deciding: { bg: 'bg-green-50', text: 'text-green-700', label: 'Deciding' },
  onboarding: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Onboarding' },
  power_user: { bg: 'bg-indigo-50', text: 'text-indigo-700', label: 'Power User' },
};

function JourneyStageBadges({ stages }: { stages: string[] }) {
  if (!stages || stages.length === 0) {
    return <span className="text-figma-muted">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {stages.map((stage) => {
        const config = STAGE_CONFIG[stage] ?? { bg: 'bg-gray-50', text: 'text-gray-700', label: stage };
        return (
          <span
            key={stage}
            className={cn('px-1.5 py-0.5 rounded text-figma-2xs font-medium whitespace-nowrap', config.bg, config.text)}
          >
            {config.label}
          </span>
        );
      })}
    </div>
  );
}

// ============================================================================
// Competitor Avatar Stack
// ============================================================================

/** Try to get favicon from Google, fallback to initials */
function CompetitorAvatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' }) {
  // Try common domain patterns
  const domain = name.toLowerCase().replace(/\s+/g, '') + '.com';
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

  const sizeClasses = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5';
  const imgSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className={cn(sizeClasses, 'rounded-full bg-white flex items-center justify-center overflow-hidden')}>
      <img
        src={faviconUrl}
        alt={name}
        className={cn(imgSize, 'object-contain')}
        onError={(e) => {
          // Fallback to CompanyAvatar on error
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          target.parentElement!.innerHTML = `<span class="text-[8px] font-semibold text-white">${name.slice(0, 2).toUpperCase()}</span>`;
          target.parentElement!.style.backgroundColor = '#3182CE';
        }}
      />
    </div>
  );
}

function CompetitorAvatarStack({ competitors, maxVisible = 3 }: { competitors: string[]; maxVisible?: number }) {
  if (competitors.length === 0) {
    return <span className="text-figma-muted">—</span>;
  }

  const visible = competitors.slice(0, maxVisible);
  const overflow = competitors.length - maxVisible;

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <button type="button" className="flex items-center -space-x-1.5 cursor-help">
          {visible.map((name, idx) => (
            <div
              key={name}
              className="w-5 h-5 rounded-full border-2 border-white"
              style={{ zIndex: maxVisible - idx + 1 }}
            >
              <CompetitorAvatar name={name} size="xs" />
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
      <TooltipContent side="bottom" className="p-2">
        <div className="flex flex-col gap-1.5">
          {competitors.map(name => (
            <div key={name} className="flex items-center gap-2">
              <CompetitorAvatar name={name} size="sm" />
              <span className="text-figma-xs">{name}</span>
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Table Header with Tooltip Definitions
// ============================================================================

/** Column span class mapping (Tailwind requires static class names) */
const SPAN_CLASSES: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  4: 'col-span-4',
};

/** Column definition type */
interface ColumnDef {
  label: string;
  tooltip: string;
  span: 1 | 2 | 4;
  align: 'left' | 'right';
  paddingLeft?: boolean;
}

/** Column definitions with labels and tooltips */
const COLUMN_DEFS: ColumnDef[] = [
  { label: 'Prompt', tooltip: 'The user query that triggered an AI response mentioning your brand.', span: 4, align: 'left' },
  { label: 'Topic', tooltip: 'The category or subject area the prompt relates to.', span: 2, align: 'left' },
  { label: 'Mentions', tooltip: 'How many times AI mentioned your brand in responses to this prompt.', span: 1, align: 'left' },
  { label: 'Citations', tooltip: 'Number of responses that included a link to your site.', span: 1, align: 'right' },
  { label: 'Position', tooltip: 'Your brand\'s rank in the AI response — #1 means you were mentioned first.', span: 1, align: 'right' },
  { label: 'Competitors', tooltip: 'Other brands the AI mentioned alongside yours in responses.', span: 2, align: 'left', paddingLeft: true },
  { label: 'Stage', tooltip: 'Where the user is in their buying journey when asking this question.', span: 1, align: 'right' },
];

function TableHeader() {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-figma-border-light bg-figma-hover rounded-t-lg">
        {COLUMN_DEFS.map((col) => (
          <div
            key={col.label}
            className={cn(
              SPAN_CLASSES[col.span],
              col.align === 'right' && 'flex justify-end',
              col.paddingLeft && 'pl-4',
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-figma-2xs font-medium text-figma-secondary uppercase tracking-wide cursor-help inline-flex items-center gap-1">
                  {col.label}
                  <HelpCircle className="w-3 h-3 text-figma-muted" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-left">
                <p className="text-figma-xs">{col.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// Table Row
// ============================================================================

function TableRow({ prompt }: { prompt: TopPrompt }) {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-figma-border-light last:border-0 hover:bg-figma-hover/50 transition-colors">
      {/* Prompt - 2 lines with ellipsis + hover for full */}
      <div className="col-span-4">
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <p className="text-figma-sm text-figma-primary line-clamp-2 leading-relaxed cursor-default">
              {prompt.text}
            </p>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="max-w-md">
            <p className="text-figma-sm">{prompt.text}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Topics */}
      <div className="col-span-2 flex items-center">
        {prompt.topics.length > 0 ? (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span className="text-figma-xs text-figma-secondary truncate cursor-default">
                {prompt.topics.length === 1
                  ? prompt.topics[0]
                  : `${prompt.topics[0]} +${prompt.topics.length - 1}`}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div className="flex flex-col gap-1">
                {prompt.topics.map(topic => (
                  <span key={topic} className="text-figma-xs">{topic}</span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-figma-muted">—</span>
        )}
      </div>

      {/* Mentions - count with platform status on hover */}
      <div className="col-span-1 flex items-center">
        {prompt.platformStatus.length > 0 ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button className="text-figma-sm font-medium text-figma-primary tabular-nums hover:text-figma-accent transition-colors">
                {prompt.mentions}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="p-2">
              <div className="flex flex-col gap-1.5">
                {[...prompt.platformStatus]
                  .sort((a, b) => (b.mentioned ? 1 : 0) - (a.mentioned ? 1 : 0))
                  .map(({ platform, mentioned }) => (
                  <div key={platform} className={cn(
                    "flex items-center gap-2",
                    !mentioned && "opacity-50"
                  )}>
                    <span className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      mentioned ? "bg-green-500" : "bg-gray-400"
                    )} />
                    <PlatformIcon platform={platform} size="sm" />
                    <span className="text-figma-xs capitalize">
                      {platform.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span className="text-figma-sm font-medium text-figma-primary tabular-nums">
            {prompt.mentions}
          </span>
        )}
      </div>

      {/* Citations */}
      <div className="col-span-1 flex items-center justify-end">
        <span className="text-figma-sm text-figma-secondary tabular-nums">
          {prompt.citations}
        </span>
      </div>

      {/* Position */}
      <div className="col-span-1 flex items-center justify-end">
        <span className="text-figma-sm text-figma-secondary tabular-nums">
          {prompt.position ? `#${prompt.position}` : '—'}
        </span>
      </div>

      {/* Competitor Mentions - avatar stack */}
      <div className="col-span-2 flex items-center pl-4">
        <CompetitorAvatarStack competitors={prompt.competitorsMentioned} />
      </div>

      {/* Journey Stages */}
      <div className="col-span-1 flex items-center justify-end">
        <JourneyStageBadges stages={prompt.journeyStages} />
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function TableSkeleton() {
  return (
    <>
      <TableHeader />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-figma-border-light last:border-0">
          <div className="col-span-4">
            <Skeleton className="h-4 w-full rounded mb-1" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          <div className="col-span-2"><Skeleton className="h-4 w-16 rounded" /></div>
          <div className="col-span-1"><Skeleton className="h-4 w-8 rounded" /></div>
          <div className="col-span-1"><Skeleton className="h-4 w-8 rounded ml-auto" /></div>
          <div className="col-span-1"><Skeleton className="h-4 w-8 rounded ml-auto" /></div>
          <div className="col-span-2 pl-4"><Skeleton className="h-4 w-16 rounded" /></div>
          <div className="col-span-1"><Skeleton className="h-5 w-16 rounded ml-auto" /></div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TopPromptsPreview({ timeRange, brandName, onViewAll, className }: TopPromptsPreviewProps) {
  const { data, isLoading, error } = useTopPrompts(timeRange);
  const title = `Top prompts mentioning ${brandName}`;

  // Loading
  if (isLoading) {
    return (
      <ContentCard
        title={title}
        actionLabel="View all"
        onAction={onViewAll}
        className={className}
      >
        <TableSkeleton />
      </ContentCard>
    );
  }

  const prompts = data?.prompts ?? [];

  // Empty / error
  if (error || prompts.length === 0) {
    return (
      <ContentCard
        title={title}
        actionLabel="View all"
        onAction={onViewAll}
        className={className}
      >
        <div className="py-8 text-center">
          <p className="text-figma-sm text-figma-muted">
            Prompt data will appear once mentions are analyzed.
          </p>
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard
      title={title}
      actionLabel="View all"
      onAction={onViewAll}
      className={className}
    >
      <TooltipProvider>
        <div className="overflow-x-auto">
          <TableHeader />
          {prompts.map((prompt) => (
            <TableRow key={prompt.id} prompt={prompt} />
          ))}
        </div>
      </TooltipProvider>
    </ContentCard>
  );
}

export default TopPromptsPreview;
