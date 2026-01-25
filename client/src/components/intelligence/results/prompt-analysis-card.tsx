/**
 * Top 3 Performing Prompts Card
 *
 * Shows the top 3 prompts where the brand appears strongest.
 * Toggle to switch between competitor and your brand view.
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { CompanyAvatar } from '@/components/ui/company-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PromptResult } from '../types';

// Only shows tooltip when text is actually truncated
function TruncatedText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      // Check if text overflows (scrollHeight > clientHeight means truncated)
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [children]);

  const textSpan = (
    <span
      ref={textRef}
      className={cn('line-clamp-2', isTruncated && 'cursor-help', className)}
    >
      {children}
    </span>
  );

  if (!isTruncated) {
    return textSpan;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{textSpan}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm text-figma-xs leading-relaxed">
          {children}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PromptAnalysisCardProps {
  promptResults: PromptResult[];
  yourPromptResults: PromptResult[];
  targetName: string;
  targetLogo?: string;
  yourName: string;
  yourLogo?: string;
  className?: string;
}

// Brand toggle switcher
function BrandSwitcher({
  selected,
  onSelect,
  targetName,
  targetLogo,
  yourName,
  yourLogo,
}: {
  selected: 'target' | 'you';
  onSelect: (v: 'target' | 'you') => void;
  targetName: string;
  targetLogo?: string;
  yourName: string;
  yourLogo?: string;
}) {
  return (
    <div className="flex items-center gap-1 bg-figma-hover rounded-lg p-0.5">
      <button
        onClick={() => onSelect('target')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-figma-2xs font-medium rounded-md transition-colors',
          selected === 'target'
            ? 'bg-white text-figma-primary shadow-sm'
            : 'text-figma-muted hover:text-figma-secondary'
        )}
      >
        <span className={cn(selected !== 'target' && 'opacity-40')}>
          <CompanyAvatar name={targetName} logoUrl={targetLogo} size="xs" />
        </span>
        {targetName}
      </button>
      <button
        onClick={() => onSelect('you')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-figma-2xs font-medium rounded-md transition-colors',
          selected === 'you'
            ? 'bg-white text-figma-blue shadow-sm'
            : 'text-figma-muted hover:text-figma-secondary'
        )}
      >
        <span className={cn(selected !== 'you' && 'opacity-40')}>
          <CompanyAvatar name={yourName} logoUrl={yourLogo} size="xs" />
        </span>
        {yourName}
      </button>
    </div>
  );
}

// Individual prompt section
function PromptSection({ result }: { result: PromptResult }) {
  return (
    <div>
      {/* Prompt header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-figma-sm font-medium text-figma-primary">
          "{result.promptText}"
        </span>
      </div>

      {/* Platform results (max 3) */}
      <ul className="space-y-1.5 pl-6">
        {result.results.slice(0, 3).map((platformResult) => (
          <li
            key={platformResult.platformId}
            className="flex items-start gap-2 text-figma-sm text-figma-secondary leading-relaxed list-disc"
          >
            <PlatformIcon
              platform={platformResult.platformId}
              size="xs"
              className={cn('mt-0.5 shrink-0', !platformResult.mentioned && 'opacity-50 grayscale')}
            />
            <TruncatedText
              className={!platformResult.mentioned ? 'text-figma-muted' : undefined}
            >
              {platformResult.summary}
            </TruncatedText>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PromptAnalysisCard({
  promptResults,
  yourPromptResults,
  targetName,
  targetLogo,
  yourName,
  yourLogo,
  className,
}: PromptAnalysisCardProps) {
  const [selectedBrand, setSelectedBrand] = useState<'target' | 'you'>('target');

  // Show top 3 prompts based on selected brand
  // Fall back to empty array if yourPromptResults isn't available yet
  const activeResults = selectedBrand === 'target' ? promptResults : (yourPromptResults || []);
  const topPrompts = activeResults.slice(0, 3);

  const activeBrandName = selectedBrand === 'target' ? targetName : yourName;

  return (
    <ContentCard
      title="Top 3 performing prompts"
      subtitle={`Where ${activeBrandName} appears strongest`}
      className={cn('flex flex-col', className)}
      contentClassName="flex-1 flex flex-col min-h-0"
      headerRight={
        <BrandSwitcher
          selected={selectedBrand}
          onSelect={setSelectedBrand}
          targetName={targetName}
          targetLogo={targetLogo}
          yourName={yourName}
          yourLogo={yourLogo}
        />
      }
    >
      <div className="flex-1 flex flex-col">
        {topPrompts.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-figma-muted text-figma-sm">
            No prompt data available for {activeBrandName}
          </div>
        ) : (
          <>
            {topPrompts[0] && (
              <div className="flex-1 border-b border-figma-border-light pb-3">
                <PromptSection result={topPrompts[0]} />
              </div>
            )}
            {topPrompts[1] && (
              <div className="flex-1 border-b border-figma-border-light py-3">
                <PromptSection result={topPrompts[1]} />
              </div>
            )}
            {topPrompts[2] && (
              <div className="flex-1 pt-3">
                <PromptSection result={topPrompts[2]} />
              </div>
            )}
          </>
        )}
      </div>
    </ContentCard>
  );
}
