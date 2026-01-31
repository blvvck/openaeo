

import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { VisibilityScoreRing } from '@/components/charts/visibility-score-ring';
import { PlatformBreakdown, PLATFORMS } from '@/components/ui/platform-icon';
import { Info } from 'lucide-react';

export interface VisibilityScoreCardProps {
  /** Visibility score (0-100) */
  score: number;
  /** Previous score for trend calculation */
  previousScore?: number;
  /** Platform breakdown scores */
  platformScores?: Record<string, number>;
  /** Data freshness text */
  dataFreshness?: string;
  /** Additional classes */
  className?: string;
}


function getScoreInfo(score: number) {
  if (score >= 70) {
    return { label: 'Strong', color: 'text-green-600 dark:text-green-400' };
  }
  if (score >= 50) {
    return { label: 'Average', color: 'text-yellow-600 dark:text-yellow-400' };
  }
  return { label: 'Needs work', color: 'text-red-600 dark:text-red-400' };
}

export function VisibilityScoreCard({
  score,
  previousScore,
  platformScores = {},
  dataFreshness,
  className,
}: VisibilityScoreCardProps) {
  const [, navigate] = useLocation();
  const scoreInfo = getScoreInfo(score);

  // Calculate score change
  const scoreChange = previousScore !== undefined
    ? score - previousScore
    : undefined;

  const handleClick = () => {
    navigate('/app/visibility');
  };

  return (
    <Card
      interactive
      onClick={handleClick}
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Visibility Score</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end" className="max-w-xs">
              <div className="space-y-3 text-sm">
                {/* Platform breakdown */}
                <div>
                  <p className="font-medium mb-1">Platform Breakdown</p>
                  <div className="space-y-1">
                    {PLATFORMS.map((platform) => (
                      <div key={platform.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{platform.name}</span>
                        <span className="font-medium tabular-nums">
                          {platformScores[platform.id] ?? '--'}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Score change */}
                {scoreChange !== undefined && (
                  <div>
                    <p className="font-medium mb-1">Change</p>
                    <p className="text-xs text-muted-foreground">
                      {scoreChange >= 0 ? '+' : ''}{scoreChange} pts from last period
                    </p>
                  </div>
                )}

                {/* Score thresholds */}
                <div>
                  <p className="font-medium mb-1">Score Guide</p>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    <p><span className="text-green-600">70+</span> = Strong visibility</p>
                    <p><span className="text-yellow-600">50-69</span> = Average visibility</p>
                    <p><span className="text-red-600">&lt;50</span> = Needs improvement</p>
                  </div>
                </div>

                {/* Data freshness */}
                {dataFreshness && (
                  <p className="text-xs text-muted-foreground/70 pt-1 border-t">
                    {dataFreshness}
                  </p>
                )}
              </div>
            </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center pb-4 pt-2 px-4">
        {/* Ring gauge */}
        <VisibilityScoreRing
          score={score}
          previousScore={previousScore}
          size="lg"
          showTrend={true}
          label=""
        />

        {/* Score label */}
        <p className={cn('text-xs font-medium mt-1', scoreInfo.color)}>
          {scoreInfo.label}
        </p>

        {/* Platform breakdown - horizontal scroll */}
        <div className="mt-3 w-full overflow-x-auto scrollbar-hide">
          <PlatformBreakdown
            scores={platformScores}
            maxPlatforms={8}
            showSeparators={true}
            className="justify-center"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default VisibilityScoreCard;
