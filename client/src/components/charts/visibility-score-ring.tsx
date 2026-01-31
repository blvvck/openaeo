import { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PLATFORMS, getPlatformColor } from '@/components/ui/platform-icon';

interface PlatformScore {
  platform: string;
  score: number;
}

interface VisibilityScoreRingProps {
  /** Visibility score (0-100) */
  score: number;
  /** Previous score for trend calculation */
  previousScore?: number;
  /** Platform scores for multi-segment ring */
  platformScores?: PlatformScore[];
  /** Size of the ring */
  size?: 'sm' | 'md' | 'lg' | 'figma';
  /** Show trend indicator */
  showTrend?: boolean;
  /** Label below the score */
  label?: string;
  /** Additional classes */
  className?: string;
  /** Animation duration in ms */
  animationDuration?: number;
}

const SIZES = {
  sm: { width: 120, height: 120, fontSize: 'text-2xl', labelSize: 'text-xs', innerRadius: 35, outerRadius: 50 },
  md: { width: 180, height: 180, fontSize: 'text-4xl', labelSize: 'text-sm', innerRadius: 55, outerRadius: 75 },
  lg: { width: 200, height: 200, fontSize: 'text-4xl', labelSize: 'text-base', innerRadius: 60, outerRadius: 85 },
  figma: { width: 104, height: 104, fontSize: 'text-[32px]', labelSize: 'text-xs', innerRadius: 42, outerRadius: 52 },
};


function getScoreLabel(score: number): { label: string; color: string; hex: string } {
  if (score >= 70) return { label: 'Strong', color: 'text-[#17A34A]', hex: '#17A34A' };
  if (score >= 50) return { label: 'Average', color: 'text-[#F59E0B]', hex: '#F59E0B' };
  return { label: 'Needs work', color: 'text-[#DC2626]', hex: '#DC2626' };
}

function getTrendInfo(current: number, previous?: number) {
  if (previous === undefined) return null;

  const change = current - previous;
  const percentChange = previous > 0 ? ((change / previous) * 100).toFixed(1) : '0';

  if (change > 2) {
    return {
      direction: 'up' as const,
      change: Math.abs(change),
      percentChange: `+${percentChange}%`,
      icon: TrendingUp,
      color: 'text-[#17A34A]',
    };
  } else if (change < -2) {
    return {
      direction: 'down' as const,
      change: Math.abs(change),
      percentChange: `${percentChange}%`,
      icon: TrendingDown,
      color: 'text-[#DC2626]',
    };
  }

  return {
    direction: 'stable' as const,
    change: 0,
    percentChange: '0%',
    icon: Minus,
    color: 'text-muted-foreground',
  };
}

export function VisibilityScoreRing({
  score,
  previousScore,
  platformScores,
  size = 'md',
  showTrend = true,
  label = 'Visibility score',
  className,
  animationDuration = 1000,
}: VisibilityScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const sizeConfig = SIZES[size as keyof typeof SIZES] || SIZES.md;
  const scoreLabel = getScoreLabel(score);
  const trend = getTrendInfo(score, previousScore);

  // Animate score on mount/change
  useEffect(() => {
    const startTime = Date.now();
    const startScore = animatedScore;
    const endScore = score;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentScore = startScore + (endScore - startScore) * easeProgress;

      setAnimatedScore(Math.round(currentScore));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score, animationDuration]);

  // Get color variations based on score threshold
  // Returns array of colors: variations of green (70+), yellow (50-69), or red (<50)
  const getScoreColors = (numColors: number): string[] => {
    if (score >= 70) {
      // Green variations (Strong) - Figma #17A34A
      const greens = ['#17A34A', '#138D3F', '#0E7634', '#0B5E29', '#15A249', '#059669'];
      return greens.slice(0, Math.max(numColors, 1));
    } else if (score >= 50) {
      // Yellow/Amber variations (Average) - Figma #F59E0B
      const yellows = ['#F59E0B', '#D97706', '#B45309', '#92400E', '#EAB308', '#CA8A04'];
      return yellows.slice(0, Math.max(numColors, 1));
    } else {
      // Red variations (Needs work) - Figma #DC2626
      const reds = ['#DC2626', '#C53030', '#9B2C2C', '#822727', '#EF4444', '#B91C1C'];
      return reds.slice(0, Math.max(numColors, 1));
    }
  };

  // Build pie data from platform scores
  // Ring fills to the overall `score`, with color variations based on threshold
  const buildPieData = () => {
    if (platformScores && platformScores.length > 0) {
      // Filter platforms with data
      const activePlatforms = platformScores.filter(p => p.score > 0);

      if (activePlatforms.length === 0) {
        // No platform data - show score-based single color
        const colors = getScoreColors(1);
        return [
          { name: 'score', value: score, color: colors[0] },
          { name: 'background', value: 100 - score, color: '#e5e7eb' },
        ];
      }

      // Get color variations for the number of active platforms
      const colors = getScoreColors(activePlatforms.length);

      // Calculate total of active platform scores for proportional sizing
      const totalActiveScore = activePlatforms.reduce((sum, p) => sum + p.score, 0);

      // Scale platform segments to fill exactly `score`% of the ring
      // Each platform gets a color variation based on the score threshold
      const segments = activePlatforms.map((p, index) => ({
        name: p.platform,
        value: (p.score / totalActiveScore) * score,
        color: colors[index % colors.length],
      }));

      // Background fills the remaining portion (100 - score)
      const background = 100 - score;
      if (background > 0) {
        segments.push({ name: 'background', value: background, color: '#e5e7eb' });
      }

      return segments;
    }

    // Fallback: single segment with score-based color
    const colors = getScoreColors(1);
    return [
      { name: 'score', value: score, color: colors[0] },
      { name: 'background', value: 100 - score, color: '#e5e7eb' },
    ];
  };

  const dataWithBackground = buildPieData();
  const hasMultiplePlatforms = platformScores && platformScores.filter(p => p.score > 0).length > 1;

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className="relative"
        style={{ width: sizeConfig.width, height: sizeConfig.height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithBackground}
              cx="50%"
              cy="50%"
              innerRadius={sizeConfig.innerRadius}
              outerRadius={sizeConfig.outerRadius}
              startAngle={90}
              endAngle={-270}
              paddingAngle={hasMultiplePlatforms ? 2 : 0}
              dataKey="value"
              animationDuration={animationDuration}
              animationBegin={0}
            >
              {dataWithBackground.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke="none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Main score - fixed color per Figma snippet */}
          <span className={cn('font-bold', sizeConfig.fontSize, 'text-[#111827]')}>
            {animatedScore}
          </span>
          {/* Delta/trend - also colored by threshold */}
          {showTrend && trend && (
            <div className={cn('flex items-center gap-1 mt-0.5', scoreLabel.color)}>
              <trend.icon className="w-3 h-3" />
              <span className="text-xs">{trend.percentChange}</span>
            </div>
          )}
        </div>
      </div>

      {label && (
        <span className={cn('text-muted-foreground mt-2', sizeConfig.labelSize)}>
          {label}
        </span>
      )}
    </div>
  );
}
