/**
 * Skeleton Loader Components
 *
 * Loading placeholders with shimmer animation.
 * Use these to show loading states that match content shape.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Base Skeleton component with shimmer effect
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width - can be Tailwind class or CSS value */
  width?: string;
  /** Height - can be Tailwind class or CSS value */
  height?: string;
}

export function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-muted',
        className
      )}
      style={{
        width: width?.startsWith('w-') ? undefined : width,
        height: height?.startsWith('h-') ? undefined : height,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Text skeleton - matches typography scale
 */
interface TextSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of lines to show */
  lines?: number;
  /** Text size variant */
  size?: 'sm' | 'base' | 'lg' | 'xl';
  /** Last line width percentage */
  lastLineWidth?: number;
}

export function TextSkeleton({
  lines = 1,
  size = 'base',
  lastLineWidth = 75,
  className,
  ...props
}: TextSkeletonProps) {
  const heightMap = {
    sm: 'h-3',
    base: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
  };

  const gapMap = {
    sm: 'gap-2',
    base: 'gap-2.5',
    lg: 'gap-3',
    xl: 'gap-3.5',
  };

  return (
    <div className={cn('flex flex-col', gapMap[size], className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            heightMap[size],
            i === lines - 1 && lines > 1 ? `w-[${lastLineWidth}%]` : 'w-full'
          )}
          style={i === lines - 1 && lines > 1 ? { width: `${lastLineWidth}%` } : undefined}
        />
      ))}
    </div>
  );
}

/**
 * Circle skeleton - for avatars, icons
 */
interface CircleSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size in pixels or Tailwind size class */
  size?: number | string;
}

export function CircleSkeleton({ size = 40, className, style, ...props }: CircleSkeletonProps) {
  const sizeValue = typeof size === 'number' ? `${size}px` : size;

  return (
    <Skeleton
      className={cn('rounded-full', className)}
      style={{
        width: sizeValue,
        height: sizeValue,
        ...style,
      }}
      {...props}
    />
  );
}

/**
 * Ring skeleton - for score rings, donut charts
 * Shows a ring outline with empty center, matching VisibilityScoreRing shape
 */
interface RingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size in pixels */
  size?: number;
  /** Ring stroke width in pixels */
  strokeWidth?: number;
  /** Show placeholder text in center */
  showCenterText?: boolean;
}

export function RingSkeleton({
  size = 180,
  strokeWidth = 12,
  showCenterText = true,
  className,
  ...props
}: RingSkeletonProps) {
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {/* Ring outline */}
      <div
        className="absolute inset-0 rounded-full animate-pulse"
        style={{
          border: `${strokeWidth}px solid hsl(var(--muted))`,
        }}
      />
      {/* Center content placeholder */}
      {showCenterText && (
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-3 w-8 rounded" />
        </div>
      )}
    </div>
  );
}

/**
 * Card skeleton - matches Card component structure
 */
interface CardSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show header area */
  hasHeader?: boolean;
  /** Number of content lines */
  contentLines?: number;
  /** Show footer area */
  hasFooter?: boolean;
}

export function CardSkeleton({
  hasHeader = true,
  contentLines = 3,
  hasFooter = false,
  className,
  ...props
}: CardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6 shadow-sm',
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      <div className="space-y-2">
        <TextSkeleton lines={contentLines} lastLineWidth={60} />
      </div>

      {hasFooter && (
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      )}
    </div>
  );
}

/**
 * Table row skeleton
 */
interface TableRowSkeletonProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Number of columns */
  columns?: number;
  /** Column widths as percentages (optional) */
  columnWidths?: number[];
}

export function TableRowSkeleton({
  columns = 4,
  columnWidths,
  className,
  ...props
}: TableRowSkeletonProps) {
  const widths = columnWidths || Array(columns).fill(100 / columns);

  return (
    <tr className={cn('border-b', className)} {...props}>
      {widths.map((width, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4" style={{ width: `${Math.min(width * 1.5, 100)}%` }} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table skeleton - full table placeholder
 */
interface TableSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
  ...props
}: TableSkeletonProps) {
  return (
    <div className={cn('rounded-lg border', className)} {...props}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Chart skeleton - placeholder for charts
 */
interface ChartSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chart type affects the shape */
  type?: 'bar' | 'line' | 'pie' | 'area';
  /** Height */
  height?: number | string;
}

export function ChartSkeleton({
  type = 'bar',
  height = 300,
  className,
  ...props
}: ChartSkeletonProps) {
  const heightValue = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-card p-4',
        className
      )}
      style={{ height: heightValue }}
      {...props}
    >
      {/* Y-axis labels */}
      <div className="absolute left-4 top-4 bottom-12 flex flex-col justify-between">
        {[100, 75, 50, 25, 0].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>

      {/* Chart area */}
      <div className="ml-14 mr-4 h-full flex items-end gap-2 pb-8">
        {type === 'bar' && (
          <>
            {[65, 80, 45, 90, 55, 70, 85].map((h, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </>
        )}

        {type === 'line' && (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-full h-1/2 rounded" />
          </div>
        )}

        {type === 'pie' && (
          <div className="w-full h-full flex items-center justify-center">
            <CircleSkeleton size="60%" />
          </div>
        )}

        {type === 'area' && (
          <div className="w-full h-full flex items-end">
            <Skeleton className="w-full h-2/3 rounded-t" />
          </div>
        )}
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-4 left-14 right-4 flex justify-between">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
interface ListItemSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show avatar/icon on left */
  hasAvatar?: boolean;
  /** Show action button on right */
  hasAction?: boolean;
}

export function ListItemSkeleton({
  hasAvatar = true,
  hasAction = false,
  className,
  ...props
}: ListItemSkeletonProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b last:border-0',
        className
      )}
      {...props}
    >
      {hasAvatar && <CircleSkeleton size={40} />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      {hasAction && <Skeleton className="h-8 w-16 rounded" />}
    </div>
  );
}

/**
 * List skeleton - multiple list items
 */
interface ListSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Number of items */
  items?: number;
  /** Show avatars */
  hasAvatar?: boolean;
  /** Show actions */
  hasAction?: boolean;
}

export function ListSkeleton({
  items = 5,
  hasAvatar = true,
  hasAction = false,
  className,
  ...props
}: ListSkeletonProps) {
  return (
    <div className={cn('rounded-lg border divide-y', className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} hasAvatar={hasAvatar} hasAction={hasAction} />
      ))}
    </div>
  );
}
