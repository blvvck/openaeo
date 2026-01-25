/**
 * Key Insights Card
 *
 * Strengths, gaps, and opportunities from the research.
 */

import { useState } from 'react';
import { Star, AlertTriangle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContentCard } from '@/components/shared';
import { CompanyAvatar } from '@/components/ui/company-avatar';

interface Insights {
  strengths: string[];
  gaps: string[];
  opportunities: string[];
}

interface KeyInsightsCardProps {
  insights: Insights;
  yourInsights?: Insights;
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

// Section component
function InsightSection({
  title,
  icon: Icon,
  iconColor,
  items,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('w-4 h-4', iconColor)} />
        <h4 className="text-figma-sm font-medium text-figma-primary">{title}</h4>
      </div>
      <ul className="space-y-1.5 pl-6">
        {items.map((item, index) => (
          <li
            key={index}
            className="text-figma-sm text-figma-secondary leading-relaxed list-disc"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAX_ITEMS_PER_SECTION = 3;

export function KeyInsightsCard({
  insights,
  yourInsights,
  targetName,
  targetLogo,
  yourName,
  yourLogo,
  className,
}: KeyInsightsCardProps) {
  const [selectedBrand, setSelectedBrand] = useState<'target' | 'you'>('target');

  // Show insights based on selected brand, fallback to empty if not available
  const emptyInsights: Insights = { strengths: [], gaps: [], opportunities: [] };
  const activeInsights = selectedBrand === 'target' ? insights : (yourInsights || emptyInsights);
  const activeBrandName = selectedBrand === 'target' ? targetName : yourName;
  const hasData = activeInsights.strengths.length > 0 || activeInsights.gaps.length > 0 || activeInsights.opportunities.length > 0;

  return (
    <ContentCard
      title="Key insights"
      subtitle={`What ${activeBrandName}'s research reveals`}
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
      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-figma-muted text-figma-sm">
          No insights available for {activeBrandName}
        </div>
      ) : (
        <>
          <div className="flex-1 border-b border-figma-border-light pb-3">
            <InsightSection
              title="Strengths"
              icon={Star}
              iconColor="text-figma-green"
              items={activeInsights.strengths.slice(0, MAX_ITEMS_PER_SECTION)}
            />
          </div>
          <div className="flex-1 border-b border-figma-border-light py-3">
            <InsightSection
              title="Gaps"
              icon={AlertTriangle}
              iconColor="text-figma-orange"
              items={activeInsights.gaps.slice(0, MAX_ITEMS_PER_SECTION)}
            />
          </div>
          <div className="flex-1 pt-3">
            <InsightSection
              title="Opportunities"
              icon={Target}
              iconColor="text-figma-blue"
              items={activeInsights.opportunities.slice(0, MAX_ITEMS_PER_SECTION)}
            />
          </div>
        </>
      )}
    </ContentCard>
  );
}
