/**
 * Results Page (Step 5)
 *
 * THE STAR. Comprehensive, scannable research findings.
 */

import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeft, Building2, UserPlus, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { useToast } from '@/hooks/use-toast';
import { useActiveWorkspaceName } from '@/hooks/use-active-workspace';

import { PlatformPerformanceCard } from './platform-performance-card';
import { PromptAnalysisCard } from './prompt-analysis-card';
import { KeyInsightsCard } from './key-insights-card';
import type { ResearchResults } from '../types';

interface ResultsPageProps {
  results: ResearchResults;
  onResearchAnother: () => void;
  onAddAsCompetitor: () => Promise<boolean> | boolean;
  userBrandName?: string;
  userBrandLogo?: string;
}


// Prompt pill component
function PromptPill({ text, align }: { text: string; align: 'left' | 'right' }) {
  return (
    <div className={cn(
      "text-figma-2xs text-figma-secondary bg-figma-hover px-2.5 py-1.5 rounded-lg truncate",
      align === 'right' ? 'text-right' : 'text-left'
    )}>
      {text}
    </div>
  );
}

type PlatformSentiment = {
  platformId: string;
  sentiment: 'positive' | 'neutral' | 'negative';
};

// Metric comparison card - clean 5-column grid layout
function MetricCard({
  label,
  targetValue,
  yourValue,
  targetDetail,
  yourDetail,
  targetPrompts = [],
  yourPrompts = [],
  isPosition = false,
  isSentiment = false,
  targetSentiment,
  targetQuote,
  yourSentiment,
  yourQuote,
  targetPlatformSentiments = [],
  yourPlatformSentiments = [],
}: {
  label: string;
  targetValue: number;
  yourValue: number;
  targetDetail?: string;
  yourDetail?: string;
  targetPrompts?: string[];
  yourPrompts?: string[];
  isPosition?: boolean;
  isSentiment?: boolean;
  targetSentiment?: 'positive' | 'neutral' | 'negative';
  targetQuote?: string;
  yourSentiment?: 'positive' | 'neutral' | 'negative';
  yourQuote?: string;
  targetPlatformSentiments?: PlatformSentiment[];
  yourPlatformSentiments?: PlatformSentiment[];
}) {
  // For position, lower is better. For others, higher is better.
  const targetWins = isPosition ? targetValue < yourValue : targetValue > yourValue;
  const yourWins = isPosition ? yourValue < targetValue : yourValue > targetValue;

  const getSentimentConfig = (s: 'positive' | 'neutral' | 'negative') => {
    if (s === 'positive') return { label: 'Positive', color: 'text-figma-green', dot: 'bg-figma-green' };
    if (s === 'negative') return { label: 'Negative', color: 'text-figma-red', dot: 'bg-figma-red' };
    return { label: 'Neutral', color: 'text-figma-orange', dot: 'bg-figma-orange' };
  };

  // Cap prompts
  const maxPrompts = 3;
  const targetPromptsDisplay = targetPrompts.slice(0, maxPrompts);
  const yourPromptsDisplay = yourPrompts.slice(0, maxPrompts);
  const targetOverflow = targetPrompts.length - maxPrompts;
  const yourOverflow = yourPrompts.length - maxPrompts;

  if (isSentiment) {
    const targetConfig = getSentimentConfig(targetSentiment!);
    const yourConfig = getSentimentConfig(yourSentiment!);

    const getSentimentBg = (s: 'positive' | 'neutral' | 'negative') => {
      if (s === 'positive') return 'bg-green-100';
      if (s === 'negative') return 'bg-red-100';
      return 'bg-orange-100'; // matches figma-orange
    };

    return (
      <div className="grid grid-cols-[1fr,90px,auto,90px,1fr] gap-3 py-6 items-start border-t border-figma-border-light">
        {/* Target quote + platforms - far left */}
        <div className="text-right space-y-2.5">
          <p className="text-figma-xs text-figma-muted italic line-clamp-2">"{targetQuote}"</p>
          {targetPlatformSentiments.length > 0 && (
            <div className="flex items-center justify-end gap-1.5">
              {targetPlatformSentiments.map((ps) => (
                <div
                  key={ps.platformId}
                  className={cn("w-6 h-6 rounded-full flex items-center justify-center", getSentimentBg(ps.sentiment))}
                  title={`${ps.sentiment} sentiment`}
                >
                  <div className="grayscale brightness-[0.3]">
                    <PlatformIcon platform={ps.platformId} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Target value - inner left, stacked */}
        <div className="text-right pt-0.5">
          <div className={cn("text-3xl font-bold tabular-nums leading-none", targetConfig.color)}>
            {targetValue}%
          </div>
          <div className={cn("flex items-center justify-end gap-1.5 mt-1")}>
            <div className={cn("w-2 h-2 rounded-full", targetConfig.dot)} />
            <span className={cn("text-figma-2xs", targetConfig.color)}>
              {targetConfig.label}
            </span>
          </div>
        </div>

        {/* Center label */}
        <div className="flex justify-center pt-1">
          <span className="text-figma-2xs font-medium text-figma-muted tracking-wider px-4 py-2 bg-figma-hover rounded-full">
            {label}
          </span>
        </div>

        {/* Your value - inner right, stacked */}
        <div className="pt-0.5">
          <div className={cn("text-3xl font-bold tabular-nums leading-none", yourConfig.color)}>
            {yourValue}%
          </div>
          <div className={cn("flex items-center gap-1.5 mt-1")}>
            <div className={cn("w-2 h-2 rounded-full", yourConfig.dot)} />
            <span className={cn("text-figma-2xs", yourConfig.color)}>
              {yourConfig.label}
            </span>
          </div>
        </div>

        {/* Your quote + platforms - far right */}
        <div className="space-y-2.5">
          <p className="text-figma-xs text-figma-muted italic line-clamp-2">"{yourQuote}"</p>
          {yourPlatformSentiments.length > 0 && (
            <div className="flex items-center gap-1.5">
              {yourPlatformSentiments.map((ps) => (
                <div
                  key={ps.platformId}
                  className={cn("w-6 h-6 rounded-full flex items-center justify-center", getSentimentBg(ps.sentiment))}
                  title={`${ps.sentiment} sentiment`}
                >
                  <div className="grayscale brightness-[0.3]">
                    <PlatformIcon platform={ps.platformId} size="xs" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr,90px,auto,90px,1fr] gap-3 py-6 items-start border-t border-figma-border-light">
      {/* Target prompts - far left, fills space */}
      <div className="space-y-1.5 flex flex-col items-end">
        {targetPromptsDisplay.map((prompt, i) => (
          <div key={i} className="text-figma-2xs text-figma-secondary bg-figma-hover px-2.5 py-1.5 rounded-md text-right max-w-full truncate">
            {prompt}
          </div>
        ))}
        {targetOverflow > 0 && (
          <div className="text-figma-2xs text-figma-muted">+{targetOverflow} more</div>
        )}
      </div>

      {/* Target value - inner left (closer to center) */}
      <div className="text-right pt-0.5">
        <div className={cn(
          "text-3xl font-bold tabular-nums leading-none",
          targetWins ? "text-figma-green" : "text-figma-primary"
        )}>
          {isPosition ? `#${targetValue.toFixed(1)}` : `${targetValue}%`}
        </div>
        <div className="text-figma-2xs text-figma-muted mt-1">{targetDetail}</div>
      </div>

      {/* Center label */}
      <div className="flex justify-center pt-1">
        <span className="text-figma-2xs font-medium text-figma-muted tracking-wider px-4 py-2 bg-figma-hover rounded-full">
          {label}
        </span>
      </div>

      {/* Your value - inner right (closer to center) */}
      <div className="pt-0.5">
        <div className={cn(
          "text-3xl font-bold tabular-nums leading-none",
          yourWins ? "text-figma-blue" : "text-figma-primary"
        )}>
          {isPosition ? `#${yourValue.toFixed(1)}` : `${yourValue}%`}
        </div>
        <div className="text-figma-2xs text-figma-muted mt-1">{yourDetail}</div>
      </div>

      {/* Your prompts - far right, aligns left */}
      <div className="space-y-1.5 flex flex-col items-start">
        {yourPromptsDisplay.map((prompt, i) => (
          <div key={i} className="text-figma-2xs text-figma-secondary bg-figma-hover px-2.5 py-1.5 rounded-md truncate">
            {prompt}
          </div>
        ))}
        {yourOverflow > 0 && (
          <div className="text-figma-2xs text-figma-muted">+{yourOverflow} more</div>
        )}
      </div>
    </div>
  );
}

export function ResultsPage({
  results,
  onResearchAnother,
  onAddAsCompetitor,
  userBrandName,
  userBrandLogo,
}: ResultsPageProps) {
  const organizationName = useActiveWorkspaceName();
  const resolvedBrandName = userBrandName ?? organizationName;
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const handleAddAsCompetitor = async () => {
    const added = await onAddAsCompetitor();
    if (added) {
      toast({
        title: `${results.brand.name} added to competitors`,
        description: 'You can now track them on the Overview tab.',
      });
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${results.brand.name} - AI Visibility Report`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleDownloadReport = () => {
    handlePrint();
  };

  const formattedDate = new Date(results.completedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Back button - hidden in print */}
      <button
        onClick={onResearchAnother}
        className="flex items-center gap-2 text-figma-xs text-figma-muted hover:text-figma-primary transition-colors print:hidden"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {/* Printable content wrapper */}
      <div ref={printRef} className="bg-figma-bg border border-figma-border rounded-2xl p-6 space-y-6 print:border-0 print:p-0">
        {/* Hero Card - H2H Comparison */}
        <div className="bg-figma-card rounded-xl p-10">
          {/* Clean header */}
          <div className="flex items-center justify-between pb-6 px-8">
          {/* Target brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-figma-hover flex items-center justify-center overflow-hidden">
              {results.brand.logo ? (
                <img
                  src={results.brand.logo}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <Building2 className="w-5 h-5 text-figma-muted" />
              )}
            </div>
            <div>
              <div className="text-figma-sm font-semibold text-figma-primary">
                {results.brand.name}
              </div>
              <div className="text-figma-2xs text-figma-muted">Competitor</div>
            </div>
          </div>

          {/* Center - vs + prompts count */}
          <div className="text-center">
            <div className="text-xl font-semibold text-figma-muted">vs</div>
            <div className="text-figma-2xs text-figma-muted mt-0.5">
              {results.h2hMetrics.totalPrompts} prompts analyzed
            </div>
          </div>

          {/* Your brand */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-figma-sm font-semibold text-figma-blue">
                {resolvedBrandName}
              </div>
              <div className="text-figma-2xs text-figma-muted">You</div>
            </div>
            <div className="w-11 h-11 rounded-lg bg-blue-50 border border-[#2462EB33] flex items-center justify-center overflow-hidden">
              {userBrandLogo ? (
                <img
                  src={userBrandLogo}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-figma-sm font-bold text-figma-blue">
                  {resolvedBrandName.substring(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metrics comparison */}
        <div className="mt-8">
          <MetricCard
            label="Share"
            targetValue={results.h2hMetrics.target.shareOfAnswer}
            yourValue={results.h2hMetrics.you.shareOfAnswer}
            targetDetail={results.h2hMetrics.target.shareOfAnswerDetail}
            yourDetail={results.h2hMetrics.you.shareOfAnswerDetail}
            targetPrompts={results.h2hMetrics.target.shareOfAnswerPrompts}
            yourPrompts={results.h2hMetrics.you.shareOfAnswerPrompts}
          />
          <MetricCard
            label="Position"
            targetValue={results.h2hMetrics.target.avgPosition}
            yourValue={results.h2hMetrics.you.avgPosition}
            targetDetail={results.h2hMetrics.target.avgPositionDetail}
            yourDetail={results.h2hMetrics.you.avgPositionDetail}
            targetPrompts={results.h2hMetrics.target.avgPositionPrompts}
            yourPrompts={results.h2hMetrics.you.avgPositionPrompts}
            isPosition
          />
          <MetricCard
            label="Citations"
            targetValue={results.h2hMetrics.target.citationRate}
            yourValue={results.h2hMetrics.you.citationRate}
            targetDetail={results.h2hMetrics.target.citationRateDetail}
            yourDetail={results.h2hMetrics.you.citationRateDetail}
            targetPrompts={results.h2hMetrics.target.citationRatePrompts}
            yourPrompts={results.h2hMetrics.you.citationRatePrompts}
          />
          <MetricCard
            label="Sentiment"
            targetValue={results.h2hMetrics.target.sentimentScore}
            yourValue={results.h2hMetrics.you.sentimentScore}
            isSentiment
            targetSentiment={results.h2hMetrics.target.sentiment}
            targetQuote={results.h2hMetrics.target.sentimentQuote}
            yourSentiment={results.h2hMetrics.you.sentiment}
            yourQuote={results.h2hMetrics.you.sentimentQuote}
            targetPlatformSentiments={results.h2hMetrics.target.platformSentiments}
            yourPlatformSentiments={results.h2hMetrics.you.platformSentiments}
          />
        </div>
      </div>

        {/* Platform Performance */}
        <PlatformPerformanceCard
          platforms={results.platforms}
          yourResults={results.yourPromptResults}
          targetName={results.brand.name}
          yourName={resolvedBrandName}
          className="border-0 shadow-none"
        />

        {/* Prompt Analysis + Key Insights side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PromptAnalysisCard
            promptResults={results.promptResults}
            yourPromptResults={results.yourPromptResults}
            targetName={results.brand.name}
            targetLogo={results.brand.logo}
            yourName={resolvedBrandName}
            yourLogo={userBrandLogo}
            className="h-full border-0 shadow-none"
          />
          <KeyInsightsCard
            insights={results.insights}
            yourInsights={results.yourInsights}
            targetName={results.brand.name}
            targetLogo={results.brand.logo}
            yourName={resolvedBrandName}
            yourLogo={userBrandLogo}
            className="h-full border-0 shadow-none"
          />
        </div>

        {/* Action Buttons - hidden in print */}
        <div className="flex items-center justify-center gap-4 pt-6 border-t border-figma-border-light print:hidden">
          <Button
            onClick={handleAddAsCompetitor}
            className="bg-figma-blue text-white hover:bg-blue-600"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add as competitor
          </Button>
          <Button variant="outline" onClick={handleDownloadReport}>
            <Download className="w-4 h-4 mr-2" />
            Download report
          </Button>
          <Button variant="ghost" onClick={onResearchAnother}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Research another
          </Button>
        </div>
      </div>
    </div>
  );
}
