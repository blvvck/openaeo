/**
 * Historical Trend Calculator
 *
 * Calculates visibility trends over time, including:
 * - Daily/weekly/monthly aggregation
 * - Period-over-period comparison
 * - Trend direction detection
 * - Statistical significance indicators
 */

export type TimeInterval = 'day' | 'week' | 'month';
export type TrendDirection = 'up' | 'down' | 'flat';
export type TimePreset = '7d' | '30d' | '90d' | '1y';

export interface DataPoint {
  date: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface TrendDataPoint {
  /** Date string (ISO format for day, YYYY-Wxx for week, YYYY-MM for month) */
  date: string;
  /** Aggregated value for the period */
  value: number;
  /** Number of data points in this period */
  count: number;
  /** Change from previous period */
  change: number;
  /** Percent change from previous period */
  percentChange: number;
}

export interface TrendAnalysis {
  /** Trend direction */
  direction: TrendDirection;
  /** Overall change in value */
  totalChange: number;
  /** Percent change from start to end */
  percentChange: number;
  /** Average value over period */
  average: number;
  /** Highest value in period */
  max: number;
  /** Lowest value in period */
  min: number;
  /** Standard deviation */
  stdDev: number;
  /** Whether trend is statistically significant (>5% change) */
  isSignificant: boolean;
}

export interface TrendResult {
  /** Time series data points */
  data: TrendDataPoint[];
  /** Trend analysis */
  trend: TrendAnalysis;
  /** Time range info */
  timeRange: {
    from: Date;
    to: Date;
    interval: TimeInterval;
    preset?: TimePreset;
  };
  /** Comparison with previous period */
  comparison?: {
    previousPeriodAvg: number;
    currentPeriodAvg: number;
    change: number;
    percentChange: number;
  };
}

/**
 * Get date range for a preset
 */
export function getPresetRange(preset: TimePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();

  switch (preset) {
    case '7d':
      from.setDate(from.getDate() - 7);
      break;
    case '30d':
      from.setDate(from.getDate() - 30);
      break;
    case '90d':
      from.setDate(from.getDate() - 90);
      break;
    case '1y':
      from.setFullYear(from.getFullYear() - 1);
      break;
  }

  return { from, to };
}

/**
 * Get appropriate interval for a time range
 */
export function getDefaultInterval(from: Date, to: Date): TimeInterval {
  const days = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);

  if (days <= 14) return 'day';
  if (days <= 90) return 'week';
  return 'month';
}

/**
 * Format date for a given interval
 */
