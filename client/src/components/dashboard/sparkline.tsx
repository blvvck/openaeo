/**
 * Sparkline Component
 *
 * Generic, reusable mini-chart for inline trend visualization.
 * SVG-based with gradient fill. No axis labels -- purely visual.
 *
 * Props:
 * - data: number[] (the data points)
 * - width/height: dimensions (default 200x32)
 * - color: stroke color (default emerald)
 * - className: additional classes
 */

import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface SparklineProps {
  /** Array of numeric data points */
  data: number[];
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Stroke color (CSS color value) */
  color?: string;
  /** Additional classes */
  className?: string;
}

/**
 * Generate an SVG path from data points
 */
function buildPath(data: number[], width: number, height: number, padding: number = 2): string {
  if (data.length < 2) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Prevent division by zero

  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * usableWidth;
    const y = padding + usableHeight - ((value - min) / range) * usableHeight;
    return { x, y };
  });

  // Build smooth line using the points
  const pathParts = points.map((point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    return `L ${point.x} ${point.y}`;
  });

  return pathParts.join(' ');
}

/**
 * Build a closed area path for the gradient fill beneath the line
 */
function buildAreaPath(data: number[], width: number, height: number, padding: number = 2): string {
  if (data.length < 2) return '';

  const linePath = buildPath(data, width, height, padding);
  const usableWidth = width - padding * 2;

  // Close the area: line down to bottom-right, across to bottom-left, back to start
  const lastX = padding + usableWidth;
  const firstX = padding;
  const bottom = height;

  return `${linePath} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`;
}

export function Sparkline({
  data,
  width = 200,
  height = 32,
  color = '#10b981', // emerald-500
  className,
}: SparklineProps) {
  const gradientId = useMemo(() => `sparkline-gradient-${Math.random().toString(36).slice(2, 9)}`, []);

  const linePath = useMemo(() => buildPath(data, width, height), [data, width, height]);
  const areaPath = useMemo(() => buildAreaPath(data, width, height), [data, width, height]);

  // If no data or single point, show placeholder
  if (data.length < 2) {
    return (
      <div
        className={cn('flex items-center justify-center', className)}
        style={{ width, height }}
      >
        <div
          className="w-full border-b border-dashed border-muted-foreground/20"
          style={{ height: 1 }}
        />
      </div>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />
      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sparkline;
