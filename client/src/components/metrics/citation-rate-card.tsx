

import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { TrendIndicator } from '@/components/charts/trend-indicator';
import { Link2, Info, TrendingUp, TrendingDown } from 'lucide-react';

export interface CitationRateCardProps {
  /** Citation rate percentage (0-100) */
  rate: number;
  /** Trend percentage */
  trend: number;
  /** Comparison vs top competitor */
  vsTopCompetitor?: {
    name: string;
    difference: number; // positive = you're ahead
  };
  /** Top sources cited */
  topSources?: { domain: string; count: number }[];
  /** Citation rate by platform */
  byPlatform?: { platform: string; rate: number }[];
  /** Additional classes */
  className?: string;
}

export function CitationRateCard({
  rate,
  trend,
  vsTopCompetitor,
  topSources = [],
  byPlatform = [],
  className,
}: CitationRateCardProps) {
  const [, navigate] = useLocation();
  const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';

  const handleClick = () => {
    navigate('/app/citations');
  };

  return (
    <Card
      interactive
      onClick={handleClick}
      className={cn('cursor-pointer hover:shadow-md transition-shadow', className)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Citation Rate
          </CardTitle>
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
                  {/* Top sources */}
                  {topSources.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Top Sources Cited</p>
                      <div className="space-y-1">
                        {topSources.slice(0, 5).map((source, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{source.domain}</span>
                            <span className="font-medium tabular-nums">{source.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By platform */}
                  {byPlatform.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">By Platform</p>
                      <div className="space-y-1">
                        {byPlatform.map((p, i) => (
                          <div key={i} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{p.platform}</span>
                            <span className="font-medium tabular-nums">{p.rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* vs competitors */}
                  {vsTopCompetitor && (
                    <div>
                      <p className="font-medium mb-1">vs Competitors</p>
                      <p className="text-xs text-muted-foreground">
                        {vsTopCompetitor.difference >= 0 ? (
                          <span className="text-green-600">
                            +{vsTopCompetitor.difference}% ahead of {vsTopCompetitor.name}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {vsTopCompetitor.difference}% behind {vsTopCompetitor.name}
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-4">
        {/* Main metric */}
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold tabular-nums">
            {rate}%
          </span>
          <TrendIndicator
            value={rate}
            previousValue={rate - trend}
            direction={trendDirection}
            format="percent"
            size="sm"
          />
        </div>

        {/* Competitor comparison */}
        {vsTopCompetitor && (
          <div className={cn(
            'flex items-center gap-1 text-xs',
            vsTopCompetitor.difference >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {vsTopCompetitor.difference >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {vsTopCompetitor.difference >= 0 ? '+' : ''}
              {vsTopCompetitor.difference}% vs {vsTopCompetitor.name}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CitationRateCard;
