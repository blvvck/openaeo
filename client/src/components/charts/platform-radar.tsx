import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { platformColors, chartColors, getSeriesColor } from './chart-theme';

interface PlatformScore {
  platform: string;
  visibilityScore: number;
  mentionRate?: number;
  positionScore?: number;
  sentimentScore?: number;
}

interface PlatformRadarProps {
  /** Platform scores data */
  data: PlatformScore[];
  /** Optional competitor data to overlay */
  competitorData?: {
    name: string;
    scores: PlatformScore[];
  };
  /** Chart height */
  height?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Metric to display */
  metric?: 'visibilityScore' | 'mentionRate' | 'positionScore' | 'sentimentScore';
  /** Additional classes */
  className?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  grok: 'Grok',
  deepseek: 'DeepSeek',
};

const METRIC_CONFIG = {
  visibilityScore: { label: 'Visibility', domain: [0, 100] },
  mentionRate: { label: 'Mention Rate', domain: [0, 1] },
  positionScore: { label: 'Position', domain: [0, 100] },
  sentimentScore: { label: 'Sentiment', domain: [-1, 1] },
};

function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] || platform;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="font-medium text-foreground mb-2">
        {getPlatformLabel(label || '')}
      </p>
      <div className="space-y-1 text-sm">
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium" style={{ color: entry.color }}>
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlatformRadar({
  data,
  competitorData,
  height = 400,
  showLegend = true,
  metric = 'visibilityScore',
  className,
}: PlatformRadarProps) {
  const metricConfig = METRIC_CONFIG[metric];

  // Transform data for radar chart
  const chartData = data.map((d) => ({
    platform: getPlatformLabel(d.platform),
    platformKey: d.platform.toLowerCase(),
    Brand: d[metric] ?? 0,
    ...(competitorData && {
      [competitorData.name]: competitorData.scores.find(
        (s) => s.platform.toLowerCase() === d.platform.toLowerCase()
      )?.[metric] ?? 0,
    }),
  }));

  return (
    <div className={cn('w-full overflow-hidden touch-pan-y', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid
            stroke="hsl(var(--border))"
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="platform"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={metricConfig.domain}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickCount={5}
          />
          <Radar
            name="Brand"
            dataKey="Brand"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {competitorData && (
            <Radar
              name={competitorData.name}
              dataKey={competitorData.name}
              stroke={getSeriesColor(1)}
              fill={getSeriesColor(1)}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              iconSize={8}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Multi-metric radar showing all metrics for a single platform comparison
 */
interface MultiMetricRadarProps {
  /** Brand data with all metrics */
  brandData: {
    name: string;
    visibilityScore: number;
    mentionRate: number;
    positionScore: number;
    sentimentScore: number;
  };
  /** Competitor data with all metrics */
  competitorData?: {
    name: string;
    visibilityScore: number;
    mentionRate: number;
    positionScore: number;
    sentimentScore: number;
  };
  /** Chart height */
  height?: number;
  /** Additional classes */
  className?: string;
}

export function MultiMetricRadar({
  brandData,
  competitorData,
  height = 400,
  className,
}: MultiMetricRadarProps) {
  // Transform to radar format
  const chartData = [
    {
      metric: 'Visibility',
      [brandData.name]: brandData.visibilityScore,
      ...(competitorData && { [competitorData.name]: competitorData.visibilityScore }),
      fullMark: 100,
    },
    {
      metric: 'Mention Rate',
      [brandData.name]: brandData.mentionRate * 100, // Scale to 0-100
      ...(competitorData && { [competitorData.name]: competitorData.mentionRate * 100 }),
      fullMark: 100,
    },
    {
      metric: 'Position',
      [brandData.name]: brandData.positionScore,
      ...(competitorData && { [competitorData.name]: competitorData.positionScore }),
      fullMark: 100,
    },
    {
      metric: 'Sentiment',
      [brandData.name]: ((brandData.sentimentScore + 1) / 2) * 100, // Scale -1 to 1 -> 0 to 100
      ...(competitorData && { [competitorData.name]: ((competitorData.sentimentScore + 1) / 2) * 100 }),
      fullMark: 100,
    },
  ];

  return (
    <div className={cn('w-full overflow-hidden touch-pan-y', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickCount={5}
          />
          <Radar
            name={brandData.name}
            dataKey={brandData.name}
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {competitorData && (
            <Radar
              name={competitorData.name}
              dataKey={competitorData.name}
              stroke={getSeriesColor(1)}
              fill={getSeriesColor(1)}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
            iconSize={8}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
