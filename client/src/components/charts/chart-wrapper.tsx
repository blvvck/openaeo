import { ReactNode, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartWrapperProps {
  /** Chart content to render */
  children: ReactNode;
  /** Show loading skeleton */
  loading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Show empty state when no data */
  isEmpty?: boolean;
  /** Custom empty message */
  emptyMessage?: string;
  /** Retry callback for errors */
  onRetry?: () => void;
  /** Chart height */
  height?: number | string;
  /** Additional classes */
  className?: string;
  /** Title for the chart */
  title?: string;
  /** Description/subtitle */
  description?: string;
}

function ChartSkeleton({ height }: { height: number | string }) {
  const h = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="space-y-3" style={{ height: h }}>
      {/* Chart area skeleton */}
      <div className="relative h-full">
        <Skeleton className="absolute inset-0 rounded-lg" />
        {/* Fake axis lines */}
        <div className="absolute bottom-8 left-12 right-4 h-px bg-muted animate-pulse" />
        <div className="absolute top-4 bottom-8 left-12 w-px bg-muted animate-pulse" />
        {/* Fake bars/lines */}
        <div className="absolute bottom-8 left-16 right-8 flex items-end justify-around gap-2 h-[60%]">
          {[40, 65, 45, 80, 55, 70].map((h, i) => (
            <Skeleton
              key={i}
              className="w-8 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartError({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="p-3 bg-destructive/10 rounded-full mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{error}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center">
      <div className="p-3 bg-muted rounded-full mb-4">
        <svg
          className="w-6 h-6 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function ChartWrapper({
  children,
  loading = false,
  error = null,
  isEmpty = false,
  emptyMessage = 'No data available',
  onRetry,
  height = 300,
  className,
  title,
  description,
}: ChartWrapperProps) {
  const h = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Chart container */}
      <div className="relative" style={{ minHeight: h }}>
        {loading && <ChartSkeleton height={height} />}
        {!loading && error && <ChartError error={error} onRetry={onRetry} />}
        {!loading && !error && isEmpty && <ChartEmpty message={emptyMessage} />}
        {!loading && !error && !isEmpty && (
          <div className="overflow-hidden touch-pan-y" style={{ height: h }}>{children}</div>
        )}
      </div>
    </div>
  );
}

// Hook for managing chart data state
export function useChartData<T>(
  fetchFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, deps);

  return { data, loading, error, refetch: fetch };
}
