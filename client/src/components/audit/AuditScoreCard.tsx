import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/charts/progress-ring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditScoreCardProps {
  /** Audit score (0-100) */
  score: number;
  /** Optional label below the score */
  label?: string;
  /** Card title */
  title?: string;
  /** Show detailed breakdown */
  showBreakdown?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Get score color based on value
 * - Green (70+): Good
 * - Yellow (40-69): Needs improvement
 * - Red (<40): Poor
 */
function getScoreColor(score: number): 'success' | 'warning' | 'error' {
  if (score >= 70) return 'success';
  if (score >= 40) return 'warning';
  return 'error';
}

/**
 * Get score description based on value
 */
function getScoreDescription(score: number): string {
  if (score >= 70) return 'Good';
  if (score >= 40) return 'Needs Improvement';
  return 'Poor';
}

/**
 * AuditScoreCard - Displays audit score with circular progress ring
 *
 * Features:
 * - Color-coded score (green/yellow/red)
 * - Animated progress ring
 * - Score description
 * - prefers-reduced-motion support
 */
export function AuditScoreCard({
  score,
  label,
  title = 'AI visibility score',
  showBreakdown = false,
  className,
}: AuditScoreCardProps) {
  const scoreColor = getScoreColor(score);
  const scoreDescription = getScoreDescription(score);

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <ProgressRing
          value={score}
          size="xl"
          variant="auto"
          showValue
          label={label || scoreDescription}
          animated
        />
        {showBreakdown && (
          <div className="text-center">
            <p className={cn(
              'text-sm font-medium',
              scoreColor === 'success' && 'text-green-600 dark:text-green-400',
              scoreColor === 'warning' && 'text-yellow-600 dark:text-yellow-400',
              scoreColor === 'error' && 'text-red-600 dark:text-red-400',
            )}>
              {scoreDescription}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {score >= 70
                ? 'Your site is well-optimized for AI visibility'
                : score >= 40
                ? 'There are opportunities to improve AI discoverability'
                : 'Significant improvements needed for AI optimization'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact audit score for inline use
 */
export function CompactAuditScore({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <ProgressRing
        value={score}
        size="sm"
        variant="auto"
        showValue
        animated
      />
      <span className="text-sm text-muted-foreground">
        {getScoreDescription(score)}
      </span>
    </div>
  );
}
