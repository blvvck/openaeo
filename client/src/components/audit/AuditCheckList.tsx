import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fadeInUp, TRANSITIONS, prefersReducedMotion } from '@/lib/motion';

interface AuditCheck {
  /** Check identifier */
  id: string;
  /** Check name/label */
  name: string;
  /** Whether the check passed */
  passed: boolean;
  /** Points earned for this check */
  pointsEarned: number;
  /** Maximum points possible */
  pointsPossible: number;
  /** Detailed description of the check */
  description?: string;
  /** Details about what was found */
  details?: string;
}

interface AuditCheckListProps {
  /** List of audit checks */
  checks: AuditCheck[];
  /** Card title */
  title?: string;
  /** Show points breakdown */
  showPoints?: boolean;
  /** Additional classes */
  className?: string;
}

/**
 * Individual check item with expandable details
 */
function AuditCheckItem({
  check,
  showPoints,
}: {
  check: AuditCheck;
  showPoints: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const reducedMotion = prefersReducedMotion();
  const hasDetails = check.description || check.details;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={cn(
          'w-full flex items-center gap-3 py-3 px-4 text-left',
          'transition-colors duration-200',
          hasDetails && 'hover:bg-muted/50 cursor-pointer',
          !hasDetails && 'cursor-default',
        )}
      >
        {/* Pass/Fail Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
            check.passed
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
          )}
        >
          {check.passed ? (
            <Check className="w-4 h-4" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </div>

        {/* Check Name */}
        <span className="flex-1 font-medium text-sm">{check.name}</span>

        {/* Points */}
        {showPoints && (
          <span
            className={cn(
              'text-sm tabular-nums',
              check.passed
                ? 'text-green-600 dark:text-green-400'
                : 'text-muted-foreground',
            )}
          >
            {check.pointsEarned}/{check.pointsPossible}
          </span>
        )}

        {/* Expand Icon */}
        {hasDetails && (
          <motion.span
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={reducedMotion ? { duration: 0 } : TRANSITIONS.fast}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </motion.span>
        )}
      </button>

      {/* Expandable Details */}
      <AnimatePresence>
        {isExpanded && hasDetails && (
          <motion.div
            variants={reducedMotion ? {} : fadeInUp}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="px-4 pb-3 pl-13"
          >
            <div className="pl-9 space-y-2 text-sm text-muted-foreground">
              {check.description && <p>{check.description}</p>}
              {check.details && (
                <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                  {check.details}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * AuditCheckList - Display list of audit check results
 *
 * Features:
 * - Pass/fail icons
 * - Points earned vs possible
 * - Expandable details
 * - prefers-reduced-motion support
 */
export function AuditCheckList({
  checks,
  title = 'Audit Checks',
  showPoints = true,
  className,
}: AuditCheckListProps) {
  const totalPointsEarned = checks.reduce((sum, c) => sum + c.pointsEarned, 0);
  const totalPointsPossible = checks.reduce((sum, c) => sum + c.pointsPossible, 0);
  const passedCount = checks.filter((c) => c.passed).length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              {passedCount}/{checks.length} passed
            </span>
            {showPoints && (
              <span className="font-medium">
                {totalPointsEarned}/{totalPointsPossible} pts
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {checks.map((check) => (
            <AuditCheckItem
              key={check.id}
              check={check}
              showPoints={showPoints}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Summary of check results for compact display
 */
export function AuditCheckSummary({
  checks,
  className,
}: {
  checks: AuditCheck[];
  className?: string;
}) {
  const passedCount = checks.filter((c) => c.passed).length;
  const totalCount = checks.length;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex -space-x-1">
        {checks.slice(0, 5).map((check) => (
          <div
            key={check.id}
            className={cn(
              'w-4 h-4 rounded-full border-2 border-background flex items-center justify-center',
              check.passed
                ? 'bg-green-500'
                : 'bg-red-500',
            )}
          />
        ))}
        {checks.length > 5 && (
          <div className="w-4 h-4 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-medium">
            +{checks.length - 5}
          </div>
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {passedCount}/{totalCount}
      </span>
    </div>
  );
}
