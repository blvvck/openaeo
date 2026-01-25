import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress-indicator';
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { platformColors } from './chart-theme';

export type PlatformStatus = 'pending' | 'running' | 'success' | 'error' | 'skipped';

export interface PlatformProgress {
  platform: string;
  status: PlatformStatus;
  progress?: number; // 0-100 for running status
  error?: string;
  responseCount?: number;
  duration?: number; // ms
}

export interface AnalysisSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  platforms: PlatformProgress[];
  startedAt?: Date;
  completedAt?: Date;
  totalPrompts?: number;
  completedPrompts?: number;
}

interface AnalysisProgressCardProps {
  /** Analysis session data */
  session: AnalysisSession;
  /** Show detailed platform breakdown */
  showPlatformDetails?: boolean;
  /** Compact mode for smaller displays */
  compact?: boolean;
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

function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform.toLowerCase()] || platform;
}

function getPlatformColor(platform: string): string {
  return platformColors[platform.toLowerCase()] || 'hsl(var(--muted-foreground))';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

function getStatusIcon(status: PlatformStatus, className?: string) {
  const iconClasses = cn('w-4 h-4', className);

  switch (status) {
    case 'pending':
      return <Clock className={cn(iconClasses, 'text-muted-foreground')} />;
    case 'running':
      return <Loader2 className={cn(iconClasses, 'text-primary animate-spin')} />;
    case 'success':
      return <CheckCircle2 className={cn(iconClasses, 'text-success')} />;
    case 'error':
      return <XCircle className={cn(iconClasses, 'text-destructive')} />;
    case 'skipped':
      return <AlertTriangle className={cn(iconClasses, 'text-warning')} />;
  }
}

function getStatusLabel(status: PlatformStatus): string {
  switch (status) {
    case 'pending':
      return 'Waiting';
    case 'running':
      return 'Running';
    case 'success':
      return 'Complete';
    case 'error':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
  }
}

/**
 * Single platform status line
 */
export function PlatformStatusLine({
  platform,
  status,
  progress,
  error,
  responseCount,
  duration,
  compact = false,
}: PlatformProgress & { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        compact ? 'py-1' : 'py-2'
      )}
    >
      {/* Status icon */}
      {getStatusIcon(status)}

      {/* Platform name with color indicator */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: getPlatformColor(platform) }}
        />
        <span className={cn('text-sm', compact && 'text-xs')}>
          {getPlatformLabel(platform)}
        </span>
      </div>

      {/* Progress bar or status */}
      <div className="flex-1 min-w-[80px]">
        {status === 'running' && progress !== undefined ? (
          <Progress value={progress} className="h-2" />
        ) : (
          <span
            className={cn(
              'text-xs',
              status === 'success' && 'text-success',
              status === 'error' && 'text-destructive',
              status === 'pending' && 'text-muted-foreground',
              status === 'skipped' && 'text-warning'
            )}
          >
            {getStatusLabel(status)}
          </span>
        )}
      </div>

      {/* Stats */}
      {!compact && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {responseCount !== undefined && (
            <span>{responseCount} responses</span>
          )}
          {duration !== undefined && (
            <span>{formatDuration(duration)}</span>
          )}
        </div>
      )}

      {/* Error message */}
      {error && !compact && (
        <span className="text-xs text-destructive truncate max-w-[150px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * Full analysis progress card
 */
export function AnalysisProgressCard({
  session,
  showPlatformDetails = true,
  compact = false,
  className,
}: AnalysisProgressCardProps) {
  const completedPlatforms = session.platforms.filter(
    (p) => p.status === 'success'
  ).length;
  const totalPlatforms = session.platforms.length;
  const overallProgress = Math.round((completedPlatforms / totalPlatforms) * 100);

  const isRunning = session.status === 'running';
  const isCompleted = session.status === 'completed';
  const isFailed = session.status === 'failed';

  // Calculate elapsed/total time
  const elapsed = session.startedAt
    ? (session.completedAt || new Date()).getTime() - session.startedAt.getTime()
    : 0;

  return (
    <Card className={cn(className)}>
      <CardHeader className={cn(compact && 'pb-2')}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn('text-lg', compact && 'text-base')}>
            Analysis Progress
          </CardTitle>
          <div className="flex items-center gap-2">
            {isRunning && (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            )}
            {isCompleted && (
              <CheckCircle2 className="w-4 h-4 text-success" />
            )}
            {isFailed && (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
            <span
              className={cn(
                'text-sm font-medium',
                isRunning && 'text-primary',
                isCompleted && 'text-success',
                isFailed && 'text-destructive'
              )}
            >
              {session.status === 'pending' && 'Starting...'}
              {isRunning && `${overallProgress}%`}
              {isCompleted && 'Complete'}
              {isFailed && 'Failed'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn(compact && 'pt-0')}>
        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {completedPlatforms} of {totalPlatforms} platforms
            </span>
            {elapsed > 0 && (
              <span className="text-muted-foreground">
                {formatDuration(elapsed)}
              </span>
            )}
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Prompt progress */}
        {session.totalPrompts !== undefined && session.completedPrompts !== undefined && (
          <div className="mb-4 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {session.completedPrompts}
            </span>{' '}
            of {session.totalPrompts} prompts analyzed
          </div>
        )}

        {/* Platform breakdown */}
        {showPlatformDetails && (
          <div className="space-y-1 border-t border-border pt-3">
            {session.platforms.map((platform) => (
              <PlatformStatusLine
                key={platform.platform}
                {...platform}
                compact={compact}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Minimal progress indicator for toolbar/header
 */
export function AnalysisProgressIndicator({
  session,
  className,
}: {
  session: AnalysisSession;
  className?: string;
}) {
  const completedPlatforms = session.platforms.filter(
    (p) => p.status === 'success'
  ).length;
  const totalPlatforms = session.platforms.length;
  const isRunning = session.status === 'running';

  if (session.status === 'pending') {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isRunning ? (
        <>
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
          <span className="text-sm text-muted-foreground">
            Analyzing ({completedPlatforms}/{totalPlatforms})
          </span>
        </>
      ) : session.status === 'completed' ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-success" />
          <span className="text-sm text-muted-foreground">Analysis complete</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-muted-foreground">Analysis failed</span>
        </>
      )}
    </div>
  );
}