function formatDateKey(date: Date, interval: TimeInterval): string {
  switch (interval) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week':
      // ISO week number
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

/**
 * Group data points by interval
 */
function groupByInterval(
  data: DataPoint[],
  interval: TimeInterval
): Map<string, DataPoint[]> {
  const groups = new Map<string, DataPoint[]>();

  for (const point of data) {
    const key = formatDateKey(point.date, interval);

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  }

  return groups;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;

  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * Determine trend direction
 */
function determineTrendDirection(
  data: TrendDataPoint[],
  threshold: number = 5
): TrendDirection {
  if (data.length < 2) return 'flat';

  // Compare first third to last third
  const thirdLen = Math.max(1, Math.floor(data.length / 3));
  const firstThird = data.slice(0, thirdLen);
  const lastThird = data.slice(-thirdLen);

  const firstAvg = firstThird.reduce((s, d) => s + d.value, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((s, d) => s + d.value, 0) / lastThird.length;

  const percentChange = firstAvg > 0 ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

  if (percentChange > threshold) return 'up';
  if (percentChange < -threshold) return 'down';
  return 'flat';
}

/**
 * Calculate trend from raw data points
 */
export function calculateTrend(
  rawData: DataPoint[],
  options: {
    from?: Date;
    to?: Date;
    preset?: TimePreset;
    interval?: TimeInterval;
  } = {}
): TrendResult {
  // Determine date range
  let from: Date;
  let to: Date;

  if (options.preset) {
    const range = getPresetRange(options.preset);
    from = range.from;
    to = range.to;
  } else {
    to = options.to || new Date();
    from = options.from || new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Filter data to range
  const filteredData = rawData.filter(
    d => d.date >= from && d.date <= to
  );

  // Determine interval
  const interval = options.interval || getDefaultInterval(from, to);

  // Group by interval
  const groups = groupByInterval(filteredData, interval);

  // Calculate aggregated values
  const trendData: TrendDataPoint[] = [];
  let previousValue: number | null = null;

  // Sort groups by date
  const sortedKeys = Array.from(groups.keys()).sort();

  for (const key of sortedKeys) {
    const points = groups.get(key)!;
    const avgValue = points.reduce((s, p) => s + p.value, 0) / points.length;

    const change = previousValue !== null ? avgValue - previousValue : 0;
    const percentChange = previousValue !== null && previousValue > 0
      ? (change / previousValue) * 100
      : 0;

    trendData.push({
      date: key,
      value: Math.round(avgValue * 100) / 100,
      count: points.length,
      change: Math.round(change * 100) / 100,
      percentChange: Math.round(percentChange * 10) / 10,
    });

    previousValue = avgValue;
  }

  // Calculate overall trend analysis
  const values = trendData.map(d => d.value);
  const totalChange = values.length >= 2 ? values[values.length - 1] - values[0] : 0;
  const percentChange = values.length >= 2 && values[0] > 0
    ? (totalChange / values[0]) * 100
    : 0;

  const trend: TrendAnalysis = {
    direction: determineTrendDirection(trendData),
    totalChange: Math.round(totalChange * 100) / 100,
    percentChange: Math.round(percentChange * 10) / 10,
    average: values.length > 0 ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100 : 0,
    max: values.length > 0 ? Math.max(...values) : 0,
    min: values.length > 0 ? Math.min(...values) : 0,
    stdDev: Math.round(calculateStdDev(values) * 100) / 100,
    isSignificant: Math.abs(percentChange) > 5,
  };

  return {
    data: trendData,
    trend,
    timeRange: {
      from,
      to,
      interval,
      preset: options.preset,
    },
  };
}

/**
 * Compare current period to previous period
 */
export function compareperiods(
  rawData: DataPoint[],
  preset: TimePreset
): TrendResult {
  const { from, to } = getPresetRange(preset);
  const periodLength = to.getTime() - from.getTime();

  // Previous period
  const previousFrom = new Date(from.getTime() - periodLength);
  const previousTo = new Date(from.getTime() - 1);

  // Filter data for both periods
  const currentData = rawData.filter(d => d.date >= from && d.date <= to);
  const previousData = rawData.filter(d => d.date >= previousFrom && d.date <= previousTo);

  // Calculate averages
  const currentAvg = currentData.length > 0
    ? currentData.reduce((s, d) => s + d.value, 0) / currentData.length
    : 0;
  const previousAvg = previousData.length > 0
    ? previousData.reduce((s, d) => s + d.value, 0) / previousData.length
    : 0;

  const change = currentAvg - previousAvg;
  const percentChange = previousAvg > 0 ? (change / previousAvg) * 100 : 0;

  // Get full trend result
  const result = calculateTrend(rawData, { preset });

  // Add comparison
  result.comparison = {
    previousPeriodAvg: Math.round(previousAvg * 100) / 100,
    currentPeriodAvg: Math.round(currentAvg * 100) / 100,
    change: Math.round(change * 100) / 100,
    percentChange: Math.round(percentChange * 10) / 10,
  };

  return result;
}

/**
 * Get simple trend direction for a metric
 */
export function getSimpleTrend(
  rawData: DataPoint[],
  preset: TimePreset = '30d'
): TrendDirection {
  const result = calculateTrend(rawData, { preset });
  return result.trend.direction;
}

/**
 * Generate empty data points for missing dates
 */
export function fillMissingDates(
  data: TrendDataPoint[],
  from: Date,
  to: Date,
  interval: TimeInterval
): TrendDataPoint[] {
  const filled: TrendDataPoint[] = [];
  const dataMap = new Map(data.map(d => [d.date, d]));

  const current = new Date(from);

  while (current <= to) {
    const key = formatDateKey(current, interval);

    if (dataMap.has(key)) {
      filled.push(dataMap.get(key)!);
    } else {
      filled.push({
        date: key,
        value: 0,
        count: 0,
        change: 0,
        percentChange: 0,
      });
    }

    // Increment date based on interval
    switch (interval) {
      case 'day':
        current.setDate(current.getDate() + 1);
        break;
      case 'week':
        current.setDate(current.getDate() + 7);
        break;
      case 'month':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  return filled;
}
